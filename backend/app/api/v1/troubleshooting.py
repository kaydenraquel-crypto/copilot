from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import time
from app.db.session import get_db
from app.api.deps import get_current_user
from app.db.models.manual import EquipmentManual
from app.db.models.user import User
from app.schemas.troubleshooting import TroubleshootRequest, TroubleshootResponse
from app.core.cache import check_cache, save_to_cache
from app.core.claude import troubleshoot_with_ai, calculate_cost, MODEL_PROVIDERS
from app.core.usage import log_api_usage
from app.core.model_selector import suggest_model, estimate_query_complexity

router = APIRouter()


@router.post("", response_model=dict)
async def troubleshoot(
    request: TroubleshootRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Troubleshoot equipment issue using AI.
    
    This endpoint:
    1. Checks cache for existing response
    2. Looks for relevant manual in library
    3. Calls Claude API for troubleshooting
    4. Caches the response for future use
    """
    start_time = time.time()
    
    manufacturer = request.equipment.manufacturer
    model = request.equipment.model
    error_code = request.error_code
    symptom = request.symptom
    requested_model = request.model_id or "auto"
    
    # Resolve "auto" to actual model using smart selection
    if requested_model == "auto":
        # Check if manual exists for smart selection
        manual_exists = db.query(EquipmentManual).filter(
            EquipmentManual.manufacturer.ilike(f"%{manufacturer}%"),
            EquipmentManual.model.ilike(f"%{model}%")
        ).first() is not None
        
        complexity = estimate_query_complexity(error_code, symptom)
        suggestion = suggest_model(has_manual=manual_exists, query_complexity=complexity)
        model_id = suggestion["model_id"]
        auto_selected = True
    else:
        model_id = requested_model
        auto_selected = False
    
    # Check cache first (per model)
    cached = check_cache(db, manufacturer, model, error_code, symptom, model_id)
    if cached.get("found"):
        response_time_ms = int((time.time() - start_time) * 1000)
        
        # Log cache hit (no cost)
        provider, _ = MODEL_PROVIDERS.get(model_id, ("anthropic", ""))
        log_api_usage(
            db=db,
            endpoint="/troubleshoot",
            user_id=current_user.id,
            ai_provider=provider,
            model_id=model_id,
            response_time_ms=response_time_ms,
            cache_hit=True
        )
        
        return {
            "success": True,
            "data": {
                "cache_hit": True,
                "response_time_ms": response_time_ms,
                "troubleshooting": cached["response"],
                "cached_at": str(cached["cached_at"]),
                "times_served": cached["times_served"],
                "model_id": model_id,
                "auto_selected": auto_selected
            }
        }
    
    # Look for manual in library
    manual = db.query(EquipmentManual).filter(
        EquipmentManual.manufacturer.ilike(f"%{manufacturer}%"),
        EquipmentManual.model.ilike(f"%{model}%")
    ).first()
    
    manual_text = manual.extracted_text if manual else None
    manual_id = manual.id if manual else None
    
    # Update manual access stats
    if manual:
        manual.times_accessed += 1
        db.commit()
    
    # Call AI API (Claude, Gemini, etc.)
    try:
        response = await troubleshoot_with_ai(
            manual_text=manual_text,
            manufacturer=manufacturer,
            model=model,
            error_code=error_code,
            symptom=symptom,
            model_id=model_id
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate troubleshooting response: {str(e)}"
        )
    
    response_time_ms = int((time.time() - start_time) * 1000)
    
    # Estimate tokens and cost (based on response size)
    # Rough estimate: 1 token ≈ 4 chars
    prompt_tokens = 3000  # Approximate for manual + prompt
    completion_tokens = len(str(response)) // 4
    cost = calculate_cost(model_id, prompt_tokens, completion_tokens)
    
    provider, _ = MODEL_PROVIDERS.get(model_id, ("anthropic", ""))
    
    # Log usage (with cost)
    log_api_usage(
        db=db,
        endpoint="/troubleshoot",
        user_id=current_user.id,
        ai_provider=provider,
        model_id=model_id,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        cost_usd=cost,
        response_time_ms=response_time_ms,
        cache_hit=False
    )
    
    # Save to cache (per model)
    save_to_cache(
        db=db,
        manufacturer=manufacturer,
        model=model,
        error_code=error_code,
        symptom=symptom,
        response=response,
        manual_ids=[manual_id] if manual_id else [],
        response_time_ms=response_time_ms,
        model_id=model_id,
        cost_usd=cost
    )
    
    return {
        "success": True,
        "data": {
            "cache_hit": False,
            "response_time_ms": response_time_ms,
            "troubleshooting": response,
            "manual_available": manual is not None,
            "manual_id": manual_id,
            "model_id": model_id,
            "auto_selected": auto_selected,
            "cost_usd": cost
        }
    }


@router.post("/feedback", response_model=dict)
async def submit_feedback(
    cache_id: int,
    helpful: bool,
    notes: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Submit feedback on a troubleshooting response."""
    from app.db.models.cache import TroubleshootingCache
    
    cached = db.query(TroubleshootingCache).filter(
        TroubleshootingCache.id == cache_id
    ).first()
    
    if not cached:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cache entry not found"
        )
    
    if helpful:
        cached.upvotes += 1
    else:
        cached.downvotes += 1
    
    if notes:
        cached.feedback_notes = notes
    
    db.commit()
    
    return {
        "success": True,
        "message": "Feedback submitted successfully"
    }
