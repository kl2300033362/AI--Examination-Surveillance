# Multi-stage build for AI Online Examination Surveillance Platform
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive

WORKDIR /app

# Install system dependencies for OpenCV, MediaPipe, Audio, and Node.js
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    portaudio19-dev \
    libasound2-dev \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Install Frontend dependencies
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci

# Copy project files
COPY . .

# Build frontend
RUN cd frontend && npm run build

# Ensure runtime directories exist
RUN mkdir -p logs data/database data/screenshots backend/data/screenshots

EXPOSE 8000 5173

# Default entrypoint starts backend and frontend preview
CMD ["sh", "-c", "python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 & cd frontend && npm run preview -- --host 0.0.0.0 --port 5173 & wait"]
