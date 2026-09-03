import os
import httpx
import logging
import asyncio
from backend.database.database import SessionLocal
from backend.database.models import NotificationLog

logger = logging.getLogger("ai_guardian.notification_service")

class NotificationService:
    def __init__(self):
        self.bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
        self.chat_id = os.getenv("TELEGRAM_CHAT_ID")
        self.enabled = bool(self.bot_token and self.chat_id)
        
        if not self.enabled:
            logger.warning("Telegram credentials not found. Notifications disabled.")

    async def send_telegram_message(self, message: str, event_id: int = None):
        if not self.enabled:
            return False
            
        url = f"https://api.telegram.org/bot{self.bot_token}/sendMessage"
        payload = {
            "chat_id": self.chat_id,
            "text": message,
            "parse_mode": "HTML"
        }
        
        status = "FAILED"
        error_msg = None
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload, timeout=10.0)
                if response.status_code == 200:
                    status = "SENT"
                    logger.info("Telegram notification sent successfully.")
                else:
                    error_msg = f"HTTP {response.status_code}: {response.text}"
                    logger.error(f"Failed to send telegram message: {error_msg}")
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Exception while sending telegram message: {error_msg}")
            
        if event_id:
            self._log_notification(event_id, "TELEGRAM", status, error_msg)
            
        return status == "SENT"
        
    def _log_notification(self, event_id: int, provider: str, status: str, error_message: str = None):
        db = SessionLocal()
        try:
            log = NotificationLog(
                event_id=event_id,
                provider=provider,
                status=status,
                error_message=error_message
            )
            db.add(log)
            db.commit()
        except Exception as e:
            logger.error(f"Failed to log notification: {e}")
        finally:
            db.close()

notification_service = NotificationService()
