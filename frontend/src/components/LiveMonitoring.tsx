import React, { useState } from 'react';
import { Camera, Shield, Sparkles, Video, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

interface LiveMonitoringProps {
  isMonitoring: boolean;
  systemStatus: any;
  backendUrl: string;
}

export const LiveMonitoring: React.FC<LiveMonitoringProps> = ({ isMonitoring, systemStatus, backendUrl }) => {
  const [streamError, setStreamError] = useState(false);

  return (
    <div className="glass-panel overflow-hidden flex flex-col h-[500px] border-slate-800">
      {/* Feed Header */}
      <div className="bg-slate-900/90 p-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Camera size={16} />
          </div>
          <div>
            <h2 className="font-bold text-xs uppercase tracking-wider text-slate-200 flex items-center gap-2">
              Candidate Video Streaming Feed
              <span className={clsx(
                "px-2 py-0.5 rounded-full text-[10px] font-bold",
                isMonitoring 
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse" 
                  : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
              )}>
                {isMonitoring ? "● SURVEILLANCE ACTIVE" : "● STREAMING (STANDBY)"}
              </span>
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="text-slate-400">Stream: <span className="text-emerald-400 font-bold">LIVE 30FPS</span></span>
        </div>
      </div>
      
      {/* Video Viewport */}
      <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden">
        {streamError ? (
          <div className="text-center text-slate-500 p-6">
            <AlertCircle size={44} className="mx-auto mb-3 text-amber-400/60" />
            <p className="text-sm font-semibold text-slate-300">Connecting to Video Stream...</p>
            <p className="text-xs text-slate-500 mt-1">Starting camera pipeline at {backendUrl}</p>
          </div>
        ) : (
          <img 
            src={`${backendUrl}/api/monitoring/video_feed`} 
            alt="Live candidate camera feed"
            className="w-full h-full object-contain"
            onError={() => setStreamError(true)}
            onLoad={() => setStreamError(false)}
          />
        )}
        
        {/* Top Status Banner Overlay */}
        <div className="absolute top-3 left-3 right-3 flex justify-between items-center pointer-events-none">
          <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-md px-3 py-1 rounded-lg border border-slate-700/80 text-[11px] font-mono text-slate-300">
            <Video size={13} className="text-emerald-400 animate-pulse" />
            <span>VIDEO: CONTINUOUS AUTO-STREAM</span>
          </div>

          <div className={clsx(
            "px-3 py-1 rounded-lg text-[11px] font-mono font-bold backdrop-blur-md border shadow-lg",
            isMonitoring 
              ? "bg-emerald-950/80 border-emerald-500 text-emerald-300"
              : "bg-amber-950/80 border-amber-500 text-amber-300"
          )}>
            {isMonitoring ? "🛡️ AI SURVEILLANCE: ENGAGED" : "⏳ AI SURVEILLANCE: IDLE (WAITING FOR START)"}
          </div>
        </div>

        {/* AI Telemetry Overlay when Monitoring */}
        {isMonitoring ? (
          <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end pointer-events-none">
            <div className="bg-black/75 p-3 rounded-xl text-xs font-mono backdrop-blur-md border border-slate-700/80 shadow-2xl">
              <div className="flex items-center justify-between gap-4 mb-1.5">
                <span className="text-slate-400">Candidate Face:</span>
                <span className={clsx("font-bold", systemStatus?.faceDetected ? "text-emerald-400" : "text-red-400")}>
                  {systemStatus?.faceDetected ? "VERIFIED (CENTERED)" : "ABSENT / MISSING"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 mb-1.5">
                <span className="text-slate-400">Head Pose:</span>
                <span className="text-emerald-400 font-bold">{systemStatus?.headDirection || 'CENTER'}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400">Eye Gaze:</span>
                <span className={clsx("font-bold", systemStatus?.eyes === 'CLOSED' ? "text-amber-400 animate-pulse" : "text-emerald-400")}>
                  {systemStatus?.eyes || 'OPEN'}
                </span>
              </div>
            </div>

            <div className="bg-emerald-950/80 border border-emerald-500/60 p-2.5 rounded-xl text-xs font-mono text-emerald-300 backdrop-blur-md flex items-center gap-2">
              <Sparkles size={14} className="text-emerald-400" />
              <span>AI Exam Surveillance Active</span>
            </div>
          </div>
        ) : (
          <div className="absolute bottom-4 left-4 right-4 flex justify-center pointer-events-none">
            <div className="bg-black/80 backdrop-blur-md px-4 py-2 rounded-xl border border-blue-500/40 text-xs font-mono text-blue-300 flex items-center gap-2 shadow-2xl">
              <Shield size={14} className="text-blue-400" />
              <span>Video streaming preview ready. Click START to begin protected exam surveillance.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
