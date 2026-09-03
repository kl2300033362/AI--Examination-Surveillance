import cv2
import threading
import logging
import time
import numpy as np
from typing import Optional, Generator

logger = logging.getLogger("ai_guardian.camera_service")

class CameraService:
    def __init__(self, camera_index: int = 0):
        self.camera_index = camera_index
        self.cap: Optional[cv2.VideoCapture] = None
        self.is_running = False
        self.current_frame = None
        self.lock = threading.Lock()
        self.thread: Optional[threading.Thread] = None
        self.using_synthetic = False

    def _create_synthetic_frame(self):
        img = np.zeros((480, 640, 3), dtype=np.uint8)
        img[:] = (24, 18, 15)
        cv2.putText(img, "AI GUARDIAN LIVE FEED", (160, 180), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (220, 220, 220), 2)
        cv2.putText(img, "Webcam Simulation Mode", (195, 215), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 220, 120), 1)
        
        # Face representation
        cv2.ellipse(img, (320, 310), (70, 95), 0, 0, 360, (180, 160, 150), -1)
        cv2.circle(img, (295, 290), 10, (255, 255, 255), -1)
        cv2.circle(img, (295, 290), 4, (40, 40, 40), -1)
        cv2.circle(img, (345, 290), 10, (255, 255, 255), -1)
        cv2.circle(img, (345, 290), 4, (40, 40, 40), -1)
        cv2.line(img, (320, 300), (320, 325), (140, 120, 110), 2)
        cv2.ellipse(img, (320, 345), (25, 8), 0, 0, 180, (80, 80, 180), 2)

        ts = time.strftime("%Y-%m-%d %H:%M:%S")
        cv2.putText(img, f"TIME: {ts}", (20, 450), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (160, 160, 160), 1)
        return img

    def start(self):
        if self.is_running:
            return

        try:
            self.cap = cv2.VideoCapture(self.camera_index)
            if self.cap.isOpened():
                self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
                self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
                self.using_synthetic = False
                logger.info("Real camera opened successfully.")
            else:
                self.using_synthetic = True
                logger.warning(f"No physical camera found at index {self.camera_index}. Using simulated feed.")
        except Exception as e:
            self.using_synthetic = True
            logger.warning(f"Camera init exception: {e}. Using simulated feed.")

        self.is_running = True
        self.thread = threading.Thread(target=self._capture_loop, daemon=True)
        self.thread.start()
        logger.info("Camera service started.")

    def _capture_loop(self):
        while self.is_running:
            if not self.using_synthetic and self.cap is not None and self.cap.isOpened():
                ret, frame = self.cap.read()
                if ret:
                    with self.lock:
                        self.current_frame = frame
                else:
                    logger.warning("Failed to grab frame from webcam. Generating fallback frame.")
                    with self.lock:
                        self.current_frame = self._create_synthetic_frame()
                    time.sleep(0.1)
            else:
                with self.lock:
                    self.current_frame = self._create_synthetic_frame()
                time.sleep(0.04)

    def get_frame(self):
        with self.lock:
            if self.current_frame is not None:
                return self.current_frame.copy()
            return self._create_synthetic_frame()

    def stop(self):
        self.is_running = False
        if self.thread is not None:
            self.thread.join(timeout=2.0)
            self.thread = None
        if self.cap is not None:
            self.cap.release()
            self.cap = None
        logger.info("Camera service stopped.")

    def generate_mjpeg_stream(self) -> Generator[bytes, None, None]:
        """Generator for pushing MJPEG frames via HTTP."""
        if not self.is_running:
            self.start()

        while self.is_running:
            frame = self.get_frame()
            if frame is not None:
                # Convert to JPEG
                ret, buffer = cv2.imencode('.jpg', frame)
                if ret:
                    yield (b'--frame\r\n'
                           b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
            time.sleep(0.03) # Cap at ~30 FPS

camera_service = CameraService()
