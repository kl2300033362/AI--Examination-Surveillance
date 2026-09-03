import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  ShieldCheck, 
  Bookmark, 
  ChevronLeft, 
  ChevronRight, 
  Send, 
  Maximize, 
  Minimize,
  Award,
  RotateCcw,
  Sparkles,
  Play
} from 'lucide-react';
import clsx from 'clsx';

interface Question {
  id: number;
  category: string;
  question: string;
  codeSnippet?: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

const EXAM_QUESTIONS: Question[] = [
  {
    id: 1,
    category: "Computer Vision & AI",
    question: "Which facial landmark landmarking technique is commonly used to estimate 3D head pose (Yaw, Pitch, Roll) from a 2D webcam stream?",
    options: [
      "Perspective-n-Point (PnP) algorithm with 3D facial landmarks",
      "K-Means Clustering on pixel intensities",
      "Haar Cascades feature vector subtraction",
      "Fourier Fast Transform (FFT) on grayscale masks"
    ],
    correctAnswer: 0,
    explanation: "Perspective-n-Point (PnP) maps 2D facial landmark points (e.g. nose tip, eye corners, chin) to a standard 3D face model to compute rotation vectors."
  },
  {
    id: 2,
    category: "AI & Object Detection",
    question: "In real-time YOLOv8 object detection, what is the role of Non-Maximum Suppression (NMS)?",
    codeSnippet: `results = model(frame, conf=0.5, iou=0.45)`,
    options: [
      "It converts bounding boxes from RGB to CMYK color space",
      "It filters out redundant overlapping bounding boxes for the same object",
      "It doubles the frame resolution before inferencing",
      "It compresses the model weights into FP16 format"
    ],
    correctAnswer: 1,
    explanation: "Non-Maximum Suppression (NMS) suppresses overlapping bounding box proposals that exceed the Intersection-over-Union (IoU) threshold, keeping only the highest confidence detection."
  },
  {
    id: 3,
    category: "System Design & Security",
    question: "Which WebSocket protocol mechanism ensures connection liveness between a proctoring client and server?",
    options: [
      "DNS reverse lookups",
      "Ping/Pong heartbeat frames",
      "HTTP/2 header compression",
      "SSL Certificate renewal handshakes"
    ],
    correctAnswer: 1,
    explanation: "Ping/Pong heartbeat frames verify that the bidirectional WebSocket pipe is active and quickly detect network disconnections."
  },
  {
    id: 4,
    category: "Data Structures & Algorithms",
    question: "What is the average time complexity of searching for an item in a balanced Binary Search Tree (AVL or Red-Black Tree)?",
    options: [
      "O(1)",
      "O(n)",
      "O(log n)",
      "O(n log n)"
    ],
    correctAnswer: 2,
    explanation: "In a balanced BST with n nodes, the maximum height is strictly logarithmic (O(log n)), guaranteeing O(log n) lookup, insertion, and deletion."
  },
  {
    id: 5,
    category: "Image Processing",
    question: "What mathematical operator is widely applied to compute variance for blur/sharpness detection in video feeds?",
    codeSnippet: `sharpness = cv2.Laplacian(gray_frame, cv2.CV_64F).var()`,
    options: [
      "Laplacian 2nd-order derivative operator",
      "Gaussian Blur Kernel radius",
      "Canny Edge Hysteresis thresholding",
      "Sobel Horizontal Gradient filter"
    ],
    correctAnswer: 0,
    explanation: "The variance of the Laplacian highlights rapid intensity changes (edges). In-focus images produce high Laplacian variance, while blurry images produce low variance."
  },
  {
    id: 6,
    category: "Web Engineering",
    question: "Which React 19 hook or optimization pattern ensures expensive calculations are not re-executed on every render unless dependencies change?",
    options: [
      "useId()",
      "useMemo()",
      "useDebugValue()",
      "useImperativeHandle()"
    ],
    correctAnswer: 1,
    explanation: "useMemo caches the result of a calculation between renders, only recalculating when one of its specified dependencies changes."
  },
  {
    id: 7,
    category: "Machine Learning",
    question: "In classification problems, what metric represents the proportion of true positives among all instances that were predicted as positive?",
    options: [
      "Recall (Sensitivity)",
      "Precision (Positive Predictive Value)",
      "Accuracy",
      "Specificity"
    ],
    correctAnswer: 1,
    explanation: "Precision is calculated as True Positives / (True Positives + False Positives), measuring how accurate positive predictions are."
  },
  {
    id: 8,
    category: "Web Security",
    question: "What browser security policy prevents unauthorized cross-origin requests from stealing authenticated credentials?",
    options: [
      "CORS (Cross-Origin Resource Sharing) with credentials flag",
      "DNS Prefetching",
      "HTTP Strict Transport Security (HSTS) preload",
      "Brotli Compression Header"
    ],
    correctAnswer: 0,
    explanation: "CORS controls which external origins are allowed to read resource responses, and requires explicit 'Access-Control-Allow-Origin' credentials handling."
  }
];

interface ExamRoomProps {
  status: any;
  backendUrl: string;
  isMonitoring: boolean;
  onStart: () => void;
  onStop: () => void;
}

export const ExamRoom: React.FC<ExamRoomProps> = ({ 
  status, 
  backendUrl, 
  isMonitoring, 
  onStart, 
  onStop 
}) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<{ [key: number]: number }>({});
  const [flagged, setFlagged] = useState<{ [key: number]: boolean }>({});
  const [timeLeft, setTimeLeft] = useState(1800); // 30 minutes in seconds
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Tab switch anti-cheat detection - only active during exam surveillance
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && !isSubmitted && isMonitoring) {
        // Trigger simulated Tab Switch infraction
        fetch(`${backendUrl}/api/monitoring/simulate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_type: 'TAB_SWITCH_DETECTED',
            metadata: { note: 'Candidate switched browser tab during active exam' }
          })
        }).catch(console.error);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [backendUrl, isSubmitted, isMonitoring]);

  // Countdown timer - only runs when surveillance is actively started
  useEffect(() => {
    if (isSubmitted || timeLeft <= 0 || !isMonitoring) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setIsSubmitted(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isSubmitted, timeLeft, isMonitoring]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(console.error);
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(console.error);
      setIsFullscreen(false);
    }
  };

  const handleSelectOption = (optionIdx: number) => {
    setAnswers(prev => ({ ...prev, [currentIdx]: optionIdx }));
  };

  const handleClearOption = () => {
    setAnswers(prev => {
      const next = { ...prev };
      delete next[currentIdx];
      return next;
    });
  };

  const toggleFlag = () => {
    setFlagged(prev => ({ ...prev, [currentIdx]: !prev[currentIdx] }));
  };

  // Calculate integrity score (100% minus 10% per warning strike)
  const totalWarnings = status.total_warnings || 0;
  const integrityScore = Math.max(0, 100 - (totalWarnings * 10));

  // Current question data
  const currentQ = EXAM_QUESTIONS[currentIdx];
  const isAnswered = answers[currentIdx] !== undefined;
  const isFlagged = !!flagged[currentIdx];

  const handleFinalSubmit = () => {
    setIsSubmitted(true);
    if (onStop) {
      onStop();
    }
  };

  // Submission calculation
  const totalAnsweredCount = Object.keys(answers).length;
  let correctCount = 0;
  EXAM_QUESTIONS.forEach((q, idx) => {
    if (answers[idx] === q.correctAnswer) {
      correctCount += 1;
    }
  });

  return (
    <div className="space-y-6">
      {!isMonitoring ? (
        /* ================= PRE-EXAM VERIFICATION & START CHAMBER ================= */
        <div className="space-y-6">
          {/* Top Banner Alert */}
          <div className="glass-panel p-4 bg-gradient-to-r from-blue-950/80 via-slate-900/90 to-indigo-950/80 border-blue-500/40 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
                <Sparkles size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider font-mono">
                    Video Streaming Auto-Started & Live
                  </span>
                </div>
                <h2 className="text-lg font-black text-white mt-0.5">
                  Candidate Pre-Exam Chamber — Awaiting Start
                </h2>
                <p className="text-xs text-slate-300">
                  Your video stream is live. AI surveillance and exam questions will only begin when you click <b>START</b>.
                </p>
              </div>
            </div>

            <button
              onClick={onStart}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-xl shadow-emerald-600/30 hover:shadow-emerald-500/50 transition-all transform active:scale-95 flex items-center gap-2.5 ring-2 ring-emerald-400/40 animate-pulse shrink-0"
            >
              <Play size={18} className="fill-white" />
              START PROTECTED EXAM
            </button>
          </div>

          {/* Main Pre-Exam Grid: Live Stream on Left, Rules & Readiness on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Live Camera Viewport (7 Cols) */}
            <div className="lg:col-span-7 glass-panel p-5 bg-slate-950/80 border-slate-800 rounded-2xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      Live Candidate Webcam Preview
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                    30 FPS STREAMING
                  </span>
                </div>

                {/* Video Monitor Frame */}
                <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center">
                  <img
                    src={`${backendUrl}/api/monitoring/video_feed`}
                    alt="Pre-exam live candidate stream"
                    className="w-full h-full object-cover"
                  />

                  {/* On-Stream Live Badge */}
                  <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-md px-3 py-1 rounded-lg border border-slate-700/80 text-[10px] font-mono text-slate-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>AUTOMATIC VIDEO FEED: LIVE</span>
                  </div>

                  {/* AI Surveillance Status Badge */}
                  <div className="absolute top-3 right-3 bg-amber-950/80 backdrop-blur-md px-3 py-1 rounded-lg border border-amber-500/50 text-[10px] font-mono text-amber-300 font-bold">
                    AI SURVEILLANCE: STANDBY (CLICK START)
                  </div>

                  {/* Center Crosshair Framing Guide */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30">
                    <div className="w-48 h-64 border border-dashed border-emerald-400 rounded-3xl" />
                  </div>

                  {/* Bottom Stream Note */}
                  <div className="absolute bottom-3 inset-x-3 bg-black/75 backdrop-blur-md p-2 rounded-lg border border-slate-700/80 text-[11px] text-center text-slate-300 font-mono">
                    Ensure your face is clearly lit and centered within the framing guide before clicking START.
                  </div>
                </div>
              </div>

              {/* Camera Diagnostics */}
              <div className="grid grid-cols-3 gap-3 mt-4 text-center font-mono text-xs">
                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">WEBCAM PIPELINE</span>
                  <span className="text-emerald-400 font-bold">CONNECTED</span>
                </div>
                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">STREAM MODE</span>
                  <span className="text-blue-400 font-bold">CONTINUOUS</span>
                </div>
                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">AI SURVEILLANCE</span>
                  <span className="text-amber-400 font-bold">WAITING FOR START</span>
                </div>
              </div>
            </div>

            {/* Exam Information & Readiness Checklist (5 Cols) */}
            <div className="lg:col-span-5 space-y-4">
              {/* Exam Info Card */}
              <div className="glass-panel p-5 bg-slate-950/80 border-slate-800 rounded-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                  <span className="text-xs font-bold text-primary uppercase font-mono">Certification Exam</span>
                  <span className="text-xs text-slate-400 font-mono">30 Minutes</span>
                </div>
                <h3 className="text-base font-black text-white">
                  National AI & Software Engineering Certification Exam
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Candidate: <b>Alex Rivera</b> (ID: #CAN-9041)
                </p>

                <div className="grid grid-cols-2 gap-3 mt-4 text-xs font-mono">
                  <div className="bg-slate-900/70 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">TOTAL QUESTIONS</span>
                    <span className="text-white font-bold">{EXAM_QUESTIONS.length} Questions</span>
                  </div>
                  <div className="bg-slate-900/70 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">ALLOWED STRIKES</span>
                    <span className="text-amber-400 font-bold">10 Warnings Max</span>
                  </div>
                </div>
              </div>

              {/* Pre-Exam Checklist */}
              <div className="glass-panel p-5 bg-slate-950/80 border-slate-800 rounded-2xl space-y-3">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Pre-Exam Surveillance Checklist
                </h4>
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <div className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-[10px] font-bold">✓</div>
                    <span>Webcam streaming active and transmitting video feed</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-400">
                    <div className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-[10px] font-bold">✓</div>
                    <span>Date & time stamped screenshot evidence archive armed</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <div className="w-4 h-4 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-[10px] font-bold">!</div>
                    <span>AI face, drowsiness, pose & device tracking will activate on START</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <div className="w-4 h-4 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-[10px] font-bold">!</div>
                    <span>Tab switching or minimizing will trigger proctor infractions</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800">
                  <button
                    onClick={onStart}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/30 transition active:scale-95 flex items-center justify-center gap-2 ring-2 ring-emerald-400/40 animate-pulse"
                  >
                    <Play size={16} className="fill-white" />
                    CLICK TO START PROTECTED EXAM
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ================= ACTIVE EXAM CONDUCTION & AI SURVEILLANCE ================= */
        <div className="space-y-6">
          {/* Active Surveillance Status Banner */}
          <div className="glass-panel p-3.5 bg-emerald-950/40 border-emerald-500/40 rounded-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
              <div>
                <span className="text-xs font-bold text-emerald-400 uppercase font-mono block">
                  PROTECTED EXAM CONDUCTION ACTIVE
                </span>
                <span className="text-[11px] text-slate-300">
                  AI video surveillance, gaze tracking, multiple faces & device detection engaged
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="bg-black/60 text-slate-300 px-3 py-1 rounded-lg text-xs font-mono border border-slate-700">
                Session #{status?.current_session_id || 1}
              </span>
            </div>
          </div>

          {/* Exam Header Bar */}
          <div className="glass-panel p-4 bg-slate-900/80 border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded text-[11px] font-bold uppercase">
                  Proctored Live Session
                </span>
                <span className="text-xs text-slate-400 font-mono">Code: AI-EXAM-2026</span>
              </div>
              <h1 className="text-lg md:text-xl font-black text-white mt-1">
                National AI & Software Engineering Certification Exam
              </h1>
              <p className="text-xs text-slate-400">Candidate: Alex Rivera (ID: #CAN-9041)</p>
            </div>

            {/* Status Indicators */}
            <div className="flex items-center gap-4 flex-wrap">
              {/* Integrity Score */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/70 border border-slate-800">
                <ShieldCheck className={integrityScore > 75 ? "text-emerald-400" : integrityScore > 40 ? "text-amber-400" : "text-red-400"} size={18} />
                <div className="text-xs">
                  <span className="text-slate-400 block text-[10px]">Integrity Score</span>
                  <span className={clsx("font-bold font-mono", integrityScore > 75 ? "text-emerald-400" : integrityScore > 40 ? "text-amber-400" : "text-red-400")}>
                    {integrityScore}%
                  </span>
                </div>
              </div>

              {/* Countdown Clock */}
              <div className={clsx(
                "flex items-center gap-2 px-4 py-2 rounded-xl border font-mono font-bold text-sm shadow-lg",
                timeLeft < 300 
                  ? "bg-red-950/80 border-red-500 text-red-300 animate-pulse" 
                  : "bg-slate-950/80 border-slate-800 text-white"
              )}>
                <Clock size={16} className={timeLeft < 300 ? "text-red-400" : "text-primary"} />
                <span>{formatTime(timeLeft)}</span>
              </div>

              {/* Fullscreen Toggle */}
              <button 
                onClick={toggleFullscreen}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              >
                {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
              </button>
            </div>
          </div>

          {/* Main Exam Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Col (3 Cols) - Question Card */}
        <div className="lg:col-span-3 space-y-6">
          <div className="glass-panel p-6 bg-slate-950/70 border-slate-800">
            {/* Question Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-primary/20 text-primary font-bold flex items-center justify-center text-sm border border-primary/40">
                  Q{currentIdx + 1}
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {currentQ.category}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={toggleFlag}
                  className={clsx(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition",
                    isFlagged 
                      ? "bg-amber-950/80 border-amber-500 text-amber-300" 
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                  )}
                >
                  <Bookmark size={14} className={isFlagged ? "fill-amber-400" : ""} />
                  {isFlagged ? "Flagged for Review" : "Flag for Review"}
                </button>
              </div>
            </div>

            {/* Question Prompt */}
            <h2 className="text-base md:text-lg font-semibold text-slate-100 leading-relaxed mb-4">
              {currentQ.question}
            </h2>

            {/* Code Snippet if present */}
            {currentQ.codeSnippet && (
              <pre className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 text-xs font-mono text-blue-300 overflow-x-auto mb-6">
                <code>{currentQ.codeSnippet}</code>
              </pre>
            )}

            {/* Option Choices */}
            <div className="space-y-3 mt-6">
              {currentQ.options.map((option, optIdx) => {
                const isSelected = answers[currentIdx] === optIdx;
                return (
                  <label
                    key={optIdx}
                    onClick={() => handleSelectOption(optIdx)}
                    className={clsx(
                      "flex items-start gap-3.5 p-4 rounded-xl border cursor-pointer transition-all",
                      isSelected 
                        ? "bg-primary/15 border-primary text-white ring-1 ring-primary/40 shadow-lg shadow-blue-500/10" 
                        : "bg-slate-900/50 border-slate-800 text-slate-300 hover:bg-slate-850 hover:border-slate-700"
                    )}
                  >
                    <div className={clsx(
                      "w-5 h-5 rounded-full border flex items-center justify-center text-xs font-bold mt-0.5 shrink-0 transition",
                      isSelected ? "border-primary bg-primary text-white" : "border-slate-600 bg-slate-800 text-slate-400"
                    )}>
                      {String.fromCharCode(65 + optIdx)}
                    </div>
                    <span className="text-sm font-medium leading-normal flex-1">
                      {option}
                    </span>
                  </label>
                );
              })}
            </div>

            {/* Question Footer Navigation */}
            <div className="flex items-center justify-between pt-6 mt-8 border-t border-slate-800">
              <button
                onClick={handleClearOption}
                disabled={!isAnswered}
                className={clsx(
                  "text-xs text-slate-400 hover:text-slate-200 transition",
                  !isAnswered && "opacity-40 cursor-not-allowed"
                )}
              >
                Clear Selection
              </button>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
                  disabled={currentIdx === 0}
                  className={clsx(
                    "flex items-center gap-1 px-4 py-2 rounded-lg text-xs font-bold bg-slate-900 border border-slate-800 text-slate-300 transition",
                    currentIdx === 0 ? "opacity-40 cursor-not-allowed" : "hover:bg-slate-800 hover:text-white"
                  )}
                >
                  <ChevronLeft size={16} /> Previous
                </button>

                {currentIdx < EXAM_QUESTIONS.length - 1 ? (
                  <button
                    onClick={() => setCurrentIdx(prev => Math.min(EXAM_QUESTIONS.length - 1, prev + 1))}
                    className="flex items-center gap-1 px-5 py-2 rounded-lg text-xs font-bold bg-primary hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 transition active:scale-95"
                  >
                    Next <ChevronRight size={16} />
                  </button>
                ) : (
                  <button
                    onClick={handleFinalSubmit}
                    className="flex items-center gap-1.5 px-6 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 transition active:scale-95"
                  >
                    <Send size={14} /> Finish Exam
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Col (1 Col) - Question Palette & Anti-Cheat Status */}
        <div className="space-y-6">
          {/* Question Palette Matrix */}
          <div className="glass-panel p-5 bg-slate-950/70 border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
              Question Palette
            </h3>

            <div className="grid grid-cols-4 gap-2.5">
              {EXAM_QUESTIONS.map((q, idx) => {
                const ans = answers[idx] !== undefined;
                const flg = !!flagged[idx];
                const active = currentIdx === idx;

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIdx(idx)}
                    className={clsx(
                      "h-10 rounded-xl font-bold text-xs flex items-center justify-center border transition-all relative",
                      active ? "ring-2 ring-blue-400 scale-105" : "",
                      ans ? "bg-emerald-600 text-white border-emerald-500 shadow-sm" : 
                      flg ? "bg-amber-600 text-white border-amber-500 shadow-sm" : 
                      "bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700"
                    )}
                  >
                    {idx + 1}
                    {flg && (
                      <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-6 pt-4 border-t border-slate-800 space-y-2 text-[11px] text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-emerald-600 border border-emerald-500" />
                <span>Answered ({totalAnsweredCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-amber-600 border border-amber-500" />
                <span>Marked for Review ({Object.values(flagged).filter(Boolean).length})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-slate-900 border border-slate-800" />
                <span>Unvisited ({EXAM_QUESTIONS.length - totalAnsweredCount})</span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              onClick={() => {
                if (window.confirm(`Are you ready to submit your exam? You have answered ${totalAnsweredCount} of ${EXAM_QUESTIONS.length} questions.`)) {
                  handleFinalSubmit();
                }
              }}
              className="w-full mt-6 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-emerald-600/20 transition active:scale-95 flex items-center justify-center gap-2"
            >
              <Send size={14} /> Submit Final Answers
            </button>
          </div>

          {/* AI Proctoring Rules Banner */}
          <div className="glass-panel p-4 bg-slate-900/60 border-slate-800 text-xs space-y-2.5">
            <h4 className="font-bold text-slate-300 flex items-center gap-1.5">
              <Sparkles size={14} className="text-primary" /> Active Proctoring Rules
            </h4>
            <ul className="text-[11px] text-slate-400 space-y-1 list-disc pl-4 leading-relaxed">
              <li>Keep your face centered in the camera feed.</li>
              <li>Only the candidate is permitted in the room.</li>
              <li>No smartphones, laptops, or cheat materials.</li>
              <li>Maintain clear camera lighting and focus.</li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  )}

      {/* Submission & Proctor Audit Modal */}
      {isSubmitted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
          <div className="max-w-lg w-full glass-panel p-8 text-center border-primary/50 ring-2 ring-primary/20">
            <div className="w-16 h-16 bg-emerald-900/50 border-2 border-emerald-500 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Award size={36} />
            </div>

            <h2 className="text-2xl font-black text-white mb-1">Exam Completed & Submitted</h2>
            <p className="text-xs text-slate-400 mb-6">
              AI Proctoring telemetry and assessment answers verified.
            </p>

            {/* Scorecard Matrix */}
            <div className="grid grid-cols-3 gap-3 mb-6 font-mono text-center">
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">Exam Score</span>
                <span className="text-xl font-bold text-primary">
                  {correctCount}/{EXAM_QUESTIONS.length}
                </span>
              </div>
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">Accuracy</span>
                <span className="text-xl font-bold text-emerald-400">
                  {Math.round((correctCount / EXAM_QUESTIONS.length) * 100)}%
                </span>
              </div>
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">Integrity</span>
                <span className={clsx("text-xl font-bold", integrityScore > 75 ? "text-emerald-400" : "text-amber-400")}>
                  {integrityScore}%
                </span>
              </div>
            </div>

            {/* Proctoring Verification Badge */}
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 text-left text-xs text-slate-300 space-y-2 mb-6 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Candidate:</span>
                <span className="text-white font-bold">Alex Rivera (#CAN-9041)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Irregularities:</span>
                <span className={totalWarnings > 0 ? "text-amber-400 font-bold" : "text-emerald-400 font-bold"}>
                  {totalWarnings} Recorded
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Certification Status:</span>
                <span className={integrityScore > 60 ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                  {integrityScore > 60 ? "PROCTOR VERIFIED - PASSED" : "FLAGGED FOR EXAMINER AUDIT"}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                setIsSubmitted(false);
                setTimeLeft(1800);
                setAnswers({});
                setFlagged({});
                setCurrentIdx(0);
              }}
              className="w-full bg-primary hover:bg-blue-500 text-white py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-blue-500/20 transition active:scale-95 flex items-center justify-center gap-2"
            >
              <RotateCcw size={14} /> Start New Exam Session
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
