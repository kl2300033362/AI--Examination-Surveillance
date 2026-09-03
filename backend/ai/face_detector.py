import cv2
import mediapipe as mp
from backend.ai.base_detector import BaseDetector
from typing import Dict, Any, Optional

class FaceDetector(BaseDetector):
    def __init__(self):
        super().__init__()
        self.mp_face_detection = mp.solutions.face_detection
        # Use face detection model (faster than face mesh for simple counting)
        self.face_detection = self.mp_face_detection.FaceDetection(
            model_selection=0, min_detection_confidence=0.5
        )

    def process(self, frame, **kwargs) -> Optional[Dict[str, Any]]:
        if not self.enabled or frame is None:
            return None

        # Convert the BGR image to RGB
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.face_detection.process(rgb_frame)

        face_count = 0
        face_boxes = []
        if results.detections:
            face_count = len(results.detections)
            h, w = frame.shape[:2]
            for detection in results.detections:
                bboxC = detection.location_data.relative_bounding_box
                score = float(detection.score[0]) if detection.score else 1.0
                face_boxes.append({
                    "xmin": max(0, int(bboxC.xmin * w)),
                    "ymin": max(0, int(bboxC.ymin * h)),
                    "width": int(bboxC.width * w),
                    "height": int(bboxC.height * h),
                    "score": round(score, 2)
                })

        if face_count == 0:
            return {
                "detected": True,
                "event_type": "FACE_NOT_DETECTED",
                "confidence": 1.0,
                "metadata": {
                    "face_count": 0,
                    "reason": "No candidate face detected in exam frame",
                    "faces": []
                }
            }
        elif face_count > 1:
            return {
                "detected": True,
                "event_type": "MULTIPLE_FACES",
                "confidence": 1.0,
                "metadata": {
                    "face_count": face_count,
                    "reason": f"Unauthorized person detected ({face_count} faces in frame)",
                    "faces": face_boxes
                }
            }
        
        return {
             "detected": False, # Normal candidate state
             "event_type": "NORMAL",
             "confidence": 1.0,
             "metadata": {
                 "face_count": 1,
                 "faces": face_boxes
             }
        }
