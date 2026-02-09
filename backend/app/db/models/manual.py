from sqlalchemy import Column, Integer, String, Text, DECIMAL, Boolean, TIMESTAMP, func
from sqlalchemy.dialects.postgresql import JSONB
from app.db.base import Base


class EquipmentManual(Base):
    """Equipment manual storage with extracted content."""
    __tablename__ = "equipment_manuals"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Equipment identification
    manufacturer = Column(String(100), nullable=False, index=True)
    model = Column(String(100), nullable=False, index=True)
    serial_range = Column(String(100))
    manual_type = Column(String(50), nullable=False)  # service, parts, installation, user, wiring
    
    # File storage
    file_path = Column(Text, nullable=False)
    file_size_mb = Column(DECIMAL(10, 2))
    file_hash = Column(String(64))
    page_count = Column(Integer)
    
    # Extracted content
    extracted_text = Column(Text)
    extracted_sections = Column(JSONB)
    
    # Metadata
    source = Column(String(50))  # partstown, user_upload, manufacturer, web_search
    source_url = Column(Text)
    pdf_version = Column(String(50))
    
    # Processing status
    ocr_quality = Column(String(20), default="pending")
    processing_status = Column(String(20), default="pending")
    needs_review = Column(Boolean, default=False)
    review_notes = Column(Text)
    
    # Usage tracking
    times_accessed = Column(Integer, default=0)
    last_accessed = Column(TIMESTAMP)
    
    # Timestamps
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
