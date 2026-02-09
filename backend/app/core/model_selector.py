"""
Smart model selection logic for cost-effective AI usage.
Prioritizes affordability without sacrificing accuracy.
"""

# Model ranking by cost-effectiveness (best value first)
MODEL_PRIORITY = [
    # Flash tier (cheapest, good for simple queries)
    ("gemini-2.5-flash", "google"),      # $0.075/M input, $0.30/M output
    ("gpt-4o-mini", "openai"),           # $0.15/M input, $0.60/M output
    ("claude-haiku-4-5", "anthropic"),   # $0.25/M input, $1.25/M output
    
    # Pro tier (better quality, still affordable)
    ("gemini-2.5-pro", "google"),        # $1.25/M input, $10/M output
    ("gpt-4o", "openai"),                # $2.50/M input, $10/M output
    ("claude-sonnet-4-5", "anthropic"),  # $3.00/M input, $15/M output
]


def suggest_model(
    has_manual: bool = False,
    query_complexity: str = "medium",  # low, medium, high
    manufacturer: str = "",
    preferred_providers: list = None
) -> dict:
    """
    Suggest the optimal model based on query context.
    
    Logic:
    - Simple queries + manual available → Flash tier (cheap)
    - Medium queries → Pro tier (balanced)
    - Complex queries or no manual → Sonnet (most capable)
    """
    
    # Determine required tier based on complexity and context
    if query_complexity == "low" or (query_complexity == "medium" and has_manual):
        # Simple query or has good context → use cheap models
        target_tier = ["gemini-2.5-flash", "gpt-4o-mini", "claude-haiku-4-5"]
        reason = "Simple query - using fast, affordable model"
    elif query_complexity == "medium":
        # Medium complexity without manual → use mid-tier
        target_tier = ["gemini-2.5-pro", "gpt-4o"]
        reason = "Medium complexity - using balanced model"
    else:
        # High complexity → use the best
        target_tier = ["claude-sonnet-4-5", "gemini-2.5-pro", "gpt-4o"]
        reason = "Complex query - using most capable model"
    
    # Filter by preferred providers if specified
    if preferred_providers:
        for model_id, provider in MODEL_PRIORITY:
            if model_id in target_tier and provider in preferred_providers:
                return {
                    "model_id": model_id,
                    "provider": provider,
                    "reason": reason,
                    "auto_selected": True
                }
    
    # Return first available from target tier
    for model_id, provider in MODEL_PRIORITY:
        if model_id in target_tier:
            return {
                "model_id": model_id,
                "provider": provider,
                "reason": reason,
                "auto_selected": True
            }
    
    # Fallback to most reliable
    return {
        "model_id": "claude-sonnet-4-5",
        "provider": "anthropic",
        "reason": "Default selection",
        "auto_selected": True
    }


def estimate_query_complexity(error_code: str = None, symptom: str = None) -> str:
    """
    Estimate query complexity based on inputs.
    """
    # No info provided → assume medium
    if not error_code and not symptom:
        return "medium"
    
    # Error code only → usually straightforward lookup
    if error_code and not symptom:
        return "low"
    
    # Symptom length indicates complexity
    if symptom:
        symptom_length = len(symptom.strip())
        
        if symptom_length < 50:
            return "low"
        elif symptom_length < 200:
            return "medium"
        else:
            return "high"
    
    return "medium"
