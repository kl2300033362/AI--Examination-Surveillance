import threading
import logging
import platform
import time

logger = logging.getLogger("ai_guardian.alarm_service")

class AlarmService:
    def __init__(self):
        self.is_playing = False
        self.lock = threading.Lock()
        self.current_os = platform.system()

    def play_alarm(self, duration_seconds: int = 3):
        with self.lock:
            if self.is_playing:
                return
            self.is_playing = True

        logger.warning(f"Playing alarm for {duration_seconds} seconds...")
        threading.Thread(target=self._play_sound_loop, args=(duration_seconds,), daemon=True).start()

    def _play_sound_loop(self, duration_seconds: int):
        end_time = time.time() + duration_seconds
        try:
            if self.current_os == "Windows":
                import winsound
                while time.time() < end_time and self.is_playing:
                    winsound.Beep(1000, 500) # Frequency 1000Hz, duration 500ms
                    time.sleep(0.1)
            elif self.current_os == "Darwin": # macOS
                import os
                while time.time() < end_time and self.is_playing:
                    os.system("afplay /System/Library/Sounds/Ping.aiff")
            elif self.current_os == "Linux":
                import os
                while time.time() < end_time and self.is_playing:
                    os.system("play -n synth 0.5 sine 1000 2>/dev/null") # Requires sox
                    time.sleep(0.1)
            else:
                logger.error(f"Unsupported OS for alarm: {self.current_os}")
                time.sleep(duration_seconds)
        except Exception as e:
            logger.error(f"Failed to play alarm: {e}")
            
        with self.lock:
            self.is_playing = False

    def stop_alarm(self):
        with self.lock:
            self.is_playing = False
        logger.info("Alarm stopped manually.")

alarm_service = AlarmService()
