import logging
import re
from datetime import datetime, timezone
from pathlib import Path
from statistics import median
from typing import Dict, List, Sequence, Tuple
from uuid import UUID

import pdfplumber

from app.db.models.rag import Manual, ManualChunk
from app.db.session import SessionLocal
from app.services.embeddings import embed_texts

logger = logging.getLogger(__name__)


class ScannedPdfError(RuntimeError):
    """Raised when a manual appears to be an image-only scanned PDF."""


def _normalize_whitespace(text: str) -> str:
    text = text.replace("\x00", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _estimate_tokens(text: str) -> int:
    # Fast approximation: ~1.3 tokens per word for technical text.
    words = len(re.findall(r"\S+", text))
    return max(1, int(words * 1.3))


def _is_table_like_paragraph(paragraph: str) -> bool:
    lines = [line.strip() for line in paragraph.splitlines() if line.strip()]
    if len(lines) < 4:
        return False

    code_like = 0
    for line in lines:
        if re.match(r"^[A-Z0-9\-_/]{2,20}\s{1,}.+", line):
            code_like += 1
        elif re.match(r"^(E|F|AL|ERR)[0-9\-]+\s+.+", line, re.IGNORECASE):
            code_like += 1

    return (code_like / len(lines)) >= 0.4


def _split_into_units(text: str) -> List[str]:
    if not text:
        return []

    units: List[str] = []
    paragraphs = [p.strip() for p in re.split(r"\n{2,}", text) if p.strip()]

    for paragraph in paragraphs:
        if _is_table_like_paragraph(paragraph):
            units.append(paragraph)
            continue

        sentences = [
            sentence.strip()
            for sentence in re.split(r"(?<=[.!?])\s+(?=[A-Z0-9])", paragraph)
            if sentence.strip()
        ]
        if len(sentences) <= 1:
            units.append(paragraph)
        else:
            units.extend(sentences)

    return units


def _detect_section_header(page: pdfplumber.page.Page, page_text: str) -> str | None:
    try:
        words = page.extract_words(extra_attrs=["size"]) or []
    except Exception:
        words = []

    if words:
        sizes = [word["size"] for word in words if isinstance(word.get("size"), (int, float))]
        if sizes:
            threshold = median(sizes) + 1.2
            candidate_words = [word for word in words if isinstance(word.get("size"), (int, float)) and word["size"] >= threshold]

            line_map: Dict[float, List[str]] = {}
            for word in candidate_words:
                line_key = round(float(word.get("top", 0.0)), 0)
                line_map.setdefault(line_key, []).append(word["text"])

            for _, line_words in sorted(line_map.items(), key=lambda item: item[0]):
                line = " ".join(line_words).strip()
                normalized = re.sub(r"[^A-Za-z0-9 /:&\-]", "", line).strip()
                if not normalized:
                    continue
                if (normalized.isupper() and len(normalized) >= 4) or normalized.endswith(":"):
                    return normalized[:255]

    for line in page_text.splitlines()[:12]:
        candidate = line.strip()
        if len(candidate) < 4 or len(candidate) > 90:
            continue
        if candidate.isupper() or candidate.endswith(":"):
            return candidate[:255]

    return None


def extract_text_from_pdf(file_path: str) -> List[Dict]:
    pages: List[Dict] = []
    empty_or_near_empty_pages = 0

    with pdfplumber.open(file_path) as pdf:
        for index, page in enumerate(pdf.pages, start=1):
            raw_text = page.extract_text() or ""
            normalized_text = _normalize_whitespace(raw_text)
            if len(normalized_text) < 40:
                empty_or_near_empty_pages += 1

            section_header = _detect_section_header(page, normalized_text)
            pages.append(
                {
                    "page_number": index,
                    "section": section_header,
                    "text": normalized_text,
                }
            )

    if not pages:
        raise RuntimeError("No pages found in PDF")

    near_empty_ratio = empty_or_near_empty_pages / len(pages)
    total_text_chars = sum(len(page["text"]) for page in pages)

    if near_empty_ratio >= 0.6 or total_text_chars < 250:
        raise ScannedPdfError(
            "PDF appears to be scanned or image-based. OCR is required before indexing."
        )

    active_section = "General"
    for page in pages:
        if page["section"]:
            active_section = page["section"]
        else:
            page["section"] = active_section

    return pages


def _tail_overlap_items(items: Sequence[Tuple[str, int]], overlap_tokens: int) -> List[Tuple[str, int]]:
    overlap_items: List[Tuple[str, int]] = []
    running_tokens = 0

    for text, page_number in reversed(items):
        overlap_items.insert(0, (text, page_number))
        running_tokens += _estimate_tokens(text)
        if running_tokens >= overlap_tokens:
            break

    return overlap_items


def chunk_text(
    pages: Sequence[Dict],
    target_tokens: int = 800,
    overlap_tokens: int = 100,
) -> List[Dict]:
    units: List[Tuple[str, int, str]] = []
    for page in pages:
        section = (page.get("section") or "General").strip() or "General"
        page_number = int(page.get("page_number", 0))
        for unit in _split_into_units(page.get("text", "")):
            units.append((unit, page_number, section))

    chunks: List[Dict] = []
    current_items: List[Tuple[str, int]] = []
    current_section: str | None = None
    current_tokens = 0

    def flush_current_chunk() -> None:
        nonlocal current_items, current_tokens, current_section
        if not current_items:
            return

        chunk_text_value = _normalize_whitespace("\n\n".join(text for text, _ in current_items))
        if chunk_text_value:
            chunks.append(
                {
                    "page_number": min(page for _, page in current_items),
                    "section": current_section or "General",
                    "chunk_text": chunk_text_value,
                }
            )

        current_items = []
        current_tokens = 0

    for unit_text, page_number, section in units:
        unit_tokens = _estimate_tokens(unit_text)

        if current_section is None:
            current_section = section

        if section != current_section and current_items:
            flush_current_chunk()
            current_section = section

        if current_tokens + unit_tokens > target_tokens and current_items:
            previous_items = list(current_items)
            flush_current_chunk()
            overlap_items = _tail_overlap_items(previous_items, overlap_tokens)
            current_items = overlap_items
            current_tokens = sum(_estimate_tokens(text) for text, _ in current_items)

        current_items.append((unit_text, page_number))
        current_tokens += unit_tokens

    flush_current_chunk()
    return chunks


async def embed_chunks(chunks: Sequence[Dict]) -> List[Dict]:
    if not chunks:
        return []

    embeddings = await embed_texts([chunk["chunk_text"] for chunk in chunks])
    embedded_chunks: List[Dict] = []

    for chunk, embedding in zip(chunks, embeddings):
        embedded = dict(chunk)
        embedded["embedding"] = embedding
        embedded_chunks.append(embedded)

    return embedded_chunks


async def index_manual(manual_id: UUID, file_path: str) -> None:
    db = SessionLocal()
    manual = None
    try:
        manual = db.query(Manual).filter(Manual.id == manual_id).first()
        if manual is None:
            raise RuntimeError(f"Manual {manual_id} not found")

        pdf_path = Path(file_path)
        if not pdf_path.exists():
            raise FileNotFoundError(f"Manual file does not exist: {file_path}")

        pages = extract_text_from_pdf(file_path)
        chunks = chunk_text(pages)
        if not chunks:
            raise RuntimeError("No text chunks were generated from this PDF")

        embedded_chunks = await embed_chunks(chunks)

        db.query(ManualChunk).filter(ManualChunk.manual_id == manual_id).delete(synchronize_session=False)
        for chunk in embedded_chunks:
            db.add(
                ManualChunk(
                    manual_id=manual_id,
                    page_number=chunk["page_number"],
                    section=chunk["section"],
                    chunk_text=chunk["chunk_text"],
                    embedding=chunk["embedding"],
                )
            )

        manual.indexed_at = datetime.now(timezone.utc)
        manual.indexing_status = "complete"
        manual.indexing_error = None
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.exception("Manual indexing failed for %s: %s", manual_id, exc)

        if manual is None:
            manual = db.query(Manual).filter(Manual.id == manual_id).first()

        if manual is not None:
            manual.indexed_at = None
            manual.indexing_status = "failed"
            manual.indexing_error = str(exc)[:2000]
            db.commit()

        raise
    finally:
        db.close()


async def index_manual_background(manual_id: UUID, file_path: str) -> None:
    try:
        await index_manual(manual_id, file_path)
    except Exception:
        # Failure state is persisted in index_manual; just avoid bubbling in background tasks.
        return
