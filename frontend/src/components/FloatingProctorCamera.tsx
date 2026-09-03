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
import clsx from 'clsx';

interface FloatingProctorCameraProps {
  status: any;
  isMonitoring: boolean;
  backendUrl: string;
}

export const FloatingProctorCamera: React.FC<FloatingProctorCameraProps> = ({
  status,
  isMonitoring,
  backendUrl
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
          <img 
            src={`${backendUrl}/api/monitoring/video_feed`} 
            alt="Candidate Live Stream" 
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
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
                ) : (
                  <span className="bg-emerald-950/90 border border-emerald-500/60 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-lg">
                    <Shield size={10} /> 1 CANDIDATE (SECURE)
                  </span>
                )}
              </div>

              {/* Warning Counter Pill */}
              <div className={clsx(
                "px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border shadow-lg",
                status.total_warnings >= (status.max_warnings || 10) 
                  ? "bg-red-950/90 border-red-500 text-red-300 animate-pulse" 
                  : status.total_warnings > 0 
                  ? "bg-amber-950/90 border-amber-500 text-amber-300" 
                  : "bg-slate-900/80 border-slate-700 text-slate-300"
              )}>
                ⚡ {status.total_warnings || 0}/{status.max_warnings || 10} Warn
              </div>
            </div>

            {/* Bottom HUD: Target crosshair corners */}
            <div className="flex justify-between items-end text-[10px] font-mono text-slate-400 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-md border border-slate-800">
              <span className={clsx("flex items-center gap-1", isMonitoring ? "text-emerald-400" : "text-blue-400")}>
                <Sparkles size={10} /> {isMonitoring ? "AI PROCTOR ON" : "AI IN STANDBY"}
              </span>
              <span>FPS: ~30</span>
            </div>
          </div>

          {/* Quick Corner Snap Controls (show on hover) */}
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/90 p-1 rounded-lg border border-slate-700 pointer-events-auto">
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
