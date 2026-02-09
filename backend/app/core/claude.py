import anthropic
import httpx
import json
import re
import logging
from typing import Dict, Optional, Tuple
from app.config import settings

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Anthropic client
anthropic_client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

# Initialize Gemini client (lazy - only if key exists)
gemini_model = None
if settings.GOOGLE_API_KEY:
    try:
        import google.generativeai as genai
        genai.configure(api_key=settings.GOOGLE_API_KEY)
        gemini_model = genai.GenerativeModel("gemini-2.5-pro")
        logger.info("✅ Gemini API configured successfully")
    except Exception as e:
        logger.warning(f"⚠️ Gemini API not available: {e}")

# Initialize OpenAI client (lazy - only if key exists)
openai_client = None
if settings.OPENAI_API_KEY:
    try:
        import openai
        openai_client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
        logger.info("✅ OpenAI API configured successfully")
    except Exception as e:
        logger.warning(f"⚠️ OpenAI API not available: {e}")


def log_cache_performance(message, operation: str):
    """Log cache performance metrics for cost tracking."""
    usage = message.usage
    
    # Get cache metrics (may not exist on all responses)
    cache_creation = getattr(usage, 'cache_creation_input_tokens', 0) or 0
    cache_read = getattr(usage, 'cache_read_input_tokens', 0) or 0
    input_tokens = getattr(usage, 'input_tokens', 0) or 0
    output_tokens = getattr(usage, 'output_tokens', 0) or 0
    
    # Calculate approximate costs
    # Regular input: $3/1M tokens, Cached read: $0.30/1M tokens (90% off)
    regular_cost = (input_tokens - cache_read) * 0.000003
    cached_cost = cache_read * 0.0000003
    cache_creation_cost = cache_creation * 0.00000375  # 25% premium for creation
    output_cost = output_tokens * 0.000015
    total_cost = regular_cost + cached_cost + cache_creation_cost + output_cost
    
    # Savings calculation
    would_have_cost = (input_tokens + cache_creation) * 0.000003 + output_cost
    savings = would_have_cost - total_cost
    savings_pct = (savings / would_have_cost * 100) if would_have_cost > 0 else 0
    
    logger.info(f"""
╔══════════════════════════════════════════════════════════
║ CLAUDE API USAGE - {operation}
╠══════════════════════════════════════════════════════════
║ Input tokens:           {input_tokens:,}
║ Output tokens:          {output_tokens:,}
║ Cache created:          {cache_creation:,} tokens
║ Cache read (90% off):   {cache_read:,} tokens
╠══════════════════════════════════════════════════════════
║ Estimated cost:         ${total_cost:.4f}
║ Savings from cache:     ${savings:.4f} ({savings_pct:.1f}%)
╚══════════════════════════════════════════════════════════
""")


