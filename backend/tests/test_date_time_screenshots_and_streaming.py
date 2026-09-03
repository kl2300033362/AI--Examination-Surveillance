import os
import glob
import pytest
from datetime import datetime
from fastapi.testclient import TestClient
from backend.main import app
from backend.services.camera_service import camera_service
from backend.services.monitoring_service import monitoring_service
from backend.services.screenshot_service import screenshot_service
from backend.database.database import Base, engine, SessionLocal
from backend.database.models import Event, WarningCounter

client = TestClient(app)

@pytest.fixture(autouse=True)
def clean_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        db.query(Event).delete()
        db.query(WarningCounter).delete()
        db.commit()
    finally:
        db.close()
    yield

def test_video_feed_streams_automatically_without_monitoring_started():
    # Ensure monitoring is NOT started
    monitoring_service.stop_monitoring()
    assert monitoring_service.is_monitoring is False

    # Check status endpoint
    status_res = client.get("/api/status")
    assert status_res.status_code == 200
    assert status_res.json()["monitoring_active"] is False

    # Video streaming preview is active: camera service generates valid frames
    camera_service.start()
    assert camera_service.is_running is True
    frame = camera_service.get_frame()
    assert frame is not None
    assert frame.shape[0] > 0

    # Stream generator yields valid MJPEG chunks
    stream_gen = camera_service.generate_mjpeg_stream()
    chunk = next(stream_gen)
    assert b"--frame" in chunk
    assert b"Content-Type: image/jpeg" in chunk

def test_ai_surveillance_starts_only_on_start_and_stops_cleanly():
    monitoring_service.stop_monitoring()
    assert monitoring_service.is_monitoring is False

    # Trigger START
    start_res = client.post("/api/monitoring/start")
    assert start_res.status_code == 200
    data = start_res.json()
    assert data["status"] == "started"
    assert monitoring_service.is_monitoring is True
    assert monitoring_service.session_id is not None

    # Verify initial start audit screenshot is recorded date & time wise
    now = datetime.now()
    today_str = now.strftime("%Y-%m-%d")
    date_dir = os.path.join("data", "screenshots", today_str)
    assert os.path.exists(date_dir)
    start_snaps = glob.glob(os.path.join(date_dir, "*EXAM_START_VERIFICATION*.jpg"))
    assert len(start_snaps) > 0, "EXAM_START_VERIFICATION screenshot should be recorded on start"

    # Trigger STOP
    stop_res = client.post("/api/monitoring/stop")
    assert stop_res.status_code == 200
    assert monitoring_service.is_monitoring is False
    # Camera streaming preview remains alive for candidate view
    assert camera_service.is_running is True

def test_date_and_time_wise_screenshots_recorded_on_event():
    # Start surveillance
    client.post("/api/monitoring/start")

    # Simulate an exam violation
    now = datetime.now()
    today_str = now.strftime("%Y-%m-%d")
    
    sim_res = client.post("/api/monitoring/simulate", json={
        "event_type": "PHONE_DETECTED",
        "metadata": {"object_label": "Mobile Phone", "confidence": 0.96}
    })
    assert sim_res.status_code == 200

    # Verify screenshot was saved in date-wise directory: data/screenshots/YYYY-MM-DD/
    date_dir = os.path.join("data", "screenshots", today_str)
    assert os.path.exists(date_dir), f"Directory {date_dir} should exist"

    date_files = glob.glob(os.path.join(date_dir, "*.jpg"))
    assert len(date_files) > 0, "At least one date-wise screenshot should be present"

    # Verify filename contains date and time pattern (YYYY-MM-DD_HH-MM-SS_...)
    latest_file = os.path.basename(date_files[-1])
    assert today_str in latest_file
    assert "PHONE_DETECTED" in latest_file

    # Verify screenshots list API returns date grouped records
    list_res = client.get("/api/monitoring/screenshots")
    assert list_res.status_code == 200
    archive_data = list_res.json()
    assert archive_data["total_screenshots"] > 0
    assert today_str in archive_data["dates"]
    assert len(archive_data["items_by_date"][today_str]) > 0

    item = archive_data["items_by_date"][today_str][0]
    assert item["date"] == today_str
    assert "time" in item
    assert "url" in item

    # Verify screenshot retrieval route serves the file
    img_res = client.get(item["url"])
    assert img_res.status_code == 200
    assert "image/jpeg" in img_res.headers["content-type"]
    assert len(img_res.content) > 1000

    monitoring_service.stop_monitoring()
