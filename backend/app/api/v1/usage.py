from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.deps import get_current_user
from app.db.models.user import User
from app.core.usage import get_usage_summary, get_usage_by_model

router = APIRouter()


@router.get("/summary", response_model=dict)
async def usage_summary(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get usage summary for the current user.
    Shows total requests, tokens, cost, and cache hits.
    """
    summary = get_usage_summary(db, user_id=current_user.id, days=days)
    return {"success": True, "data": summary}


@router.get("/by-model", response_model=dict)
async def usage_by_model(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get usage breakdown by AI model.
    Shows requests, tokens, and cost per model.
    """
    breakdown = get_usage_by_model(db, user_id=current_user.id, days=days)
    return {"success": True, "data": breakdown}


@router.get("/all", response_model=dict)
async def all_usage_summary(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get combined usage summary and breakdown (for dashboard).
    """
    summary = get_usage_summary(db, user_id=current_user.id, days=days)
    by_model = get_usage_by_model(db, user_id=current_user.id, days=days)
    
    return {
        "success": True,
        "data": {
            "summary": summary,
            "by_model": by_model
        }
    }
