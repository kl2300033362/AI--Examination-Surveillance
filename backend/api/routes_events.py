from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database.database import get_db
from backend.database.models import Event
from backend.database.schemas import EventResponse
from typing import List

router = APIRouter()

@router.get("", response_model=List[EventResponse])
@router.get("/", response_model=List[EventResponse])
def get_events(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    events = db.query(Event).order_by(Event.timestamp.desc()).offset(skip).limit(limit).all()
    return events

@router.delete("")
@router.delete("/")
def clear_events(db: Session = Depends(get_db)):
    from backend.database.models import WarningCounter
    db.query(Event).delete()
    db.query(WarningCounter).delete()
    db.commit()
    return {"status": "success", "message": "All events and counters cleared"}
