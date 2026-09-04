from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import StreamingResponse, FileResponse
from backend.services.monitoring_service import monitoring_service
from backend.services.camera_service import camera_service
import json
import os

router = APIRouter()

@router.post("/start")
def start_monitoring():
    monitoring_service.start_monitoring()
    return {"status": "started", "session_id": monitoring_service.session_id}

@router.post("/stop")
def stop_monitoring():
    monitoring_service.stop_monitoring()
    return {"status": "stopped"}

@router.get("/video_feed")
def video_feed():
    if not camera_service.is_running:
        camera_service.start()
    return StreamingResponse(camera_service.generate_mjpeg_stream(),
                             media_type="multipart/x-mixed-replace; boundary=frame")

@router.get("/screenshots")
def list_screenshots():
    from backend.services.screenshot_service import screenshot_service
    return screenshot_service.list_all_screenshots()

@router.get("/screenshots/{file_path:path}")
def get_screenshot(file_path: str):
    # Support both YYYY-MM-DD/filename.jpg and filename.jpg directly
    filepath = os.path.join("data", "screenshots", file_path)
    if not os.path.exists(filepath):
        import glob
        matches = glob.glob(os.path.join("data", "screenshots", "**", os.path.basename(file_path)), recursive=True)
        if matches and os.path.exists(matches[0]):
            filepath = matches[0]
        else:
            raise HTTPException(status_code=404, detail="Screenshot not found")
    return FileResponse(filepath)

@router.post("/test_alarm")
def test_alarm():
    from backend.services.alarm_service import alarm_service
    alarm_service.play_alarm(duration_seconds=3)
    return {"status": "success", "message": "Alarm triggered"}

@router.post("/test_lock")
def test_lock():
    from backend.services.system_lock_service import system_lock_service
    success = system_lock_service.lock_system()
    return {"status": "success" if success else "disabled_or_failed", "locked": success}

@router.post("/reset_session")
def reset_session():
    from backend.database.database import SessionLocal
    from backend.database.models import WarningCounter
    db = SessionLocal()
    try:
        db.query(WarningCounter).delete()
        db.commit()
    finally:
        db.close()
    return {"status": "success", "message": "Proctoring session counters reset"}

@router.post("/simulate")
async def simulate_event(event_data: dict):
    from backend.services.warning_engine import warning_engine
    if not monitoring_service.session_id:
        monitoring_service.start_monitoring()
    
    event_type = event_data.get("event_type", "HEAD_TURNED")
    custom_metadata = event_data.get("metadata", {})
    
    defaults = {
        "DROWSINESS": {"ear": 0.16, "eyes": "CLOSED", "reason": "Candidate drowsiness / prolonged eye closure detected"},
        "HEAD_TURNED": {"direction": custom_metadata.get("direction", "LOOKING_LEFT"), "yaw": -28.5, "pitch": 4.2},
        "MULTIPLE_FACES": {"face_count": custom_metadata.get("face_count", 2), "reason": "Second person found in frame"},
        "PHONE_DETECTED": {"object_label": "Mobile Phone", "confidence": 0.94},
        "BOOK_DETECTED": {"object_label": "Book / Notes", "confidence": 0.89},
        "LAPTOP_DETECTED": {"object_label": "Secondary Laptop", "confidence": 0.91},
        "SMARTWATCH_DETECTED": {"object_label": "Smartwatch", "confidence": 0.88},
        "FACE_BLURRY": {"blur_score": 8.2, "blur_percentage": 94.5},
        "CAMERA_BLOCKED": {"brightness": 4.1, "reason": "Camera lens covered"},
        "FACE_NOT_DETECTED": {"face_count": 0, "reason": "Candidate absent"},
        "TAB_SWITCH_DETECTED": {"action": "Candidate left test tab"}
    }
    
    metadata = {**defaults.get(event_type, {}), **custom_metadata, "simulated": True}
    
    frame = camera_service.get_frame()
    detection = {
        "detected": True,
        "event_type": event_type,
        "confidence": event_data.get("confidence", 0.95),
        "metadata": metadata,
        "frame": frame
    }
    
    # Bypass temporal and cooldown for instant simulation
    warning_engine.last_triggered[event_type] = 0
    warning_engine._handle_confirmed_event(detection, monitoring_service.session_id)
    
    return {"status": "success", "event_type": event_type, "metadata": metadata}

import base64
import numpy as np
import cv2
from fastapi import UploadFile, File

@router.post("/upload_frame")
async def upload_frame(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is not None:
            camera_service.update_client_frame(frame)
            return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}
    return {"status": "error", "message": "Failed to decode frame"}

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    monitoring_service.add_client(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            cmd = json.loads(data)
            action = cmd.get("action")
            if action == "client_frame":
                b64_data = cmd.get("image", "")
                if "," in b64_data:
                    b64_data = b64_data.split(",", 1)[1]
                if b64_data:
                    try:
                        img_bytes = base64.b64decode(b64_data)
                        nparr = np.frombuffer(img_bytes, np.uint8)
                        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                        if frame is not None:
                            camera_service.update_client_frame(frame)
                    except Exception:
                        pass
            elif action == "test_alarm":
                from backend.services.alarm_service import alarm_service
                alarm_service.play_alarm(3)
    except WebSocketDisconnect:
        monitoring_service.remove_client(websocket)
