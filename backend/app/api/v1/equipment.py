from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from app.db.session import get_db
from app.api.deps import get_current_user
from app.db.models.equipment import EquipmentProfile
from app.db.models.manual import EquipmentManual
from app.db.models.user import User
from app.schemas.equipment import (
    EquipmentProfileCreate, 
    EquipmentProfileUpdate, 
    EquipmentProfileResponse
)

router = APIRouter()


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
def create_equipment_profile(
    profile_data: EquipmentProfileCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new equipment profile."""
    
    # Check for existing profile with same serial number
    if profile_data.serial_number:
        existing = db.query(EquipmentProfile).filter(
            EquipmentProfile.serial_number == profile_data.serial_number
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Equipment with this serial number already exists"
            )
    
    # Find matching manual if available
    manual = db.query(EquipmentManual).filter(
        EquipmentManual.manufacturer.ilike(f"%{profile_data.manufacturer}%"),
        EquipmentManual.model.ilike(f"%{profile_data.model}%")
    ).first()
    
    profile = EquipmentProfile(
        manufacturer=profile_data.manufacturer,
        model=profile_data.model,
        serial_number=profile_data.serial_number,
        customer_name=profile_data.customer_name,
        customer_location=profile_data.customer_location,
        installation_date=profile_data.installation_date,
        equipment_notes=profile_data.equipment_notes,
        warranty_expiration=profile_data.warranty_expiration,
        manual_id=manual.id if manual else None,
        created_by=current_user.username
    )
    
    db.add(profile)
    db.commit()
    db.refresh(profile)
    
    return {
        "success": True,
        "data": EquipmentProfileResponse.model_validate(profile)
    }


@router.get("", response_model=dict)
def list_equipment_profiles(
    manufacturer: Optional[str] = None,
    customer_name: Optional[str] = None,
    active_only: bool = True,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all equipment profiles."""
    
    query = db.query(EquipmentProfile)
    
    if manufacturer:
        query = query.filter(EquipmentProfile.manufacturer.ilike(f"%{manufacturer}%"))
    if customer_name:
        query = query.filter(EquipmentProfile.customer_name.ilike(f"%{customer_name}%"))
    if active_only:
        query = query.filter(EquipmentProfile.active == True)
    
    total = query.count()
    profiles = query.order_by(EquipmentProfile.created_at.desc()).offset(offset).limit(limit).all()
    
    return {
        "success": True,
        "data": {
            "profiles": [EquipmentProfileResponse.model_validate(p) for p in profiles],
            "total": total,
            "limit": limit,
            "offset": offset
        }
    }


@router.get("/{profile_id}", response_model=dict)
def get_equipment_profile(
    profile_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific equipment profile."""
    
    profile = db.query(EquipmentProfile).filter(EquipmentProfile.id == profile_id).first()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Equipment profile not found"
        )
    
    return {
        "success": True,
        "data": EquipmentProfileResponse.model_validate(profile)
    }


@router.put("/{profile_id}", response_model=dict)
def update_equipment_profile(
    profile_id: int,
    update_data: EquipmentProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an equipment profile."""
    
    profile = db.query(EquipmentProfile).filter(EquipmentProfile.id == profile_id).first()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Equipment profile not found"
        )
    
    # Update fields
    update_dict = update_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(profile, key, value)
    
    db.commit()
    db.refresh(profile)
    
    return {
        "success": True,
        "data": EquipmentProfileResponse.model_validate(profile)
    }


@router.delete("/{profile_id}", response_model=dict)
def delete_equipment_profile(
    profile_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete an equipment profile."""
    
    profile = db.query(EquipmentProfile).filter(EquipmentProfile.id == profile_id).first()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Equipment profile not found"
        )
    
    db.delete(profile)
    db.commit()
    
    return {
        "success": True,
        "message": "Equipment profile deleted successfully"
    }
