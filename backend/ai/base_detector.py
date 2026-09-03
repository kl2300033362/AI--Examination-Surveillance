from typing import Dict, Any, Optional

class BaseDetector:
    def __init__(self):
        self.enabled = True

    def process(self, frame, **kwargs) -> Optional[Dict[str, Any]]:
        """
        Process a frame and return detection results.
        Must return a dict in the following format if an event is detected:
        {
            "detected": bool,
            "event_type": str,
            "confidence": float,
            "metadata": dict
        }
        Return None if no relevant event is detected (or normal state).
        """
        raise NotImplementedError("Subclasses must implement process()")
