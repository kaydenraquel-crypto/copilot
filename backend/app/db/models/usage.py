from sqlalchemy import Column, Integer, String, Text, Boolean, DECIMAL, TIMESTAMP, ForeignKey, func
from app.db.base import Base


class APIUsageLog(Base):
    """API usage tracking for cost management."""
    __tablename__ = "api_usage_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Request details
    endpoint = Column(String(100), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    
    # AI usage
    ai_provider = Column(String(50))  # claude, openai, etc.
    model_used = Column(String(50))
    prompt_tokens = Column(Integer)
    completion_tokens = Column(Integer)
    total_tokens = Column(Integer)
    
    # Cost
    cost_usd = Column(DECIMAL(10, 6))
    
    # Performance
    response_time_ms = Column(Integer)
    cache_hit = Column(Boolean, default=False)
    
    # Status
    status_code = Column(Integer)
    error_message = Column(Text)
    
    # Timestamp
    created_at = Column(TIMESTAMP, server_default=func.now(), index=True)
