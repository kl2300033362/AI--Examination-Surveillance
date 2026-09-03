import os
import logging
try:
    import functools
    import torch
    if hasattr(torch, 'load'):
        _orig_load = torch.load
        torch.load = functools.partial(_orig_load, weights_only=False)
except Exception:
    pass

from ultralytics import YOLO
from backend.ai.base_detector import BaseDetector
from typing import Dict, Any, Optional

logger = logging.getLogger("ai_guardian.object_detector")

class ObjectDetector(BaseDetector):
    def __init__(self, confidence_threshold: float = 0.5):
        super().__init__()
        self.confidence_threshold = confidence_threshold
        try:
            # Check root, models dir or local
            root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            model_paths = [
                os.path.join(root_dir, "models", "yolov8n.pt"),
                os.path.join(root_dir, "yolov8n.pt"),
                "yolov8n.pt"
            ]
            chosen_path = "yolov8n.pt"
            for p in model_paths:
                if os.path.exists(p):
                    chosen_path = p
                    break
            self.model = YOLO(chosen_path)
            # COCO classes for exam proctoring:
            # 63: laptop, 65: remote (electronic device), 67: cell phone, 73: book, 74: clock (smartwatch)
            self.target_classes = {
                67: {"event_type": "PHONE_DETECTED", "label": "Mobile Phone"},
                73: {"event_type": "BOOK_DETECTED", "label": "Book / Notes"},
                63: {"event_type": "LAPTOP_DETECTED", "label": "Secondary Screen / Laptop"},
                74: {"event_type": "SMARTWATCH_DETECTED", "label": "Smartwatch / Clock"},
                65: {"event_type": "ELECTRONIC_DEVICE_DETECTED", "label": "Electronic Device"}
            }
        except Exception as e:
            logger.error(f"Failed to load YOLO model: {e}")
            self.enabled = False

    def process(self, frame, **kwargs) -> Optional[Dict[str, Any]]:
        if not self.enabled or frame is None:
            return None

        # Predict
        results = self.model(frame, verbose=False)
        
        detected_objects = []

        if results and len(results) > 0:
            result = results[0]
            boxes = result.boxes
            for box in boxes:
                cls_id = int(box.cls[0].item())
                conf = float(box.conf[0].item())
                
                if cls_id in self.target_classes and conf >= self.confidence_threshold:
                    target_info = self.target_classes[cls_id]
                    event_type = target_info["event_type"]
                    label = target_info["label"]
                    
                    xyxy = box.xyxy[0].tolist() if hasattr(box, 'xyxy') else []
                    detected_objects.append({
                        "event_type": event_type,
                        "label": label,
                        "confidence": round(conf, 2),
                        "bbox": [round(coord, 1) for coord in xyxy]
                    })

        if detected_objects:
            best_det = max(detected_objects, key=lambda x: x["confidence"])
            return {
                "detected": True,
                "event_type": best_det["event_type"],
                "confidence": best_det["confidence"],
                "metadata": {
                    "object_label": best_det["label"],
                    "all_detections": detected_objects,
                    "count": len(detected_objects)
                }
            }

        return {
            "detected": False,
            "event_type": "NORMAL",
            "confidence": 1.0,
            "metadata": {}
        }
