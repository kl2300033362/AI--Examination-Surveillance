import React, { useEffect, useState } from 'react';
import { 
  Search, 
  Filter, 
  Image as ImageIcon, 
  Trash2, 
  RefreshCw, 
  X,
  AlertTriangle,
  Eye,
  Users,
  Smartphone,
  BookOpen
} from 'lucide-react';
import clsx from 'clsx';

interface EventLogProps {
  backendUrl: string;
}

export const EventLog: React.FC<EventLogProps> = ({ backendUrl }) => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);

  const fetchEvents = () => {
    setLoading(true);
    fetch(`${backendUrl}/api/events`)
      .then(res => res.json())
      .then(data => {
        setEvents(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch events', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchEvents();
  }, [backendUrl]);

  const handleClearHistory = async () => {
    if (window.confirm('Clear all logged violation events?')) {
      try {
        await fetch(`${backendUrl}/api/events`, { method: 'DELETE' });
        setEvents([]);
      } catch (err) {
        console.error('Failed to clear events', err);
      }
    }
  };

  // Filter events
  const filteredEvents = events.filter(e => {
    const matchesSearch = 
      (e.event_type || '').toLowerCase().includes(search.toLowerCase()) ||
      (e.description || '').toLowerCase().includes(search.toLowerCase());
    const matchesSeverity = severityFilter === 'ALL' || e.severity === severityFilter;
    return matchesSearch && matchesSeverity;
  });

  const getEventIcon = (type: string) => {
    if (type.includes('HEAD')) return <Eye size={14} className="text-amber-400" />;
    if (type.includes('FACE') || type.includes('PERSON')) return <Users size={14} className="text-red-400" />;
    if (type.includes('PHONE') || type.includes('LAPTOP') || type.includes('DEVICE')) return <Smartphone size={14} className="text-red-400" />;
    if (type.includes('BOOK')) return <BookOpen size={14} className="text-amber-400" />;
    return <AlertTriangle size={14} className="text-slate-400" />;
  };

  return (
    <div className="glass-panel p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Proctor Incident & Violation Audit Logs
          </h2>
          <p className="text-xs text-slate-400">Timestamped records of all exam irregularities and candidate telemetry</p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={fetchEvents}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 border border-slate-700"
          >
            <RefreshCw size={13} /> Refresh
          </button>
          <button 
            onClick={handleClearHistory}
            className="p-2 bg-red-950/60 hover:bg-red-900 text-red-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 border border-red-500/30"
          >
            <Trash2 size={13} /> Clear Logs
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search infractions (e.g. Phone, Head turn, Multiple faces, Book)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-400" />
          <select 
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">CRITICAL Only</option>
            <option value="WARNING">WARNING Only</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
              <th className="py-3 px-4">Time</th>
              <th className="py-3 px-4">Violation Event</th>
              <th className="py-3 px-4">Description</th>
              <th className="py-3 px-4">Severity</th>
              <th className="py-3 px-4">Confidence</th>
              <th className="py-3 px-4">Strike #</th>
              <th className="py-3 px-4 text-right">Evidence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {loading ? (
              <tr><td colSpan={7} className="py-8 text-center text-slate-500">Loading audit records...</td></tr>
            ) : filteredEvents.length === 0 ? (
              <tr><td colSpan={7} className="py-8 text-center text-slate-500">No violations logged yet. Clean session.</td></tr>
            ) : (
              filteredEvents.map((e, idx) => {
                const screenshotPath = e.metadata_json?.screenshot_path;
                const screenshotFilename = screenshotPath ? screenshotPath.split(/[\\/]/).pop() : null;
                const snapshotUrl = e.metadata_json?.screenshot_url
                  ? `${backendUrl}${e.metadata_json.screenshot_url}`
                  : e.metadata_json?.relative_screenshot_path
                  ? `${backendUrl}/api/monitoring/screenshots/${e.metadata_json.relative_screenshot_path}`
                  : screenshotFilename
                  ? `${backendUrl}/api/monitoring/screenshots/${screenshotFilename}`
                  : null;

                return (
                  <tr key={idx} className="hover:bg-slate-900/50 transition">
                    <td className="py-3 px-4 text-slate-400">
                      {new Date(e.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-4 font-sans font-bold text-white flex items-center gap-2">
                      {getEventIcon(e.event_type)}
                      {e.event_type.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-300 max-w-xs truncate">
                      {e.description || e.event_type}
                    </td>
                    <td className="py-3 px-4">
                      <span className={clsx(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold",
                        e.severity === 'CRITICAL' ? "bg-red-950 text-red-300 border border-red-500/40" : "bg-amber-950 text-amber-300 border border-amber-500/40"
                      )}>
                        {e.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {e.confidence ? `${Math.round(e.confidence * 100)}%` : '100%'}
                    </td>
                    <td className="py-3 px-4 font-bold text-amber-400">
                      #{e.warning_number || 1}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {snapshotUrl ? (
                        <button 
                          onClick={() => setSelectedScreenshot(snapshotUrl)}
                          className="bg-primary/20 hover:bg-primary text-primary hover:text-white px-2.5 py-1 rounded-lg text-[10px] font-bold font-sans transition flex items-center gap-1 ml-auto"
                        >
                          <ImageIcon size={11} /> Snapshot
                        </button>
                      ) : (
                        <span className="text-slate-600 font-sans text-[10px]">Logged</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Snapshot Preview Modal */}
      {selectedScreenshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
          <div className="max-w-2xl w-full glass-panel p-4 bg-slate-950 border-slate-700">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ImageIcon size={16} className="text-primary" /> Captured Violation Evidence Frame
              </h3>
              <button 
                onClick={() => setSelectedScreenshot(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>
            <div className="bg-black rounded-xl overflow-hidden max-h-[70vh] flex items-center justify-center">
              <img 
                src={selectedScreenshot} 
                alt="Infraction Evidence" 
                className="max-h-[65vh] w-auto object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
