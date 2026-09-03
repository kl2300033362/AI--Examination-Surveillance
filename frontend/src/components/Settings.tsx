import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Settings as SettingsIcon, 
  Trash2, 
  Save, 
  Eye, 
  Smartphone, 
  Lock 
} from 'lucide-react';

interface SettingsProps {
  backendUrl?: string;
}

export const Settings: React.FC<SettingsProps> = ({ backendUrl = 'http://127.0.0.1:8000' }) => {
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [warningLimit, setWarningLimit] = useState(10);
  const [headYawThreshold, setHeadYawThreshold] = useState(20);
  const [blurThreshold, setBlurThreshold] = useState(15);
  const [autoLock, setAutoLock] = useState(true);

  const handleDeleteHistory = async () => {
    if (window.confirm('Are you sure you want to delete all exam infraction history?')) {
      try {
        const res = await fetch(`${backendUrl}/api/events`, { method: 'DELETE' });
        if (res.ok) {
          alert('Event history cleared successfully.');
        } else {
          alert('Failed to clear event history.');
        }
      } catch (err) {
        console.error('Error clearing history:', err);
        alert('Network error while clearing event history.');
      }
    }
  };

  const handleSaveSettings = () => {
    setSaveStatus('Exam proctoring policies saved successfully!');
    setTimeout(() => setSaveStatus(null), 3000);
  };

  return (
    <div className="glass-panel p-6 max-w-4xl mx-auto space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <SettingsIcon size={20} className="text-primary" /> Exam Proctoring Configuration & Rules
        </h2>
        <p className="text-xs text-slate-400">Configure AI detection sensitivities, warning tolerances, and anti-cheat policies</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Face & Head Pose Tracking */}
        <section className="space-y-4 bg-slate-950/40 p-5 rounded-2xl border border-slate-800">
          <h3 className="font-bold text-primary text-sm flex items-center gap-2">
            <Eye size={16} /> Head Pose & Gaze Calibration
          </h3>
          
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Head Turn Yaw Threshold (Degrees: {headYawThreshold}°)
            </label>
            <input 
              type="range" 
              min={10} 
              max={45} 
              value={headYawThreshold} 
              onChange={(e) => setHeadYawThreshold(Number(e.target.value))}
              className="w-full accent-primary" 
            />
            <span className="text-[11px] text-slate-500">Lower = stricter head turn detection. Higher = allows moderate glance angles.</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Face Missing Grace Timeout (seconds)
            </label>
            <input type="number" defaultValue={2} className="bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-white" />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <input type="checkbox" defaultChecked id="multiFace" className="w-4 h-4 accent-primary rounded" />
            <label htmlFor="multiFace" className="text-xs text-slate-300 font-semibold">
              Enable Multiple Person / Room Occupancy Detection
            </label>
          </div>
        </section>

        {/* Object & Device Detection */}
        <section className="space-y-4 bg-slate-950/40 p-5 rounded-2xl border border-slate-800">
          <h3 className="font-semibold text-primary text-sm flex items-center gap-2">
            <Smartphone size={16} /> Device & Cheat Material Detection
          </h3>
          
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center gap-3">
              <input type="checkbox" defaultChecked id="objPhone" className="w-4 h-4 accent-primary rounded" />
              <label htmlFor="objPhone" className="text-slate-300 font-medium">Mobile Phones & Smartphones</label>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" defaultChecked id="objBook" className="w-4 h-4 accent-primary rounded" />
              <label htmlFor="objBook" className="text-slate-300 font-medium">Books, Notebooks & Cheat Sheets</label>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" defaultChecked id="objLaptop" className="w-4 h-4 accent-primary rounded" />
              <label htmlFor="objLaptop" className="text-slate-300 font-medium">Secondary Laptops & Monitors</label>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" defaultChecked id="objWatch" className="w-4 h-4 accent-primary rounded" />
              <label htmlFor="objWatch" className="text-slate-300 font-medium">Smartwatches & Wearables</label>
            </div>
          </div>
          
          <div className="flex flex-col gap-1.5 pt-2">
            <label className="text-xs font-semibold text-slate-300">YOLOv8 Detection Confidence Threshold</label>
            <input type="number" step="0.05" defaultValue={0.50} className="bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-white" />
          </div>
        </section>
        
        {/* Warning Chances & Disqualification Policy */}
        <section className="space-y-4 bg-slate-950/40 p-5 rounded-2xl border border-slate-800 md:col-span-2">
          <h3 className="font-semibold text-primary text-sm flex items-center gap-2">
            <Lock size={16} /> Disqualification & Strike Policy
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Allowed Warning Strikes before Exam Disqualification: <span className="font-bold text-amber-400 font-mono">{warningLimit} Strikes</span>
              </label>
              <input 
                type="range" 
                min={3} 
                max={10} 
                value={warningLimit} 
                onChange={(e) => setWarningLimit(Number(e.target.value))}
                className="w-full accent-primary" 
              />
              <span className="text-[11px] text-slate-500">Standard strict exams: 3 - 5 strikes. Practice exams: 8 - 10 strikes.</span>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  checked={autoLock} 
                  onChange={(e) => setAutoLock(e.target.checked)} 
                  id="autoLock" 
                  className="w-4 h-4 accent-red-500 rounded" 
                />
                <label htmlFor="autoLock" className="text-xs text-red-400 font-bold">
                  Auto-suspend exam & trigger lock screen on limit reached
                </label>
              </div>

              <div className="flex items-center gap-3">
                <input type="checkbox" defaultChecked id="audioChime" className="w-4 h-4 accent-primary rounded" />
                <label htmlFor="audioChime" className="text-xs text-slate-300 font-medium">
                  Play audio warning tone on violation detection
                </label>
              </div>
            </div>
          </div>
        </section>
        
        {/* Video Quality & Privacy */}
        <section className="space-y-4 bg-slate-950/40 p-5 rounded-2xl border border-slate-800 md:col-span-2">
          <h3 className="font-semibold text-primary text-sm flex items-center gap-2">
            <ShieldCheck size={16} /> Camera Feed Quality & Privacy
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-slate-300">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Face Blur Sensitivity Threshold (Laplacian Variance: {blurThreshold})
              </label>
              <input 
                type="number" 
                value={blurThreshold} 
                onChange={(e) => setBlurThreshold(Number(e.target.value))}
                className="bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-white" 
              />
              <span className="text-[11px] text-slate-500">Filters out standard laptop webcams. Flags only severe blur / covered lens.</span>
            </div>
            
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-xs space-y-2">
              <p className="font-bold text-slate-200">Exam Audit Statement:</p>
              <ul className="list-disc pl-4 space-y-1 text-slate-400 text-[11px]">
                <li>Webcam stream runs locally during test session.</li>
                <li>Evidence frames captured only upon high-confidence violations.</li>
              </ul>
              <button 
                onClick={handleDeleteHistory}
                className="mt-3 bg-red-950/50 hover:bg-red-900 text-red-300 px-4 py-2 rounded-xl text-xs font-bold border border-red-500/30 w-full transition active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Trash2 size={13} /> Delete All Exam Incident History
              </button>
            </div>
          </div>
        </section>
      </div>
      
      <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
        {saveStatus && (
          <span className="text-emerald-400 font-semibold text-xs animate-pulse">{saveStatus}</span>
        )}
        {!saveStatus && <div />}
        <button 
          onClick={handleSaveSettings}
          className="bg-primary hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-bold text-xs transition active:scale-95 shadow-lg shadow-blue-500/20 flex items-center gap-2"
        >
          <Save size={14} /> Save Configuration
        </button>
      </div>
    </div>
  );
};
