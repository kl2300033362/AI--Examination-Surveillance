import cv2
import numpy as np
import mediapipe as mp
from backend.ai.base_detector import BaseDetector
from typing import Dict, Any, Optional

class BlurDetector(BaseDetector):
    def __init__(self, blur_threshold: float = 15.0, min_brightness: float = 20.0):
        """
        Face-specific blur detector calibrated for severe / 90%+ blur:
        - Evaluates blur exclusively on the isolated face region.
        - Ignores mild laptop webcam blur.
        - Uses CLAHE contrast normalization so lighting/darkness is decoupled from sharpness.
        - Filters out low-light / dark faces (darkness != blur).
        """
        super().__init__()
        self.blur_threshold = blur_threshold
        self.min_brightness = min_brightness
        self.clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        
        # MediaPipe Face Detection for face localization
        self.mp_face_detection = mp.solutions.face_detection
        self.face_detection = self.mp_face_detection.FaceDetection(
            model_selection=0, min_detection_confidence=0.4
        )

    def process(self, frame, **kwargs) -> Optional[Dict[str, Any]]:
        if not self.enabled or frame is None:
            return None

        h, w = frame.shape[:2]
        
        # Check full frame for camera obstruction / blockage
        frame_gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        frame_brightness = float(np.mean(frame_gray))
        if frame_brightness < 10.0:
            return {
                "detected": True,
                "event_type": "CAMERA_BLOCKED",
                "confidence": 0.95,
                "metadata": {
                    "reason": "Camera is covered, blocked, or completely black",
                    "brightness": round(frame_brightness, 1)
                }
            }

        # Detect face location to evaluate blur on the face specifically
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.face_detection.process(rgb_frame)

        if not results or not results.detections:
            # If no face is detected, let FaceDetector handle it; do not flag blur
            return None

        # Extract primary face bounding box
        detection = results.detections[0]
        bboxC = detection.location_data.relative_bounding_box
        
        # Calculate pixel coordinates with margin around the face
        margin_x = int(bboxC.width * w * 0.1)
        margin_y = int(bboxC.height * h * 0.1)
        
        xmin = max(0, int(bboxC.xmin * w) - margin_x)
        ymin = max(0, int(bboxC.ymin * h) - margin_y)
        xmax = min(w, int((bboxC.xmin + bboxC.width) * w) + margin_x)
        ymax = min(h, int((bboxC.ymin + bboxC.height) * h) + margin_y)

        if xmax <= xmin or ymax <= ymin:
            return None

        face_roi = frame[ymin:ymax, xmin:xmax]
        face_gray = cv2.cvtColor(face_roi, cv2.COLOR_BGR2GRAY)
        
        # Check lighting / darkness of the face
        mean_brightness = float(np.mean(face_gray))
        if mean_brightness < self.min_brightness:
            return {
                "detected": False,
                "event_type": "NORMAL",
                "confidence": 1.0,
                "metadata": {
                    "blur_score": 0.0,
                    "mean_brightness": round(mean_brightness, 1),
                    "note": "Low illumination - darkness ignored"
                }
            }

        # Apply CLAHE normalization to remove lighting bias from sharpness
        face_normalized = self.clahe.apply(face_gray)
        
        # Compute sharpness variance on normalized face
        fm = float(cv2.Laplacian(face_normalized, cv2.CV_64F).var())

        # Estimated blur percentage (100% = completely blurred, 0% = sharp)
        blur_percentage = max(0.0, min(100.0, (1.0 - (fm / 150.0)) * 100.0))

        # Only trigger when blur is extreme (fm < self.blur_threshold)
        if fm < self.blur_threshold:
            return {
                "detected": True,
                "event_type": "FACE_BLURRY",
                "confidence": min(1.0, max(0.6, 1.0 - (fm / self.blur_threshold))),
                "metadata": {
                    "blur_score": round(fm, 2),
                    "mean_brightness": round(mean_brightness, 1),
                    "blur_percentage": round(blur_percentage, 1),
                    "reason": "Webcam video feed is blurry or out of focus"
                }
            }

        return {
            "detected": False,
            "event_type": "NORMAL",
            "confidence": 1.0,
            "metadata": {
                "blur_score": round(fm, 2),
                "mean_brightness": round(mean_brightness, 1),
                "blur_percentage": round(blur_percentage, 1)
            }
        }
