import pytest
import numpy as np
from backend.services.warning_engine import WarningEngine
from backend.ai.object_detector import ObjectDetector
from backend.ai.head_pose_detector import HeadPoseDetector
from backend.ai.blur_detector import BlurDetector
from backend.ai.face_detector import FaceDetector
from backend.ai.drowsiness_detector import DrowsinessDetector
from backend.database.models import WarningCounter, Event
from backend.database.database import Base, engine, SessionLocal

@pytest.fixture(autouse=True)
def setup_database():
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

def test_exam_violation_types_handling():
    engine = WarningEngine()
    engine.temporal_thresholds = {}
    engine.cooldowns = {}
    engine.max_warnings = 6

    violations = [
        ("HEAD_TURNED", {"direction": "LOOKING_LEFT"}),
        ("MULTIPLE_FACES", {"face_count": 2}),
        ("PHONE_DETECTED", {"object_label": "Mobile Phone"}),
        ("BOOK_DETECTED", {"object_label": "Book / Notes"}),
        ("FACE_BLURRY", {"blur_percentage": 92.0}),
        ("DROWSINESS", {"ear": 0.15})
    ]

    for event_type, metadata in violations:
        engine.process_detection({
            "detected": True,
            "event_type": event_type,
            "confidence": 0.95,
            "metadata": metadata
        }, session_id=1)

    db = SessionLocal()
    events = db.query(Event).all()
    assert len(events) == 6

    event_types = [e.event_type for e in events]
    assert "HEAD_TURNED" in event_types
    assert "MULTIPLE_FACES" in event_types
    assert "PHONE_DETECTED" in event_types
    assert "BOOK_DETECTED" in event_types
    assert "FACE_BLURRY" in event_types
    assert "DROWSINESS" in event_types
    db.close()

def test_camera_blocked_detection():
    detector = BlurDetector()
    # Create black frame (covered camera)
    black_frame = np.zeros((480, 640, 3), dtype=np.uint8)
    result = detector.process(black_frame)
    assert result is not None
    assert result["detected"] is True
    assert result["event_type"] == "CAMERA_BLOCKED"

def test_face_detector_no_face():
    detector = FaceDetector()
    # Blank frame
    blank_frame = np.zeros((480, 640, 3), dtype=np.uint8)
    result = detector.process(blank_frame)
    assert result is not None
    assert result["detected"] is True
    assert result["event_type"] == "FACE_NOT_DETECTED"

def test_drowsiness_detector_blank_frame():
    detector = DrowsinessDetector()
    blank_frame = np.zeros((480, 640, 3), dtype=np.uint8)
    result = detector.process(blank_frame)
    # When no face landmarks are present, returns None
    assert result is None

