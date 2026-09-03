import { useEffect, useState } from 'react';
import type { WSEvent } from '../hooks/useWebSocket';
import { AlertTriangle, XCircle, X } from 'lucide-react';
import clsx from 'clsx';

interface FloatingWarningProps {
  event: WSEvent | null;
}

export const FloatingWarning = ({ event }: FloatingWarningProps) => {
  const [visible, setVisible] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<WSEvent | null>(null);

  useEffect(() => {
    if (event && (event.type === 'warning' || event.type === 'critical')) {
      setCurrentEvent(event);
      setVisible(true);
      
      if (event.type === 'warning') {
        const timer = setTimeout(() => {
          setVisible(false);
        }, 5000);
        return () => clearTimeout(timer);
      }
      // Critical warnings stay until dismissed manually
    }
  }, [event]);

  if (!visible || !currentEvent) return null;

  const isCritical = currentEvent.type === 'critical';

  return (
    <div className={clsx(
      "fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md p-4 rounded-xl shadow-2xl border flex items-start gap-4 transition-all duration-300 transform translate-y-0",
      isCritical ? "bg-red-900/90 border-red-500 text-white" : "bg-amber-900/90 border-amber-500 text-amber-50"
    )}>
      <div className="shrink-0 mt-1">
        {isCritical ? <XCircle size={28} className="text-red-400" /> : <AlertTriangle size={28} className="text-amber-400" />}
      </div>
      <div className="flex-1">
        <h3 className="font-bold text-lg">
          {isCritical ? '🚨 CRITICAL ALERT' : '⚠ WARNING'}
        </h3>
        <p className="mt-1 font-medium">{currentEvent.event_type?.replace(/_/g, ' ')}</p>
        <p className="text-sm mt-2 opacity-80">
          Warning: {currentEvent.warning_number} / {currentEvent.max_warnings || 10}
        </p>
      </div>
      <button onClick={() => setVisible(false)} className="opacity-70 hover:opacity-100 transition">
        <X size={20} />
      </button>
    </div>
  );
};
