from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from backend.database.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password_hash = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class MonitoringSession(Base):
    __tablename__ = "monitoring_sessions"

    id = Column(Integer, primary_key=True, index=True)
    started_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    ended_at = Column(DateTime, nullable=True)
    status = Column(String, default="ACTIVE") # ACTIVE, COMPLETED, ERROR

    events = relationship("Event", back_populates="session")

class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("monitoring_sessions.id"), nullable=True)
    event_type = Column(String, index=True) # e.g., DROWSINESS, HEAD_TURNED, FACE_NOT_DETECTED
    severity = Column(String) # INFO, WARNING, CRITICAL
    confidence = Column(Float, nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    description = Column(Text, nullable=True)
    action_taken = Column(String, nullable=True)
    warning_number = Column(Integer, nullable=True)
    metadata_json = Column(JSON, nullable=True) # Renamed to metadata_json as metadata is a reserved attribute in SQLAlchemy DeclarativeBase

    session = relationship("MonitoringSession", back_populates="events")
    notification_logs = relationship("NotificationLog", back_populates="event")
    system_actions = relationship("SystemAction", back_populates="event")

class WarningCounter(Base):
    __tablename__ = "warning_counters"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String, unique=True, index=True)
    count = Column(Integer, default=0)
    last_triggered = Column(DateTime, nullable=True)

class Setting(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String, index=True) # e.g., face, drowsiness, general
    key = Column(String, unique=True, index=True)
    value = Column(String) # Store as string, parse as needed
    description = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

class NotificationLog(Base):
    __tablename__ = "notification_logs"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"))
    provider = Column(String) # e.g., TELEGRAM
    status = Column(String) # SENT, FAILED
    sent_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    error_message = Column(Text, nullable=True)

    event = relationship("Event", back_populates="notification_logs")

class SystemAction(Base):
    __tablename__ = "system_actions"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"))
    action = Column(String) # e.g., LOCK_SYSTEM, ALARM
    status = Column(String) # SUCCESS, FAILED
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    event = relationship("Event", back_populates="system_actions")
