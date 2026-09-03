import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Image as ImageIcon, 
  RefreshCw, 
  Search, 
  ExternalLink, 
  Download, 
  X, 
  Eye, 
  Users, 
  Smartphone, 
  BookOpen, 
  CheckCircle2,
  Filter,
  Camera
} from 'lucide-react';
import clsx from 'clsx';

interface ScreenshotItem {
  filename: string;
  relative_path: string;
  date: string;
  time: string;
  event_type: string;
  url: string;
  size_bytes?: number;
  timestamp: string;
}

interface ScreenshotArchiveData {
  total_screenshots: number;
  dates: string[];
  items_by_date: { [date: string]: ScreenshotItem[] };
}

interface ScreenshotGalleryProps {
  backendUrl: string;
}

export const ScreenshotGallery: React.FC<ScreenshotGalleryProps> = ({ backendUrl }) => {
  const [data, setData] = useState<ScreenshotArchiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>('ALL');
  const [selectedEventFilter, setSelectedEventFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [activeModalImage, setActiveModalImage] = useState<ScreenshotItem | null>(null);

  const fetchScreenshots = () => {
    setLoading(true);
    fetch(`${backendUrl}/api/monitoring/screenshots`)
      .then(res => res.json())
      .then((archiveData: ScreenshotArchiveData) => {
        setData(archiveData);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load screenshots archive:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchScreenshots();
  }, [backendUrl]);

  const getEventBadgeClass = (eventType: string) => {
    const clean = eventType.toUpperCase();
    if (clean.includes('CRITICAL') || clean.includes('PHONE') || clean.includes('MULTIPLE') || clean.includes('TAB')) {
      return "bg-red-950/80 text-red-300 border-red-500/50";
    }
    if (clean.includes('DROWSINESS') || clean.includes('HEAD') || clean.includes('BOOK') || clean.includes('BLURRY')) {
      return "bg-amber-950/80 text-amber-300 border-amber-500/50";
    }
    if (clean.includes('ROUTINE') || clean.includes('CHECK')) {
      return "bg-emerald-950/80 text-emerald-300 border-emerald-500/50";
    }
    return "bg-blue-950/80 text-blue-300 border-blue-500/50";
  };

  const getEventIcon = (eventType: string) => {
    const clean = eventType.toUpperCase();
    if (clean.includes('PHONE') || clean.includes('LAPTOP') || clean.includes('DEVICE')) return <Smartphone size={12} className="text-red-400" />;
    if (clean.includes('MULTIPLE') || clean.includes('PERSON')) return <Users size={12} className="text-red-400" />;
    if (clean.includes('HEAD') || clean.includes('DROWSINESS')) return <Eye size={12} className="text-amber-400" />;
    if (clean.includes('BOOK')) return <BookOpen size={12} className="text-amber-400" />;
    if (clean.includes('ROUTINE')) return <CheckCircle2 size={12} className="text-emerald-400" />;
    return <Camera size={12} className="text-blue-400" />;
  };

  // Compile dates and list of items
  const dates = data?.dates || [];
  const itemsByDate = data?.items_by_date || {};

  const filteredDates = selectedDate === 'ALL' ? dates : dates.filter(d => d === selectedDate);

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="glass-panel p-5 bg-slate-900/80 border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
              Surveillance Audit Trail
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Total Captured: {data?.total_screenshots || 0} Snapshots
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-white mt-1 flex items-center gap-2">
            <Calendar size={22} className="text-primary" />
            Exam Evidence & Date-Wise Screenshot Archive
          </h1>
          <p className="text-xs text-slate-400">
            Automated date & time recorded candidate frames with visual timestamp watermarks
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchScreenshots}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 border border-slate-700 shadow-md"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-primary" : ""} /> Refresh Archive
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel p-4 bg-slate-950/60 border-slate-800 flex flex-col md:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by event (e.g. Drowsiness, Phone, Head turned, Routine)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900/90 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-primary"
          />
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-slate-400 shrink-0" />
          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
          >
            <option value="ALL">All Dates ({dates.length})</option>
            {dates.map(d => (
              <option key={d} value={d}>{d} ({itemsByDate[d]?.length || 0})</option>
            ))}
          </select>
        </div>

        {/* Event Type Filter */}
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-400 shrink-0" />
          <select
            value={selectedEventFilter}
            onChange={(e) => setSelectedEventFilter(e.target.value)}
            className="bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
          >
            <option value="ALL">All Event Types</option>
            <option value="DROWSINESS">Drowsiness</option>
            <option value="HEAD_TURNED">Head Turned</option>
            <option value="MULTIPLE_FACES">Multiple Faces</option>
            <option value="PHONE_DETECTED">Phone Detected</option>
            <option value="BOOK_DETECTED">Book / Notes</option>
            <option value="ROUTINE_PROCTOR_CHECK">Routine Verification</option>
            <option value="TAB_SWITCH_DETECTED">Tab Switch</option>
          </select>
        </div>
      </div>

      {/* Timeline of Date Groups */}
      {loading ? (
        <div className="glass-panel p-12 text-center text-slate-500 border-slate-800">
          <RefreshCw size={32} className="mx-auto mb-3 animate-spin text-primary" />
          <p className="text-sm font-semibold text-slate-300">Loading date-wise screenshot archive...</p>
        </div>
      ) : filteredDates.length === 0 ? (
        <div className="glass-panel p-12 text-center text-slate-500 border-slate-800">
          <Camera size={44} className="mx-auto mb-3 opacity-40 text-slate-400" />
          <h3 className="text-sm font-bold text-slate-300">No Screenshots Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Screenshots are recorded date and time wise automatically when exam violations occur or during active exam surveillance.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {filteredDates.map(dateKey => {
            let items = itemsByDate[dateKey] || [];
            if (selectedEventFilter !== 'ALL') {
              items = items.filter(it => it.event_type.toUpperCase().includes(selectedEventFilter));
            }
            if (search.trim()) {
              items = items.filter(it => 
                it.event_type.toLowerCase().includes(search.toLowerCase()) || 
                it.filename.toLowerCase().includes(search.toLowerCase())
              );
            }

            if (items.length === 0) return null;

            return (
              <div key={dateKey} className="glass-panel p-6 bg-slate-950/50 border-slate-800 space-y-4">
                {/* Date Header Strip */}
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-blue-500/10 text-primary border border-blue-500/20">
                      <Calendar size={18} />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white flex items-center gap-2">
                        {dateKey}
                        <span className="text-xs font-normal text-slate-400 font-mono">
                          ({items.length} snapshot{items.length > 1 ? 's' : ''})
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-400">Date-organized audit partition: data/screenshots/{dateKey}/</p>
                    </div>
                  </div>

                  <span className="text-xs font-mono text-slate-400 bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">
                    Latest: {items[0]?.time || 'N/A'}
                  </span>
                </div>

                {/* Screenshots Grid for this date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {items.map((item, idx) => (
                    <div 
                      key={idx}
                      className="group bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden shadow-lg hover:border-primary/50 transition-all duration-200 flex flex-col"
                    >
                      {/* Image Preview Container */}
                      <div 
                        onClick={() => setActiveModalImage(item)}
                        className="relative h-44 bg-black overflow-hidden cursor-pointer"
                      >
                        <img 
                          src={`${backendUrl}${item.url}`} 
                          alt={item.event_type}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                        
                        {/* Overlay hover prompt */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-bold backdrop-blur-[2px]">
                          <ExternalLink size={16} /> View Evidence Frame
                        </div>

                        {/* Event Badge */}
                        <div className="absolute top-2 left-2 pointer-events-none">
                          <span className={clsx(
                            "px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1 shadow-md uppercase backdrop-blur-md",
                            getEventBadgeClass(item.event_type)
                          )}>
                            {getEventIcon(item.event_type)}
                            {item.event_type.replace(/_/g, ' ')}
                          </span>
                        </div>

                        {/* Time Stamp Badge */}
                        <div className="absolute bottom-2 right-2 pointer-events-none bg-black/80 px-2 py-0.5 rounded-md text-[10px] font-mono text-slate-300 border border-slate-700/80 shadow-md flex items-center gap-1">
                          <Clock size={10} className="text-emerald-400" />
                          {item.time}
                        </div>
                      </div>

                      {/* Card Meta Footer */}
                      <div className="p-3 text-xs flex items-center justify-between border-t border-slate-800/80 bg-slate-950/70">
                        <div className="truncate pr-2">
                          <span className="text-[10px] font-mono text-slate-400 block truncate" title={item.filename}>
                            {item.filename}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {item.date} • {item.time}
                          </span>
                        </div>

                        <a 
                          href={`${backendUrl}${item.url}`} 
                          download={item.filename}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition shrink-0"
                          title="Download screenshot"
                        >
                          <Download size={13} />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Fullscreen Snapshot Evidence Modal */}
      {activeModalImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in">
          <div className="max-w-4xl w-full glass-panel p-5 bg-slate-950 border-slate-700 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ImageIcon size={16} className="text-primary" />
                  Evidence Frame: {activeModalImage.event_type.replace(/_/g, ' ')}
                </h3>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  Recorded Date: <b className="text-slate-200">{activeModalImage.date}</b> | Time: <b className="text-slate-200">{activeModalImage.time}</b>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`${backendUrl}${activeModalImage.url}`}
                  download={activeModalImage.filename}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700"
                >
                  <Download size={13} /> Download
                </a>
                <button
                  onClick={() => setActiveModalImage(null)}
                  className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Image Display */}
            <div className="bg-black rounded-2xl overflow-hidden max-h-[70vh] flex items-center justify-center border border-slate-800">
              <img
                src={`${backendUrl}${activeModalImage.url}`}
                alt={activeModalImage.event_type}
                className="max-h-[68vh] w-auto object-contain"
              />
            </div>

            {/* Modal Footer */}
            <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>File: {activeModalImage.filename}</span>
              <span>Relative Path: {activeModalImage.relative_path}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
