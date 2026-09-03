import cv2
import mediapipe as mp
import numpy as np
from backend.ai.base_detector import BaseDetector
from typing import Dict, Any, Optional

class HeadPoseDetector(BaseDetector):
    def __init__(self, yaw_threshold: int = 20, pitch_threshold: int = 20):
        super().__init__()
        self.mp_face_mesh = mp.solutions.face_mesh
        self.face_mesh = self.mp_face_mesh.FaceMesh(
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        self.yaw_threshold = yaw_threshold
        self.pitch_threshold = pitch_threshold

    def process(self, frame, **kwargs) -> Optional[Dict[str, Any]]:
        if not self.enabled:
            return None

        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.face_mesh.process(rgb_frame)

        if not results.multi_face_landmarks:
            return None

        img_h, img_w, _ = frame.shape
        face_3d = []
        face_2d = []

        for face_landmarks in results.multi_face_landmarks:
            for idx, lm in enumerate(face_landmarks.landmark):
                if idx == 33 or idx == 263 or idx == 1 or idx == 61 or idx == 291 or idx == 199:
                    if idx == 1:
                        nose_2d = (lm.x * img_w, lm.y * img_h)
                        nose_3d = (lm.x * img_w, lm.y * img_h, lm.z * 3000)

                    x, y = int(lm.x * img_w), int(lm.y * img_h)

                    face_2d.append([x, y])
                    face_3d.append([x, y, lm.z])

            face_2d = np.array(face_2d, dtype=np.float64)
            face_3d = np.array(face_3d, dtype=np.float64)

            focal_length = 1.0 * img_w
            cam_matrix = np.array([
                [focal_length, 0, img_w / 2],
                [0, focal_length, img_h / 2],
                [0, 0, 1]
            ])

            dist_matrix = np.zeros((4, 1), dtype=np.float64)

            success, rot_vec, trans_vec = cv2.solvePnP(face_3d, face_2d, cam_matrix, dist_matrix)

            rmat, jac = cv2.Rodrigues(rot_vec)

            angles, mtxR, mtxQ, Qx, Qy, Qz = cv2.RQDecomp3x3(rmat)

            x = angles[0] * 360 # Pitch
            y = angles[1] * 360 # Yaw
            # z = angles[2] * 360 # Roll

            yaw = float(y)
            pitch = float(x)

            # Determine direction
            direction = "CENTER"
            if yaw > self.yaw_threshold:
                direction = "LOOKING_RIGHT"
            elif yaw < -self.yaw_threshold:
                direction = "LOOKING_LEFT"
            elif pitch > self.pitch_threshold:
                direction = "LOOKING_UP"
            elif pitch < -self.pitch_threshold:
                direction = "LOOKING_DOWN"

            is_deviated = (abs(yaw) > self.yaw_threshold or abs(pitch) > self.pitch_threshold)

            if is_deviated:
                return {
                    "detected": True,
                    "event_type": "HEAD_TURNED",
                    "confidence": min(1.0, max(0.6, (max(abs(yaw), abs(pitch)) / 45.0))),
                    "metadata": {
                        "yaw": round(yaw, 1),
                        "pitch": round(pitch, 1),
                        "direction": direction,
                        "description": f"Candidate is {direction.replace('_', ' ').lower()} away from exam screen"
                    }
                }
            
            return {
                "detected": False,
                "event_type": "NORMAL",
                "confidence": 1.0,
                "metadata": {
                    "yaw": round(yaw, 1),
                    "pitch": round(pitch, 1),
                    "direction": "CENTER"
                }
            }

        return None
