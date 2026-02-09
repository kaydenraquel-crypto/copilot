from sqlalchemy import Column, Integer, String, Text, Boolean, Date, TIMESTAMP, ForeignKey, func
from sqlalchemy.dialects.postgresql import JSONB
from app.db.base import Base


class ServiceHistory(Base):
    """Service history tracking for equipment."""
    __tablename__ = "service_history"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Links
    profile_id = Column(Integer, ForeignKey("equipment_profiles.id", ondelete="CASCADE"))
    troubleshooting_cache_id = Column(Integer, ForeignKey("troubleshooting_cache.id", ondelete="SET NULL"))
    
    # Service details
    service_date = Column(Date, nullable=False, index=True)
    service_type = Column(String(50))  # repair, maintenance, diagnostic, installation
    
    # Problem & resolution
    reported_issue = Column(Text, nullable=False)
    error_codes = Column(String(200))
    diagnosis = Column(Text)
    resolution = Column(Text)
    parts_replaced = Column(JSONB)  # Array of {part_number, description, quantity, cost}
    
    # Time tracking
    time_on_site_minutes = Column(Integer)
    troubleshooting_time_minutes = Column(Integer)
    repair_time_minutes = Column(Integer)
    
    # Outcome
    issue_resolved = Column(Boolean)
    followup_required = Column(Boolean, default=False)
    followup_notes = Column(Text)
    
    # Technician
    technician_name = Column(String(100))
    
    # Timestamps
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