async def validate_url(url: str) -> Tuple[bool, Optional[str]]:
    """
    Check if a URL is valid and accessible.
    Returns (is_valid, content_type)
    """
    if not url or not url.startswith('http'):
        return False, None
    
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as http_client:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/pdf,*/*',
            }
            response = await http_client.head(url, headers=headers)
            
            if response.status_code == 200:
                return True, response.headers.get('content-type', '')
            elif response.status_code == 405:
                # HEAD not allowed, try GET
                response = await http_client.get(url, headers=headers)
                if response.status_code == 200:
                    return True, response.headers.get('content-type', '')
            
            return False, None
    except Exception as e:
        logger.warning(f"URL validation failed for {url}: {e}")
        return False, None


async def search_manual_on_web(
    manufacturer: str, 
    model: str, 
    manual_type: str
) -> Dict:
    """
    Search for equipment manual using Claude with web search.
    Note: Web search doesn't benefit from caching as each search is unique.
    """
    
    prompt = f"""Use web search to find a PDF service manual for: {manufacturer} {model}

Search query to use: "{manufacturer} {model} service manual PDF filetype:pdf"

Also try: "{manufacturer} {model}" site:partstown.com OR site:manualslib.com

When you find a result with a PDF link, return this JSON:
{{"found": true, "url": "the PDF URL", "source": "website name"}}

If no PDF manual found after searching:
{{"found": false}}"""

    try:
        logger.info(f"Searching for {manufacturer} {model} {manual_type} manual...")
        
        message = anthropic_client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2048,
            tools=[{"type": "web_search_20250305", "name": "web_search"}],
            tool_choice={"type": "any"},
            messages=[{"role": "user", "content": prompt}]
        )
        
        logger.info(f"Response stop_reason: {message.stop_reason}")
        log_cache_performance(message, "Web Search")
        
        text_response = ""
        
        for block in message.content:
            if hasattr(block, 'text'):
                text_response += block.text
            elif hasattr(block, 'type') and block.type == 'tool_use':
                logger.info(f"Tool used: {block.name}")
        
        # If stop_reason is tool_use, continue the conversation
        if message.stop_reason == "tool_use":
            message = anthropic_client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=2048,
                tools=[{"type": "web_search_20250305", "name": "web_search"}],
                messages=[
                    {"role": "user", "content": prompt},
                    {"role": "assistant", "content": message.content},
                ]
            )
            log_cache_performance(message, "Web Search (continued)")
            
            for block in message.content:
                if hasattr(block, 'text'):
                    text_response += block.text
        
        logger.info(f"Final response text: {text_response[:500]}...")
        
        # Clean and parse JSON
        response_text = text_response.strip()
        
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0]
        elif "```" in response_text:
            parts = response_text.split("```")
            if len(parts) >= 2:
                response_text = parts[1]
        
        response_text = response_text.strip()
        
        result = None
        try:
            if response_text.startswith("{"):
                result = json.loads(response_text)
        except json.JSONDecodeError:
            json_match = re.search(r'\{[^{}]*"found"\s*:\s*(true|false)[^{}]*\}', response_text, re.DOTALL | re.IGNORECASE)
            if json_match:
                try:
                    result = json.loads(json_match.group())
                except:
                    pass
        
        if not result:
            logger.error(f"Could not parse JSON from: {response_text}")
            return {"found": False, "error": "Could not parse response", "raw": response_text[:500]}
        
        # Validate URL if found
        if result.get("found") and result.get("url"):
            url = result["url"]
            logger.info(f"Found URL: {url}")
            
            is_valid, content_type = await validate_url(url)
            result["validated"] = is_valid
            if content_type:
                result["content_type"] = content_type
            
            if not is_valid:
                logger.warning(f"URL validation failed for {url}")
        
        return result
        
    except Exception as e:
        logger.error(f"Search failed: {e}", exc_info=True)
        return {"found": False, "error": str(e)}


async def structure_manual_content(
    manual_text: str, 
    manufacturer: str, 
    model: str
) -> Dict:
    """
    Use Claude to extract structured sections from manual text.
    Uses prompt caching for the manual text to reduce costs.
    """
    
    # Limit to ~40k tokens (120k chars) for reasonable costs
    text_sample = manual_text[:120000]
    
    try:
        message = anthropic_client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            # Use system parameter with cache_control for the manual text
            system=[
                {
                    "type": "text",
                    "text": "You are a technical documentation analyst specializing in commercial equipment service manuals."
                },
                {
                    "type": "text",
                    "text": f"SERVICE MANUAL CONTENT:\n{text_sample}",
                    "cache_control": {"type": "ephemeral"}  # ENABLES CACHING - 90% cost reduction!
                }
            ],
            messages=[{
                "role": "user",
                "content": f"""Analyze this service manual for {manufacturer} {model}.

Extract and structure the following sections (if present):

Return a JSON object with these sections:
{{
  "overview": {{"text": "summary", "page_range": [start, end]}},
  "specifications": {{"text": "specs", "data": {{}}}},
  "error_codes": {{
    "text": "error definitions",
    "page_range": [start, end],
    "codes": {{"F1": "Error description"}}
  }},
  "troubleshooting": {{
    "text": "procedures",
    "page_range": [start, end],
    "procedures": []
  }},
  "wiring_diagrams": {{"text": "wiring info", "page_range": [start, end]}},
  "parts_list": {{"text": "parts", "categories": []}}
}}"""
            }]
        )
        
        log_cache_performance(message, f"Structure Manual ({manufacturer} {model})")
        
        response_text = message.content[0].text
        
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0]
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0]
        
        return json.loads(response_text.strip())
    
    except Exception as e:
        logger.error(f"Structure manual failed: {e}")
        return {"error": str(e)}


async def troubleshoot_with_claude(
    manual_text: str,
    manufacturer: str,
    model: str,
    error_code: Optional[str],
    symptom: Optional[str]
) -> Dict:
    """
    Use Claude to troubleshoot equipment issue with manual context.
    Uses prompt caching for the manual text - 90% cost reduction for repeated queries!
    """
    
    # Limit manual text to ~40k tokens for cost efficiency
    text_sample = manual_text[:120000] if manual_text else ""
    
    try:
        message = anthropic_client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            tools=[{"type": "web_search_20250305", "name": "web_search"}],
            # PROMPT CACHING: Put manual text in system with cache_control
            system=[
                {
                    "type": "text",
                    "text": "You are a commercial equipment service technician assistant. Provide detailed, practical troubleshooting guidance."
                },
                {
                    "type": "text",
                    "text": f"SERVICE MANUAL for {manufacturer} {model}:\n\n{text_sample}" if text_sample else "No manual available - use your knowledge and web search.",
                    "cache_control": {"type": "ephemeral"}  # ENABLES CACHING!
                }
            ],
            messages=[{
                "role": "user",
                "content": f"""Troubleshoot this issue:

Equipment: {manufacturer} {model}
Error Code: {error_code or "None specified"}
Symptom: {symptom or "None specified"}

Provide troubleshooting guidance in this JSON format:
{{
  "error_definition": "Clear definition of the error",
  "severity": "critical/high/medium/low",
  "troubleshooting_steps": [
    {{
      "step": 1,
      "title": "Short step title",
      "instruction": "Detailed instruction",
      "expected_result": "What should happen",
      "safety_warning": "Warning if applicable or null"
    }}
  ],
  "parts_to_check": [
    {{
      "name": "Part name",
      "part_number": "P/N if available or null",
      "description": "What it does",
      "location": "Where to find it",
      "common_failure_modes": ["mode1", "mode2"]
    }}
  ],
  "common_causes": ["cause1", "cause2"],
  "estimated_repair_time_minutes": 30,
  "difficulty": "beginner/intermediate/advanced",
  "citations": [
    {{
      "source": "Manual section name",
      "page": 22,
      "section": "Section title"
    }}
  ]
}}

CRITICAL: If manual content was provided, cite specific page numbers. If no manual, use web search."""
            }]
        )
        
        log_cache_performance(message, f"Troubleshoot ({manufacturer} {model} - {error_code or symptom})")
        
        response_text = ""
        for block in message.content:
            if hasattr(block, 'text'):
                response_text += block.text
        
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0]
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0]
        
        return json.loads(response_text.strip())
    
    except Exception as e:
        logger.error(f"Troubleshoot failed: {e}")
        return {
            "error": "Failed to generate troubleshooting response",
            "details": str(e)
        }


# Model ID to provider mapping
MODEL_PROVIDERS = {
    # Claude models
    "claude-sonnet-4-5": ("anthropic", "claude-sonnet-4-20250514"),
    "claude-haiku-4-5": ("anthropic", "claude-haiku-4-5-20251001"),
    # Gemini models (stable GA versions)
    "gemini-2.5-pro": ("google", "gemini-2.5-pro"),
    "gemini-2.5-flash": ("google", "gemini-2.5-flash"),
    # OpenAI GPT-4o models
    "gpt-4o": ("openai", "gpt-4o"),
    "gpt-4o-mini": ("openai", "gpt-4o-mini"),
}

# Pricing per 1M tokens (input, output) in USD
MODEL_PRICING = {
    "claude-sonnet-4-5": (3.00, 15.00),
    "claude-haiku-4-5": (0.25, 1.25),
    "gemini-2.5-pro": (1.25, 10.00),
    "gemini-2.5-flash": (0.075, 0.30),
    "gpt-4o": (2.50, 10.00),
    "gpt-4o-mini": (0.15, 0.60),
}


def calculate_cost(model_id: str, input_tokens: int, output_tokens: int) -> float:
    """Calculate cost in USD for a given request."""
    input_price, output_price = MODEL_PRICING.get(model_id, (3.00, 15.00))
    input_cost = (input_tokens / 1_000_000) * input_price
    output_cost = (output_tokens / 1_000_000) * output_price
    return round(input_cost + output_cost, 6)


async def troubleshoot_with_ai(
    manual_text: str,
    manufacturer: str,
    model: str,
    error_code: Optional[str],
    symptom: Optional[str],
    model_id: str = "claude-sonnet-4-5"
) -> Dict:
    """
    Multi-provider AI troubleshooting with support for Claude and Gemini.
    Uses prompt caching for Claude models.
    """
    
    # Limit manual text for cost efficiency
    text_sample = manual_text[:120000] if manual_text else ""
    
    # Get provider and actual model name
    provider, actual_model = MODEL_PROVIDERS.get(model_id, ("anthropic", "claude-sonnet-4-20250514"))
    
    # Build the prompt (shared across providers)
    troubleshoot_prompt = f"""Troubleshoot this issue:

Equipment: {manufacturer} {model}
Error Code: {error_code or "None specified"}
Symptom: {symptom or "None specified"}

SERVICE MANUAL CONTEXT:
{text_sample if text_sample else "No manual available - use your knowledge."}

Provide troubleshooting guidance in this JSON format:
{{
  "error_definition": "Clear definition of the error",
  "severity": "critical/high/medium/low",
  "troubleshooting_steps": [
    {{
      "step": 1,
      "title": "Short step title",
      "instruction": "Detailed instruction",
      "expected_result": "What should happen",
      "safety_warning": "Warning if applicable or null"
    }}
  ],
  "parts_to_check": [
    {{
      "name": "Part name",
      "part_number": "P/N if available or null",
      "description": "What it does",
      "location": "Where to find it",
      "common_failure_modes": ["mode1", "mode2"]
    }}
  ],
  "common_causes": ["cause1", "cause2"],
  "estimated_repair_time_minutes": 30,
  "difficulty": "beginner/intermediate/advanced",
  "citations": [
    {{
      "source": "Manual section name",
      "page": 22,
      "section": "Section title"
    }}
  ]
}}

CRITICAL: Return ONLY valid JSON. If manual content was provided, cite specific page numbers."""

    try:
        # --- GEMINI PROVIDER ---
        if provider == "google":
            if not gemini_model:
                logger.warning("Gemini not available, falling back to Claude")
                return await troubleshoot_with_claude(manual_text, manufacturer, model, error_code, symptom)
            
            import google.generativeai as genai
            
            # Use the actual model name from MODEL_PROVIDERS
            gemini = genai.GenerativeModel(
                model_name=actual_model,
                system_instruction="You are a commercial equipment service technician assistant. Provide detailed, practical troubleshooting guidance. Always respond in valid JSON format only."
            )
            
            response = gemini.generate_content(troubleshoot_prompt)
            
            logger.info(f"""
╔══════════════════════════════════════════════════════════
║ GEMINI API USAGE - Troubleshoot ({manufacturer} {model})
╠══════════════════════════════════════════════════════════
║ Model:                  {actual_model}
║ Input tokens:           ~{len(troubleshoot_prompt) // 4:,}
╚══════════════════════════════════════════════════════════
""")
            
            response_text = response.text
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0]
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0]
            
            return json.loads(response_text.strip())
        
        # --- OPENAI PROVIDER ---
        elif provider == "openai":
            if not openai_client:
                logger.warning("OpenAI not available, falling back to Claude")
                return await troubleshoot_with_claude(manual_text, manufacturer, model, error_code, symptom)
            
            response = openai_client.chat.completions.create(
                model=actual_model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a commercial equipment service technician assistant. Provide detailed, practical troubleshooting guidance. Always respond in valid JSON format only."
                    },
                    {
                        "role": "user",
                        "content": troubleshoot_prompt
                    }
                ],
                max_tokens=4096
            )
            
            logger.info(f"""
╔══════════════════════════════════════════════════════════
║ OPENAI API USAGE - Troubleshoot ({manufacturer} {model})
╠══════════════════════════════════════════════════════════
║ Model:                  {actual_model}
║ Input tokens:           {response.usage.prompt_tokens:,}
║ Output tokens:          {response.usage.completion_tokens:,}
╚══════════════════════════════════════════════════════════
""")
            
            response_text = response.choices[0].message.content
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0]
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0]
            
            return json.loads(response_text.strip())
        
        # --- CLAUDE PROVIDER (default) ---
        else:
            message = anthropic_client.messages.create(
                model=actual_model,
                max_tokens=4096,
                tools=[{"type": "web_search_20250305", "name": "web_search"}],
                system=[
                    {
                        "type": "text",
                        "text": "You are a commercial equipment service technician assistant. Provide detailed, practical troubleshooting guidance."
                    },
                    {
                        "type": "text",
                        "text": f"SERVICE MANUAL for {manufacturer} {model}:\n\n{text_sample}" if text_sample else "No manual available - use your knowledge and web search.",
                        "cache_control": {"type": "ephemeral"}
                    }
                ],
                messages=[{"role": "user", "content": troubleshoot_prompt}]
            )
            
            log_cache_performance(message, f"Troubleshoot ({manufacturer} {model} - {error_code or symptom}) via {model_id}")
            
            response_text = ""
            for block in message.content:
                if hasattr(block, 'text'):
                    response_text += block.text
            
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0]
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0]
            
            return json.loads(response_text.strip())
    
    except Exception as e:
        logger.error(f"Troubleshoot with {model_id} failed: {e}")
        return {
            "error": f"Failed to generate troubleshooting response using {model_id}",
            "details": str(e)
        }

