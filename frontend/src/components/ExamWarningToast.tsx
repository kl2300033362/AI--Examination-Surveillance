import React, { useEffect, useState, useRef } from 'react';
import type { WSEvent } from '../hooks/useWebSocket';
import { 
  AlertTriangle, 
  XCircle, 
  X, 
  Eye, 
  Users, 
  Smartphone, 
  BookOpen, 
  ShieldAlert, 
  Lock, 
  RefreshCw 
} from 'lucide-react';
import clsx from 'clsx';

interface ExamWarningToastProps {
  event: WSEvent | null;
  maxWarnings?: number;
  onDismiss?: () => void;
}

export const ExamWarningToast: React.FC<ExamWarningToastProps> = ({ 
  event, 
  maxWarnings = 10,
  onDismiss 
}) => {
  const [visible, setVisible] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<WSEvent | null>(null);
  const [progress, setProgress] = useState(100);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Play synthetic Web Audio warning chime
  const playChime = (isCritical: boolean) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      
      const ctx = audioContextRef.current || new AudioCtx();
      audioContextRef.current = ctx;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (isCritical) {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch {
      // Audio context might be restricted before interaction
    }
  };

  useEffect(() => {
    if (event && (event.type === 'warning' || event.type === 'critical')) {
      setCurrentEvent(event);
      setVisible(true);
      setProgress(100);
      
      const isCritical = event.type === 'critical' || (event.warning_number && event.warning_number >= maxWarnings);
      if (event.warning_number && event.warning_number >= maxWarnings) {
        setIsLockedOut(true);
      }

      playChime(isCritical);

      // Auto dismiss for non-critical warnings
      if (!isCritical) {
        const duration = 6000;
        const interval = 50;
        const step = (interval / duration) * 100;

        const timer = setInterval(() => {
          setProgress(prev => {
            if (prev <= 0) {
              clearInterval(timer);
              setVisible(false);
              return 0;
            }
            return prev - step;
          });
        }, interval);

        return () => clearInterval(timer);
      }
    }
  }, [event, maxWarnings]);

  if (!visible || !currentEvent) return null;

  const eventType = currentEvent.event_type || 'PROCTOR_WARNING';
  const isCritical = currentEvent.type === 'critical' || (currentEvent.warning_number && currentEvent.warning_number >= maxWarnings);

  // Get specific guidance based on detection type
  const getViolationDetails = () => {
    switch (eventType) {
      case 'DROWSINESS':
        return {
          icon: <Eye className="text-amber-400" size={32} />,
          title: 'DROWSINESS / EYE CLOSURE DETECTED',
          message: 'Prolonged eye closure or drowsiness detected. Please keep your eyes open and focus on the examination.',
          badge: 'Drowsiness Alert'
        };
      case 'HEAD_TURNED':
        return {
          icon: <Eye className="text-amber-400" size={32} />,
          title: 'HEAD TURN DETECTED',
          message: 'Your head turned away from the screen. Please look directly at your examination monitor.',
          badge: 'Gaze Violation'
        };
      case 'MULTIPLE_FACES':
        return {
          icon: <Users className="text-red-400" size={32} />,
          title: 'UNAUTHORIZED PERSON DETECTED',
          message: 'Another person was found in your camera view! No other individuals are permitted in the exam area.',
          badge: 'Room Integrity Breach'
        };
      case 'PHONE_DETECTED':
        return {
          icon: <Smartphone className="text-red-400" size={32} />,
          title: 'MOBILE PHONE DETECTED',
          message: 'An unauthorized mobile device was detected in your camera field. Remove it immediately.',
          badge: 'Prohibited Device'
        };
      case 'BOOK_DETECTED':
        return {
          icon: <BookOpen className="text-amber-400" size={32} />,
          title: 'BOOK / NOTES DETECTED',
          message: 'Study materials, books, or notes detected. Reference items are strictly forbidden.',
          badge: 'Cheat Material'
        };
      case 'LAPTOP_DETECTED':
      case 'ELECTRONIC_DEVICE_DETECTED':
      case 'SMARTWATCH_DETECTED':
        return {
          icon: <Smartphone className="text-red-400" size={32} />,
          title: 'UNAUTHORIZED DEVICE DETECTED',
          message: 'Secondary electronic screen or gadget detected in test environment.',
          badge: 'Device Policy Violation'
        };
      case 'FACE_BLURRY':
        return {
          icon: <AlertTriangle className="text-amber-400" size={32} />,
          title: 'BLURRY CAMERA FEED',
          message: 'Your camera picture is severely blurry or out of focus. Please adjust lighting and clean your lens.',
          badge: 'Video Quality Issue'
        };
      case 'CAMERA_BLOCKED':
      case 'FACE_NOT_DETECTED':
        return {
          icon: <XCircle className="text-red-400" size={32} />,
          title: 'CANDIDATE ABSENT / CAMERA OBSCURED',
          message: 'Candidate face is missing or camera view is completely blocked.',
          badge: 'Absence Infraction'
        };
      case 'TAB_SWITCH_DETECTED':
        return {
          icon: <ShieldAlert className="text-red-400" size={32} />,
          title: 'BROWSER TAB SWITCH DETECTED',
          message: 'You switched away from the active exam window. Window navigation is prohibited.',
          badge: 'Browser Navigation'
        };
      default:
        return {
          icon: <AlertTriangle className="text-amber-400" size={32} />,
          title: eventType.replace(/_/g, ' '),
          message: currentEvent.description || 'An examination irregularity was detected.',
          badge: 'Proctor Alert'
        };
    }
  };

  const details = getViolationDetails();
  const warningNum = currentEvent.warning_number || 1;
  const remaining = Math.max(0, maxWarnings - warningNum);

  return (
    <>
      {/* Top Floating Pop-up Banner */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-xl animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto">
        <div className={clsx(
          "relative overflow-hidden rounded-2xl p-5 shadow-2xl border backdrop-blur-2xl transition-all",
          isCritical 
            ? "bg-gradient-to-r from-red-950/95 via-slate-950/95 to-red-950/95 border-red-500 ring-2 ring-red-500/50 shadow-red-900/40" 
            : "bg-gradient-to-r from-amber-950/95 via-slate-950/95 to-amber-950/95 border-amber-500 ring-2 ring-amber-500/40 shadow-amber-900/30"
        )}>
          {/* Progress bar countdown */}
          {!isCritical && (
            <div 
              className="absolute bottom-0 left-0 h-1 bg-amber-500/80 transition-all ease-linear"
              style={{ width: `${progress}%` }}
            />
          )}

          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className={clsx(
              "p-3 rounded-xl shrink-0 border",
              isCritical ? "bg-red-900/40 border-red-500/50 animate-pulse" : "bg-amber-900/40 border-amber-500/50"
            )}>
              {details.icon}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={clsx(
                  "text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-full border",
                  isCritical ? "bg-red-500 text-white border-red-400" : "bg-amber-500/30 text-amber-300 border-amber-400/50"
                )}>
                  {isCritical ? '🚨 CRITICAL VIOLATION' : '⚠️ PROCTOR WARNING'}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {details.badge}
                </span>
              </div>

              <h3 className="text-base font-bold text-white tracking-wide">
                {details.title}
              </h3>

              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {details.message}
              </p>

              {/* Warning Count Tally */}
              <div className="mt-3 flex items-center justify-between pt-2.5 border-t border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-300">Warning Strike:</span>
                  <span className={clsx(
                    "font-bold font-mono px-2 py-0.5 rounded",
                    isCritical ? "bg-red-900 text-red-200" : "bg-amber-900 text-amber-200"
                  )}>
                    {warningNum} / {maxWarnings}
                  </span>
                </div>
                
                <span className={clsx("font-semibold", remaining === 0 ? "text-red-400 font-bold" : "text-slate-400")}>
                  {remaining > 0 ? `${remaining} warning${remaining > 1 ? 's' : ''} left before disqualification` : 'DISQUALIFICATION LIMIT REACHED'}
                </span>
              </div>
            </div>

            {/* Dismiss Button */}
            <button 
              onClick={() => {
                setVisible(false);
                if (onDismiss) onDismiss();
              }}
              className="text-slate-400 hover:text-white p-1.5 hover:bg-slate-800 rounded-lg transition shrink-0"
              title="Acknowledge & Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Critical Exam Limit Reached Modal */}
      {isLockedOut && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in">
          <div className="max-w-md w-full glass-panel p-8 text-center border-red-500/80 ring-4 ring-red-600/30">
            <div className="w-16 h-16 bg-red-900/50 border-2 border-red-500 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
              <Lock size={32} />
            </div>
            
            <h2 className="text-2xl font-black text-white mb-2">EXAMINATION SUSPENDED</h2>
            <p className="text-sm text-red-300 mb-4 font-semibold">
              Maximum proctoring violation limit ({maxWarnings}/{maxWarnings}) exceeded.
            </p>
            
            <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 text-left text-xs text-slate-300 space-y-2 mb-6 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Infractions:</span>
                <span className="text-red-400 font-bold">{warningNum}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Last Trigger:</span>
                <span className="text-amber-400 font-bold">{details.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Proctor Status:</span>
                <span className="text-red-400 font-bold">FLAGGED FOR AUDIT</span>
              </div>
            </div>

            <p className="text-xs text-slate-400 mb-6">
              Your examination session and video telemetry have been recorded for proctor review.
            </p>

            <button 
              onClick={() => setIsLockedOut(false)}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 py-2.5 rounded-xl font-bold text-xs border border-slate-700 transition active:scale-95 flex items-center justify-center gap-2"
            >
              <RefreshCw size={14} /> Review Candidate Audit Report
            </button>
          </div>
        </div>
      )}
    </>
  );
};
