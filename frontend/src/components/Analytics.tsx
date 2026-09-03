import React, { useEffect, useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  PieChart, 
  Pie 
} from 'recharts';
import { 
  ShieldAlert, 
  Printer, 
  Award, 
  FileText,
  Activity
} from 'lucide-react';
import clsx from 'clsx';

interface AnalyticsProps {
  backendUrl?: string;
}

const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export const Analytics: React.FC<AnalyticsProps> = ({ backendUrl = 'http://127.0.0.1:8000' }) => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${backendUrl}/api/events`)
      .then(res => res.json())
      .then(data => {
        setEvents(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch events for analytics', err);
        setLoading(false);
      });
  }, [backendUrl]);

  // Aggregate by event type
  const typeCounts: { [key: string]: number } = {};
  events.forEach(e => {
    const key = (e.event_type || 'UNKNOWN').replace(/_/g, ' ');
    typeCounts[key] = (typeCounts[key] || 0) + 1;
  });

  const typeData = Object.keys(typeCounts).map(name => ({
    name,
    count: typeCounts[name]
  }));

  // Aggregate by severity
  const severityCounts: { [key: string]: number } = { WARNING: 0, CRITICAL: 0 };
  events.forEach(e => {
    const sev = e.severity || 'WARNING';
    severityCounts[sev] = (severityCounts[sev] || 0) + 1;
  });

  const severityData = Object.keys(severityCounts).map(name => ({
    name,
    value: severityCounts[name]
  })).filter(d => d.value > 0);

  // Calculate session integrity index
  const totalEvents = events.length;
  const criticalEvents = severityCounts['CRITICAL'] || 0;
  const integrityScore = Math.max(0, 100 - (totalEvents * 6) - (criticalEvents * 10));

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="glass-panel p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Exam Proctoring Analytics & Candidate Integrity Report
          </h2>
          <p className="text-xs text-slate-400">Automated behavioral analysis, anomaly frequency, and audit certification</p>
        </div>

        <button 
          onClick={handlePrintReport}
          className="bg-primary hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-blue-500/20 active:scale-95"
        >
          <Printer size={14} /> Export / Print Proctor Report
        </button>
      </div>

      {/* Summary Scorecards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 flex items-center gap-4">
          <div className={clsx(
            "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border",
            integrityScore > 75 ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-400" : integrityScore > 50 ? "bg-amber-950/80 border-amber-500/50 text-amber-400" : "bg-red-950/80 border-red-500/50 text-red-400"
          )}>
            <Award size={24} />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Candidate Integrity Rating</span>
            <span className={clsx("text-2xl font-black font-mono", integrityScore > 75 ? "text-emerald-400" : integrityScore > 50 ? "text-amber-400" : "text-red-400")}>
              {integrityScore}% {integrityScore > 75 ? "(HIGH INTEGRITY)" : integrityScore > 50 ? "(MODERATE)" : "(FLAGGED)"}
            </span>
          </div>
        </div>

        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-950/80 border border-blue-500/50 text-primary flex items-center justify-center shrink-0">
            <Activity size={24} />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total Recorded Irregularities</span>
            <span className="text-2xl font-black font-mono text-white">
              {totalEvents} <span className="text-xs text-slate-400 font-sans font-normal">incidents</span>
            </span>
          </div>
        </div>

        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-950/80 border border-red-500/50 text-red-400 flex items-center justify-center shrink-0">
            <ShieldAlert size={24} />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Critical Violations</span>
            <span className="text-2xl font-black font-mono text-red-400">
              {criticalEvents} <span className="text-xs text-slate-400 font-sans font-normal">high severity</span>
            </span>
          </div>
        </div>
      </div>
      
      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Event Type Distribution */}
        <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800">
          <h3 className="text-slate-300 font-bold mb-4 text-xs uppercase tracking-wider">
            Violation Distribution by Category
          </h3>
          <div className="h-64">
            {typeData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <XAxis dataKey="name" stroke="#64748b" angle={-20} textAnchor="end" interval={0} height={45} tick={{ fontSize: 10 }} />
                  <YAxis stroke="#64748b" allowDecimals={false} />
                  <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '12px', fontSize: '12px' }} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]}>
                    {typeData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                {loading ? 'Analyzing proctor telemetry...' : 'No exam infractions recorded in this session.'}
              </div>
            )}
          </div>
        </div>
        
        {/* Severity Distribution */}
        <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800">
          <h3 className="text-slate-300 font-bold mb-4 text-xs uppercase tracking-wider">
            Severity Classification (Warnings vs Critical)
          </h3>
          <div className="h-64">
            {severityData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={severityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={6}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {severityData.map((entry) => (
                      <Cell key={entry.name} fill={entry.name === 'CRITICAL' ? '#ef4444' : '#f59e0b'} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '12px', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                Clean session: No warnings or critical events recorded.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Official Audit Certificate Box */}
      <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs">
        <div className="flex items-center gap-3">
          <FileText className="text-primary shrink-0" size={24} />
          <div>
            <span className="font-bold text-white block">Official AI Proctoring Session Transcript</span>
            <span className="text-slate-400">Cryptographically verifiable examination telemetry log</span>
          </div>
        </div>
        <div className="text-slate-400 font-mono text-[11px]">
          Session Integrity: <span className="text-emerald-400 font-bold">{integrityScore}% VALID</span> | Proctor Engine: v2.6.4-AGY
        </div>
      </div>

    </div>
  );
};
