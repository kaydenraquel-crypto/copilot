from pydantic import BaseModel, Field
from typing import List, Optional


class EquipmentInfo(BaseModel):
    """Equipment identification."""
    manufacturer: str = Field(..., max_length=100)
    model: str = Field(..., max_length=100)


class TroubleshootRequest(BaseModel):
    """Schema for troubleshooting request."""
    equipment: EquipmentInfo
    error_code: Optional[str] = Field(None, max_length=50)
    symptom: Optional[str] = None
    additional_context: Optional[str] = None
    model_id: Optional[str] = Field("auto", description="AI model to use (auto for smart selection)")


class TroubleshootingStep(BaseModel):
    """Individual troubleshooting step."""
    step: int
    title: str
    instruction: str
    expected_result: str
    safety_warning: Optional[str] = None


class PartToCheck(BaseModel):
    """Part to check during troubleshooting."""
    name: str
    part_number: Optional[str] = None
    description: str
    location: Optional[str] = None
    common_failure_modes: Optional[List[str]] = None


class Citation(BaseModel):
    """Source citation for troubleshooting info."""
    source: str
    manual_id: Optional[int] = None
    page: Optional[int] = None
    section: Optional[str] = None
    url: Optional[str] = None


class TroubleshootingData(BaseModel):
    """Full troubleshooting response data."""
    error_definition: str
    severity: str
    troubleshooting_steps: List[TroubleshootingStep]
    parts_to_check: List[PartToCheck]
    common_causes: List[str]
    estimated_repair_time_minutes: Optional[int] = None
    difficulty: str
    citations: List[Citation]


class TroubleshootResponse(BaseModel):
    """Schema for troubleshooting API response."""
    cache_hit: bool
    response_time_ms: int
    troubleshooting: dict
    manual_available: bool
    manual_id: Optional[int] = None
