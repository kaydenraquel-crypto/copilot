import fitz  # PyMuPDF
from pathlib import Path
from typing import Dict


def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract all text from a PDF file."""
    try:
        doc = fitz.open(pdf_path)
        text = ""
        
        for page_num in range(doc.page_count):
            page = doc[page_num]
            text += f"\n--- Page {page_num + 1} ---\n"
            text += page.get_text()
        
        doc.close()
        return text
    except Exception as e:
        raise Exception(f"Failed to extract text from PDF: {str(e)}")


def get_pdf_info(pdf_path: str) -> Dict:
    """Get PDF metadata and information."""
    try:
        doc = fitz.open(pdf_path)
        file_path = Path(pdf_path)
        
        info = {
            "page_count": doc.page_count,
            "file_size_mb": round(file_path.stat().st_size / (1024 * 1024), 2),
            "metadata": doc.metadata
        }
        
        doc.close()
        return info
    except Exception as e:
        raise Exception(f"Failed to get PDF info: {str(e)}")


def extract_text_from_pages(pdf_path: str, start_page: int, end_page: int) -> str:
    """Extract text from specific page range."""
    try:
        doc = fitz.open(pdf_path)
        text = ""
        
        # Clamp page range
        start = max(0, start_page - 1)  # Convert to 0-indexed
        end = min(doc.page_count, end_page)
        
        for page_num in range(start, end):
            page = doc[page_num]
            text += f"\n--- Page {page_num + 1} ---\n"
            text += page.get_text()
        
        doc.close()
        return text
    except Exception as e:
        raise Exception(f"Failed to extract text from pages: {str(e)}")
