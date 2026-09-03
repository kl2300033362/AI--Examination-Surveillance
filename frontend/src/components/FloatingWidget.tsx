import { useState } from 'react';
import { Minus, X, Maximize2 } from 'lucide-react';
import clsx from 'clsx';

export const FloatingWidget = ({ status, isMonitoring }: { status: any, isMonitoring: boolean }) => {
  const [minimized, setMinimized] = useState(false);
  const [closed, setClosed] = useState(false);

  if (closed || !isMonitoring) return null;

  return (
    <div className={clsx(
      "fixed bottom-4 right-4 z-40 bg-slate-900/90 backdrop-blur-md border rounded-xl shadow-2xl transition-all duration-300",
      minimized ? "w-48 border-slate-700/50" : "w-64 border-primary/30"
    )}>
      <div className="flex items-center justify-between p-2 border-b border-slate-700/50 bg-slate-800/50 rounded-t-xl">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          AI GUARDIAN
        </div>
        <div className="flex gap-1 text-slate-400">
          <button onClick={() => setMinimized(!minimized)} className="hover:text-white">
            {minimized ? <Maximize2 size={12} /> : <Minus size={12} />}
          </button>
          <button onClick={() => setClosed(true)} className="hover:text-white">
            <X size={12} />
          </button>
        </div>
      </div>
      
      {!minimized && (
        <div className="p-3 text-xs font-mono space-y-1 text-slate-300">
          <div className="flex justify-between">
            <span>Face:</span>
            <span className={status.faceDetected ? "text-emerald-400" : "text-red-400"}>
              {status.faceDetected ? "OK" : "MISSING"}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Head:</span>
            <span className={status.headDirection === "CENTER" ? "text-emerald-400" : "text-amber-400"}>
              {status.headDirection}
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-700/50 flex justify-between font-bold">
            <span>Warnings:</span>
            <span className={status.total_warnings >= status.max_warnings ? "text-red-400" : "text-amber-400"}>
              {status.total_warnings} / {status.max_warnings}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
