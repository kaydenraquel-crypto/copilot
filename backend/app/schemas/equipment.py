from pydantic import BaseModel, Field
from typing import Optional, Dict, List
from datetime import date, datetime


class EquipmentProfileCreate(BaseModel):
    """Schema for creating equipment profile."""
    manufacturer: str = Field(..., max_length=100)
    model: str = Field(..., max_length=100)
    serial_number: Optional[str] = Field(None, max_length=100)
    customer_name: Optional[str] = Field(None, max_length=200)
    customer_location: Optional[str] = None
    installation_date: Optional[date] = None
    equipment_notes: Optional[str] = None
    warranty_expiration: Optional[date] = None


class EquipmentProfileUpdate(BaseModel):
    """Schema for updating equipment profile."""
    customer_name: Optional[str] = Field(None, max_length=200)
    customer_location: Optional[str] = None
    equipment_notes: Optional[str] = None
    next_service_due: Optional[date] = None
    warranty_expiration: Optional[date] = None
    active: Optional[bool] = None


class EquipmentProfileResponse(BaseModel):
    """Schema for equipment profile response."""
    id: int
    manufacturer: str
    model: str
    serial_number: Optional[str]
    customer_name: Optional[str]
    customer_location: Optional[str]
    installation_date: Optional[date]
    manual_id: Optional[int]
    active: bool
    last_service_date: Optional[date]
    next_service_due: Optional[date]
    warranty_expiration: Optional[date]
    created_at: datetime
    
    class Config:
        from_attributes = True
