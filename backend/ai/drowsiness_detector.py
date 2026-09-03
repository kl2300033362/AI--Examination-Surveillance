import cv2
import mediapipe as mp
import numpy as np
from backend.ai.base_detector import BaseDetector
from typing import Dict, Any, Optional

class DrowsinessDetector(BaseDetector):
    """
    Intelligent Eye Aspect Ratio (EAR) Drowsiness & Prolonged Eye-Closure Detector.
    Uses MediaPipe FaceMesh landmark coordinate geometric analysis to measure
    eye opening ratio.
    """
    def __init__(self, ear_threshold: float = 0.20, consecutive_frames: int = 15):
        super().__init__()
        self.enabled = True
        self.ear_threshold = ear_threshold
        self.consecutive_frames = consecutive_frames
        self.closed_frame_count = 0
        
        self.mp_face_mesh = mp.solutions.face_mesh
        self.face_mesh = self.mp_face_mesh.FaceMesh(
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        
        # Landmark indices for Left and Right eyes in MediaPipe Face Mesh
        # Left eye: [362, 385, 387, 263, 373, 380]
        self.LEFT_EYE = [362, 385, 387, 263, 373, 380]
        # Right eye: [33, 160, 158, 133, 153, 144]
        self.RIGHT_EYE = [33, 160, 158, 133, 153, 144]

    def _calculate_ear(self, landmarks, eye_indices, img_w: int, img_h: int) -> float:
        points = []
        for idx in eye_indices:
            lm = landmarks[idx]
            points.append(np.array([lm.x * img_w, lm.y * img_h]))
        
        # Vertical distances: ||p2 - p6|| and ||p3 - p5||
        v1 = np.linalg.norm(points[1] - points[5])
        v2 = np.linalg.norm(points[2] - points[4])
        # Horizontal distance: ||p1 - p4||
        h = np.linalg.norm(points[0] - points[3])
        
        if h == 0:
            return 0.3
        
        ear = (v1 + v2) / (2.0 * h)
        return float(ear)

    def process(self, frame, **kwargs) -> Optional[Dict[str, Any]]:
        if not self.enabled or frame is None:
            return None

        h, w = frame.shape[:2]
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.face_mesh.process(rgb_frame)

        if not results.multi_face_landmarks:
            return None

        landmarks = results.multi_face_landmarks[0].landmark
        left_ear = self._calculate_ear(landmarks, self.LEFT_EYE, w, h)
        right_ear = self._calculate_ear(landmarks, self.RIGHT_EYE, w, h)
        avg_ear = (left_ear + right_ear) / 2.0

        if avg_ear < self.ear_threshold:
            self.closed_frame_count += 1
            if self.closed_frame_count >= self.consecutive_frames:
                return {
                    "detected": True,
                    "event_type": "DROWSINESS",
                    "confidence": min(1.0, max(0.6, 1.0 - (avg_ear / self.ear_threshold))),
                    "metadata": {
                        "ear": round(avg_ear, 3),
                        "left_ear": round(left_ear, 3),
                        "right_ear": round(right_ear, 3),
                        "eyes": "CLOSED",
                        "reason": "Candidate drowsiness / prolonged eye closure detected"
                    }
                }
        else:
            self.closed_frame_count = max(0, self.closed_frame_count - 1)

        return {
            "detected": False,
            "event_type": "NORMAL",
            "confidence": 1.0,
            "metadata": {
                "ear": round(avg_ear, 3),
                "eyes": "OPEN"
            }
        }
