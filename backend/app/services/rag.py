import asyncio
from typing import Dict, List, Optional

import anthropic
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import settings

RAG_MODEL = "claude-sonnet-4-5-20250929"

RAG_PROMPT_TEMPLATE = """You are a field service assistant for commercial kitchen equipment repair.
Answer ONLY based on the manual excerpts provided below.
If the answer is not in the excerpts, say so clearly - do not guess.
Be concise and practical - the technician is standing in front of the equipment.
Always cite which page or section your answer comes from.

Manual excerpts:
{context}

Question: {question}
"""

FALLBACK_PROMPT_TEMPLATE = """You are a field service assistant for commercial kitchen equipment repair.
No indexed manual excerpts are available for this equipment in the system.
Give a concise best-effort answer and clearly say that no manual is currently indexed.

Equipment: {brand} {model}
Question: {question}
"""

_anthropic_client: anthropic.Anthropic | None = None


def _get_anthropic_client() -> anthropic.Anthropic:
    global _anthropic_client

    if _anthropic_client is not None:
        return _anthropic_client

    _anthropic_client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    return _anthropic_client


def _embedding_to_vector_literal(embedding: List[float]) -> str:
    return "[" + ",".join(f"{value:.8f}" for value in embedding) + "]"


def similarity_search(
    db: Session,
    question_embedding: List[float],
    equipment_model: str,
    brand: Optional[str] = None,
    top_k: int = 5,
) -> List[Dict]:
    embedding_literal = _embedding_to_vector_literal(question_embedding)

    query = text(
        """
        SELECT
            mc.id,
            mc.manual_id,
            mc.page_number,
            mc.section,
            mc.chunk_text,
            (mc.embedding <=> CAST(:embedding AS vector)) AS distance,
            m.filename,
            m.brand,
            m.model
        FROM manual_chunks mc
        JOIN manuals m ON m.id = mc.manual_id
        WHERE lower(m.model) = lower(:equipment_model)
          AND (:brand IS NULL OR lower(m.brand) = lower(:brand))
          AND m.indexed_at IS NOT NULL
          AND m.indexing_status = 'complete'
        ORDER BY mc.embedding <=> CAST(:embedding AS vector)
        LIMIT :top_k
        """
    )

    rows = (
        db.execute(
            query,
            {
                "embedding": embedding_literal,
                "equipment_model": equipment_model.strip(),
                "brand": brand.strip() if brand else None,
                "top_k": top_k,
            },
        )
        .mappings()
        .all()
    )

    return [dict(row) for row in rows]


def get_indexed_manual(
    db: Session,
    equipment_model: str,
    brand: Optional[str] = None,
) -> Optional[Dict]:
    query = text(
        """
        SELECT id, filename, brand, model
        FROM manuals
        WHERE lower(model) = lower(:equipment_model)
          AND (:brand IS NULL OR lower(brand) = lower(:brand))
          AND indexed_at IS NOT NULL
          AND indexing_status = 'complete'
        ORDER BY indexed_at DESC, created_at DESC
        LIMIT 1
        """
    )

    row = db.execute(
        query,
        {
            "equipment_model": equipment_model.strip(),
            "brand": brand.strip() if brand else None,
        },
    ).mappings().first()

    if row is None:
        return None
    return dict(row)


def _build_context(chunks: List[Dict]) -> str:
    context_blocks = []
    for index, chunk in enumerate(chunks, start=1):
        page_number = chunk.get("page_number")
        section = chunk.get("section") or "Unknown"
        excerpt = (chunk.get("chunk_text") or "").strip()
        context_blocks.append(
            f"[Excerpt {index}] Page {page_number}, Section: {section}\n{excerpt}"
        )
    return "\n\n".join(context_blocks)


async def build_rag_response(question: str, chunks: List[Dict]) -> str:
    client = _get_anthropic_client()
    context = _build_context(chunks)
    prompt = RAG_PROMPT_TEMPLATE.format(context=context, question=question.strip())

    response = await asyncio.to_thread(
        client.messages.create,
        model=RAG_MODEL,
        max_tokens=900,
        messages=[{"role": "user", "content": prompt}],
    )

    answer_parts = []
    for block in response.content:
        if getattr(block, "type", "") == "text":
            answer_parts.append(block.text)

    return "\n".join(answer_parts).strip()


async def build_fallback_response(question: str, brand: str, model: str) -> str:
    client = _get_anthropic_client()
    prompt = FALLBACK_PROMPT_TEMPLATE.format(
        question=question.strip(),
        brand=brand.strip(),
        model=model.strip(),
    )

    response = await asyncio.to_thread(
        client.messages.create,
        model=RAG_MODEL,
        max_tokens=500,
        messages=[{"role": "user", "content": prompt}],
    )

    answer_parts = []
    for block in response.content:
        if getattr(block, "type", "") == "text":
            answer_parts.append(block.text)

    return "\n".join(answer_parts).strip()
