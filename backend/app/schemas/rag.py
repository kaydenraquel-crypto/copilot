from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class ManualRead(BaseModel):
    id: UUID
    filename: str
    brand: str
    model: str
    equipment_type: Optional[str] = None
    file_path: str
    indexing_status: str
    indexing_error: Optional[str] = None
    indexed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ManualChunkRead(BaseModel):
    id: UUID
    manual_id: UUID
    page_number: Optional[int] = None
    section: Optional[str] = None
    chunk_text: str
    created_at: datetime

    class Config:
        from_attributes = True


class ManualListResponse(BaseModel):
    manuals: List[ManualRead]
    total: int


class ManualUploadResponse(BaseModel):
    manual: ManualRead
    message: str


class RAGQueryRequest(BaseModel):
    question: str = Field(..., min_length=3)
    equipment_model: str = Field(..., min_length=1)
    brand: str = Field(..., min_length=1)
    top_k: int = Field(default=5, ge=1, le=10)


class RAGSource(BaseModel):
    page: Optional[int] = None
    section: Optional[str] = None
    excerpt: str


class ManualUsed(BaseModel):
    id: UUID
    filename: str
    brand: str
    model: str


class RAGQueryResponse(BaseModel):
    answer: str
    sources: List[RAGSource]
    manual_used: Optional[ManualUsed] = None
    manual_available: bool
