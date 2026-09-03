import pytest
from backend.services.warning_engine import WarningEngine
from backend.database.models import WarningCounter, Event
from backend.database.database import Base, engine, SessionLocal
import time

@pytest.fixture(autouse=True)
def setup_database():
    # Setup fresh DB for tests
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        db.query(Event).delete()
        db.query(WarningCounter).delete()
        db.commit()
    finally:
        db.close()
    yield
    db = SessionLocal()
    try:
        db.query(Event).delete()
        db.query(WarningCounter).delete()
        db.commit()
    finally:
        db.close()

def test_warning_engine_temporal_confirmation():
    engine = WarningEngine()
    engine.cooldowns = {"FACE_BLURRY": 0}
    engine.temporal_thresholds = {"FACE_BLURRY": 1.0}
    
    detection = {"detected": True, "event_type": "FACE_BLURRY", "confidence": 0.9}
    
    # First detection (starts tracking)
    engine.process_detection(detection, session_id=1)
    
    db = SessionLocal()
    count = db.query(WarningCounter).filter_by(event_type="FACE_BLURRY").first()
    assert count is None # Should not be logged yet
    
    # Fast forward 1.1 seconds
    time.sleep(1.1)
    engine.process_detection(detection, session_id=1)
    
    count = db.query(WarningCounter).filter_by(event_type="FACE_BLURRY").first()
    assert count is not None
    assert count.count == 1
    db.close()

def test_event_deduplication_cooldown():
    engine = WarningEngine()
    engine.temporal_thresholds = {} # Disable temporal for this test
    engine.cooldowns = {"PHONE_DETECTED": 2}
    
    detection = {"detected": True, "event_type": "PHONE_DETECTED"}
    
    # First detection
    engine.process_detection(detection, session_id=1)
    
    db = SessionLocal()
    count = db.query(WarningCounter).filter_by(event_type="PHONE_DETECTED").first()
    assert count.count == 1
    
    # Immediate second detection (should be ignored due to cooldown)
    engine.process_detection(detection, session_id=1)
    db.commit() # Refresh
    count = db.query(WarningCounter).filter_by(event_type="PHONE_DETECTED").first()
    assert count.count == 1 # Still 1
    
    # Wait for cooldown
    time.sleep(2.1)
    engine.process_detection(detection, session_id=1)
    
    db.commit()
    count = db.query(WarningCounter).filter_by(event_type="PHONE_DETECTED").first()
    assert count.count == 2 # Now 2
    
    db.close()

def test_warning_limit_severity():
    engine = WarningEngine()
    engine.temporal_thresholds = {}
    engine.cooldowns = {"HEAD_TURNED": 0}
    engine.max_warnings = 2
    
    detection = {"detected": True, "event_type": "HEAD_TURNED"}
    
    db = SessionLocal()
    
    # Warning 1
    engine.process_detection(detection, session_id=1)
    event1 = db.query(Event).order_by(Event.id.desc()).first()
    assert event1.severity == "WARNING"
    
    # Warning 2 (Hits max_warnings limit)
    engine.process_detection(detection, session_id=1)
    event2 = db.query(Event).order_by(Event.id.desc()).first()
    assert event2.severity == "CRITICAL"
    
    db.close()
