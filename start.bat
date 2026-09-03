@echo off
echo ===================================================
echo Starting AI Online Proctor & Exam Conductor Platform...
echo ===================================================

:: Ensure D:\Python311 and Scripts are in PATH for this session
set "PATH=D:\Python311;D:\Python311\Scripts;%PATH%"

echo Starting AI Proctoring Backend on port 8000...
start "AI Proctor - Backend" cmd /k "cd backend && python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"

echo Starting Candidate Exam & Proctor Frontend on port 5173...
start "AI Proctor - Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ===================================================
echo AI Online Proctor & Exam Conductor services launched!
echo Candidate & Proctor Portal: http://localhost:5173
echo AI Backend API:             http://127.0.0.1:8000
echo ===================================================
