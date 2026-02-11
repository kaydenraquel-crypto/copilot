import asyncio
import logging
from typing import List, Sequence

from openai import OpenAI

from app.config import settings

logger = logging.getLogger(__name__)

EMBEDDING_MODEL = "text-embedding-3-small"

_openai_client: OpenAI | None = None


def _get_client() -> OpenAI:
    global _openai_client

    if _openai_client is not None:
        return _openai_client

    if not settings.OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY is required for embedding generation")

    _openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)
    return _openai_client


async def _embed_batch_with_retry(
    texts: Sequence[str],
    max_retries: int = 3,
    initial_backoff_seconds: float = 1.0,
) -> List[List[float]]:
    client = _get_client()
    delay = initial_backoff_seconds

    for attempt in range(1, max_retries + 1):
        try:
            response = await asyncio.to_thread(
                client.embeddings.create,
                model=EMBEDDING_MODEL,
                input=list(texts),
            )
            return [item.embedding for item in response.data]
        except Exception as exc:
            if attempt == max_retries:
                raise RuntimeError(f"Embedding request failed after {max_retries} attempts: {exc}") from exc

            logger.warning(
                "Embedding batch attempt %s/%s failed, retrying in %.1fs: %s",
                attempt,
                max_retries,
                delay,
                exc,
            )
            await asyncio.sleep(delay)
            delay *= 2

    raise RuntimeError("Embedding request failed unexpectedly")


async def embed_texts(texts: Sequence[str], batch_size: int = 64) -> List[List[float]]:
    if not texts:
        return []

    embeddings: List[List[float]] = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        batch_embeddings = await _embed_batch_with_retry(batch)
        embeddings.extend(batch_embeddings)

    return embeddings


async def embed_query(text: str) -> List[float]:
    embeddings = await embed_texts([text], batch_size=1)
    return embeddings[0]
