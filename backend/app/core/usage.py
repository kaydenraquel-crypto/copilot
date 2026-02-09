from sqlalchemy.orm import Session
from sqlalchemy import func, case
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional
from app.db.models.usage import APIUsageLog


def log_api_usage(
    db: Session,
    endpoint: str,
    user_id: int,
    ai_provider: str,
    model_id: str,
    prompt_tokens: int = 0,
    completion_tokens: int = 0,
    cost_usd: float = 0.0,
    response_time_ms: int = 0,
    cache_hit: bool = False,
    status_code: int = 200,
    error_message: Optional[str] = None
) -> APIUsageLog:
    """Log API usage for cost tracking and analytics."""
    
    log_entry = APIUsageLog(
        endpoint=endpoint,
        user_id=user_id,
        ai_provider=ai_provider,
        model_used=model_id,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        total_tokens=prompt_tokens + completion_tokens,
        cost_usd=Decimal(str(cost_usd)),
        response_time_ms=response_time_ms,
        cache_hit=cache_hit,
        status_code=status_code,
        error_message=error_message
    )
    
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    
    return log_entry


def get_usage_summary(db: Session, user_id: Optional[int] = None, days: int = 30) -> dict:
    """Get usage summary for dashboard."""
    cutoff = datetime.utcnow() - timedelta(days=days)
    
    query = db.query(
        func.count(APIUsageLog.id).label('total_requests'),
        func.sum(APIUsageLog.total_tokens).label('total_tokens'),
        func.sum(APIUsageLog.cost_usd).label('total_cost'),
        func.sum(case((APIUsageLog.cache_hit == True, 1), else_=0)).label('cache_hits')
    ).filter(APIUsageLog.created_at >= cutoff)
    
    if user_id:
        query = query.filter(APIUsageLog.user_id == user_id)
    
    result = query.first()
    
    return {
        "total_requests": result.total_requests or 0,
        "total_tokens": result.total_tokens or 0,
        "total_cost_usd": float(result.total_cost or 0),
        "cache_hits": result.cache_hits or 0,
        "period_days": days
    }


def get_usage_by_model(db: Session, user_id: Optional[int] = None, days: int = 30) -> list:
    """Get usage breakdown by model."""
    cutoff = datetime.utcnow() - timedelta(days=days)
    
    query = db.query(
        APIUsageLog.model_used,
        APIUsageLog.ai_provider,
        func.count(APIUsageLog.id).label('requests'),
        func.sum(APIUsageLog.total_tokens).label('tokens'),
        func.sum(APIUsageLog.cost_usd).label('cost')
    ).filter(
        APIUsageLog.created_at >= cutoff,
        APIUsageLog.cache_hit == False  # Only count non-cached
    ).group_by(
        APIUsageLog.model_used,
        APIUsageLog.ai_provider
    )
    
    if user_id:
        query = query.filter(APIUsageLog.user_id == user_id)
    
    results = query.all()
    
    return [
        {
            "model_id": r.model_used,
            "provider": r.ai_provider,
            "requests": r.requests,
            "tokens": r.tokens or 0,
            "cost_usd": float(r.cost or 0)
        }
        for r in results
    ]
