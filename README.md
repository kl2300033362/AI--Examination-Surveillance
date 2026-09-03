# AI--Examination-Surveillance

AI Guardian is an automated, production-grade full-stack AI Online Exam Proctoring & Examination Surveillance Platform. It provides continuous video streaming, start-gated exam surveillance, real-time candidate verification, gaze tracking, multiple faces detection, electronic device detection, and date & time-stamped screenshot evidence recording.

## Architecture
- **Backend:** FastAPI, OpenCV, MediaPipe (Face/Landmarks/Drowsiness/Head Pose), Ultralytics YOLOv8 (Objects), PyAudio, SQLite + SQLAlchemy.
- **Frontend:** React, TypeScript, Vite, Tailwind CSS.
- **Communication:** REST APIs and WebSockets for real-time video streaming and warning popups.

## Features
- **Face & Drowsiness Detection**: Detects multiple faces, missing faces, and calculates Eye Aspect Ratio (EAR) for drowsiness.
- **Head Pose & Blur**: Detects if the user is looking away or if the camera is blurry.
- **Object Detection**: Detects cell phones, books, and watches using YOLOv8.
- **Audio Detection**: Monitors microphone volume for loud events.
- **Warning Engine**: Centralized system with cooldowns, temporal confirmation, and severity escalation.
- **Actions**: Triggers Telegram notifications, sound alarms, and Windows System Locks (if enabled) upon reaching a warning limit.

## Installation

### Requirements
- Python 3.11+
- Node.js & npm

### Setup
1. **Clone the repository.**
2. **Backend Setup**:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```
3. **Frontend Setup**:
   ```bash
   cd frontend
   npm install
   ```

## Environment Configuration
Copy `.env.example` to `.env` in the root folder and configure:
```
TELEGRAM_BOT_TOKEN=your_token
TELEGRAM_CHAT_ID=your_chat_id
SYSTEM_LOCK_ENABLED=false
```

## Running the Application
You can use the provided `start.bat` script on Windows, or start them manually:

**Terminal 1 (Backend):**
```bash
cd backend
uvicorn main:app --reload
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

## Security & Privacy
- All logs and events are stored locally in the SQLite database (`data/database/`).
- The camera and microphone are only active when monitoring is explicitly started via the dashboard.
- Telegram credentials must be kept secure in the `.env` file and should never be committed.

## Known Limitations
- YOLOv8 weights (`yolov8n.pt`) will automatically download on the first run, which may take a moment.
- System Lock currently uses Windows API (`ctypes.windll.user32.LockWorkStation`). Ensure `SYSTEM_LOCK_ENABLED` is true if you want to test it.
- **Disk Space**: Ensure your primary drive has adequate space to install Node modules and download YOLO weights.
