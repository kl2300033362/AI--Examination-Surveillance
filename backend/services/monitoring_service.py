import threading
import time
import logging
import asyncio
from datetime import datetime, timezone
from backend.services.camera_service import camera_service
from backend.ai.face_detector import FaceDetector
from backend.ai.head_pose_detector import HeadPoseDetector
from backend.ai.blur_detector import BlurDetector
from backend.ai.object_detector import ObjectDetector
from backend.ai.drowsiness_detector import DrowsinessDetector
from backend.services.warning_engine import warning_engine
from backend.services.notification_service import notification_service
from backend.services.alarm_service import alarm_service
from backend.services.system_lock_service import system_lock_service
from backend.database.database import SessionLocal
from backend.database.models import MonitoringSession

logger = logging.getLogger("ai_guardian.monitoring_service")

class MonitoringService:
    def __init__(self):
        self.is_monitoring = False
        self.thread = None
        self.session_id = None
        self.websocket_clients = []
        self.loop = asyncio.new_event_loop()
        
        # Initialize Detectors
        self.face_detector = FaceDetector()
        self.head_pose_detector = HeadPoseDetector()
        self.blur_detector = BlurDetector()
        self.object_detector = ObjectDetector()
        self.drowsiness_detector = DrowsinessDetector()
        
        self.detectors = [
            self.face_detector,
            self.head_pose_detector,
            self.blur_detector,
            self.object_detector,
            self.drowsiness_detector
        ]

        # Register Warning Engine callbacks
        warning_engine.register_callbacks(
            on_warning=self._on_warning,
            on_critical=self._on_critical
        )

        threading.Thread(target=self._run_async_loop, daemon=True).start()

    def _run_async_loop(self):
        asyncio.set_event_loop(self.loop)
        self.loop.run_forever()

    def add_client(self, websocket):
        self.websocket_clients.append(websocket)

    def remove_client(self, websocket):
        if websocket in self.websocket_clients:
            self.websocket_clients.remove(websocket)

    def _broadcast_event(self, event_data: dict):
        async def _send():
            for client in self.websocket_clients.copy():
                try:
                    await client.send_json(event_data)
                except Exception as e:
                    logger.error(f"Failed to send to websocket: {e}")
                    self.remove_client(client)
        
        asyncio.run_coroutine_threadsafe(_send(), self.loop)

    def _on_warning(self, event_dict: dict):
        logger.warning(f"Warning Event: {event_dict['event_type']}")
        self._broadcast_event({"type": "warning", **event_dict})

    def _on_critical(self, event_dict: dict):
        logger.critical(f"Critical Event: {event_dict['event_type']}")
        self._broadcast_event({"type": "critical", **event_dict})
        
        # Actions for critical
        alarm_service.play_alarm(duration_seconds=5)
        
        # Send Telegram notification
        msg = (f"🚨 <b>AI GUARDIAN ALERT</b> 🚨\n\n"
               f"<b>Event:</b> {event_dict['event_type']}\n"
               f"<b>Warning:</b> {event_dict['warning_number']}\n"
               f"<b>Severity:</b> CRITICAL")
        asyncio.run_coroutine_threadsafe(
            notification_service.send_telegram_message(msg, event_dict['id']),
            self.loop
        )
        
        # Check system lock
        if event_dict["warning_number"] >= warning_engine.max_warnings:
            # Need to create SystemAction log
            system_lock_service.lock_system()

    def start_monitoring(self):
        if self.is_monitoring:
            return
            
        # Create DB session
        db = SessionLocal()
        try:
            session = MonitoringSession()
            db.add(session)
            db.commit()
            db.refresh(session)
            self.session_id = session.id
        finally:
            db.close()

        camera_service.start()
        
        self.is_monitoring = True
        self.thread = threading.Thread(target=self._monitoring_loop, daemon=True)
        self.thread.start()
        
        # Immediately record candidate start verification screenshot date & time wise
        try:
            from backend.services.screenshot_service import screenshot_service
            start_frame = camera_service.get_frame()
            if start_frame is not None:
                screenshot_service.capture_and_save(
                    frame=start_frame,
                    event_type="EXAM_START_VERIFICATION",
                    severity="INFO",
                    warning_number=0,
                    custom_metadata={"session_id": self.session_id, "mode": "EXAM_COMMENCED"}
                )
        except Exception as e:
            logger.error(f"Failed to record initial exam start screenshot: {e}")

        self._broadcast_event({"type": "status", "monitoring": True, "session_id": self.session_id})
        logger.info(f"Monitoring started. Session ID: {self.session_id}")

    def _monitoring_loop(self):
        last_routine_snapshot = time.time()
        while self.is_monitoring:
            frame = camera_service.get_frame()
            current_time = time.time()
            if frame is not None:
                # Periodic verification screenshot every 60s during active exam surveillance
                if current_time - last_routine_snapshot >= 60:
                    last_routine_snapshot = current_time
                    try:
                        from backend.services.screenshot_service import screenshot_service
                        screenshot_service.capture_and_save(
                            frame=frame,
                            event_type="ROUTINE_PROCTOR_CHECK",
                            severity="INFO",
                            warning_number=0,
                            custom_metadata={"session_id": self.session_id, "mode": "PERIODIC_EXAM_AUDIT"}
                        )
                    except Exception as e:
                        logger.error(f"Failed periodic exam screenshot: {e}")

                for detector in self.detectors:
                    if not self.is_monitoring:
                        break
                    try:
                        result = detector.process(frame=frame)
                        if result and self.is_monitoring:
                            # Attach frame for screenshot functionality
                            result["frame"] = frame
                            warning_engine.process_detection(result, self.session_id)
                    except Exception as e:
                        logger.error(f"Detector {detector.__class__.__name__} failed: {e}")

            time.sleep(0.1) # ~10 FPS for AI processing to save CPU

    def stop_monitoring(self, stop_camera: bool = False):
        self.is_monitoring = False
        if self.thread is not None:
            self.thread.join(timeout=1.0)
            self.thread = None
            
        if stop_camera:
            camera_service.stop()
        
        if self.session_id:
            db = SessionLocal()
            try:
                session = db.query(MonitoringSession).filter(MonitoringSession.id == self.session_id).first()
                if session:
                    session.ended_at = datetime.now(timezone.utc)
                    session.status = "COMPLETED"
                    db.commit()
            except Exception as e:
                logger.error(f"Failed to update session on stop: {e}")
            finally:
                db.close()
                self.session_id = None
                
        self._broadcast_event({"type": "status", "monitoring": False})
        logger.info("AI surveillance stopped (Camera streaming remains live).")

monitoring_service = MonitoringService()
