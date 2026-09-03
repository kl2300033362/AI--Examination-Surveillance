import os
import sys

# Ensure root directory is in sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

# PyTorch 2.6+ compatibility for model checkpoints
try:
    import functools
    import torch
    _orig_torch_load = torch.load
    torch.load = functools.partial(_orig_torch_load, weights_only=False)
except Exception:
    pass

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.database.database import engine, Base
import backend.database.models  # Ensures all model tables are registered in Base.metadata
import logging

# Create logs directory if it doesn't exist
os.makedirs("logs", exist_ok=True)

# Configure logging
logger = logging.getLogger("ai_guardian")
logger.setLevel(logging.INFO)

formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")

# Application log
app_handler = logging.FileHandler("logs/application.log")
app_handler.setFormatter(formatter)
logger.addHandler(app_handler)

# Error log
error_handler = logging.FileHandler("logs/errors.log")
error_handler.setLevel(logging.ERROR)
error_handler.setFormatter(formatter)
logger.addHandler(error_handler)

# Console log
console_handler = logging.StreamHandler()
console_handler.setFormatter(formatter)
logger.addHandler(console_handler)

# Create database tables
Base.metadata.create_all(bind=engine)

import contextlib
from backend.services.camera_service import camera_service

@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing camera service for automatic video streaming...")
    try:
        camera_service.start()
        logger.info("Camera service automatically started for continuous video streaming preview.")
    except Exception as e:
        logger.error(f"Failed to auto-start camera service on startup: {e}")
    yield
    logger.info("Shutting down camera service...")
    try:
        camera_service.stop()
    except Exception as e:
        logger.error(f"Failed to stop camera service on shutdown: {e}")

app = FastAPI(
    title="AI Guardian API",
    description="Backend API for AI Guardian - Intelligent Face, Drowsiness & Activity Monitoring System",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For development, allow all. In production, restrict this.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from backend.api import routes_monitoring, routes_status, routes_events

app.include_router(routes_monitoring.router, prefix="/api/monitoring", tags=["monitoring"])
app.include_router(routes_status.router, prefix="/api/status", tags=["status"])
app.include_router(routes_events.router, prefix="/api/events", tags=["events"])

@app.get("/")
def read_root():
    return {"message": "Welcome to AI Guardian API"}
