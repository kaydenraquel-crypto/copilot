from pydantic import BaseModel, Field
from typing import Optional, Dict, List
from datetime import datetime


class ManualUpload(BaseModel):
    """Schema for manual upload metadata."""
    manufacturer: str = Field(..., max_length=100)
    model: str = Field(..., max_length=100)
    manual_type: str = Field(..., pattern="^(service|parts|installation|user|wiring)$")
    pdf_version: Optional[str] = None
    serial_range: Optional[str] = "All"


class ManualResponse(BaseModel):
    """Schema for manual list response."""
    id: int
    manufacturer: str
    model: str
    manual_type: str
    file_size_mb: Optional[float]
    page_count: Optional[int]
    ocr_quality: str
    times_accessed: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class ManualDetail(ManualResponse):
    """Schema for detailed manual info."""
    file_path: str
    extracted_sections: Optional[Dict]
    source: Optional[str]
    source_url: Optional[str]
    pdf_version: Optional[str]
    last_accessed: Optional[datetime]


class ManualSearchRequest(BaseModel):
    """Schema for manual search request."""
    manufacturer: str
    model: str
    manual_type: str = "service"
