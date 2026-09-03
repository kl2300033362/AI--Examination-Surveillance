#!/usr/bin/env bash
set -e

echo "==================================================="
echo "Starting AI Online Proctor & Exam Conductor Platform..."
echo "==================================================="

# Check for .env file
if [ ! -f ".env" ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
fi

# Create runtime directories
mkdir -p logs data/database data/screenshots backend/data/screenshots

# Start backend in background
echo "Starting AI Proctoring Backend on port 8000..."
python3 -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Start frontend in background
echo "Starting Candidate Exam & Proctor Frontend on port 5173..."
cd frontend
npm run dev -- --host 0.0.0.0 &
FRONTEND_PID=$!
cd ..

echo ""
echo "==================================================="
echo "AI Online Proctor & Exam Conductor services launched!"
echo "Candidate & Proctor Portal: http://localhost:5173"
echo "AI Backend API:             http://localhost:8000"
echo "==================================================="
echo "Press Ctrl+C to stop both services."

cleanup() {
    echo ""
    echo "Shutting down services..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT
wait
