import os
import ctypes
import platform
import logging

logger = logging.getLogger("ai_guardian.system_lock")

class SystemLockService:
    def __init__(self, enabled: bool = None):
        if enabled is None:
            self.enabled = os.getenv("SYSTEM_LOCK_ENABLED", "false").lower() in ("true", "1", "yes")
        else:
            self.enabled = enabled

    def lock_system(self):
        if not self.enabled:
            logger.info("System lock requested but is currently disabled.")
            return False

        logger.warning("Initiating system lock...")
        try:
            current_os = platform.system()
            if current_os == "Windows":
                # Windows lock API
                ctypes.windll.user32.LockWorkStation()
                logger.info("Windows system locked successfully.")
                return True
            elif current_os == "Darwin": # macOS
                import os
                os.system('/System/Library/CoreServices/Menu\\ Extras/User.menu/Contents/Resources/CGSession -suspend')
                logger.info("macOS system locked successfully.")
                return True
            elif current_os == "Linux":
                import os
                # Common linux lock commands
                os.system('xdg-screensaver lock')
                logger.info("Linux system locked successfully.")
                return True
            else:
                logger.error(f"Unsupported OS for system lock: {current_os}")
                return False
        except Exception as e:
            logger.error(f"Failed to lock system: {e}")
            return False

system_lock_service = SystemLockService()
