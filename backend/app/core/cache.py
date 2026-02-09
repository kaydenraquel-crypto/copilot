from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Dict, Optional, List
from app.db.models.cache import TroubleshootingCache
from app.utils.hash import create_query_hash


def check_cache(
    db: Session,
    manufacturer: str,
    model: str,
    error_code: Optional[str],
    symptom: Optional[str],
    model_id: str = "claude-sonnet-4-5"
) -> Dict:
    """Check if troubleshooting response is cached for this model."""
    
    query_hash = create_query_hash(manufacturer, model, error_code or "", symptom or "", model_id)
    
    cached = db.query(TroubleshootingCache).filter(
        TroubleshootingCache.query_hash == query_hash
        # No expiry check - cache is permanent!
    ).first()
    
    if cached:
        # Update usage stats
        cached.times_served += 1
        cached.last_served = datetime.utcnow()
        db.commit()
        
        return {
            "found": True,
            "response": cached.response_data,
            "cached_at": cached.created_at,
            "times_served": cached.times_served
        }
    
    return {"found": False}


def save_to_cache(
    db: Session,
    manufacturer: str,
    model: str,
    error_code: Optional[str],
    symptom: Optional[str],
    response: Dict,
    manual_ids: List[int],
    response_time_ms: int,
    cost_usd: float = 0.0,
    model_id: str = "claude-sonnet-4-5"
) -> TroubleshootingCache:
    """Save troubleshooting response to cache (per model)."""
    
    query_hash = create_query_hash(manufacturer, model, error_code or "", symptom or "", model_id)
    
    # Check if already cached for this model
    existing = db.query(TroubleshootingCache).filter(
        TroubleshootingCache.query_hash == query_hash
    ).first()
    
    if existing:
        # Update existing cache entry
        existing.response_data = response
        existing.source_manual_ids = manual_ids
        existing.response_time_ms = response_time_ms
        existing.cost_usd = cost_usd
        existing.last_served = datetime.utcnow()
        db.commit()
        return existing
    else:
        # Create new cache entry
        cache_entry = TroubleshootingCache(
            equipment_manufacturer=manufacturer,
            equipment_model=model,
            error_code=error_code,
            symptom=symptom,
            query_hash=query_hash,
            response_data=response,
            source_manual_ids=manual_ids,
            response_time_ms=response_time_ms,
            claude_model=model_id,  # Store which model generated this
            cost_usd=cost_usd,
            expires_at=datetime.utcnow() + timedelta(days=36500)  # ~100 years = permanent
        )
        db.add(cache_entry)
        db.commit()
        db.refresh(cache_entry)
        return cache_entry
