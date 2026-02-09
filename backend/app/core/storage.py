from pathlib import Path
import shutil
from typing import BinaryIO
from app.config import settings


class LocalStorage:
    """Local filesystem storage for PDF files."""
    
    def __init__(self):
        self.base_path = Path(settings.STORAGE_PATH) / "manuals"
        self.base_path.mkdir(parents=True, exist_ok=True)
    
    def save_file(self, file: BinaryIO, filename: str) -> str:
        """Save uploaded file and return path."""
        # Sanitize filename
        safe_filename = "".join(c for c in filename if c.isalnum() or c in ('_', '-', '.'))
        file_path = self.base_path / safe_filename
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file, buffer)
        
        return str(file_path)
    
    def get_file_path(self, filename: str) -> str:
        """Get full path to file."""
        return str(self.base_path / filename)
    
    def file_exists(self, filename: str) -> bool:
        """Check if file exists."""
        return (self.base_path / filename).exists()
    
    def delete_file(self, filename: str) -> bool:
        """Delete a file."""
        file_path = self.base_path / filename
        if file_path.exists():
            file_path.unlink()
            return True
        return False
    
    def list_files(self) -> list:
        """List all files in storage."""
        return [f.name for f in self.base_path.iterdir() if f.is_file()]


# Singleton instance
storage = LocalStorage()
