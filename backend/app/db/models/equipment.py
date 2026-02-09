from sqlalchemy import Column, Integer, String, Text, Boolean, Date, TIMESTAMP, ForeignKey, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.db.base import Base


class EquipmentProfile(Base):
    """Equipment profile for customer equipment instances."""
    __tablename__ = "equipment_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Equipment identification
    manufacturer = Column(String(100), nullable=False, index=True)
    model = Column(String(100), nullable=False, index=True)
    serial_number = Column(String(100), index=True)
    
    # Location/customer info
    customer_name = Column(String(200))
    customer_location = Column(Text)
    installation_date = Column(Date)
    
    # Manual link
    manual_id = Column(Integer, ForeignKey("equipment_manuals.id", ondelete="SET NULL"))
    
    # Equipment details
    equipment_notes = Column(Text)
    common_issues = Column(JSONB)  # Track recurring problems
    
    # Status
    active = Column(Boolean, default=True)
    last_service_date = Column(Date)
    next_service_due = Column(Date)
    warranty_expiration = Column(Date)
    
    # Metadata
    created_by = Column(String(100))
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
