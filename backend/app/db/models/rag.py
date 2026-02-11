import uuid

from pgvector.sqlalchemy import Vector
from sqlalchemy import Column, ForeignKey, Integer, String, Text, TIMESTAMP, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import Base


class Manual(Base):
    __tablename__ = "manuals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    filename = Column(String(255), nullable=False)
    brand = Column(String(100), nullable=False, index=True)
    model = Column(String(100), nullable=False, index=True)
    equipment_type = Column(String(100), nullable=True)
    file_path = Column(Text, nullable=False)
    indexing_status = Column(String(20), nullable=False, default="pending", server_default=text("'pending'"))
    indexing_error = Column(Text, nullable=True)
    indexed_at = Column(TIMESTAMP(timezone=True), nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)

    chunks = relationship(
        "ManualChunk",
        back_populates="manual",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class ManualChunk(Base):
    __tablename__ = "manual_chunks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    manual_id = Column(UUID(as_uuid=True), ForeignKey("manuals.id", ondelete="CASCADE"), nullable=False, index=True)
    page_number = Column(Integer, nullable=True, index=True)
    section = Column(String(255), nullable=True)
    chunk_text = Column(Text, nullable=False)
    embedding = Column(Vector(1536), nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)

    manual = relationship("Manual", back_populates="chunks")
