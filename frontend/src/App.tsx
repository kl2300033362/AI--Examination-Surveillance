import { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { ExamRoom } from './components/ExamRoom';
import { ExamWarningToast } from './components/ExamWarningToast';
import { FloatingProctorCamera } from './components/FloatingProctorCamera';
import { EventLog } from './components/EventLog';
import { Analytics } from './components/Analytics';
import { Settings } from './components/Settings';
import { ScreenshotGallery } from './components/ScreenshotGallery';
import { useWebSocket } from './hooks/useWebSocket';
import { 
  LayoutDashboard, 
  List, 
  BarChart2, 
  Settings as SettingsIcon, 
  GraduationCap, 
  Shield,
  Camera,
  Wifi,
  WifiOff
} from 'lucide-react';
import clsx from 'clsx';

// Dynamic backend and websocket URLs for local and cloud runner / tunnel deployment
const getBackendUrl = () => {
  const envUrl = (import.meta as any).env?.VITE_BACKEND_URL;
  if (envUrl) return envUrl;
  if (typeof window !== 'undefined' && window.location.port !== '5173') {
    return window.location.origin;
  }
  return 'http://127.0.0.1:8000';
};

const getWsUrl = () => {
  const envWs = (import.meta as any).env?.VITE_WS_URL;
  if (envWs) return envWs;
  if (typeof window !== 'undefined' && window.location.port !== '5173') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/api/monitoring/ws`;
  }
  return 'ws://127.0.0.1:8000/api/monitoring/ws';
};

const BACKEND_URL = getBackendUrl();
const WS_URL = getWsUrl();

interface NavButtonProps {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  activeTab: string;
  onSelect: (id: string) => void;
}

const NavButton = ({ id, label, icon, badge, activeTab, onSelect }: NavButtonProps) => (
  <button 
    onClick={() => onSelect(id)}
    className={clsx(
      "flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition relative active:scale-95",
      activeTab === id 
        ? "bg-primary text-white shadow-lg shadow-blue-500/25" 
        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/80"
    )}
  >
    {icon} 
    <span>{label}</span>
    {badge && (
      <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] px-1.5 py-0.5 rounded-full font-mono">
        {badge}
      </span>
    )}
  </button>
);

function App() {
  const [activeTab, setActiveTab] = useState('exam'); // Default to Candidate Exam Room
  const [isMonitoring, setIsMonitoring] = useState(false);
  const { lastEvent } = useWebSocket(WS_URL);
  
  // Aggregate status based on events and periodic fetching
  const [status, setStatus] = useState({
    faceDetected: true,
    faceCount: 1,
    headDirection: 'CENTER',
    eyes: 'OPEN',
    faceQuality: 'GOOD',
    objects: 'NONE',
    currentViolation: false,
    total_warnings: 0,
    max_warnings: 10,
    current_session_id: null
  });

  useEffect(() => {
    if (lastEvent) {
      if (lastEvent.type === 'status') {
        setIsMonitoring(lastEvent.monitoring);
        if (lastEvent.session_id) {
          setStatus(prev => ({ ...prev, current_session_id: lastEvent.session_id }));
        }
      } else if (lastEvent.type === 'warning' || lastEvent.type === 'critical') {
        setStatus(prev => {
          const newStatus = { 
            ...prev, 
            currentViolation: true,
            total_warnings: lastEvent.warning_number ?? prev.total_warnings,
            max_warnings: lastEvent.max_warnings ?? prev.max_warnings ?? 10 
          };
          
          switch(lastEvent.event_type) {
            case 'DROWSINESS':
              newStatus.eyes = 'CLOSED';
              break;
            case 'FACE_NOT_DETECTED': 
              newStatus.faceDetected = false; 
              newStatus.faceCount = 0;
              break;
            case 'MULTIPLE_FACES': 
              newStatus.faceDetected = true;
              newStatus.faceCount = lastEvent.metadata?.face_count || 2; 
              break;
            case 'HEAD_TURNED': 
              newStatus.headDirection = lastEvent.metadata?.direction || 'TURNED'; 
              break;
            case 'FACE_BLURRY': 
            case 'CAMERA_BLOCKED':
              newStatus.faceQuality = 'BLURRY'; 
              break;
            case 'PHONE_DETECTED': 
              newStatus.objects = 'PHONE'; 
              break;
            case 'BOOK_DETECTED': 
              newStatus.objects = 'BOOK'; 
              break;
            case 'LAPTOP_DETECTED': 
              newStatus.objects = 'LAPTOP'; 
              break;
            case 'SMARTWATCH_DETECTED':
            case 'WATCH_DETECTED': 
              newStatus.objects = 'WATCH'; 
              break;
            default: 
              break;
          }
          return newStatus;
        });
        
        // Reset transient indicators after 6 seconds
        setTimeout(() => {
          setStatus(prev => ({
            ...prev,
            currentViolation: false,
            faceDetected: true,
            faceCount: 1,
            headDirection: 'CENTER',
            eyes: 'OPEN',
            faceQuality: 'GOOD',
            objects: 'NONE'
          }));
        }, 6000);
      }
    }
  }, [lastEvent]);

  const [connectionError, setConnectionError] = useState(false);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/status`)
      .then(res => {
        if (!res.ok) throw new Error("Network response was not ok");
        return res.json();
      })
      .then(data => {
        setIsMonitoring(data.monitoring_active);
        setStatus(prev => ({
          ...prev,
          current_session_id: data.current_session_id,
          total_warnings: data.total_warnings,
          max_warnings: data.max_warnings || 10
        }));
        setConnectionError(false);
      })
      .catch(err => {
        console.error("Failed to fetch initial status", err);
        setConnectionError(true);
      });
  }, []);

  const retryConnection = () => {
    setConnectionError(false);
    window.location.reload();
  };

  const handleStart = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/monitoring/start`, { method: 'POST' });
      const data = await res.json();
      setIsMonitoring(true);
      if (data.session_id) {
        setStatus(prev => ({ ...prev, current_session_id: data.session_id }));
      }
    } catch (e) {
      console.error("Failed to start monitoring", e);
      setConnectionError(true);
    }
  };

  const handleStop = async () => {
    try {
      await fetch(`${BACKEND_URL}/api/monitoring/stop`, { method: 'POST' });
      setIsMonitoring(false);
    } catch (e) {
      console.error("Failed to stop monitoring", e);
      setConnectionError(true);
    }
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-200">
      {/* Background Ambient Glows */}
      <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] bg-blue-900/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] bg-emerald-900/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-[30%] right-[20%] w-[35%] h-[35%] bg-purple-900/10 rounded-full blur-[140px] pointer-events-none" />
      
      {/* Connection Error Modal */}
      {connectionError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="glass-panel p-8 text-center flex flex-col items-center max-w-md border-red-500/60 ring-2 ring-red-500/20">
            <div className="text-red-500 mb-4 bg-red-950/60 p-4 rounded-full border border-red-500/40">
              <WifiOff size={36} />
            </div>
            <h2 className="text-xl font-bold mb-2 text-white">AI Proctoring Backend Offline</h2>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Unable to establish a connection with the Python FastAPI AI Proctoring server at <code className="text-blue-400 font-mono">{BACKEND_URL}</code>.
            </p>
            <button 
              onClick={retryConnection} 
              className="bg-primary hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20 transition active:scale-95 flex items-center gap-2"
            >
              <Wifi size={14} /> Retry Connection
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace Container */}
      <div className="relative z-10 max-w-7xl mx-auto p-4 md:p-6 flex flex-col gap-6">
        
        {/* Real-time Pop-up Warning Toast Notification */}
        <ExamWarningToast 
          event={lastEvent} 
          maxWarnings={status.max_warnings} 
        />
        
        {/* Main Application Header & Tab Bar */}
        <header className="glass-panel p-3 flex flex-col md:flex-row items-center justify-between gap-4 border-slate-800/80 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
              <Shield size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black tracking-wide text-white">AI ONLINE PROCTOR</span>
                <span className="bg-primary/20 text-primary border border-primary/40 text-[10px] font-bold px-1.5 py-0.5 rounded">
                  EXAM CONDUCTOR
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Automated Video Examination Surveillance Suite</p>
            </div>
          </div>

          {/* Navigation Bar */}
          <div className="flex items-center gap-1.5 flex-wrap bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800">
            <NavButton 
              id="exam" 
              label="Candidate Exam Portal" 
              icon={<GraduationCap size={16} />} 
              badge="Active Test"
              activeTab={activeTab}
              onSelect={setActiveTab}
            />
            <NavButton 
              id="dashboard" 
              label="Proctor Conductor Center" 
              icon={<LayoutDashboard size={16} />} 
              activeTab={activeTab}
              onSelect={setActiveTab}
            />
            <NavButton 
              id="evidence" 
              label="Evidence Archive" 
              icon={<Camera size={16} />} 
              activeTab={activeTab}
              onSelect={setActiveTab}
            />
            <NavButton 
              id="events" 
              label="Incident Logs" 
              icon={<List size={16} />} 
              activeTab={activeTab}
              onSelect={setActiveTab}
            />
            <NavButton 
              id="analytics" 
              label="Integrity Analytics" 
              icon={<BarChart2 size={16} />} 
              activeTab={activeTab}
              onSelect={setActiveTab}
            />
            <NavButton 
              id="settings" 
              label="Settings" 
              icon={<SettingsIcon size={16} />} 
              activeTab={activeTab}
              onSelect={setActiveTab}
            />
          </div>
        </header>

        {/* Dynamic Content Views */}
        <main className="flex-1">
          {activeTab === 'exam' && (
            <ExamRoom 
              status={status} 
              backendUrl={BACKEND_URL} 
              isMonitoring={isMonitoring}
              onStart={handleStart}
              onStop={handleStop}
            />
          )}

          {activeTab === 'dashboard' && (
            <Dashboard 
              status={status} 
              isMonitoring={isMonitoring} 
              onStart={handleStart} 
              onStop={handleStop}
              backendUrl={BACKEND_URL}
            />
          )}

          {activeTab === 'evidence' && (
            <ScreenshotGallery backendUrl={BACKEND_URL} />
          )}

          {activeTab === 'events' && (
            <EventLog backendUrl={BACKEND_URL} />
          )}

          {activeTab === 'analytics' && (
            <Analytics backendUrl={BACKEND_URL} />
          )}

          {activeTab === 'settings' && (
            <Settings backendUrl={BACKEND_URL} />
          )}
        </main>
      </div>
      
      {/* 360-Degree Cursor-Draggable Edge Floating Proctor Camera */}
      <FloatingProctorCamera 
        status={status} 
        isMonitoring={isMonitoring} 
        backendUrl={BACKEND_URL}
      />
    </div>
  );
}

export default App;
