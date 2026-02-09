from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.session import get_db
from app.api.deps import get_current_user
from app.db.models.manual import EquipmentManual
from app.db.models.equipment import EquipmentProfile
from app.db.models.cache import TroubleshootingCache
from app.db.models.user import User

router = APIRouter()


@router.get("/health")
def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "version": "0.1.0",
        "service": "CCR Tech Copilot API"
    }


@router.get("/stats", response_model=dict)
def get_system_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get system statistics."""
    
    manual_count = db.query(func.count(EquipmentManual.id)).scalar()
    equipment_count = db.query(func.count(EquipmentProfile.id)).scalar()
    cache_count = db.query(func.count(TroubleshootingCache.id)).scalar()
    
    # Calculate cache stats
    total_cache_hits = db.query(func.sum(TroubleshootingCache.times_served)).scalar() or 0
    
    # Get top manufacturers
    top_manufacturers = db.query(
        EquipmentManual.manufacturer,
        func.count(EquipmentManual.id).label('count')
    ).group_by(EquipmentManual.manufacturer).order_by(
        func.count(EquipmentManual.id).desc()
    ).limit(5).all()
    
    return {
        "success": True,
        "data": {
            "manuals": {
                "total": manual_count
            },
            "equipment_profiles": {
                "total": equipment_count
            },
            "cache": {
                "entries": cache_count,
                "total_hits": total_cache_hits
            },
            "top_manufacturers": [
                {"manufacturer": m[0], "count": m[1]} 
                for m in top_manufacturers
            ]
        }
    }


@router.get("/manufacturers", response_model=dict)
def get_manufacturers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get list of all manufacturers with manuals."""
    
    manufacturers = db.query(
        EquipmentManual.manufacturer
    ).distinct().order_by(EquipmentManual.manufacturer).all()
    
    return {
        "success": True,
        "data": {
            "manufacturers": [m[0] for m in manufacturers]
        }
    }
