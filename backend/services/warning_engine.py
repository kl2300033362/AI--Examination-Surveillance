import os
import time
import logging
from typing import Dict, Any, List
from backend.database.database import SessionLocal
from backend.database.models import Event, WarningCounter, SystemAction
from datetime import datetime, timezone
import json

logger = logging.getLogger("ai_guardian.warning_engine")

class WarningEngine:
    def __init__(self):
        self.cooldowns = {
            "DROWSINESS": 5,
            "FACE_NOT_DETECTED": 4,
            "MULTIPLE_FACES": 5,
            "HEAD_TURNED": 4,
            "PHONE_DETECTED": 6,
            "BOOK_DETECTED": 6,
            "LAPTOP_DETECTED": 6,
            "SMARTWATCH_DETECTED": 6,
            "ELECTRONIC_DEVICE_DETECTED": 6,
            "FACE_BLURRY": 5,
            "CAMERA_BLOCKED": 4,
            "TAB_SWITCH_DETECTED": 3,
        }
        self.temporal_thresholds = {
            "DROWSINESS": 1.5,
            "FACE_NOT_DETECTED": 1.5, # seconds required before triggering
            "MULTIPLE_FACES": 0.8,
            "HEAD_TURNED": 1.5,
            "FACE_BLURRY": 1.5,
        }
        
        self.state_tracking = {}
        self.last_triggered = {}
        
        # Callbacks to trigger UI/Actions
        self.on_warning_event = None # type: Callable[[dict], None]
        self.on_critical_event = None # type: Callable[[dict], None]
        
        self.max_warnings = 10 # Default 10 chances in proctored exam mode

    def register_callbacks(self, on_warning, on_critical):
        self.on_warning_event = on_warning
        self.on_critical_event = on_critical

    def process_detection(self, detection: Dict[str, Any], session_id: int):
        event_type = detection["event_type"]
        is_detected = detection["detected"]
        
        if event_type == "NORMAL":
            # Reset temporal tracking for this event if back to normal
            return
            
        current_time = time.time()
        
        # Temporal Confirmation (require event to persist for a duration)
        if event_type in self.temporal_thresholds:
            if event_type not in self.state_tracking:
                self.state_tracking[event_type] = current_time
            
            elapsed = current_time - self.state_tracking[event_type]
            if elapsed < self.temporal_thresholds[event_type]:
                return # Not sustained long enough yet
        
        # Cooldown check
        cooldown = self.cooldowns.get(event_type, 6)
        last_time = self.last_triggered.get(event_type, 0)
        
        if current_time - last_time < cooldown:
            return # In cooldown
            
        # Event is confirmed and off cooldown
        self.last_triggered[event_type] = current_time
        
        # Log to Database and Increment Counter
        self._handle_confirmed_event(detection, session_id)

    def _handle_confirmed_event(self, detection: Dict[str, Any], session_id: int):
        event_type = detection["event_type"]
        confidence = detection.get("confidence", 1.0)
        metadata = detection.get("metadata", {})
        
        db = SessionLocal()
        try:
            # Increment specific counter
            counter = db.query(WarningCounter).filter(WarningCounter.event_type == event_type).first()
            if not counter:
                counter = WarningCounter(event_type=event_type, count=0)
                db.add(counter)
            
            counter.count += 1
            counter.last_triggered = datetime.now(timezone.utc)
            db.commit()
            
            # Check total warnings (sum of all infraction counts)
            total_warnings = db.query(WarningCounter).with_entities(WarningCounter.count).all()
            total_sum = sum([c[0] for c in total_warnings])
            
            severity = "WARNING"
            if total_sum >= self.max_warnings:
                severity = "CRITICAL"
                
            if event_type in ["MULTIPLE_FACES", "PHONE_DETECTED"]:
                if total_sum >= 2:
                    severity = "CRITICAL"
                    
            descriptions = {
                "DROWSINESS": f"Candidate drowsiness / prolonged eye closure detected (EAR: {metadata.get('ear', 0.16)})",
                "HEAD_TURNED": f"Head turned away from exam screen ({metadata.get('direction', 'AWAY')})",
                "MULTIPLE_FACES": f"Unauthorized person found in exam area ({metadata.get('face_count', 2)} faces detected)",
                "PHONE_DETECTED": "Mobile phone / smartphone detected in camera view",
                "BOOK_DETECTED": "Book, notes, or reference cheat material detected",
                "LAPTOP_DETECTED": "Secondary screen or laptop detected",
                "SMARTWATCH_DETECTED": "Smartwatch / digital watch detected",
                "ELECTRONIC_DEVICE_DETECTED": "Unauthorized electronic device detected",
                "FACE_BLURRY": f"Blurry camera feed detected (Blur: {metadata.get('blur_percentage', 90)}%)",
                "CAMERA_BLOCKED": "Webcam is blocked, covered, or low light",
                "FACE_NOT_DETECTED": "Candidate absent from camera view",
                "TAB_SWITCH_DETECTED": "Candidate switched away from the exam browser window"
            }
            
            description = descriptions.get(event_type, f"{event_type.replace('_', ' ')} detected")
            
            new_event = Event(
                session_id=session_id,
                event_type=event_type,
                severity=severity,
                confidence=confidence,
                description=description,
                warning_number=total_sum,
                metadata_json=metadata
            )
            db.add(new_event)
            db.commit()
            db.refresh(new_event)
            
            # Screenshot Capture Logic for evidence (Date & Time Wise)
            try:
                from backend.services.screenshot_service import screenshot_service
                frame = detection.get("frame")
                screenshot_info = screenshot_service.capture_and_save(
                    frame=frame,
                    event_type=event_type,
                    event_id=new_event.id,
                    severity=severity,
                    warning_number=total_sum,
                    custom_metadata=metadata
                )
                if screenshot_info:
                    metadata.update({
                        "screenshot_path": screenshot_info.get("screenshot_path"),
                        "relative_screenshot_path": screenshot_info.get("relative_screenshot_path"),
                        "screenshot_filename": screenshot_info.get("screenshot_filename"),
                        "screenshot_url": screenshot_info.get("screenshot_url"),
                        "date": screenshot_info.get("date"),
                        "time": screenshot_info.get("time"),
                    })
                    new_event.metadata_json = dict(metadata)
                    db.commit()
            except Exception as e:
                logger.error(f"Failed to record date/time screenshot: {e}")
            
            event_dict = {
                "id": new_event.id,
                "event_type": new_event.event_type,
                "severity": new_event.severity,
                "description": description,
                "warning_number": new_event.warning_number,
                "max_warnings": self.max_warnings,
                "metadata": metadata,
                "timestamp": new_event.timestamp.isoformat()
            }
            
            # Trigger Callbacks (which will handle WebSocket / Alarms / Locks / Notifications)
            if severity == "CRITICAL" and self.on_critical_event:
                self.on_critical_event(event_dict)
            elif self.on_warning_event:
                self.on_warning_event(event_dict)
                
        except Exception as e:
            logger.error(f"Failed to handle event in DB: {e}")
            db.rollback()
        finally:
            db.close()
            
    def reset_state(self, event_type: str):
        if event_type in self.state_tracking:
            del self.state_tracking[event_type]

warning_engine = WarningEngine()
