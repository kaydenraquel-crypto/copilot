import httpx
from pathlib import Path
from typing import Optional, Tuple
from app.config import settings


async def download_pdf(url: str, filename: str) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Download a PDF from a URL and save it to storage.
    
    Returns:
        Tuple of (success, file_path, error_message)
    """
    storage_path = Path(settings.STORAGE_PATH) / "manuals"
    storage_path.mkdir(parents=True, exist_ok=True)
    
    # Sanitize filename
    safe_filename = "".join(c for c in filename if c.isalnum() or c in ('_', '-', '.'))
    if not safe_filename.endswith('.pdf'):
        safe_filename += '.pdf'
    
    file_path = storage_path / safe_filename
    
    try:
        async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
            # Set headers to look like a browser
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/pdf,*/*',
            }
            
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            
            # Check if it's actually a PDF
            content_type = response.headers.get('content-type', '')
            if 'pdf' not in content_type.lower() and not url.lower().endswith('.pdf'):
                # Try to get it anyway, might still be a PDF
                pass
            
            # Save the file
            with open(file_path, 'wb') as f:
                f.write(response.content)
            
            # Verify it's a valid PDF (check magic bytes)
            with open(file_path, 'rb') as f:
                header = f.read(5)
                if header != b'%PDF-':
                    file_path.unlink()  # Delete invalid file
                    return False, None, "Downloaded file is not a valid PDF"
            
            return True, str(file_path), None
            
    except httpx.HTTPStatusError as e:
        return False, None, f"HTTP error {e.response.status_code}: {str(e)}"
    except httpx.RequestError as e:
        return False, None, f"Request failed: {str(e)}"
    except Exception as e:
        return False, None, f"Download failed: {str(e)}"
