import React, { useState, useEffect } from 'react';
import { Station, Train, LiveStationData } from '../types';
import { 
  X, TrainTrack, Navigation, CheckCircle2, AlertCircle, 
  ArrowRight, Shuffle, Radio, Shield, Clock, Zap, Gauge,
  SlidersHorizontal, ChevronRight, RefreshCw, Layers,
  Compass, MapPin, Activity, Check, ArrowDownLeft, ArrowUpRight,
  TrendingUp, Eye, Wifi, WifiOff, AlertTriangle
} from 'lucide-react';

interface StationYardModalProps {
  station: Station;
  allTrains: Train[];
  onClose: () => void;
  onReassignPlatform: (stationId: string, trainId: string, targetPfNum: number) => void;
  onToggleSignal: (stationId: string, platformId: string) => void;
}

export function StationYardModal({
  station,
  allTrains,
  onClose,
  onReassignPlatform,
  onToggleSignal
}: StationYardModalProps) {
  const [activeTab, setActiveTab] = useState<'yard' | 'board' | 'telemetry'>('board');
  const [boardFilter, setBoardFilter] = useState<'all' | 'arriving' | 'departing' | 'passing'>('all');
  const [selectedPlatform, setSelectedPlatform] = useState<number | null>(null);
  const [reassignModalTrain, setReassignModalTrain] = useState<Train | null>(null);
  const [liveData, setLiveData] = useState<LiveStationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchLiveStationData = async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch(`/api/stations/${station.code}/live`);
      if (res.ok) {
        const data: LiveStationData = await res.json();
        setLiveData(data);
      }
    } catch (e) {
      console.error("Failed to load live station feed", e);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLiveStationData();
    const interval = setInterval(fetchLiveStationData, 3000);
    return () => clearInterval(interval);
  }, [station.code]);

  // Find trains currently at or approaching this station from master train feed
  const berthedTrains = allTrains.filter(t => t.currentStationId === station.id);
  const arrivingTrains = liveData?.arriving || allTrains.filter(t => t.nextStationCode === station.code || (t.route.includes(station.id) && t.currentStationId !== station.id && !berthedTrains.includes(t)));
  const departingTrains = liveData?.departing || berthedTrains;
  const passingTrains = liveData?.passing || allTrains.filter(t => t.route.includes(station.id) && !arrivingTrains.includes(t) && !departingTrains.includes(t));

  const getPlatformTrain = (pfNum: number) => {
    return berthedTrains.find(t => t.platformNumber === pfNum || t.currentPlatformId === `${station.id}-PF${pfNum}`);
  };

  const handleReassign = (targetPfNum: number) => {
    if (!reassignModalTrain) return;
    onReassignPlatform(station.id, reassignModalTrain.trainNumber || reassignModalTrain.id, targetPfNum);
    setReassignModalTrain(null);
  };

  const availableCount = station.platforms.filter(p => p.status === 'Available').length;
  const occupiedCount = station.platforms.filter(p => p.status === 'Occupied').length;

  const filteredBoardTrains = () => {
    if (boardFilter === 'arriving') return arrivingTrains;
    if (boardFilter === 'departing') return departingTrains;
    if (boardFilter === 'passing') return passingTrains;
    // Combine all unique
    const set = new Map<string, Train>();
    [...departingTrains, ...arrivingTrains, ...passingTrains].forEach(t => set.set(t.trainNumber || t.id, t));
    return Array.from(set.values());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl max-h-[94vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Top Header Bar */}
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-950/80 border border-cyan-500/30 rounded-xl text-cyan-400">
              <TrainTrack className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-100 tracking-wide">{station.name}</h3>
                <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 font-mono text-xs font-bold rounded border border-cyan-500/40">
                  {station.code}
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 bg-slate-800 text-slate-300 font-mono text-[11px] rounded border border-slate-700">
                  {liveData?.zone || 'SECR'} / {liveData?.division || 'Bilaspur'} Division
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                <span>{station.platforms.length} Platform Tracks</span>
                <span>•</span>
                <span className="text-emerald-400">Electronic Interlocking (EI) Online</span>
                <span>•</span>
                <span className="text-cyan-400 font-bold">CRIS / NTES Live Feed Synchronized</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live Feed Status Pill */}
            <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl font-mono text-xs">
              <span className={`w-2 h-2 rounded-full ${liveData?.connectionStatus === 'FALLBACK' ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}`} />
              <span className="text-slate-300 font-bold">{liveData?.authenticityStatus || 'LIVE'}</span>
              <span className="text-slate-500 text-[10px]">
                {liveData?.lastUpdated || new Date().toLocaleTimeString()}
              </span>
              <button
                onClick={fetchLiveStationData}
                disabled={isRefreshing}
                className="ml-1 p-1 hover:bg-slate-800 rounded text-cyan-400 transition-colors"
                title="Refresh Live Station Feed"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
              title="Close Yard View"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="bg-slate-950/60 border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('board')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition-all ${
                activeTab === 'board'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              LIVE STATION BOARD ({filteredBoardTrains().length})
            </button>
            <button
              onClick={() => setActiveTab('yard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition-all ${
                activeTab === 'yard'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <TrainTrack className="w-3.5 h-3.5" />
              INTERLOCKING TRACK YARD
            </button>
            <button
              onClick={() => setActiveTab('telemetry')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition-all ${
                activeTab === 'telemetry'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              PLATFORM BERTH CONTROLS ({station.platforms.length})
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
            <span className="text-emerald-400 font-bold">{availableCount} PFs CLEAR</span>
            <span className="text-slate-600">|</span>
            <span className="text-rose-400 font-bold">{occupiedCount} PFs BERTHED</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-5 space-y-5">

          {/* TAB 1: LIVE STATION BOARD (Arriving / Departing / Passing) */}
          {activeTab === 'board' && (
            <div className="space-y-4">
              {/* Category Filter Pills */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setBoardFilter('all')}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-colors ${
                      boardFilter === 'all' ? 'bg-cyan-500 text-slate-950 font-extrabold' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    ALL TRAINS ({arrivingTrains.length + departingTrains.length + passingTrains.length})
                  </button>
                  <button
                    onClick={() => setBoardFilter('arriving')}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-colors ${
                      boardFilter === 'arriving' ? 'bg-emerald-500 text-slate-950 font-extrabold' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                    ARRIVING ({arrivingTrains.length})
                  </button>
                  <button
                    onClick={() => setBoardFilter('departing')}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-colors ${
                      boardFilter === 'departing' ? 'bg-sky-500 text-slate-950 font-extrabold' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    DEPARTING ({departingTrains.length})
                  </button>
                  <button
                    onClick={() => setBoardFilter('passing')}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-colors ${
                      boardFilter === 'passing' ? 'bg-amber-500 text-slate-950 font-extrabold' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    PASSING ({passingTrains.length})
                  </button>
                </div>

                <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">
                  <Shield className="w-3.5 h-3.5 text-cyan-400" />
                  <span>CRIS / NTES Timetable Active</span>
                </div>
              </div>

              {/* Trains Live Table & Cards */}
              <div className="space-y-3">
                {filteredBoardTrains().length === 0 ? (
                  <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-8 text-center">
                    <p className="text-sm font-mono text-slate-400">No currently scheduled trains in this category for {station.name}.</p>
                  </div>
                ) : (
                  filteredBoardTrains().map(trn => {
                    const isBerthed = trn.currentStationId === station.id;
                    const isArriving = trn.nextStationCode === station.code;
                    const isPassing = !isBerthed && !isArriving;
                    
                    const catBadgeColor = 
                      trn.category === 'Vande Bharat' ? 'bg-sky-950 text-sky-300 border-sky-600' :
                      trn.category === 'Rajdhani' || trn.category === 'Duronto' ? 'bg-rose-950 text-rose-300 border-rose-600' :
                      trn.category === 'Freight' ? 'bg-amber-950 text-amber-300 border-amber-600' :
                      'bg-emerald-950 text-emerald-300 border-emerald-600';

                    const isAiAssigned = trn.trackAssignmentSource === 'AI PROPOSED';

                    return (
                      <div 
                        key={trn.trainNumber || trn.id}
                        className="bg-slate-950/70 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition-all shadow-md"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                          {/* Train Identity */}
                          <div className="flex items-start sm:items-center gap-3">
                            <div className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg font-mono text-base font-extrabold text-cyan-300 tracking-wider">
                              {trn.trainNumber || trn.id}
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-sm sm:text-base font-bold text-slate-100">{trn.trainName}</h4>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${catBadgeColor}`}>
                                  {trn.category || trn.type}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                  trn.status === 'RUNNING' || trn.status === 'ON_TIME' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' :
                                  trn.status === 'DELAYED' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' :
                                  'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                                }`}>
                                  {trn.status || 'RUNNING'}
                                </span>
                              </div>
                              <p className="text-xs font-mono text-slate-400 mt-1 flex flex-wrap items-center gap-2">
                                <span>Route: {trn.route.map(id => id.replace('S-', '')).join(' ➔ ')}</span>
                                <span>•</span>
                                <span>{trn.locoType || 'WAP-7 Twin Electric'}</span>
                              </p>
                            </div>
                          </div>

                          {/* Track / Platform Assignment & Source Badge */}
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="flex flex-col items-end">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Track Line:</span>
                                <span className="px-2.5 py-1 bg-cyan-950 text-cyan-300 border border-cyan-800 rounded font-mono text-xs font-extrabold">
                                  {trn.platformNumber ? `PF-${trn.platformNumber}` : trn.trackAssignment || 'MAIN LINE'}
                                </span>
                              </div>
                              <span className={`text-[9px] font-mono mt-0.5 font-bold ${
                                isAiAssigned ? 'text-purple-400' : 'text-emerald-400'
                              }`}>
                                {isAiAssigned ? '⚡ AI PROPOSED ASSIGNMENT' : '📡 OPERATIONAL FEED'}
                              </span>
                            </div>

                            {isBerthed && (
                              <button
                                onClick={() => setReassignModalTrain(trn)}
                                className="px-2.5 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded text-xs font-mono font-bold flex items-center gap-1 transition-colors"
                              >
                                <Shuffle className="w-3.5 h-3.5" /> Switch PF
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Telemetry Detail Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 pt-3 text-xs font-mono">
                          <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">
                            <span className="text-[10px] text-slate-500 uppercase block">Last Reported</span>
                            <span className="font-bold text-slate-200">{trn.lastStation}</span>
                            <span className="text-[10px] text-slate-400 block">({trn.lastStationCode})</span>
                          </div>

                          <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">
                            <span className="text-[10px] text-slate-500 uppercase block">Next Station</span>
                            <span className="font-bold text-cyan-300">{trn.nextStation}</span>
                            <span className="text-[10px] text-slate-400 block">({trn.nextStationCode})</span>
                          </div>

                          <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">
                            <span className="text-[10px] text-slate-500 uppercase block">Sched Arrival/Dep</span>
                            <span className="font-bold text-slate-200">{trn.scheduledArrival} / {trn.scheduledDeparture}</span>
                            <span className="text-[10px] text-slate-400 block">Timetable STA/STD</span>
                          </div>

                          <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">
                            <span className="text-[10px] text-slate-500 uppercase block">Expected Arrival/Dep</span>
                            <span className="font-bold text-amber-300">{trn.expectedArrival} / {trn.expectedDeparture}</span>
                            <span className="text-[10px] text-slate-400 block">ETA Dynamic</span>
                          </div>

                          <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">
                            <span className="text-[10px] text-slate-500 uppercase block">Current Delay</span>
                            <span className={`font-extrabold ${trn.delayMinutes > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                              {trn.delayMinutes > 0 ? `+${trn.delayMinutes} MIN` : 'RIGHT TIME'}
                            </span>
                            <span className="text-[10px] text-slate-400 block">Speed: {trn.speed} km/h</span>
                          </div>

                          <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">
                            <span className="text-[10px] text-slate-500 uppercase block">Position Status</span>
                            <span className="font-bold text-slate-200 truncate block">{trn.positionLabel || 'ESTIMATED FROM UPDATE'}</span>
                            <span className="text-[10px] text-emerald-400 block">Age: {trn.dataFreshnessSeconds || 8}s ago</span>
                          </div>
                        </div>

                        {/* Location Subtext */}
                        <div className="mt-2 text-[11px] font-mono text-slate-400 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            <span>{trn.currentLocationDesc || `Passing block section near ${trn.lastStation}`}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 hidden sm:inline">
                            Source: {trn.source}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 2: ELECTRONIC INTERLOCKING TRACK YARD (SVG Diagram) */}
          {activeTab === 'yard' && (
            <div className="space-y-4">
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 overflow-hidden relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                    <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
                    Electronic Interlocking (EI) Track Layout & Turnouts
                  </div>
                  <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Clear Signal</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Danger / Locked</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-1 bg-cyan-400"></span> Main Line</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-1 bg-sky-400"></span> Loop Line</span>
                  </div>
                </div>

                {/* SVG Yard Diagram */}
                <div className="w-full overflow-x-auto custom-scrollbar py-2">
                  <svg viewBox={`0 0 920 ${station.platforms.length * 48 + 40}`} className="w-full min-w-[800px] h-auto select-none font-mono">
                    <defs>
                      <linearGradient id="train-vb-grad-modal" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#0284c7" />
                        <stop offset="50%" stopColor="#38bdf8" />
                        <stop offset="100%" stopColor="#f8fafc" />
                      </linearGradient>
                      <linearGradient id="train-raj-grad-modal" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#be123c" />
                        <stop offset="50%" stopColor="#f43f5e" />
                        <stop offset="100%" stopColor="#fbbf24" />
                      </linearGradient>
                      <linearGradient id="train-sf-grad-modal" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#047857" />
                        <stop offset="100%" stopColor="#10b981" />
                      </linearGradient>
                      <linearGradient id="train-frt-grad-modal" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#b45309" />
                        <stop offset="100%" stopColor="#f59e0b" />
                      </linearGradient>
                    </defs>

                    {/* Yard Throat Inbound Left */}
                    <line x1="20" y1="20" x2="100" y2={station.platforms.length * 24 + 10} stroke="#334155" strokeWidth="4" strokeLinecap="round" />
                    <text x="25" y="15" fill="#64748b" fontSize="10">INBOUND MAIN (DN/UP)</text>

                    {/* Yard Throat Outbound Right */}
                    <line x1="800" y1={station.platforms.length * 24 + 10} x2="880" y2={station.platforms.length * 48} stroke="#334155" strokeWidth="4" strokeLinecap="round" />
                    <text x="810" y={station.platforms.length * 48 + 15} fill="#64748b" fontSize="10">OUTBOUND</text>

                    {/* Platform Lines */}
                    {station.platforms.map((pf, idx) => {
                      const y = 30 + idx * 48;
                      const train = getPlatformTrain(pf.number);
                      const isOccupied = !!train || pf.status === 'Occupied';
                      const isMainLine = pf.lineType === 'Main Line' || pf.number <= 2;
                      const signalGreen = pf.signalState === 'Green';

                      const trainGrad = train?.category === 'Vande Bharat' 
                        ? 'url(#train-vb-grad-modal)' 
                        : train?.category === 'Rajdhani' || train?.category === 'Duronto'
                        ? 'url(#train-raj-grad-modal)' 
                        : train?.category === 'Freight'
                        ? 'url(#train-frt-grad-modal)'
                        : 'url(#train-sf-grad-modal)';

                      return (
                        <g key={pf.id} className="cursor-pointer" onClick={() => setSelectedPlatform(pf.number)}>
                          {/* Left Switch Point Crossover */}
                          <path
                            d={`M 100 ${station.platforms.length * 24 + 10} C 140 ${station.platforms.length * 24 + 10}, 150 ${y}, 190 ${y}`}
                            fill="none"
                            stroke={isOccupied ? '#f43f5e' : '#0284c7'}
                            strokeWidth="2"
                            strokeDasharray={isOccupied ? "none" : "3 3"}
                            opacity="0.6"
                          />

                          {/* Right Switch Point Crossover */}
                          <path
                            d={`M 710 ${y} C 750 ${y}, 760 ${station.platforms.length * 24 + 10}, 800 ${station.platforms.length * 24 + 10}`}
                            fill="none"
                            stroke={isOccupied ? '#f43f5e' : '#0284c7'}
                            strokeWidth="2"
                            strokeDasharray={isOccupied ? "none" : "3 3"}
                            opacity="0.6"
                          />

                          {/* Platform Concrete Island */}
                          <rect x="190" y={y - 15} width="520" height="8" rx="3" fill="#1e293b" stroke="#334155" strokeWidth="1" />
                          <line x1="200" y1={y - 11} x2="700" y2={y - 11} stroke="#475569" strokeWidth="1" strokeDasharray="10 5" />

                          {/* Track Sleepers */}
                          <line x1="180" y1={y} x2="720" y2={y} stroke="#0f172a" strokeWidth="8" strokeLinecap="round" />
                          <line x1="180" y1={y} x2="720" y2={y} stroke={isOccupied ? '#881337' : '#0369a1'} strokeWidth="8" strokeDasharray="2 5" />
                          
                          {/* Rail Track Line */}
                          <line
                            x1="170"
                            y1={y}
                            x2="730"
                            y2={y}
                            stroke={isOccupied ? '#f43f5e' : isMainLine ? '#22d3ee' : '#38bdf8'}
                            strokeWidth="2.5"
                            strokeLinecap="round"
                          />

                          {/* Platform Badge */}
                          <rect x="110" y={y - 12} width="58" height="24" rx="4" fill="#090d16" stroke={isMainLine ? '#06b6d4' : '#334155'} strokeWidth="1" />
                          <text x="139" y={y + 3} fill="#f1f5f9" fontSize="11" fontWeight="bold" textAnchor="middle">
                            PF-{pf.number}
                          </text>
                          <text x="139" y={y + 11} fill={isMainLine ? '#22d3ee' : '#94a3b8'} fontSize="7" textAnchor="middle">
                            {isMainLine ? 'MAIN LINE' : 'LOOP LINE'}
                          </text>

                          {/* Signal Lamp */}
                          <g 
                            transform={`translate(735, ${y})`} 
                            onClick={(e) => { e.stopPropagation(); onToggleSignal(station.id, pf.id); }}
                            className="hover:scale-125 transition-transform"
                          >
                            <circle r="6" fill="#090d16" stroke="#475569" strokeWidth="1.5" />
                            <circle r="4" fill={signalGreen ? '#10b981' : '#ef4444'} className={signalGreen ? 'animate-pulse' : ''} />
                          </g>

                          {/* Train Berthed on Platform */}
                          {train ? (
                            <g transform={`translate(240, ${y - 10})`}>
                              <rect x="0" y="2" width="45" height="16" rx="4" fill={trainGrad} stroke="#0f172a" strokeWidth="1" />
                              <polygon points="45,4 52,10 45,16" fill={trainGrad} />
                              <polygon points="52,9 75,4 75,16 52,11" fill="rgba(254, 240, 138, 0.3)" />

                              {/* Coaches */}
                              <rect x="58" y="3" width="55" height="14" rx="2" fill={trainGrad} opacity="0.95" />
                              <rect x="117" y="3" width="55" height="14" rx="2" fill={trainGrad} opacity="0.95" />
                              <rect x="176" y="3" width="55" height="14" rx="2" fill={trainGrad} opacity="0.95" />
                              <rect x="235" y="3" width="55" height="14" rx="2" fill={trainGrad} opacity="0.95" />
                              <rect x="294" y="3" width="55" height="14" rx="2" fill={trainGrad} opacity="0.95" />

                              {/* Pantograph */}
                              <line x1="20" y1="2" x2="26" y2="-4" stroke="#e2e8f0" strokeWidth="1.5" />
                              <line x1="26" y1="-4" x2="32" y2="2" stroke="#e2e8f0" strokeWidth="1.5" />
                              <line x1="22" y1="-4" x2="30" y2="-4" stroke="#38bdf8" strokeWidth="2" />

                              {/* Label */}
                              <rect x="80" y="-14" width="220" height="16" rx="4" fill="rgba(2,6,23,0.92)" stroke="#38bdf8" strokeWidth="0.8" />
                              <text x="190" y="-3" fill="#f8fafc" fontSize="8" fontWeight="bold" textAnchor="middle">
                                {train.trainNumber} {train.trainName} ({train.speed} km/h • {train.platformPhase || 'berthed'})
                              </text>
                            </g>
                          ) : (
                            <g transform={`translate(420, ${y})`}>
                              <text x="0" y="3" fill="#475569" fontSize="9" textAnchor="middle">
                                TRACK CIRCUIT CLEAR • LENGTH {pf.lengthMeters || 600}M
                              </text>
                            </g>
                          )}
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PLATFORM BERTH TELEMETRY & REASSIGNMENT */}
          {activeTab === 'telemetry' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {station.platforms.map(pf => {
                const train = getPlatformTrain(pf.number);
                const isOccupied = !!train || pf.status === 'Occupied';
                const isSelected = selectedPlatform === pf.number;

                return (
                  <div
                    key={pf.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isSelected 
                        ? 'bg-slate-800/80 border-cyan-500 shadow-lg shadow-cyan-500/10' 
                        : isOccupied 
                        ? 'bg-slate-950/60 border-rose-900/40 hover:border-rose-700/60' 
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${isOccupied ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                        <span className="font-mono text-sm font-bold text-slate-100">
                          Platform {pf.number}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 px-1.5 py-0.5 bg-slate-900 rounded border border-slate-800">
                          {pf.lineType || (pf.number <= 2 ? 'Main Line' : 'Loop Line')}
                        </span>
                      </div>

                      <button
                        onClick={() => onToggleSignal(station.id, pf.id)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 border transition-colors ${
                          pf.signalState === 'Green'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-400 border-rose-500/40 hover:bg-rose-500/30'
                        }`}
                        title="Click to toggle starter signal aspect"
                      >
                        <Radio className="w-2.5 h-2.5" />
                        SIG: {pf.signalState || 'Green'}
                      </button>
                    </div>

                    {train ? (
                      <div className="mt-2 p-2.5 bg-slate-900/80 rounded-lg border border-slate-800 space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-cyan-300">{train.trainNumber} - {train.trainName}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                            {train.category || train.type}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-400 pt-1">
                          <div>
                            <span className="text-slate-500">SPEED:</span> {train.speed} km/h
                          </div>
                          <div>
                            <span className="text-slate-500">COACHES:</span> {train.coaches || 22} Rake
                          </div>
                          <div>
                            <span className="text-slate-500">DIRECTION:</span> {train.direction} Line
                          </div>
                          <div>
                            <span className="text-slate-500">DELAY:</span>{' '}
                            <span className={train.delayMinutes > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                              +{train.delayMinutes} min
                            </span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-800/80 flex justify-end">
                          <button
                            onClick={() => setReassignModalTrain(train)}
                            className="px-2.5 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded text-[10px] font-mono font-bold flex items-center gap-1.5 transition-colors"
                          >
                            <Shuffle className="w-3 h-3" /> Reassign Line / Platform
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 p-3 bg-slate-900/30 rounded-lg border border-slate-800/60 text-center">
                        <span className="text-xs font-mono text-emerald-400 font-bold flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> PLATFORM AVAILABLE
                        </span>
                        <p className="text-[10px] font-mono text-slate-500 mt-1">
                          Axle counter clear • 650m length • Ready for inbound rake
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Reassignment Popup Modal */}
        {reassignModalTrain && (
          <div className="absolute inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-cyan-500/50 rounded-xl p-5 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Shuffle className="w-4 h-4 text-cyan-400" />
                  Reassign Platform for {reassignModalTrain.trainNumber} {reassignModalTrain.trainName}
                </h4>
                <button
                  onClick={() => setReassignModalTrain(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-400 font-mono">
                Select target platform line to switch interlocking turnouts and route track:
              </p>

              <div className="grid grid-cols-2 gap-2">
                {station.platforms.map(pf => {
                  const isCurrent = reassignModalTrain.platformNumber === pf.number;
                  const isOccupiedByOther = pf.status === 'Occupied' && !isCurrent;

                  return (
                    <button
                      key={pf.id}
                      disabled={isCurrent || isOccupiedByOther}
                      onClick={() => handleReassign(pf.number)}
                      className={`p-3 rounded-lg border text-left font-mono transition-all ${
                        isCurrent
                          ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-400 opacity-60'
                          : isOccupiedByOther
                          ? 'bg-rose-950/20 border-rose-900/40 text-rose-400/50 opacity-40 cursor-not-allowed'
                          : 'bg-slate-950/60 border-slate-700 hover:border-cyan-400 hover:bg-slate-800 text-slate-200'
                      }`}
                    >
                      <div className="text-xs font-bold">Platform {pf.number}</div>
                      <div className="text-[10px] text-slate-400">
                        {isCurrent ? 'Current Line' : isOccupiedByOther ? 'Occupied' : 'Clear (Assign)'}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setReassignModalTrain(null)}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-mono"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
