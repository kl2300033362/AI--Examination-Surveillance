import React from 'react';
import { 
  Activity, 
  ShieldCheck, 
  ShieldAlert, 
  Users, 
  Eye, 
  Smartphone, 
  BookOpen, 
  Sparkles,
  RefreshCw,
  BellRing,
  Lock,
  Play,
  Square
} from 'lucide-react';
import { LiveMonitoring } from './LiveMonitoring';
import clsx from 'clsx';

interface DashboardProps {
  status: any;
  isMonitoring: boolean;
  onStart: () => void;
  onStop: () => void;
  backendUrl: string;
}

const StatCard = ({ title, value, icon, statusClass = 'text-slate-200', subtitle }: any) => (
  <div className="glass-panel p-4 flex flex-col justify-between h-32 relative overflow-hidden group">
    <div className="flex justify-between items-start z-10">
      <div>
        <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">{title}</span>
        {subtitle && <span className="text-[10px] text-slate-500">{subtitle}</span>}
      </div>
      <span className="text-slate-500">{icon}</span>
    </div>
    <div className={clsx("text-2xl font-bold z-10", statusClass)}>
      {value}
    </div>
    <div className="absolute -bottom-4 -right-4 opacity-5 group-hover:opacity-10 transition-opacity">
      {React.cloneElement(icon, { size: 100 })}
    </div>
  </div>
);

