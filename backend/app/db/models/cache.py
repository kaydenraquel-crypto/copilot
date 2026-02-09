from sqlalchemy import Column, Integer, String, Text, DECIMAL, TIMESTAMP, func
from sqlalchemy.dialects.postgresql import JSONB, ARRAY
from app.db.base import Base


class TroubleshootingCache(Base):
    """Cache for AI-generated troubleshooting responses."""
    __tablename__ = "troubleshooting_cache"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Query parameters
    equipment_manufacturer = Column(String(100), nullable=False)
    equipment_model = Column(String(100), nullable=False, index=True)
    error_code = Column(String(50), index=True)
    symptom = Column(Text)
    query_hash = Column(String(64), unique=True, nullable=False, index=True)
    
    # Response data
    response_data = Column(JSONB, nullable=False)
    source_manual_ids = Column(ARRAY(Integer))
    confidence_score = Column(DECIMAL(3, 2))
    
    # Citations
    citations = Column(JSONB)
    
    # Quality metrics
    response_time_ms = Column(Integer)
    claude_model = Column(String(50))
    prompt_tokens = Column(Integer)
    completion_tokens = Column(Integer)
    cost_usd = Column(DECIMAL(10, 6))
    
    # User feedback
    times_served = Column(Integer, default=1)
    upvotes = Column(Integer, default=0)
    downvotes = Column(Integer, default=0)
    feedback_notes = Column(Text)
    
    # Cache management
    created_at = Column(TIMESTAMP, server_default=func.now())
    expires_at = Column(TIMESTAMP)
    last_served = Column(TIMESTAMP, server_default=func.now())
