from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime

class SettingBase(BaseModel):
    category: str
    key: str
    value: str
    description: Optional[str] = None

class SettingCreate(SettingBase):
    pass

class SettingResponse(SettingBase):
    id: int
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class EventBase(BaseModel):
    event_type: str
    severity: str
    confidence: Optional[float] = None
    description: Optional[str] = None
    action_taken: Optional[str] = None
    warning_number: Optional[int] = None
    metadata_json: Optional[Dict[str, Any]] = None

class EventCreate(EventBase):
    session_id: Optional[int] = None

class EventResponse(EventBase):
    id: int
    timestamp: datetime
    session_id: Optional[int] = None
    model_config = ConfigDict(from_attributes=True)

class WarningCounterResponse(BaseModel):
    id: int
    event_type: str
    count: int
    last_triggered: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class StatusResponse(BaseModel):
    system_status: str
    monitoring_active: bool
    current_session_id: Optional[int] = None
    total_warnings: int
    max_warnings: int