export const Dashboard: React.FC<DashboardProps> = ({ status, isMonitoring, onStart, onStop, backendUrl }) => {

  const simulateViolation = (eventType: string, metadata: any = {}) => {
    fetch(`${backendUrl}/api/monitoring/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type: eventType, metadata })
    }).catch(console.error);
  };

  const handleResetSession = () => {
    if (window.confirm('Reset all proctoring infraction counters for a fresh exam attempt?')) {
      fetch(`${backendUrl}/api/monitoring/reset_session`, { method: 'POST' })
        .then(() => window.location.reload())
        .catch(console.error);
    }
  };

  const maxWarn = status?.max_warnings || 10;
  const currentWarn = status?.total_warnings || 0;

  return (
    <div className="space-y-6">
      
      {/* Conductor Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
              Examiner Portal
            </span>
            <span className="text-xs text-slate-400 font-mono">Session ID: #{status?.current_session_id || 1}</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-white mt-1 flex items-center gap-2">
            <Sparkles className="text-primary" size={22} />
            AI Online Exam Proctor & Conductor Center
          </h1>
          <p className="text-xs text-slate-400">Automated video surveillance, face tracking, device detection, and real-time alerts</p>
        </div>
        
        {/* Conductor Action Controls */}
        <div className="flex gap-3 items-center flex-wrap">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-black/50 border border-slate-800">
            <div className={clsx("w-2.5 h-2.5 rounded-full animate-pulse", isMonitoring ? "bg-emerald-500" : "bg-slate-600")} />
            <span className="text-xs font-semibold text-slate-300">
              {isMonitoring ? "PROCTORING LIVE" : "PROCTORING PAUSED"}
            </span>
          </div>
          
          <div className="flex gap-2 border-l border-slate-800 pl-3">
             <button 
               onClick={handleResetSession}
               className="text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg transition active:scale-95 flex items-center gap-1.5 border border-slate-700"
               title="Reset violation count"
             >
               <RefreshCw size={13} /> Reset
             </button>
             <button 
               onClick={() => fetch(`${backendUrl}/api/monitoring/test_alarm`, { method: 'POST' }).catch(console.error)} 
               className="text-xs font-semibold bg-amber-950/60 hover:bg-amber-900/60 text-amber-200 border border-amber-500/40 px-3 py-1.5 rounded-lg transition active:scale-95 flex items-center gap-1.5"
             >
               <BellRing size={13} /> Alarm
             </button>
             <button 
               onClick={() => fetch(`${backendUrl}/api/monitoring/test_lock`, { method: 'POST' }).catch(console.error)} 
               className="text-xs font-semibold bg-red-950/60 hover:bg-red-900/60 text-red-200 border border-red-500/40 px-3 py-1.5 rounded-lg transition active:scale-95 flex items-center gap-1.5"
             >
               <Lock size={13} /> Lock
             </button>
          </div>

          {!isMonitoring ? (
            <button 
              onClick={onStart}
              className="bg-primary hover:bg-blue-500 text-white px-5 py-1.5 rounded-xl font-bold text-xs shadow-lg shadow-blue-500/20 transition active:scale-95 flex items-center gap-1.5"
            >
              <Play size={14} /> START PROCTORING
            </button>
          ) : (
            <button 
              onClick={() => {
                if(window.confirm('Are you sure you want to stop active proctoring?')) {
                  onStop();
                }
              }}
              className="bg-red-600 hover:bg-red-500 text-white px-5 py-1.5 rounded-xl font-bold text-xs shadow-lg shadow-red-500/20 transition active:scale-95 flex items-center gap-1.5"
            >
              <Square size={14} /> STOP PROCTORING
            </button>
          )}
        </div>
      </div>

      {/* Main Stream & Telemetry Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col - Video Feed */}
        <div className="lg:col-span-2">
          <LiveMonitoring isMonitoring={isMonitoring} systemStatus={status} backendUrl={backendUrl} />
        </div>
        
        {/* Right Col - Core Strike Tally & Critical Stat */}
        <div className="space-y-4">
          <div className={clsx(
            "glass-panel p-6 flex flex-col justify-center items-center text-center rounded-2xl relative overflow-hidden",
            currentWarn >= maxWarn ? "border-red-500/80 bg-red-950/20" : ""
          )}>
             <h3 className="text-slate-400 uppercase tracking-widest text-xs font-bold mb-1">
               Violation Strikes
             </h3>
             <span className="text-[11px] text-slate-500 mb-3">Allowed before exam suspension</span>
             <div className="flex items-baseline gap-2">
               <span className={clsx("text-6xl font-black font-mono", currentWarn >= maxWarn ? "text-red-400 animate-pulse" : currentWarn > 0 ? "text-amber-400" : "text-emerald-400")}>
                 {currentWarn}
               </span>
               <span className="text-2xl text-slate-500 font-mono">/ {maxWarn}</span>
             </div>
             {currentWarn >= maxWarn ? (
               <span className="mt-3 text-xs text-red-400 font-bold bg-red-900/40 px-3 py-1 rounded-full border border-red-500/40 animate-pulse">
                 DISQUALIFICATION LIMIT REACHED
               </span>
             ) : (
               <span className="mt-3 text-[11px] text-slate-400 font-mono">
                 {maxWarn - currentWarn} strike{maxWarn - currentWarn > 1 ? 's' : ''} remaining
               </span>
             )}
          </div>
          
          <StatCard 
            title="Candidate Status" 
            value={status?.faceDetected !== false ? "1 CANDIDATE PRESENT" : "ABSENT / MISSING"} 
            subtitle="Face verification"
            icon={<Users />}
            statusClass={status?.faceDetected !== false ? "text-emerald-400 text-lg" : "text-red-400 text-lg"}
          />
          
          <StatCard 
            title="Head Pose & Gaze" 
            value={status?.headDirection || "CENTER"} 
            subtitle="Orientation tracking"
            icon={<Activity />}
            statusClass={status?.headDirection !== 'CENTER' && status?.headDirection ? "text-amber-400" : "text-emerald-400"}
          />
        </div>
      </div>
      
      {/* Telemetry Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            title="Another Person Findout" 
            value={status?.faceCount && status?.faceCount > 1 ? `${status.faceCount} DETECTED` : "NONE (CLEAR)"} 
            subtitle="Room occupancy"
            icon={<Users />}
            statusClass={status?.faceCount && status?.faceCount > 1 ? "text-red-400" : "text-emerald-400"}
          />
          <StatCard 
            title="Electronic Devices" 
            value={status?.objects === 'PHONE' ? "PHONE DETECTED" : status?.objects === 'LAPTOP' ? "LAPTOP DETECTED" : "NONE DETECTED"} 
            subtitle="YOLOv8 deep learning"
            icon={<Smartphone />}
            statusClass={status?.objects && status?.objects !== 'NONE' && status?.objects !== 'BOOK' ? "text-red-400" : "text-emerald-400"}
          />
          <StatCard 
            title="Books & Study Materials" 
            value={status?.objects === 'BOOK' ? "BOOK DETECTED" : "NONE DETECTED"} 
            subtitle="Cheat sheet detection"
            icon={<BookOpen />}
            statusClass={status?.objects === 'BOOK' ? "text-amber-400" : "text-emerald-400"}
          />
          <StatCard 
            title="Picture Blur & Feed Quality" 
            value={status?.faceQuality === 'BLURRY' ? "BLURRY / OBSCURED" : "SHARP & CLEAR"} 
            subtitle="Laplacian variance test"
            icon={<ShieldCheck />}
            statusClass={status?.faceQuality === 'BLURRY' ? "text-amber-400" : "text-emerald-400"}
          />
      </div>

      {/* Developer & Live Violation Simulation Deck */}
      <div className="glass-panel p-5 border-dashed border-2 border-slate-700/60 bg-slate-950/60 rounded-2xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-slate-300 font-bold uppercase text-xs flex items-center gap-2">
            <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
            Live AI Proctoring Violation Simulator (1-Click Trigger)
          </h3>
          <span className="text-[11px] text-slate-400 font-mono">Test popup notifications & floating camera responses instantly</span>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button 
            onClick={() => simulateViolation('DROWSINESS', { ear: 0.15, eyes: 'CLOSED' })}
            className="bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30 text-xs px-3.5 py-2 rounded-xl transition active:scale-95 flex items-center gap-1.5"
          >
            <Eye size={13} /> Drowsiness (Eyes Closed)
          </button>

          <button 
            onClick={() => simulateViolation('HEAD_TURNED', { direction: 'LOOKING_LEFT' })}
            className="bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30 text-xs px-3.5 py-2 rounded-xl transition active:scale-95 flex items-center gap-1.5"
          >
            <Eye size={13} /> Head Turn (Left)
          </button>

          <button 
            onClick={() => simulateViolation('HEAD_TURNED', { direction: 'LOOKING_RIGHT' })}
            className="bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30 text-xs px-3.5 py-2 rounded-xl transition active:scale-95 flex items-center gap-1.5"
          >
            <Eye size={13} /> Head Turn (Right)
          </button>

          <button 
            onClick={() => simulateViolation('MULTIPLE_FACES', { face_count: 2 })}
            className="bg-slate-900 hover:bg-slate-800 text-red-300 border border-red-500/30 text-xs px-3.5 py-2 rounded-xl transition active:scale-95 flex items-center gap-1.5"
          >
            <Users size={13} /> Another Person (Findout)
          </button>

          <button 
            onClick={() => simulateViolation('PHONE_DETECTED', { object_label: 'Mobile Phone' })}
            className="bg-slate-900 hover:bg-slate-800 text-red-300 border border-red-500/30 text-xs px-3.5 py-2 rounded-xl transition active:scale-95 flex items-center gap-1.5"
          >
            <Smartphone size={13} /> Mobile Phone Device
          </button>

          <button 
            onClick={() => simulateViolation('BOOK_DETECTED', { object_label: 'Book / Notes' })}
            className="bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30 text-xs px-3.5 py-2 rounded-xl transition active:scale-95 flex items-center gap-1.5"
          >
            <BookOpen size={13} /> Books / Cheat Material
          </button>

          <button 
            onClick={() => simulateViolation('LAPTOP_DETECTED', { object_label: 'Secondary Laptop' })}
            className="bg-slate-900 hover:bg-slate-800 text-red-300 border border-red-500/30 text-xs px-3.5 py-2 rounded-xl transition active:scale-95 flex items-center gap-1.5"
          >
            <Smartphone size={13} /> Secondary Screen
          </button>

          <button 
            onClick={() => simulateViolation('FACE_BLURRY', { blur_percentage: 95.0 })}
            className="bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30 text-xs px-3.5 py-2 rounded-xl transition active:scale-95 flex items-center gap-1.5"
          >
            <ShieldAlert size={13} /> Blurry Picture (Cam)
          </button>

          <button 
            onClick={() => simulateViolation('CAMERA_BLOCKED', { brightness: 3.2 })}
            className="bg-slate-900 hover:bg-slate-800 text-red-300 border border-red-500/30 text-xs px-3.5 py-2 rounded-xl transition active:scale-95 flex items-center gap-1.5"
          >
            <ShieldAlert size={13} /> Blocked / Dark Camera
          </button>

          <button 
            onClick={() => simulateViolation('FACE_NOT_DETECTED', { face_count: 0 })}
            className="bg-slate-900 hover:bg-slate-800 text-red-300 border border-red-500/30 text-xs px-3.5 py-2 rounded-xl transition active:scale-95 flex items-center gap-1.5"
          >
            <Users size={13} /> Candidate Absent
          </button>

          <button 
            onClick={() => simulateViolation('TAB_SWITCH_DETECTED', { action: 'Window blur' })}
            className="bg-slate-900 hover:bg-slate-800 text-red-300 border border-red-500/30 text-xs px-3.5 py-2 rounded-xl transition active:scale-95 flex items-center gap-1.5"
          >
            <ShieldAlert size={13} /> Tab Switch Violation
          </button>
        </div>
      </div>

    </div>
  );
};
