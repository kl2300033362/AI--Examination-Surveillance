from backend.ai.base_detector import BaseDetector
from typing import Dict, Any, Optional

class AudioDetector(BaseDetector):
    def __init__(self):
        super().__init__()
        self.enabled = False

    def start(self):
        pass

    def process(self, frame=None, **kwargs) -> Optional[Dict[str, Any]]:
        return None

    def stop(self):
        pass

