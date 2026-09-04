import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, 
  Move, 
  Maximize2, 
  Minimize2, 
  X, 
  Sparkles,
  CornerDownLeft,
  CornerDownRight,
  CornerUpLeft,
  CornerUpRight,
  Eye,
  Users,
  Smartphone,
  BookOpen
} from 'lucide-react';
import { WebcamView } from './WebcamView';
import clsx from 'clsx';

interface FloatingProctorCameraProps {
  status: any;
  isMonitoring: boolean;
  backendUrl: string;
  onStart?: () => void;
  onStop?: () => void;
  webcamStream?: MediaStream | null;
}

export const FloatingProctorCamera: React.FC<FloatingProctorCameraProps> = ({
  status,
  isMonitoring,
  backendUrl,
  onStart,
  onStop: _onStop,
  webcamStream
}) => {
  const [minimized, setMinimized] = useState(false);
  const [closed, setClosed] = useState(false);
  
  // Position coordinates (default top-right edge)
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    const saved = localStorage.getItem('proctor_cam_pos');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    // Default to top-right edge with 24px margin
    return { x: window.innerWidth - 340, y: 24 };
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; posX: number; posY: number }>({
    startX: 0,
    startY: 0,
    posX: 0,
    posY: 0
  });

  const widgetRef = useRef<HTMLDivElement>(null);

  // Save position when changed
  useEffect(() => {
    localStorage.setItem('proctor_cam_pos', JSON.stringify(position));
  }, [position]);

  // Handle window resizing to keep inside viewport
  useEffect(() => {
    const handleResize = () => {
      const widgetWidth = minimized ? 200 : 320;
      const widgetHeight = minimized ? 60 : 260;
      setPosition(prev => ({
        x: Math.min(Math.max(10, prev.x), window.innerWidth - widgetWidth - 10),
        y: Math.min(Math.max(10, prev.y), window.innerHeight - widgetHeight - 10)
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [minimized]);

  // Start dragging on cursor mousedown / touchstart
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    dragRef.current = {
      startX: clientX,
      startY: clientY,
      posX: position.x,
      posY: position.y
    };
  };

  // Dragging event listeners on window for smooth 360 degree movement
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      
      const deltaX = clientX - dragRef.current.startX;
      const deltaY = clientY - dragRef.current.startY;
      
      const widgetWidth = minimized ? 200 : 320;
      const widgetHeight = minimized ? 60 : 260;
      
      const newX = Math.min(Math.max(8, dragRef.current.posX + deltaX), window.innerWidth - widgetWidth - 8);
      const newY = Math.min(Math.max(8, dragRef.current.posY + deltaY), window.innerHeight - widgetHeight - 8);
      
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleMouseMove);
      window.addEventListener('touchend', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, minimized]);

  // Snap to specific corner/edge
  const snapTo = (corner: 'TL' | 'TR' | 'BL' | 'BR') => {
    const widgetWidth = minimized ? 200 : 320;
    const widgetHeight = minimized ? 60 : 260;
    switch (corner) {
      case 'TL': setPosition({ x: 20, y: 20 }); break;
      case 'TR': setPosition({ x: window.innerWidth - widgetWidth - 20, y: 20 }); break;
      case 'BL': setPosition({ x: 20, y: window.innerHeight - widgetHeight - 20 }); break;
      case 'BR': setPosition({ x: window.innerWidth - widgetWidth - 20, y: window.innerHeight - widgetHeight - 20 }); break;
    }
  };

  if (closed) {
    return (
      <button 
        onClick={() => setClosed(false)}
        className="fixed bottom-4 right-4 z-50 bg-primary/90 hover:bg-primary text-white p-3 rounded-full shadow-2xl flex items-center gap-2 text-xs font-bold border border-blue-400/40 backdrop-blur-md animate-bounce"
      >
        <Shield size={16} /> Open Proctor Cam
      </button>
    );
  }

  // Active status checks
  const isViolation = status.total_warnings > 0 && status.currentViolation;
  const isHeadTurned = status.headDirection && status.headDirection !== 'CENTER';
  const isMultipleFaces = status.faceDetected === false || (status.faceCount && status.faceCount > 1);
  const isPhone = status.objects === 'PHONE';
  const isBook = status.objects === 'BOOK';
  const isBlurry = status.faceQuality === 'BLURRY';

  return (
    <div
      ref={widgetRef}
      style={{ 
        left: `${position.x}px`, 
        top: `${position.y}px`,
        touchAction: 'none'
      }}
      className={clsx(
        "fixed z-50 select-none shadow-2xl backdrop-blur-xl border transition-shadow duration-200",
        minimized ? "w-64 rounded-2xl bg-slate-900/95 border-slate-700" : "w-80 rounded-2xl bg-slate-950/95 border-primary/40",
        isDragging ? "shadow-blue-500/20 ring-2 ring-primary/60 scale-[1.02] cursor-grabbing" : "cursor-default",
        isViolation ? "border-red-500 ring-2 ring-red-500/30" : ""
      )}
    >
      {/* Draggable Header */}
      <div
        onMouseDown={handleMouseDown}
        onTouchStart={handleMouseDown}
        className={clsx(
          "flex items-center justify-between px-3 py-2 border-b cursor-grab active:cursor-grabbing rounded-t-2xl transition-colors",
          isViolation ? "bg-red-950/60 border-red-800/60" : "bg-slate-900/80 border-slate-800"
        )}
        title="Hold cursor to drag camera anywhere across the screen"
      >
        <div className="flex items-center gap-2">
          <div className={clsx(
            "flex items-center gap-1.5 border px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider",
            isMonitoring 
              ? "bg-emerald-950/80 text-emerald-300 border-emerald-800/60" 
              : "bg-blue-950/80 text-blue-300 border-blue-800/60"
          )}>
            <span className={clsx("w-2 h-2 rounded-full", isMonitoring ? "bg-emerald-400 animate-pulse" : "bg-blue-400")} />
            {isMonitoring ? "SURVEILLANCE ON" : "CAMERA PREVIEW"}
          </div>
          <Move size={12} className="text-slate-400 opacity-60" />
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1.5 text-slate-400">
          <button 
            onClick={(e) => { e.stopPropagation(); setMinimized(!minimized); }}
            className="hover:text-white p-1 hover:bg-slate-800 rounded transition"
            title={minimized ? "Expand video" : "Minimize"}
          >
            {minimized ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); setClosed(true); }}
            className="hover:text-red-400 p-1 hover:bg-slate-800 rounded transition"
            title="Hide widget"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Camera Video Viewport */}
      {!minimized && (
        <div className="relative bg-black w-full h-44 overflow-hidden group">
          <WebcamView
            stream={webcamStream}
            fallbackUrl={`${backendUrl}/api/monitoring/video_feed`}
            className="w-full h-full object-cover"
            alt="Candidate Live Stream"
          />

          {/* AI Proctoring Live HUD Overlay */}
          <div className="absolute inset-0 pointer-events-none p-2 flex flex-col justify-between">
            {/* Top HUD Badges */}
            <div className="flex justify-between items-start gap-2">
              <div className="flex flex-col gap-1">
                {isHeadTurned ? (
                  <span className="bg-amber-950/90 border border-amber-500/80 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-lg animate-pulse">
                    <Eye size={10} /> HEAD: {status.headDirection}
                  </span>
                ) : isMultipleFaces ? (
                  <span className="bg-red-950/90 border border-red-500/80 text-red-300 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-lg animate-pulse">
                    <Users size={10} /> {status.faceDetected === false ? "CANDIDATE ABSENT" : "UNAUTHORIZED PERSON"}
                  </span>
                ) : isPhone ? (
                  <span className="bg-red-950/90 border border-red-500/80 text-red-300 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-lg animate-pulse">
                    <Smartphone size={10} /> PHONE DETECTED
                  </span>
                ) : isBook ? (
                  <span className="bg-amber-950/90 border border-amber-500/80 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-lg animate-pulse">
                    <BookOpen size={10} /> BOOK / NOTES
                  </span>
                ) : isBlurry ? (
                  <span className="bg-amber-950/90 border border-amber-500/80 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-lg">
                    ⚠️ CAM BLURRY
                  </span>
                ) : null}

                {/* Candidate Verified Tag */}
                {isMonitoring && !isMultipleFaces && status.faceDetected !== false && (
                  <span className="bg-emerald-950/90 border border-emerald-500/80 text-emerald-300 text-[9px] font-mono px-1.5 py-0.5 rounded flex items-center gap-1">
                    <Shield size={9} /> VERIFIED
                  </span>
                )}
              </div>

              {/* Warnings Pill */}
              <div className="flex items-center gap-1 bg-black/80 backdrop-blur-md px-1.5 py-0.5 rounded border border-slate-700 text-[10px] font-mono">
                <span className={status.total_warnings > 0 ? "text-amber-400 font-bold" : "text-slate-400"}>
                  {status.total_warnings}/{status.max_warnings || 10} Warn
                </span>
              </div>
            </div>

            {/* Bottom Feed Status */}
            <div className="flex justify-between items-end text-[10px] font-mono">
              <span className="bg-black/70 px-1.5 py-0.5 rounded text-slate-300">
                {isMonitoring ? "● AI SURVEILLANCE ACTIVE" : "⏸ AI IN STANDBY"}
              </span>
              <span className="bg-black/70 px-1.5 py-0.5 rounded text-emerald-400">
                FPS: ~30
              </span>
            </div>
          </div>

          {/* Quick Click-to-Start Overlay if Not Monitoring */}
          {!isMonitoring && onStart && (
            <div 
              onClick={(e) => { e.stopPropagation(); onStart(); }}
              className="absolute inset-0 bg-black/40 hover:bg-black/20 transition flex items-center justify-center cursor-pointer pointer-events-auto"
            >
              <button className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider flex items-center gap-1 shadow-lg shadow-emerald-600/30 ring-2 ring-emerald-400/30 transition">
                <Sparkles size={11} /> Start AI Surveillance
              </button>
            </div>
          )}
        </div>
      )}

      {/* Snap Coordinates Helper Buttons */}
      {!minimized && (
        <div className="p-2 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-[10px] text-slate-400">
          <span>Dock Corner:</span>
          <div className="flex items-center gap-1">
            <button onClick={() => snapTo('TL')} className="p-1 hover:bg-slate-800 rounded text-slate-300" title="Snap to Top-Left">
              <CornerUpLeft size={11} />
            </button>
            <button onClick={() => snapTo('TR')} className="p-1 hover:bg-slate-800 rounded text-slate-300" title="Snap to Top-Right">
              <CornerUpRight size={11} />
            </button>
            <button onClick={() => snapTo('BL')} className="p-1 hover:bg-slate-800 rounded text-slate-300" title="Snap to Bottom-Left">
              <CornerDownLeft size={11} />
            </button>
            <button onClick={() => snapTo('BR')} className="p-1 hover:bg-slate-800 rounded text-slate-300" title="Snap to Bottom-Right">
              <CornerDownRight size={11} />
            </button>
          </div>
        </div>
      )}

      {/* Quick Action when not monitoring */}
      {!isMonitoring && onStart && (
        <div className="p-2 bg-slate-900 border-t border-slate-800">
          <button
            onClick={(e) => { e.stopPropagation(); onStart(); }}
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-lg uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/30 transition active:scale-95 animate-pulse"
          >
            <Sparkles size={13} />
            Start AI Surveillance
          </button>
        </div>
      )}

      {/* Footer / Summary Strip */}
      <div className="p-2.5 text-xs bg-slate-900/90 rounded-b-2xl border-t border-slate-800/80">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-400 flex items-center gap-1">
            <span className="text-[10px] opacity-75">✋ Hold cursor to drag 360°</span>
          </span>
          <span className="font-semibold text-slate-300">
            {status.headDirection === 'CENTER' ? 'Face Centered' : status.headDirection}
          </span>
        </div>
      </div>
    </div>
  );
};
