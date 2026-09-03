import os
import cv2
import time
import glob
import logging
import numpy as np
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List

logger = logging.getLogger("ai_guardian.screenshot_service")

class ScreenshotService:
    def __init__(self, base_dir: str = "data/screenshots"):
        self.base_dir = base_dir
        os.makedirs(self.base_dir, exist_ok=True)

    def capture_and_save(
        self,
        frame: np.ndarray,
        event_type: str,
        event_id: Optional[int] = None,
        severity: str = "WARNING",
        warning_number: int = 1,
        custom_metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Saves a screenshot image organized date-wise into data/screenshots/YYYY-MM-DD/
        with human-readable date & time stamped filenames and an embedded on-frame
        visual date/time evidence watermark banner.
        """
        if frame is None:
            try:
                from backend.services.camera_service import camera_service
                frame = camera_service.get_frame()
            except Exception:
                frame = None

        if frame is None:
            frame = np.zeros((480, 640, 3), dtype=np.uint8)
            frame[:] = (20, 20, 24)
            cv2.putText(frame, f"EVIDENCE CAPTURE: {event_type}", (40, 240), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (240, 240, 240), 2)

        now = datetime.now() # Local time
        date_str = now.strftime("%Y-%m-%d")
        time_str = now.strftime("%H-%M-%S")
        display_timestamp = now.strftime("%Y-%m-%d %H:%M:%S")

        # Target date-wise directory: data/screenshots/YYYY-MM-DD/
        date_dir = os.path.join(self.base_dir, date_str)
        os.makedirs(date_dir, exist_ok=True)

        ev_id = event_id if event_id is not None else int(time.time())
        clean_event = event_type.replace(" ", "_").upper()
        filename = f"{date_str}_{time_str}_{clean_event}_event_{ev_id}.jpg"
        filepath = os.path.join(date_dir, filename)
        relative_path = f"{date_str}/{filename}".replace("\\", "/")

        try:
            # Create a copy of the frame to draw on-screen date & time watermark
            watermarked_frame = frame.copy()
            h, w = watermarked_frame.shape[:2]

            # Draw semi-transparent header overlay bar (top)
            overlay = watermarked_frame.copy()
            cv2.rectangle(overlay, (0, 0), (w, 44), (12, 12, 16), -1)
            cv2.addWeighted(overlay, 0.82, watermarked_frame, 0.18, 0, watermarked_frame)
            cv2.line(watermarked_frame, (0, 44), (w, 44), (45, 45, 60), 1)

            # Row 1: Date, Time and System Label
            row1_left = f"DATE: {date_str}   TIME: {now.strftime('%H:%M:%S')}"
            row1_right = "AI PROCTOR AUDIT"
            cv2.putText(watermarked_frame, row1_left, (12, 17), cv2.FONT_HERSHEY_SIMPLEX, 0.44, (240, 240, 240), 1, cv2.LINE_AA)
            (r1_w, _), _ = cv2.getTextSize(row1_right, cv2.FONT_HERSHEY_SIMPLEX, 0.40, 1)
            cv2.putText(watermarked_frame, row1_right, (max(10, w - r1_w - 12), 17), cv2.FONT_HERSHEY_SIMPLEX, 0.40, (230, 180, 60), 1, cv2.LINE_AA)

            # Row 2: Event Type and Strike Info
            sev_color = (60, 70, 255) if severity == "CRITICAL" else (50, 180, 255) if severity == "WARNING" else (80, 220, 120)
            row2_left = f"EVENT: {clean_event}"
            row2_right = f"STRIKE #{warning_number} [{severity}]"
            cv2.putText(watermarked_frame, row2_left, (12, 36), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (180, 210, 255), 1, cv2.LINE_AA)
            (r2_w, _), _ = cv2.getTextSize(row2_right, cv2.FONT_HERSHEY_SIMPLEX, 0.42, 1)
            cv2.putText(watermarked_frame, row2_right, (max(10, w - r2_w - 12), 36), cv2.FONT_HERSHEY_SIMPLEX, 0.42, sev_color, 1, cv2.LINE_AA)

            # Write file to disk
            cv2.imwrite(filepath, watermarked_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 92])
            logger.info(f"Recorded date/time screenshot: {filepath}")

            return {
                "date": date_str,
                "time": now.strftime("%H:%M:%S"),
                "timestamp_str": display_timestamp,
                "screenshot_filename": filename,
                "screenshot_path": filepath.replace("\\", "/"),
                "relative_screenshot_path": relative_path,
                "screenshot_url": f"/api/monitoring/screenshots/{relative_path}"
            }
        except Exception as e:
            logger.error(f"Failed to record date/time screenshot: {e}")
            return {}

    def list_all_screenshots(self) -> Dict[str, Any]:
        """
        Scans data/screenshots recursively and returns all records grouped by date and sorted by time.
        """
        all_files = glob.glob(os.path.join(self.base_dir, "**", "*.jpg"), recursive=True)
        items_by_date: Dict[str, List[Dict[str, Any]]] = {}

        for f in all_files:
            rel = os.path.relpath(f, self.base_dir).replace("\\", "/")
            parts = rel.split("/")
            
            # Default extract from file
            filename = parts[-1]
            date_part = parts[0] if len(parts) > 1 else "misc"

            # Parse date/time from filename if available (e.g. 2026-09-03_12-00-00_EVENT_event_1.jpg)
            file_stats = os.stat(f)
            created_dt = datetime.fromtimestamp(file_stats.st_mtime)
            
            item_date = date_part if (len(date_part) == 10 and date_part.count("-") == 2) else created_dt.strftime("%Y-%m-%d")
            item_time = created_dt.strftime("%H:%M:%S")

            # Try to parse event name from filename
            name_parts = filename.replace(".jpg", "").split("_")
            event_type = "EVENT"
            if len(name_parts) >= 3:
                # e.g., ['2026-09-03', '12-05-30', 'DROWSINESS', 'event', '1']
                event_type = name_parts[2]

            item = {
                "filename": filename,
                "relative_path": rel,
                "date": item_date,
                "time": item_time,
                "event_type": event_type,
                "url": f"/api/monitoring/screenshots/{rel}",
                "size_bytes": file_stats.st_size,
                "timestamp": created_dt.isoformat()
            }

            if item_date not in items_by_date:
                items_by_date[item_date] = []
            items_by_date[item_date].append(item)

        # Sort dates descending, and files within each date descending by time
        sorted_dates = sorted(items_by_date.keys(), reverse=True)
        for d in sorted_dates:
            items_by_date[d] = sorted(items_by_date[d], key=lambda x: x["timestamp"], reverse=True)

        return {
            "total_screenshots": len(all_files),
            "dates": sorted_dates,
            "items_by_date": items_by_date
        }

screenshot_service = ScreenshotService()
