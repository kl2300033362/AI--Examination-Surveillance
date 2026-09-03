from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database.database import get_db
from backend.database.models import Event, WarningCounter
from backend.services.monitoring_service import monitoring_service

router = APIRouter()

@router.get("")
@router.get("/")
@router.get("/status")
def get_system_status(db: Session = Depends(get_db)):
    total_warnings = db.query(WarningCounter).with_entities(WarningCounter.count).all()
    total_sum = sum([c[0] for c in total_warnings])
    from backend.services.warning_engine import warning_engine
    
    return {
        "system_status": "ONLINE",
        "monitoring_active": monitoring_service.is_monitoring,
        "current_session_id": monitoring_service.session_id,
        "total_warnings": total_sum,
        "max_warnings": max(10, getattr(warning_engine, "max_warnings", 10))
    }
