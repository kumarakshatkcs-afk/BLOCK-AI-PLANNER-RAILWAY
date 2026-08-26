import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Station, TrackSegment, Train, Division, Platform } from '../types';
import { 
  Activity, AlertTriangle, Layers, TrainTrack, Navigation, 
  CheckCircle2, ShieldAlert, Cpu, Route, LocateFixed, ZoomIn, 
  ZoomOut, Maximize2, Radio, SlidersHorizontal, Eye, Zap,
  Sliders, ShieldCheck, GitBranch, Bell, Compass, MapPin, 
  Mountain, Waves, Grid, Crosshair, Info, Globe, Building2,
  Share2, ArrowUpRight
} from 'lucide-react';
import { StationYardModal } from './StationYardModal';

interface NetworkMapProps {
  divisions: Division[];
  stations: Station[];
  segments: TrackSegment[];
  trains: Train[];
  onOptimizeRoute: (sourceId: string, destId: string) => void;
  aiRecommendedPath?: string[];
  planStatus?: 'pending' | 'approved' | 'modified';
  mapMode?: 'schematic' | 'satellite';
  onOpenOfficialReview?: () => void;
  activeIssueCount?: number;
  externalTransform?: {x: number, y: number, k: number} | null;
}

interface SwitchState {
  [pointId: string]: 'NORMAL' | 'REVERSE';
}

interface LocalSignalState {
  [signalId: string]: 'Green' | 'Red';
}

export function NetworkMap({ 
  divisions, 
  stations, 
  segments, 
  trains, 
  onOptimizeRoute, 
  aiRecommendedPath, 
  planStatus = 'pending', 
  mapMode = 'schematic',
  onOpenOfficialReview,
  activeIssueCount = 0,
  externalTransform
}: NetworkMapProps) {
  const [selectedDivision, setSelectedDivision] = useState<string>('ALL');
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 0.95 });

  useEffect(() => {
    if (externalTransform) {
      const svg = svgRef.current;
      const width = svg?.clientWidth || 1100;
      const height = svg?.clientHeight || 650;
      setTransform({
        x: width / 2 - externalTransform.x * externalTransform.k,
        y: height / 2 - externalTransform.y * externalTransform.k,
        k: externalTransform.k
      });
    }
  }, [externalTransform]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const [hoveredStation, setHoveredStation] = useState<Station | null>(null);
  const [hoveredSegment, setHoveredSegment] = useState<TrackSegment | null>(null);
  const [selectedStationYard, setSelectedStationYard] = useState<Station | null>(null);
  const [selectedGisStation, setSelectedGisStation] = useState<Station | null>(null);
  const [selectedGisSegment, setSelectedGisSegment] = useState<TrackSegment | null>(null);
  const [cursorGis, setCursorGis] = useState<{ lat: number; lng: number } | null>(null);
  const [sourceStation, setSourceStation] = useState<string | null>(null);
  const [destStation, setDestStation] = useState<string | null>(null);

  // Live interactive point machines and signals on the map
  const [switchStates, setSwitchStates] = useState<SwitchState>({});
  const [signalOverrides, setSignalOverrides] = useState<LocalSignalState>({});

  const [toggles, setToggles] = useState({ 
    trains: true, 
    labels: true, 
    maintenance: true, 
    aiRoute: true,
    platformLines: true,
    turnouts: false,
    signals: false,
    oheMasts: false,
    trackCircuits: false,
    gisOverlay: false,
    gisGrid: false,
    rivers: false,
    stateBorders: false,
    chainageMarkers: false
  });
  
  const svgRef = useRef<SVGSVGElement>(null);

  // SVG Pan & Zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const scaleFactor = e.deltaY > 0 ? 0.95 : 1.05;
    setTransform(prev => ({
      ...prev,
      k: Math.max(0.35, Math.min(prev.k * scaleFactor, 4.5))
    }));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
  };

  const toDms = (val: number, isLat: boolean) => {
    const dir = isLat ? (val >= 0 ? 'N' : 'S') : (val >= 0 ? 'E' : 'W');
    const abs = Math.abs(val);
    const deg = Math.floor(abs);
    const minFloat = (abs - deg) * 60;
    const min = Math.floor(minFloat);
    const sec = ((minFloat - min) * 60).toFixed(1);
    return `${deg}°${min}'${sec}" ${dir}`;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const svg = svgRef.current;
    if (svg) {
      const rect = svg.getBoundingClientRect();
      const svgX = (e.clientX - rect.left - transform.x) / transform.k;
      const svgY = (e.clientY - rect.top - transform.y) / transform.k;
      // Precise geo-projection calculation
      const lng = 79.0882 + (svgX - 240) * 0.0073346;
      const lat = 21.1524 - (svgY - 500) * 0.0065035;
      setCursorGis({ lat: Number(lat.toFixed(4)), lng: Number(lng.toFixed(4)) });
    }

    if (!isDragging) return;
    setTransform(prev => ({
      ...prev,
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    }));
  };

  const handleMouseUp = () => setIsDragging(false);

  useEffect(() => {
     const svg = svgRef.current;
     if(svg) {
        svg.addEventListener('wheel', handleWheel as any, { passive: false });
        return () => svg.removeEventListener('wheel', handleWheel as any);
     }
  }, [transform]);

  const handleStationClick = (station: Station, e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.shiftKey) {
      if (!sourceStation) {
        setSourceStation(station.id);
        setDestStation(null);
      } else if (!destStation && station.id !== sourceStation) {
        setDestStation(station.id);
        onOptimizeRoute(sourceStation, station.id);
      } else {
        setSourceStation(station.id);
        setDestStation(null);
      }
    } else {
      setSelectedStationYard(station);
    }
  };

  const handleRouteSelect = (stationId: string) => {
    if (!sourceStation) {
      setSourceStation(stationId);
      setDestStation(null);
    } else if (!destStation && stationId !== sourceStation) {
      setDestStation(stationId);
      onOptimizeRoute(sourceStation, stationId);
    } else {
      setSourceStation(stationId);
      setDestStation(null);
    }
  };

  const getStationCoords = (id: string) => {
    const s = stations.find(s => s.id === id);
    return s ? { x: s.x, y: s.y } : { x: 0, y: 0 };
  };

  const zoomIn = () => setTransform(prev => ({ ...prev, k: Math.min(prev.k * 1.2, 4.5) }));
  const zoomOut = () => setTransform(prev => ({ ...prev, k: Math.max(prev.k / 1.2, 0.35) }));
  const resetView = () => setTransform({ x: 0, y: 0, k: 0.95 });

  const centerOnStation = (stationId: string) => {
    const s = stations.find(st => st.id === stationId);
    if (!s) return;
    const svg = svgRef.current;
    const width = svg?.clientWidth || 1100;
    const height = svg?.clientHeight || 650;
    setTransform({
      x: width / 2 - s.x * 1.6,
      y: height / 2 - s.y * 1.6,
      k: 1.6
    });
  };

  const handleTogglePoint = (pointId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSwitchStates(prev => ({
      ...prev,
      [pointId]: prev[pointId] === 'REVERSE' ? 'NORMAL' : 'REVERSE'
    }));
  };

  const handleToggleSignalLocal = (signalId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSignalOverrides(prev => ({
      ...prev,
      [signalId]: prev[signalId] === 'Red' ? 'Green' : 'Red'
    }));
  };

  const handleReassignPlatform = async (stationId: string, trainId: string, targetPfNum: number) => {
    try {
      await fetch('/api/platform/reassign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stationId, trainId, targetPlatformNumber: targetPfNum })
      });
    } catch (err) {
      console.error('Failed to reassign platform', err);
    }
  };

  const handleToggleSignal = async (stationId: string, platformId: string) => {
    try {
      await fetch('/api/platform/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stationId, platformId })
      });
    } catch (err) {
      console.error('Failed to toggle signal', err);
    }
  };

  const filteredStations = selectedDivision === 'ALL' ? stations : stations.filter(s => s.divisionId === selectedDivision);
  const filteredStationIds = new Set(filteredStations.map(s => s.id));
  
  const filteredSegments = segments.filter(seg => 
    selectedDivision === 'ALL' || (filteredStationIds.has(seg.sourceId) && filteredStationIds.has(seg.targetId))
  );

  // Pathfinding visual route
  const highlightedRoute = useMemo(() => {
     if(!aiRecommendedPath || aiRecommendedPath.length === 0) return [];
     const segmentIds: string[] = [];
     for(let i=0; i<aiRecommendedPath.length-1; i++){
        const edge = segments.find(s => 
           (s.sourceId === aiRecommendedPath[i] && s.targetId === aiRecommendedPath[i+1]) || 
           (s.targetId === aiRecommendedPath[i] && s.sourceId === aiRecommendedPath[i+1])
        );
        if(edge) segmentIds.push(edge.id);
     }
     return segmentIds;
  }, [aiRecommendedPath, segments]);

  // Group divisions
  const divisionsMap = useMemo(() => {
    const map = new Map<string, Division>();
    divisions.forEach(d => map.set(d.id, d));
    return map;
  }, [divisions]);

  // Comprehensive Railway Geometry Calculation for Each Station:
  // - Platform Lines
  // - Inbound and Outbound Yard Throats
  // - Crossover Switch Ladders (Turnouts)
  // - Scissors Crossovers
  // - Signals & Point Machines
  const getStationRailwayGeometry = (station: Station) => {
    const angleRad = ((station.trackAngle || 0) * Math.PI) / 180;
    const dx = Math.cos(angleRad);
    const dy = Math.sin(angleRad);
    const nx = -Math.sin(angleRad);
    const ny = Math.cos(angleRad);

    const pfCount = station.platforms.length;
    const spacing = 11.5;
    const halfLen = (station.yardLength || 120) / 2;

    const platformLines = station.platforms.map((pf, idx) => {
      const offset = (idx - (pfCount - 1) / 2) * spacing;
      const cx = station.x + nx * offset;
      const cy = station.y + ny * offset;

      const pInbound = { x: cx - dx * halfLen, y: cy - dy * halfLen };
      const pCenter = { x: cx, y: cy };
      const pOutbound = { x: cx + dx * halfLen, y: cy + dy * halfLen };

      return {
        platform: pf,
        index: idx,
        cx,
        cy,
        offset,
        pInbound,
        pCenter,
        pOutbound
      };
    });

    // Station Throat Points where lines converge/diverge
    const throatLead = halfLen + 24;
    const throatInbound = { x: station.x - dx * throatLead, y: station.y - dy * throatLead };
    const throatOutbound = { x: station.x + dx * throatLead, y: station.y + dy * throatLead };

    // Inbound & Outbound UP and DN Mainline alignment points
    const upOffset = -spacing * 0.5;
    const dnOffset = spacing * 0.5;

    const inboundUP = { x: throatInbound.x + nx * upOffset, y: throatInbound.y + ny * upOffset };
    const inboundDN = { x: throatInbound.x + nx * dnOffset, y: throatInbound.y + ny * dnOffset };
    const outboundUP = { x: throatOutbound.x + nx * upOffset, y: throatOutbound.y + ny * upOffset };
    const outboundDN = { x: throatOutbound.x + nx * dnOffset, y: throatOutbound.y + ny * dnOffset };

    // Scissors Crossover Coordinates (X-crossover between UP & DN lines)
    const scissorInboundStart = { x: throatInbound.x - dx * 14, y: throatInbound.y - dy * 14 };
    const scissorOutboundEnd = { x: throatOutbound.x + dx * 14, y: throatOutbound.y + dy * 14 };

    return {
      dx, dy, nx, ny,
      platformLines,
      throatInbound,
      throatOutbound,
      inboundUP,
      inboundDN,
      outboundUP,
      outboundDN,
      scissorInboundStart,
      scissorOutboundEnd,
      angleDeg: station.trackAngle || 0
    };
  };

  // Pre-calculate geometries for all stations
  const stationGeomMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getStationRailwayGeometry>>();
    stations.forEach(st => {
      map.set(st.id, getStationRailwayGeometry(st));
    });
    return map;
  }, [stations]);

  return (
    <div className="absolute inset-0 z-0 bg-slate-950 flex flex-col overflow-hidden select-none">
      
      {/* Immersive Dark Railway Ground Grid */}
      {mapMode === 'satellite' ? (
        <div className="absolute inset-0 pointer-events-none opacity-30">
          <svg className="w-full h-full">
            <defs>
              <filter id="satellite-terrain">
                <feTurbulence type="fractalNoise" baseFrequency="0.005" numOctaves="4" result="noise" />
                <feColorMatrix type="matrix" values="
                  0.1 0 0 0 0.05
                  0 0.35 0 0 0.12
                  0 0 0.1 0 0.05
                  0 0 0 1 0" in="noise" result="coloredNoise" />
              </filter>
            </defs>
            <rect width="100%" height="100%" filter="url(#satellite-terrain)" />
          </svg>
          <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-[#020617]/60 pointer-events-none"></div>
        </div>
      ) : (
        <div className="absolute inset-0 pointer-events-none" style={{ 
            backgroundImage: 'radial-gradient(circle at 50% 50%, #0d1527 0%, #020617 85%)',
        }}>
          {/* Railway Engineering Grid Overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a15_1px,transparent_1px),linear-gradient(to_bottom,#0f172a15_1px,transparent_1px)] bg-[size:40px_40px] opacity-40"></div>
        </div>
      )}

      {/* Top Floating Control Bar */}
      <div className="absolute top-4 left-6 right-6 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
         
         {/* Left: Division & Corridor Navigator */}
         <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md border border-slate-700/70 rounded-2xl p-1.5 shadow-2xl pointer-events-auto">
            <button
              onClick={() => setSelectedDivision('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all ${
                selectedDivision === 'ALL'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              ALL ZONES (SECR & SER)
            </button>

            {divisions.map(div => {
              const isSelected = selectedDivision === div.id;
              return (
                <button
                  key={div.id}
                  onClick={() => setSelectedDivision(div.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-slate-800 text-white shadow-md border border-slate-600'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: div.color }} />
                  {div.name}
                  <span className="text-[10px] text-slate-500">({div.zone})</span>
                </button>
              );
            })}
         </div>

         {/* Center: Live Station Quick Jump Selector */}
         <div className="hidden lg:flex items-center gap-2 bg-slate-900/90 backdrop-blur-md border border-slate-700/70 rounded-2xl px-3 py-1.5 shadow-2xl pointer-events-auto">
            <TrainTrack className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-mono text-slate-400 uppercase font-semibold">Jump to Station:</span>
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) centerOnStation(e.target.value);
              }}
              className="bg-slate-950 text-xs font-mono text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1 focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="">Select Interlocking Node...</option>
              {stations.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code} - {s.platforms.length} PFs)
                </option>
              ))}
            </select>
         </div>

         {/* Right: Pathfinding & Route Selector */}
         <div className="flex items-center gap-2 pointer-events-auto">
            <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/70 rounded-2xl p-1.5 flex items-center gap-1.5 shadow-2xl">
              <span className="text-[11px] font-mono text-slate-400 pl-2 flex items-center gap-1">
                <Route className="w-3.5 h-3.5 text-purple-400" /> AI Route:
              </span>
              <select
                value={sourceStation || ''}
                onChange={(e) => handleRouteSelect(e.target.value)}
                className="bg-slate-950 text-xs font-mono text-cyan-400 border border-slate-700 rounded-lg px-2 py-1 focus:outline-none"
              >
                <option value="">Origin Station...</option>
                {stations.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>
              <span className="text-slate-600 text-xs font-mono">➔</span>
              <select
                value={destStation || ''}
                onChange={(e) => {
                  if (sourceStation && e.target.value) {
                    setDestStation(e.target.value);
                    onOptimizeRoute(sourceStation, e.target.value);
                  }
                }}
                className="bg-slate-950 text-xs font-mono text-purple-400 border border-slate-700 rounded-lg px-2 py-1 focus:outline-none"
              >
                <option value="">Dest Station...</option>
                {stations.filter(s => s.id !== sourceStation).map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>

            {/* Official Plan Review & Issues Trigger Button */}
            {onOpenOfficialReview && (
              <button
                onClick={onOpenOfficialReview}
                className="bg-gradient-to-r from-rose-950/90 to-purple-950/90 hover:from-rose-900 hover:to-purple-900 border border-rose-500/50 hover:border-rose-400 text-rose-300 rounded-2xl px-3.5 py-1.5 shadow-2xl flex items-center gap-2 text-xs font-mono font-bold transition-all"
                title="Open Official Plan Review & Issue Solving Cockpit"
              >
                <ShieldAlert className="w-4 h-4 text-rose-400 animate-pulse" />
                <span className="hidden sm:inline">OFFICIAL REVIEW</span>
                {activeIssueCount > 0 && (
                  <span className="bg-rose-500 text-slate-950 px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                    {activeIssueCount}
                  </span>
                )}
              </button>
            )}
         </div>

      </div>

      {/* Floating Layer & Detail Toggles (Right Side) */}
      <div className="absolute right-6 top-20 z-20 flex flex-col gap-2 pointer-events-auto">
        
        {/* Navigation & Zoom Controls */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/70 rounded-xl p-1.5 shadow-xl flex flex-col gap-1">
          <button
            onClick={zoomIn}
            className="p-2 text-slate-300 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-colors"
            title="Zoom In (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={zoomOut}
            className="p-2 text-slate-300 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-colors"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={resetView}
            className="p-2 text-slate-300 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-colors"
            title="Reset Map View"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Railway Topology Feature Toggles */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/70 rounded-xl p-1.5 shadow-xl flex flex-col gap-1">
          {/* GIS Geographical Layer & Grid Toggle */}
          <button
            onClick={() => setToggles(t => ({ ...t, gisOverlay: !t.gisOverlay }))}
            className={`p-2 rounded-lg transition-colors flex items-center justify-center ${
              toggles.gisOverlay 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.3)]' 
                : 'text-slate-500 hover:bg-slate-800'
            }`}
            title="Toggle GIS Geographic Information Layer (State Borders, Rivers, Grid, Chainage)"
          >
            <Globe className="w-4 h-4" />
          </button>

          {/* Turnout Points & Switches */}
          <button
            onClick={() => setToggles(t => ({ ...t, turnouts: !t.turnouts }))}
            className={`p-2 rounded-lg transition-colors flex items-center justify-center ${
              toggles.turnouts 
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' 
                : 'text-slate-500 hover:bg-slate-800'
            }`}
            title="Toggle Turnout Points & Switches (P-101/P-102)"
          >
            <GitBranch className="w-4 h-4" />
          </button>

          {/* Color Light Signals */}
          <button
            onClick={() => setToggles(t => ({ ...t, signals: !t.signals }))}
            className={`p-2 rounded-lg transition-colors flex items-center justify-center ${
              toggles.signals 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                : 'text-slate-500 hover:bg-slate-800'
            }`}
            title="Toggle Color Light Signals (Home/Starter/IBS)"
          >
            <Radio className="w-4 h-4" />
          </button>

          {/* 25kV OHE Electrification Gantries */}
          <button
            onClick={() => setToggles(t => ({ ...t, oheMasts: !t.oheMasts }))}
            className={`p-2 rounded-lg transition-colors flex items-center justify-center ${
              toggles.oheMasts 
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' 
                : 'text-slate-500 hover:bg-slate-800'
            }`}
            title="Toggle 25kV AC Electrification Masts & LC Gates"
          >
            <Zap className="w-4 h-4" />
          </button>

          {/* Station Platform Track Lines */}
          <button
            onClick={() => setToggles(t => ({ ...t, platformLines: !t.platformLines }))}
            className={`p-2 rounded-lg transition-colors flex items-center justify-center ${
              toggles.platformLines 
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' 
                : 'text-slate-500 hover:bg-slate-800'
            }`}
            title="Toggle Station Platform Tracks (PF-1 to PF-N)"
          >
            <TrainTrack className="w-4 h-4" />
          </button>
        </div>

      </div>
      
      {/* Interactive Map SVG Canvas */}
      <div 
         className="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing w-full h-full"
         onMouseDown={handleMouseDown}
         onMouseMove={handleMouseMove}
         onMouseUp={handleMouseUp}
         onMouseLeave={handleMouseUp}
      >
        {/* Onboarding Help Chip */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-slate-900/90 backdrop-blur border border-slate-700/70 text-slate-300 text-[10px] font-mono rounded-full pointer-events-none z-10 shadow-2xl flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-cyan-400">
            <TrainTrack className="w-3.5 h-3.5" /> Interconnected Railway Permanent Way
          </span>
          <span className="text-slate-600">|</span>
          <span className="flex items-center gap-1.5 text-amber-400">
            <GitBranch className="w-3.5 h-3.5" /> Click Points/Signals to Toggle Route
          </span>
          <span className="text-slate-600">|</span>
          <span className="flex items-center gap-1.5 text-purple-400">
            <Eye className="w-3.5 h-3.5" /> Click Station for Yard Interlocking
          </span>
        </div>

        <svg ref={svgRef} className="w-full h-full absolute inset-0 z-10">
          <defs>
            <filter id="glow-cyan" x="-30%" y="-30%" width="160%" height="160%">
               <feGaussianBlur stdDeviation="3" result="blur" />
               <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-purple" x="-50%" y="-50%" width="200%" height="200%">
               <feGaussianBlur stdDeviation="5" result="blur" />
               <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-emerald" x="-50%" y="-50%" width="200%" height="200%">
               <feGaussianBlur stdDeviation="5" result="blur" />
               <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-amber" x="-50%" y="-50%" width="200%" height="200%">
               <feGaussianBlur stdDeviation="5" result="blur" />
               <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-red" x="-30%" y="-30%" width="160%" height="160%">
               <feGaussianBlur stdDeviation="4" result="blur" />
               <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Ballast Gradient */}
            <linearGradient id="ballast-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0b1120" />
              <stop offset="50%" stopColor="#030712" />
              <stop offset="100%" stopColor="#0b1120" />
            </linearGradient>
          </defs>

          <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
            
            {/* =========================================================================
                0. GIS GEOGRAPHIC INFORMATION LAYER (State Borders, Rivers, Grid, Chainage)
                ========================================================================= */}
            {toggles.gisOverlay && (
              <g className="gis-layer pointer-events-none transition-opacity duration-300">
                {/* A. GIS Coordinate Grid (Latitude Parallels & Longitude Meridians) */}
                {toggles.gisGrid && (
                  <g opacity="0.45">
                    {/* Parallels (Latitude) */}
                    {[
                      { lat: "24° 00' N", y: 90 },
                      { lat: "23° 00' N", y: 245 },
                      { lat: "22° 00' N", y: 400 },
                      { lat: "21° 00' N", y: 530 },
                      { lat: "20° 00' N", y: 670 }
                    ].map((grid, i) => (
                      <g key={`lat-${i}`}>
                        <line x1="0" y1={grid.y} x2="1600" y2={grid.y} stroke="#1e293b" strokeWidth="0.8" strokeDasharray="6 6" />
                        <text x="30" y={grid.y - 4} fill="#475569" fontSize="8" fontFamily="monospace" fontWeight="bold">
                          LAT {grid.lat}
                        </text>
                        <text x="1500" y={grid.y - 4} fill="#475569" fontSize="8" fontFamily="monospace" fontWeight="bold">
                          {grid.lat}
                        </text>
                      </g>
                    ))}

                    {/* Meridians (Longitude) */}
                    {[
                      { lng: "79° 00' E", x: 230 },
                      { lng: "80° 00' E", x: 360 },
                      { lng: "81° 00' E", x: 490 },
                      { lng: "82° 00' E", x: 670 },
                      { lng: "83° 00' E", x: 800 },
                      { lng: "84° 00' E", x: 940 },
                      { lng: "85° 00' E", x: 1070 },
                      { lng: "86° 00' E", x: 1200 },
                      { lng: "87° 00' E", x: 1400 }
                    ].map((grid, i) => (
                      <g key={`lng-${i}`}>
                        <line x1={grid.x} y1="30" x2={grid.x} y2="760" stroke="#1e293b" strokeWidth="0.8" strokeDasharray="6 6" />
                        <text x={grid.x + 4} y="55" fill="#475569" fontSize="8" fontFamily="monospace" fontWeight="bold">
                          LONG {grid.lng}
                        </text>
                        <text x={grid.x + 4} y="745" fill="#475569" fontSize="8" fontFamily="monospace" fontWeight="bold">
                          {grid.lng}
                        </text>
                      </g>
                    ))}
                  </g>
                )}

                {/* B. Authentic State Administrative Boundaries */}
                {toggles.stateBorders && (
                  <g opacity="0.7">
                    {/* Maharashtra - Chhattisgarh Border */}
                    <path 
                      d="M 390,340 C 400,430 405,480 395,570 C 385,630 375,700 370,760" 
                      fill="none" stroke="#334155" strokeWidth="1.6" strokeDasharray="8 4 2 4" 
                    />
                    <text x="210" y="380" fill="#334155" fontSize="13" fontFamily="monospace" fontWeight="bold" letterSpacing="4" opacity="0.6">
                      MAHARASHTRA STATE
                    </text>

                    {/* Chhattisgarh - Odisha Border */}
                    <path 
                      d="M 890,200 C 900,280 895,370 885,460 C 875,540 890,640 900,720" 
                      fill="none" stroke="#334155" strokeWidth="1.6" strokeDasharray="8 4 2 4" 
                    />
                    <text x="560" y="320" fill="#334155" fontSize="14" fontFamily="monospace" fontWeight="bold" letterSpacing="4" opacity="0.6">
                      CHHATTISGARH STATE (SECR)
                    </text>

                    {/* Odisha - Jharkhand Border */}
                    <path 
                      d="M 1060,180 C 1070,250 1065,310 1055,360 C 1040,410 1030,470 1020,530" 
                      fill="none" stroke="#334155" strokeWidth="1.6" strokeDasharray="8 4 2 4" 
                    />
                    <text x="960" y="440" fill="#334155" fontSize="12" fontFamily="monospace" fontWeight="bold" letterSpacing="3" opacity="0.6">
                      ODISHA STATE (SER)
                    </text>

                    {/* Jharkhand - West Bengal Border */}
                    <path 
                      d="M 1245,80 C 1240,150 1255,220 1260,290 C 1270,350 1250,420 1240,490" 
                      fill="none" stroke="#334155" strokeWidth="1.6" strokeDasharray="8 4 2 4" 
                    />
                    <text x="1140" y="160" fill="#334155" fontSize="12" fontFamily="monospace" fontWeight="bold" letterSpacing="3" opacity="0.6">
                      JHARKHAND STATE
                    </text>
                    <text x="1350" y="140" fill="#334155" fontSize="12" fontFamily="monospace" fontWeight="bold" letterSpacing="3" opacity="0.6">
                      WEST BENGAL (SER)
                    </text>
                  </g>
                )}

                {/* C. Major River Courses & Railway Bridges */}
                {toggles.rivers && (
                  <g>
                    {/* Wainganga River (Maharashtra) */}
                    <path d="M 375,320 Q 360,430 365,510 T 385,690" fill="none" stroke="#0369a1" strokeWidth="3" opacity="0.45" strokeLinecap="round" />
                    <text x="325" y="485" fill="#38bdf8" fontSize="7" fontFamily="monospace" opacity="0.75" transform="rotate(-60 325 485)">
                      ≋ Wainganga River
                    </text>

                    {/* Sheonath River (Chhattisgarh) */}
                    <path d="M 525,310 Q 535,400 540,470 T 510,640" fill="none" stroke="#0369a1" strokeWidth="3.5" opacity="0.45" strokeLinecap="round" />
                    <text x="548" y="435" fill="#38bdf8" fontSize="7" fontFamily="monospace" opacity="0.75" transform="rotate(75 548 435)">
                      ≋ Sheonath River
                    </text>

                    {/* Mahanadi River (Major Watercourse) */}
                    <path d="M 610,480 Q 645,430 730,420 T 840,440 T 930,490" fill="none" stroke="#0284c7" strokeWidth="4.5" opacity="0.5" strokeLinecap="round" />
                    <text x="660" y="445" fill="#38bdf8" fontSize="8" fontFamily="monospace" fontWeight="bold" opacity="0.85">
                      ≋ Mahanadi River Basin
                    </text>

                    {/* Hasdeo River (Champa) */}
                    <path d="M 760,250 Q 775,340 780,410 T 790,520" fill="none" stroke="#0369a1" strokeWidth="3" opacity="0.45" strokeLinecap="round" />
                    <text x="785" y="335" fill="#38bdf8" fontSize="7" fontFamily="monospace" opacity="0.75" transform="rotate(75 785 335)">
                      ≋ Hasdeo River
                    </text>

                    {/* Ib River (Jharsuguda) */}
                    <path d="M 920,230 Q 935,320 945,390 T 925,500" fill="none" stroke="#0369a1" strokeWidth="3" opacity="0.45" strokeLinecap="round" />
                    <text x="948" y="325" fill="#38bdf8" fontSize="7" fontFamily="monospace" opacity="0.75" transform="rotate(70 948 325)">
                      ≋ Ib River
                    </text>

                    {/* Brahmani / Koel River (Rourkela) */}
                    <path d="M 1010,210 Q 1025,290 1035,360 T 1050,470" fill="none" stroke="#0369a1" strokeWidth="3.2" opacity="0.45" strokeLinecap="round" />
                    <text x="1040" y="300" fill="#38bdf8" fontSize="7" fontFamily="monospace" opacity="0.75" transform="rotate(70 1040 300)">
                      ≋ Brahmani River
                    </text>

                    {/* Subarnarekha River (Tatanagar) */}
                    <path d="M 1190,170 Q 1205,250 1225,320 T 1250,450" fill="none" stroke="#0369a1" strokeWidth="3.5" opacity="0.45" strokeLinecap="round" />
                    <text x="1230" y="260" fill="#38bdf8" fontSize="7" fontFamily="monospace" opacity="0.75" transform="rotate(65 1230 260)">
                      ≋ Subarnarekha River
                    </text>

                    {/* Damodar River (Adra / Bokaro) */}
                    <path d="M 1270,90 Q 1340,140 1420,170 T 1500,210" fill="none" stroke="#0284c7" strokeWidth="3.5" opacity="0.45" strokeLinecap="round" />
                    <text x="1330" y="130" fill="#38bdf8" fontSize="7.5" fontFamily="monospace" opacity="0.8">
                      ≋ Damodar River
                    </text>
                  </g>
                )}

                {/* D. Chainage Milestone Posts Along Corridor (Km Markers) */}
                {toggles.chainageMarkers && (
                  <g opacity="0.8">
                    {[
                      { x: 120, y: 645, km: "Km 800 (CR)" },
                      { x: 295, y: 480, km: "Km 900" },
                      { x: 400, y: 450, km: "Km 1000" },
                      { x: 535, y: 422, km: "Km 1100" },
                      { x: 630, y: 398, km: "Km 1200" },
                      { x: 730, y: 372, km: "Km 1300" },
                      { x: 810, y: 358, km: "Km 1400" },
                      { x: 895, y: 345, km: "Km 1450" },
                      { x: 985, y: 330, km: "Km 1500 (SER)" },
                      { x: 1075, y: 310, km: "Km 1600" },
                      { x: 1165, y: 290, km: "Km 1700" },
                      { x: 1245, y: 255, km: "Km 1750" },
                      { x: 1320, y: 210, km: "Km 1800" },
                      { x: 1400, y: 205, km: "Km 1850" }
                    ].map((post, idx) => (
                      <g key={`km-${idx}`} transform={`translate(${post.x}, ${post.y})`}>
                        <line x1="0" y1="-8" x2="0" y2="8" stroke="#f59e0b" strokeWidth="0.9" strokeDasharray="1 1" />
                        <rect x="-14" y="-18" width="28" height="9" rx="2" fill="#020617" stroke="#d97706" strokeWidth="0.6" />
                        <text textAnchor="middle" y="-11.5" fill="#fbbf24" fontSize="5.2" fontFamily="monospace" fontWeight="bold">
                          {post.km}
                        </text>
                      </g>
                    ))}
                  </g>
                )}
              </g>
            )}

            {/* =========================================================================
                1. CORRIDOR DOUBLE-TRACK RUNNING LINES (Interconnecting Adjacent Stations)
                ========================================================================= */}
            {segments.map(seg => {
              const srcSt = stations.find(s => s.id === seg.sourceId);
              const dstSt = stations.find(s => s.id === seg.targetId);
              if (!srcSt || !dstSt) return null;

              const srcGeom = stationGeomMap.get(srcSt.id);
              const dstGeom = stationGeomMap.get(dstSt.id);
              if (!srcGeom || !dstGeom) return null;

              const isDegraded = seg.status === 'Degraded';
              const isHighlighted = highlightedRoute.includes(seg.id);
              const isHovered = hoveredSegment?.id === seg.id || selectedGisSegment?.id === seg.id;
              const isVisible = selectedDivision === 'ALL' || filteredStationIds.has(seg.sourceId) || filteredStationIds.has(seg.targetId);
              if(!isVisible) return null;

              const lineOpacity = selectedDivision === 'ALL' || filteredStationIds.has(seg.sourceId) ? 1.0 : 0.25;

              // Connect from Source Station Outbound Throat directly to Target Station Inbound Throat!
              const pStart = srcGeom.outboundDN ? { x: (srcGeom.outboundUP.x + srcGeom.outboundDN.x) / 2, y: (srcGeom.outboundUP.y + srcGeom.outboundDN.y) / 2 } : { x: srcSt.x, y: srcSt.y };
              const pEnd = dstGeom.inboundDN ? { x: (dstGeom.inboundUP.x + dstGeom.inboundDN.x) / 2, y: (dstGeom.inboundUP.y + dstGeom.inboundDN.y) / 2 } : { x: dstSt.x, y: dstSt.y };

              const dx = pEnd.x - pStart.x;
              const dy = pEnd.y - pStart.y;
              const len = Math.sqrt(dx * dx + dy * dy) || 1;
              const nx = -dy / len;
              const ny = dx / len;

              // UP Line (Outbound North) and DN Line (Inbound South) Track Spacing (Broad Gauge)
              const trackGap = 4.0;
              const upStart = { x: pStart.x + nx * trackGap, y: pStart.y + ny * trackGap };
              const upEnd = { x: pEnd.x + nx * trackGap, y: pEnd.y + ny * trackGap };
              const dnStart = { x: pStart.x - nx * trackGap, y: pStart.y - ny * trackGap };
              const dnEnd = { x: pEnd.x - nx * trackGap, y: pEnd.y - ny * trackGap };

              // Mid-corridor points for OHE, IBS Signals, LC Gates
              const midP = { x: (pStart.x + pEnd.x) / 2, y: (pStart.y + pEnd.y) / 2 };
              const p25 = { x: pStart.x + dx * 0.25, y: pStart.y + dy * 0.25 };
              const p75 = { x: pStart.x + dx * 0.75, y: pStart.y + dy * 0.75 };

              const signalAspect = signalOverrides[`SIG-${seg.id}`] || (isDegraded ? 'Red' : 'Green');

              return (
                <g 
                  key={seg.id} 
                  className="transition-all duration-300 cursor-pointer"
                  onMouseEnter={() => setHoveredSegment(seg)}
                  onMouseLeave={() => setHoveredSegment(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedGisSegment(seg);
                  }}
                >
                  
                  {/* Ballast Shoulder Bed (Dark granite trackbed contour) */}
                  <line 
                    x1={pStart.x} y1={pStart.y} x2={pEnd.x} y2={pEnd.y} 
                    stroke={isHovered ? "#0c4a6e" : "#070c18"} 
                    strokeWidth={isHovered ? "22" : "16"}
                    strokeLinecap="round"
                    opacity={lineOpacity}
                    filter={isHovered ? "url(#glow-cyan)" : ""}
                  />
                  
                  {/* Track Sleepers (Wooden/Concrete Cross Ties) */}
                  <line 
                    x1={pStart.x} y1={pStart.y} x2={pEnd.x} y2={pEnd.y} 
                    stroke={isDegraded ? "#500724" : "#0369a1"} 
                    strokeWidth="15"
                    strokeDasharray="2 6"
                    opacity={lineOpacity * 0.65}
                  />

                  {/* Intermediate Insulated Rail Joints (Track Circuit Boundaries) */}
                  {toggles.trackCircuits && (
                    <>
                      <circle cx={p25.x} cy={p25.y} r="2" fill="#0f172a" stroke="#38bdf8" strokeWidth="0.8" opacity="0.8" />
                      <circle cx={p75.x} cy={p75.y} r="2" fill="#0f172a" stroke="#38bdf8" strokeWidth="0.8" opacity="0.8" />
                    </>
                  )}

                  {/* UP Running Rail */}
                  <line 
                    x1={upStart.x} y1={upStart.y} x2={upEnd.x} y2={upEnd.y} 
                    stroke={isDegraded ? "#f43f5e" : "#06b6d4"} 
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    opacity={lineOpacity}
                    filter={isDegraded ? "url(#glow-red)" : "url(#glow-cyan)"}
                  />

                  {/* DN Running Rail */}
                  <line 
                    x1={dnStart.x} y1={dnStart.y} x2={dnEnd.x} y2={dnEnd.y} 
                    stroke={isDegraded ? "#f43f5e" : "#38bdf8"} 
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    opacity={lineOpacity}
                  />

                  {/* Mid-section Scissors / Trailing Crossover (Connecting UP & DN lines) */}
                  <g opacity={lineOpacity * 0.9}>
                    <line
                      x1={pStart.x + dx * 0.48 + nx * trackGap}
                      y1={pStart.y + dy * 0.48 + ny * trackGap}
                      x2={pStart.x + dx * 0.52 - nx * trackGap}
                      y2={pStart.y + dy * 0.52 - ny * trackGap}
                      stroke={isDegraded ? "#f43f5e" : "#0284c7"}
                      strokeWidth="1.5"
                    />
                    <line
                      x1={pStart.x + dx * 0.48 - nx * trackGap}
                      y1={pStart.y + dy * 0.48 - ny * trackGap}
                      x2={pStart.x + dx * 0.52 + nx * trackGap}
                      y2={pStart.y + dy * 0.52 + ny * trackGap}
                      stroke={isDegraded ? "#f43f5e" : "#0284c7"}
                      strokeWidth="1.5"
                    />
                    {/* Diamond crossing center frog */}
                    <circle cx={midP.x} cy={midP.y} r="1.5" fill="#f8fafc" />
                  </g>

                  {/* 25kV OHE Portal Gantries Spanning the Tracks */}
                  {toggles.oheMasts && (
                    <g opacity={lineOpacity * 0.75}>
                      {[0.2, 0.4, 0.6, 0.8].map((frac, idx) => {
                        const gp = { x: pStart.x + dx * frac, y: pStart.y + dy * frac };
                        const m1 = { x: gp.x + nx * 10, y: gp.y + ny * 10 };
                        const m2 = { x: gp.x - nx * 10, y: gp.y - ny * 10 };
                        return (
                          <g key={`ohe-${seg.id}-${idx}`}>
                            {/* Steel gantry beam */}
                            <line x1={m1.x} y1={m1.y} x2={m2.x} y2={m2.y} stroke="#475569" strokeWidth="1.2" />
                            {/* Left mast */}
                            <circle cx={m1.x} cy={m1.y} r="1.8" fill="#1e293b" stroke="#94a3b8" strokeWidth="0.6" />
                            {/* Right mast */}
                            <circle cx={m2.x} cy={m2.y} r="1.8" fill="#1e293b" stroke="#94a3b8" strokeWidth="0.6" />
                          </g>
                        );
                      })}
                    </g>
                  )}

                  {/* Level Crossing Gate on select long corridors */}
                  {seg.id.includes('N1') || seg.id.includes('R1') || seg.id.includes('C2') ? (
                    <g transform={`translate(${midP.x}, ${midP.y}) rotate(${(Math.atan2(dy, dx) * 180) / Math.PI})`} opacity={lineOpacity}>
                      {/* Road surface crossing */}
                      <rect x="-4" y="-14" width="8" height="28" fill="#1e293b" stroke="#f59e0b" strokeWidth="0.8" strokeDasharray="2 2" />
                      {/* LC Gate Stanchions */}
                      <rect x="-2" y="-16" width="4" height="3" fill="#ef4444" />
                      <rect x="-2" y="13" width="4" height="3" fill="#ef4444" />
                      {/* Warning beacon */}
                      <circle cx="0" cy="-14.5" r="1.5" fill="#f59e0b" className="animate-ping" />
                    </g>
                  ) : null}

                  {/* Intermediate Block Signal (IBS) Mast */}
                  {toggles.signals && (
                    <g 
                      transform={`translate(${pStart.x + dx * 0.35 + nx * 9}, ${pStart.y + dy * 0.35 + ny * 9})`}
                      onClick={(e) => handleToggleSignalLocal(`SIG-${seg.id}`, e)}
                      className="cursor-pointer group"
                      opacity={lineOpacity}
                    >
                      <circle r="4" fill="#020617" stroke="#334155" strokeWidth="1" />
                      <circle 
                        r="2.5" 
                        fill={signalAspect === 'Green' ? '#10b981' : '#ef4444'} 
                        filter={signalAspect === 'Green' ? "url(#glow-cyan)" : "url(#glow-red)"}
                      />
                      {transform.k > 1.2 && (
                        <text y="7" fontSize="5" fill="#94a3b8" textAnchor="middle" fontFamily="monospace">
                          IBS
                        </text>
                      )}
                    </g>
                  )}

                  {/* AI Recommended Route Highlight Glow */}
                  {isHighlighted && toggles.aiRoute && (
                     <line 
                        x1={pStart.x} y1={pStart.y} x2={pEnd.x} y2={pEnd.y} 
                        stroke={planStatus === 'approved' ? '#10b981' : planStatus === 'modified' ? '#f59e0b' : '#a855f7'}
                        strokeWidth="10"
                        strokeLinecap="round" className="animate-pulse"
                        opacity="0.85"
                        filter={planStatus === 'approved' ? "url(#glow-emerald)" : planStatus === 'modified' ? "url(#glow-amber)" : "url(#glow-purple)"}
                     />
                  )}

                  {/* Maintenance Disruption Ping */}
                  {isDegraded && toggles.maintenance && (
                     <g transform={`translate(${midP.x}, ${midP.y})`}>
                       <circle r="14" fill="#f43f5e" opacity="0.3" className="animate-ping" />
                       <circle r="5" fill="#f43f5e" filter="url(#glow-red)" />
                     </g>
                  )}

                </g>
              );
            })}
            
            {/* =========================================================================
                2. STATIONS & INTEGRATED PLATFORM INTERLOCKING TRACK STRUCTURE
                ========================================================================= */}
            {stations.map(station => {
              const isVisible = selectedDivision === 'ALL' || station.divisionId === selectedDivision;
              if (!isVisible) return null;

              const divColor = divisionsMap.get(station.divisionId)?.color || '#64748b';
              const isSource = sourceStation === station.id;
              const isDest = destStation === station.id;
              const geom = stationGeomMap.get(station.id);
              if (!geom) return null;

              return (
                <g 
                  key={station.id} 
                  onMouseEnter={() => setHoveredStation(station)}
                  onMouseLeave={() => setHoveredStation(null)}
                  onClick={(e) => handleStationClick(station, e)}
                  className="cursor-pointer group"
                >
                  
                  {/* Station Approach Scissors Crossover (Before Inbound Throat) */}
                  {toggles.turnouts && (
                    <g>
                      {/* Inbound Universal Scissors Crossover */}
                      <line 
                        x1={geom.throatInbound.x + geom.nx * 5} 
                        y1={geom.throatInbound.y + geom.ny * 5}
                        x2={geom.throatInbound.x - geom.dx * 12 - geom.nx * 5}
                        y2={geom.throatInbound.y - geom.dy * 12 - geom.ny * 5}
                        stroke="#0284c7"
                        strokeWidth="1.6"
                      />
                      <line 
                        x1={geom.throatInbound.x - geom.nx * 5} 
                        y1={geom.throatInbound.y - geom.ny * 5}
                        x2={geom.throatInbound.x - geom.dx * 12 + geom.nx * 5}
                        y2={geom.throatInbound.y - geom.dy * 12 + geom.ny * 5}
                        stroke="#0284c7"
                        strokeWidth="1.6"
                      />

                      {/* Outbound Universal Scissors Crossover */}
                      <line 
                        x1={geom.throatOutbound.x + geom.nx * 5} 
                        y1={geom.throatOutbound.y + geom.ny * 5}
                        x2={geom.throatOutbound.x + geom.dx * 12 - geom.nx * 5}
                        y2={geom.throatOutbound.y + geom.dy * 12 - geom.ny * 5}
                        stroke="#0284c7"
                        strokeWidth="1.6"
                      />
                      <line 
                        x1={geom.throatOutbound.x - geom.nx * 5} 
                        y1={geom.throatOutbound.y - geom.ny * 5}
                        x2={geom.throatOutbound.x + geom.dx * 12 + geom.nx * 5}
                        y2={geom.throatOutbound.y + geom.dy * 12 + geom.ny * 5}
                        stroke="#0284c7"
                        strokeWidth="1.6"
                      />
                    </g>
                  )}

                  {/* Platform Lines Yard Structure */}
                  {toggles.platformLines && (
                    <g>
                      
                      {/* Throat Turnout Switch Ladders (Seamlessly branching into platform tracks) */}
                      {geom.platformLines.map(({ pInbound, pOutbound, platform, index }) => {
                        const pointIdIn = `PT-IN-${station.id}-${platform.number}`;
                        const pointIdOut = `PT-OUT-${station.id}-${platform.number}`;
                        const isOccupied = platform.status === 'Occupied';
                        const switchInState = switchStates[pointIdIn] || 'NORMAL';

                        return (
                          <g key={`throat-${platform.id}`}>
                            {/* Inbound Turnout Bezier Rail */}
                            <path
                              d={`M ${geom.throatInbound.x} ${geom.throatInbound.y} C ${geom.throatInbound.x + geom.dx * 8} ${geom.throatInbound.y + geom.dy * 8}, ${pInbound.x - geom.dx * 8} ${pInbound.y - geom.dy * 8}, ${pInbound.x} ${pInbound.y}`}
                              fill="none"
                              stroke={isOccupied ? '#f43f5e' : '#0284c7'}
                              strokeWidth={platform.number <= 2 ? "2.2" : "1.6"}
                              strokeDasharray={isOccupied ? 'none' : 'none'}
                              opacity="0.85"
                            />

                            {/* Outbound Turnout Bezier Rail */}
                            <path
                              d={`M ${pOutbound.x} ${pOutbound.y} C ${pOutbound.x + geom.dx * 8} ${pOutbound.y + geom.dy * 8}, ${geom.throatOutbound.x - geom.dx * 8} ${geom.throatOutbound.y - geom.dy * 8}, ${geom.throatOutbound.x} ${geom.throatOutbound.y}`}
                              fill="none"
                              stroke={isOccupied ? '#f43f5e' : '#0284c7'}
                              strokeWidth={platform.number <= 2 ? "2.2" : "1.6"}
                              strokeDasharray={isOccupied ? 'none' : 'none'}
                              opacity="0.85"
                            />

                            {/* Switch Point Machine Indicator Box (MK-IV Point) on zoom */}
                            {toggles.turnouts && transform.k > 0.85 && (
                              <g 
                                transform={`translate(${pInbound.x - geom.dx * 6}, ${pInbound.y - geom.dy * 6})`}
                                onClick={(e) => handleTogglePoint(pointIdIn, e)}
                                className="cursor-pointer"
                              >
                                <rect x="-4" y="-3" width="8" height="6" rx="1.5" fill="#0f172a" stroke={switchInState === 'NORMAL' ? '#10b981' : '#f59e0b'} strokeWidth="0.8" />
                                <text textAnchor="middle" y="1.5" fontSize="3.5" fill="#f8fafc" fontFamily="monospace" fontWeight="bold">
                                  {switchInState === 'NORMAL' ? 'N' : 'R'}
                                </text>
                              </g>
                            )}
                          </g>
                        );
                      })}

                      {/* Parallel Platform Track Lines */}
                      {geom.platformLines.map(({ pInbound, pOutbound, platform, index, cx, cy }) => {
                        const isMainLine = platform.lineType === 'Main Line' || platform.number <= 2;
                        const isOccupied = platform.status === 'Occupied';

                        return (
                          <g key={platform.id}>
                            {/* Platform Track Bed Ballast */}
                            <line 
                              x1={pInbound.x} y1={pInbound.y} x2={pOutbound.x} y2={pOutbound.y}
                              stroke="#070c18"
                              strokeWidth="8"
                              strokeLinecap="round"
                            />
                            
                            {/* Platform Sleepers */}
                            <line 
                              x1={pInbound.x} y1={pInbound.y} x2={pOutbound.x} y2={pOutbound.y}
                              stroke={isOccupied ? '#500724' : '#0369a1'}
                              strokeWidth="8"
                              strokeDasharray="2 4"
                            />

                            {/* Platform Steel Rail Line */}
                            <line 
                              x1={pInbound.x} y1={pInbound.y} x2={pOutbound.x} y2={pOutbound.y}
                              stroke={isOccupied ? '#f43f5e' : isMainLine ? '#22d3ee' : '#38bdf8'}
                              strokeWidth={isMainLine ? "2.4" : "1.8"}
                              strokeLinecap="round"
                              filter={isOccupied ? "url(#glow-red)" : isMainLine ? "url(#glow-cyan)" : ""}
                            />

                            {/* Platform Concrete Island with Yellow Safety Edge (Placed between tracks) */}
                            {index % 2 === 0 && (
                              <g>
                                {/* Platform concrete slab */}
                                <line
                                  x1={pInbound.x + geom.nx * 5.5}
                                  y1={pInbound.y + geom.ny * 5.5}
                                  x2={pOutbound.x + geom.nx * 5.5}
                                  y2={pOutbound.y + geom.ny * 5.5}
                                  stroke="#1e293b"
                                  strokeWidth="3.8"
                                  strokeLinecap="round"
                                />
                                {/* Platform Canopy Shed Line */}
                                <line
                                  x1={pInbound.x + geom.dx * 15 + geom.nx * 5.5}
                                  y1={pInbound.y + geom.dy * 15 + geom.ny * 5.5}
                                  x2={pOutbound.x - geom.dx * 15 + geom.nx * 5.5}
                                  y2={pOutbound.y - geom.dy * 15 + geom.ny * 5.5}
                                  stroke="#334155"
                                  strokeWidth="5"
                                  strokeLinecap="round"
                                />
                              </g>
                            )}

                            {/* Platform Number Label Tag */}
                            {transform.k >= 0.7 && (
                              <g transform={`translate(${pInbound.x - geom.dx * 8}, ${pInbound.y - geom.dy * 8})`}>
                                <circle r="4.8" fill="#020617" stroke={isOccupied ? '#f43f5e' : '#38bdf8'} strokeWidth="1" />
                                <text textAnchor="middle" y="2.5" fontSize="5.5" fill="#f8fafc" fontFamily="monospace" fontWeight="bold">
                                  {platform.number}
                                </text>
                              </g>
                            )}

                            {/* Starter Signal Light at Platform Fouling Point */}
                            {toggles.signals && (
                              <g 
                                transform={`translate(${pOutbound.x + geom.dx * 5}, ${pOutbound.y + geom.dy * 5})`}
                                onClick={(e) => handleToggleSignal(station.id, platform.id)}
                                className="cursor-pointer"
                              >
                                <circle r="3.2" fill="#020617" stroke="#334155" strokeWidth="0.8" />
                                <circle 
                                  r="2.2" 
                                  fill={platform.signalState === 'Green' ? '#10b981' : '#ef4444'} 
                                  filter={platform.signalState === 'Green' ? "url(#glow-cyan)" : "url(#glow-red)"}
                                />
                              </g>
                            )}
                          </g>
                        );
                      })}
                    </g>
                  )}

                  {/* Station Control Tower Hub Node */}
                  <g transform={`translate(${station.x}, ${station.y})`}>
                    {/* Routing Selection Rings */}
                    {(isSource || isDest) && (
                       <circle r="22" fill="none" stroke={isSource ? "#a855f7" : "#06b6d4"} strokeWidth="2.5" className="animate-spin-slow" strokeDasharray="4 4" filter="url(#glow-cyan)" />
                    )}
                    
                    {/* Central EI Interlocking Hub Circle */}
                    <circle r="9.5" fill="#020617" stroke={divColor} strokeWidth="3" filter="url(#glow-cyan)" />
                    <circle r="4" fill={isSource ? '#a855f7' : isDest ? '#22d3ee' : '#f8fafc'} />
                    
                    {/* Station Name & Platform Badge */}
                    {toggles.labels && (
                       <g transform={`translate(0, ${-station.platforms.length * 6.5 - 14})`}>
                         <rect x="-30" y="-12" width="60" height="17" rx="5" fill="rgba(2,6,23,0.92)" stroke="#334155" strokeWidth="1" />
                         <text textAnchor="middle" y="0" fill="#f8fafc" fontSize="10.5" className="font-mono font-bold">
                           {station.code}
                         </text>
                         <text textAnchor="middle" y="12" fill="#94a3b8" fontSize="7" className="font-mono">
                           {station.platforms.length} PFs • {station.name}
                         </text>
                       </g>
                    )}
                  </g>
                </g>
              );
            })}

            {/* =========================================================================
                3. TRAINS MOVING SEAMLESSLY ALONG THE CONNECTED TRACK GEOMETRY
                ========================================================================= */}
            {(() => {
              if (!toggles.trains) return null;

              // Pre-calculate train positions
              const trainRenderData = trains.map(train => {
                let x = 0, y = 0;
                let angle = 0;
                
                if (train.currentStationId) {
                   const st = stations.find(s => s.id === train.currentStationId);
                   if (!st) return null;
                   const geom = stationGeomMap.get(st.id);
                   if (!geom) return null;
                   
                   const pfIdx = st.platforms.findIndex(p => p.id === train.currentPlatformId || p.number === train.platformNumber);
                   const activePfGeom = geom.platformLines[pfIdx >= 0 ? pfIdx : 0];
                   if (!activePfGeom) return null;

                   angle = geom.angleDeg;
                   if (train.direction === 'DN') angle += 180;

                   if (train.platformPhase === 'berthing') {
                      const frac = Math.min(1, Math.max(0, (train.progress - 88) / 12));
                      x = activePfGeom.pInbound.x + (activePfGeom.pCenter.x - activePfGeom.pInbound.x) * frac;
                      y = activePfGeom.pInbound.y + (activePfGeom.pCenter.y - activePfGeom.pInbound.y) * frac;
                   } else if (train.platformPhase === 'departing') {
                      const frac = Math.min(1, Math.max(0, (train.progress - 4) / 8));
                      x = activePfGeom.pCenter.x + (activePfGeom.pOutbound.x - activePfGeom.pCenter.x) * frac;
                      y = activePfGeom.pCenter.y + (activePfGeom.pOutbound.y - activePfGeom.pCenter.y) * frac;
                   } else {
                      x = activePfGeom.pCenter.x;
                      y = activePfGeom.pCenter.y;
                   }
                } else if (train.currentSegmentId) {
                   const segment = segments.find(s => s.id === train.currentSegmentId);
                   if(!segment) return null;
                   
                   const routeIdx = train.route.indexOf(segment.sourceId);
                   const isForward = routeIdx !== -1 && train.route[routeIdx + 1] === segment.targetId;
                   
                   const srcSt = stations.find(s => s.id === (isForward ? segment.sourceId : segment.targetId));
                   const dstSt = stations.find(s => s.id === (isForward ? segment.targetId : segment.sourceId));
                   if (!srcSt || !dstSt) return null;

                   const srcGeom = stationGeomMap.get(srcSt.id);
                   const dstGeom = stationGeomMap.get(dstSt.id);

                   const p1 = srcGeom ? srcGeom.throatOutbound : { x: srcSt.x, y: srcSt.y };
                   const p2 = dstGeom ? dstGeom.throatInbound : { x: dstSt.x, y: dstSt.y };
                   
                   const dx = p2.x - p1.x;
                   const dy = p2.y - p1.y;
                   const len = Math.sqrt(dx * dx + dy * dy) || 1;
                   const nx = -dy / len;
                   const ny = dx / len;
                   const sideOffset = train.direction === 'UP' ? 4.0 : -4.0;

                   const pct = train.progress / 100;
                   x = p1.x + dx * pct + nx * sideOffset;
                   y = p1.y + dy * pct + ny * sideOffset;
                   angle = (Math.atan2(dy, dx) * 180) / Math.PI;
                } else {
                   return null;
                }

                return { ...train, x, y, angle, labelOffsetY: -10, isHidden: false };
              }).filter(Boolean) as (Train & { x: number, y: number, angle: number, labelOffsetY: number, isHidden: boolean })[];

              const clusters: { id: string, x: number, y: number, count: number, hasAction: boolean, delayMax: number }[] = [];
              const isZoomedOut = transform.k <= 0.5;

              if (isZoomedOut) {
                 const clusterRadius = 60 / transform.k;
                 const handled = new Set<string>();
                 for (let i = 0; i < trainRenderData.length; i++) {
                    const t1 = trainRenderData[i];
                    if (handled.has(t1.id)) continue;
                    
                    const cluster = [t1];
                    handled.add(t1.id);
                    
                    for (let j = i + 1; j < trainRenderData.length; j++) {
                       const t2 = trainRenderData[j];
                       if (handled.has(t2.id)) continue;
                       const dist = Math.sqrt(Math.pow(t1.x - t2.x, 2) + Math.pow(t1.y - t2.y, 2));
                       if (dist < clusterRadius) {
                           cluster.push(t2);
                           handled.add(t2.id);
                       }
                    }
                    
                    if (cluster.length > 1) {
                       const cx = cluster.reduce((sum, t) => sum + t.x, 0) / cluster.length;
                       const cy = cluster.reduce((sum, t) => sum + t.y, 0) / cluster.length;
                       clusters.push({
                          id: `cluster-${t1.id}`,
                          count: cluster.length,
                          x: cx,
                          y: cy,
                          hasAction: cluster.some(t => t.appliedPlanOption),
                          delayMax: Math.max(...cluster.map(t => t.delayMinutes))
                       });
                       cluster.forEach(t => t.isHidden = true);
                    }
                 }
              }

              // Collision detection for labels
              for (let i = 0; i < trainRenderData.length; i++) {
                const t1 = trainRenderData[i];
                if (t1.isHidden) continue;
                for (let j = 0; j < i; j++) {
                  const t2 = trainRenderData[j];
                  if (t2.isHidden) continue;
                  
                  // For very close X coordinates, adjust Y to prevent label overlap
                  const dx = Math.abs(t1.x - t2.x);
                  if (dx < 100) {
                    const dy = Math.abs((t1.y + t1.labelOffsetY) - (t2.y + t2.labelOffsetY));
                    if (dy < 36) { 
                      t1.labelOffsetY += 36; 
                    }
                  }
                }
              }

              return (
                <g>
                  {trainRenderData.filter(t => !t.isHidden).map(train => {
                    const color = train.type === 'Vande Bharat' 
                      ? '#38bdf8' 
                      : train.type === 'Rajdhani' 
                      ? '#f43f5e' 
                      : train.type === 'Freight' 
                      ? '#fbbf24' 
                      : '#10b981';
                    
                    const hasAction = Boolean(train.appliedPlanOption);
                    const actionBadgeColor = 
                      train.appliedPlanOption === 'AI_REROUTE' ? '#10b981' :
                      train.appliedPlanOption === 'LOOP_DIVERSION' ? '#f59e0b' :
                      train.appliedPlanOption === 'PRECEDENCE_OVERTAKE' ? '#c084fc' :
                      train.appliedPlanOption === 'CAUTION_TSR_30' ? '#fb923c' :
                      '#38bdf8';

                    return (
                      <g 
                        key={train.id} 
                        transform={`translate(${train.x}, ${train.y}) rotate(${train.angle})`} 
                        className="transition-transform duration-700 ease-linear pointer-events-none"
                      >
                        {/* Action Applied Radar Ring */}
                        {hasAction && (
                          <circle r="18" fill="none" stroke={actionBadgeColor} strokeWidth="1.5" className="animate-ping" opacity="0.6" />
                        )}

                        {/* Headlight Beam */}
                        <polygon points="8,-4 26,-9 26,9 8,4" fill="rgba(254, 240, 138, 0.3)" />

                        {/* Engine Traction Glow */}
                        <circle r="8" fill={color} opacity="0.35" filter="url(#glow-cyan)" />
                        
                        {/* Locomotive Body */}
                        <rect x="-10" y="-3.8" width="18" height="7.6" rx="2" fill={color} stroke="#020617" strokeWidth="0.9" />
                        
                        {/* Pantograph Spark (for electric locos) */}
                        <circle cx="0" cy="0" r="1.5" fill="#f8fafc" />

                        {/* Trailing Coaches on Zoom */}
                        {transform.k > 0.75 && (
                          <>
                            <rect x="-24" y="-3.2" width="12" height="6.4" rx="1.5" fill={color} opacity="0.88" stroke="#020617" strokeWidth="0.6" />
                            <rect x="-38" y="-3.2" width="12" height="6.4" rx="1.5" fill={color} opacity="0.88" stroke="#020617" strokeWidth="0.6" />
                          </>
                        )}
                        
                        {/* Live Train Action HUD & Tag (Rotated level to camera) */}
                        <g transform={`rotate(${-train.angle}) translate(14, ${train.labelOffsetY})`}>
                          {hasAction ? (
                            <g className="animate-bounce-subtle">
                              <rect 
                                x="0" y="-18" width="180" height="34" rx="5" 
                                fill="rgba(2, 6, 23, 0.95)" 
                                stroke={actionBadgeColor} 
                                strokeWidth="1.2" 
                                filter="url(#glow-cyan)"
                              />
                              <text x="6" y="-5" fontSize="8" fill={actionBadgeColor} fontFamily="monospace" fontWeight="bold">
                                {train.appliedPlanOption === 'AI_REROUTE' ? '⚡ AI OPTIMIZED' :
                                 train.appliedPlanOption === 'LOOP_DIVERSION' ? '🔀 LOOP DIVERTED' :
                                 train.appliedPlanOption === 'PRECEDENCE_OVERTAKE' ? '👑 PRECEDENCE' :
                                 train.appliedPlanOption === 'CAUTION_TSR_30' ? '⚠️ TSR 30 KM/H' : '🛠️ MANUAL'}
                                {' • '}{train.speed} km/h
                              </text>
                              <text x="6" y="5" fontSize="7.5" fill="#f8fafc" fontFamily="monospace" fontWeight="bold">
                                {train.trainNumber} • {train.trainName}
                              </text>
                              <text x="6" y="13" fontSize="6.5" fill="#94a3b8" fontFamily="monospace">
                                {train.platformNumber ? `PF-${train.platformNumber} (${train.trackAssignmentSource || 'AI'})` : (train.trackAssignment || 'MAIN LINE')} • {train.delayMinutes > 0 ? `+${train.delayMinutes}m` : 'ON TIME'}
                              </text>
                            </g>
                          ) : transform.k > 0.6 ? (
                            <g>
                              <rect x="0" y="-14" width="165" height="26" rx="4" fill="rgba(2, 6, 23, 0.94)" stroke="#334155" strokeWidth="0.9" />
                              <text x="6" y="-2" fontSize="7.5" fill={color} fontFamily="monospace" fontWeight="bold">
                                {train.trainNumber} • {train.category || train.type} • {train.speed}km/h
                              </text>
                              <text x="6" y="8" fontSize="6.5" fill="#cbd5e1" fontFamily="monospace">
                                {train.trainName}
                              </text>
                            </g>
                          ) : null}
                        </g>
                      </g>
                    );
                  })}

                  {/* Render Clusters */}
                  {clusters.map(cluster => {
                     const color = cluster.delayMax > 30 ? '#f43f5e' : cluster.delayMax > 15 ? '#fbbf24' : '#38bdf8';
                     return (
                       <g key={cluster.id} transform={`translate(${cluster.x}, ${cluster.y})`} className="cursor-pointer transition-transform duration-700 ease-linear pointer-events-none">
                          <circle r={22 / transform.k} fill="rgba(2, 6, 23, 0.9)" stroke={color} strokeWidth={2 / transform.k} opacity="0.9" />
                          {cluster.hasAction && (
                            <circle r={(22 / transform.k) + (4 / transform.k)} fill="none" stroke="#a855f7" strokeWidth={1.5 / transform.k} className="animate-ping" opacity="0.6" />
                          )}
                          <text textAnchor="middle" y={(4 / transform.k)} fontSize={14 / transform.k} fill="#f8fafc" fontFamily="monospace" fontWeight="bold">
                            🚆×{cluster.count}
                          </text>
                          <text textAnchor="middle" y={(16 / transform.k)} fontSize={8 / transform.k} fill={color} fontFamily="monospace" fontWeight="bold">
                            {cluster.delayMax > 0 ? `+${cluster.delayMax}m` : 'RT'}
                          </text>
                       </g>
                     );
                  })}
                </g>
              );
            })()}
          </g>
        </svg>

        {/* Hovered Station Live Yard & GIS Info Panel */}
        {hoveredStation && !selectedStationYard && (
          <div className="absolute top-20 right-6 z-30 bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl p-4 w-84 backdrop-blur-md pointer-events-auto animate-in fade-in duration-150">
             <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-2.5">
                <div className="flex items-center gap-2.5">
                   <div className="p-2 bg-cyan-950/90 border border-cyan-500/40 rounded-xl text-cyan-400">
                     <MapPin className="w-4 h-4" />
                   </div>
                   <div>
                      <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                        {hoveredStation.name}
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono">
                          {hoveredStation.code}
                        </span>
                      </h4>
                      <p className="text-[10px] font-mono text-slate-400">
                        {divisionsMap.get(hoveredStation.divisionId)?.name || 'Indian Railways'} • {hoveredStation.zone || 'IR'}
                      </p>
                   </div>
                </div>

                <button
                  onClick={() => setSelectedStationYard(hoveredStation)}
                  className="px-2.5 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 border border-cyan-500/40 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1 transition-colors shadow-sm"
                >
                  <Eye className="w-3.5 h-3.5" /> Yard View
                </button>
             </div>

             {/* Authentic Indian Railways GIS Mapping Data */}
             <div className="grid grid-cols-2 gap-2 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80 mb-2.5 text-[10px] font-mono">
                <div>
                   <span className="text-slate-500 text-[9px] block">COORDINATES (WGS-84)</span>
                   <span className="text-cyan-400 font-bold">
                     {hoveredStation.lat ? `${hoveredStation.lat.toFixed(4)}°N, ${hoveredStation.lng.toFixed(4)}°E` : '21.15°N, 79.08°E'}
                   </span>
                   {hoveredStation.lat && (
                     <span className="text-slate-400 text-[8.5px] block truncate">
                       {toDms(hoveredStation.lat, true)}, {toDms(hoveredStation.lng, false)}
                     </span>
                   )}
                </div>
                <div>
                   <span className="text-slate-500 text-[9px] block">ELEVATION (MSL)</span>
                   <span className="text-amber-400 font-bold flex items-center gap-1">
                     <Mountain className="w-3 h-3 inline" /> {hoveredStation.elevationMeters ? `${hoveredStation.elevationMeters} m` : '285 m'} MSL
                   </span>
                   <span className="text-slate-400 text-[8.5px] block truncate">
                     {hoveredStation.state || 'Maharashtra'}, {hoveredStation.district || 'Nagpur'}
                   </span>
                </div>
                <div>
                   <span className="text-slate-500 text-[9px] block">CHAINAGE / INTERLOCKING</span>
                   <span className="text-slate-300 font-bold block truncate">
                     {hoveredStation.chainageKm ? `Km ${hoveredStation.chainageKm}` : 'Km 837.2'}
                   </span>
                   <span className="text-emerald-400 text-[8.5px] block truncate">
                     {hoveredStation.interlockingType || 'Electronic Interlocking (EI)'}
                   </span>
                </div>
                <div>
                   <span className="text-slate-500 text-[9px] block">TRACTION & SPEED</span>
                   <span className="text-cyan-300 font-bold block truncate">
                     {hoveredStation.electrification || '25kV AC 50Hz OHE'}
                   </span>
                   <span className="text-purple-400 text-[8.5px] block truncate">
                     Group A (160 km/h)
                   </span>
                </div>
             </div>
             
             {/* Platform Track Status List */}
             <div className="space-y-1 mt-1">
                <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 uppercase font-bold px-1">
                   <span>Platform Tracks ({hoveredStation.platforms.length})</span>
                   <span className="text-cyan-400">Live Status</span>
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                  {hoveredStation.platforms.map(pf => {
                     const trn = trains.find(t => t.currentStationId === hoveredStation.id && (t.platformNumber === pf.number || t.currentPlatformId === pf.id));
                     return (
                       <div key={pf.id} className="flex justify-between items-center text-[10px] font-mono bg-slate-950/70 p-1.5 rounded-lg border border-slate-800/80">
                          <div className="flex items-center gap-1.5">
                             <span className={`w-2 h-2 rounded-full ${trn ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                             <span className="text-slate-200 font-bold">PF-{pf.number}</span>
                             <span className="text-slate-500 text-[9px]">({pf.lineType || 'Main'})</span>
                          </div>
                          {trn ? (
                             <span className="text-rose-400 font-bold truncate max-w-[130px]">{trn.trainName}</span>
                          ) : (
                             <span className="text-emerald-400 font-bold">AVAILABLE</span>
                          )}
                       </div>
                     );
                  })}
                </div>
             </div>
          </div>
        )}

        {/* Hovered / Selected Segment GIS Inspector Panel */}
        {(hoveredSegment || selectedGisSegment) && !hoveredStation && (
          <div className="absolute top-20 right-6 z-30 bg-slate-900/95 border border-cyan-500/40 rounded-2xl shadow-2xl p-4 w-84 backdrop-blur-md pointer-events-auto animate-in fade-in duration-150">
            {(() => {
              const seg = hoveredSegment || selectedGisSegment!;
              const srcSt = stations.find(s => s.id === seg.sourceId);
              const dstSt = stations.find(s => s.id === seg.targetId);
              return (
                <div>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-cyan-950 border border-cyan-500/40 rounded-xl text-cyan-400">
                        <TrainTrack className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                          {srcSt?.code || seg.sourceId} ⇄ {dstSt?.code || seg.targetId}
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono font-normal">
                            {seg.id}
                          </span>
                        </h4>
                        <p className="text-[10px] font-mono text-slate-400">
                          {srcSt?.name} to {dstSt?.name} Corridor
                        </p>
                      </div>
                    </div>
                    {selectedGisSegment && (
                      <button 
                        onClick={() => setSelectedGisSegment(null)} 
                        className="text-slate-400 hover:text-slate-200 text-xs font-mono p-1"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80 text-[10px] font-mono mb-2">
                    <div>
                      <span className="text-slate-500 text-[9px] block">SECTION LENGTH</span>
                      <span className="text-cyan-400 font-bold text-xs">{seg.distanceKm || 45.0} Km</span>
                      <span className="text-slate-400 text-[8.5px] block">{seg.lineCount || 'Double Track'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[9px] block">MAX SPEED (MPS)</span>
                      <span className="text-emerald-400 font-bold text-xs">{seg.speedLimit || 130} Km/h</span>
                      <span className="text-slate-400 text-[8.5px] block">High-Density Network</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[9px] block">RULING GRADIENT</span>
                      <span className="text-amber-400 font-bold">{seg.gradient || '1 in 150'}</span>
                      <span className="text-slate-400 text-[8.5px] block">Ballasted Permanent Way</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[9px] block">SIGNALLING</span>
                      <span className="text-purple-400 font-bold truncate block">{seg.signallingType || 'Automatic Block (ABS)'}</span>
                      <span className="text-slate-400 text-[8.5px] block">{seg.trackStructure || '60 kg UIC Rails'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-400">Traction / Electrification:</span>
                    <span className="text-cyan-300 font-bold">{seg.electrification || '25 kV AC 50Hz OHE'}</span>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* GIS HUD (True North Compass, Scale Bar, and Real-time Cursor Coordinates) */}
        <div className="absolute top-20 left-6 z-20 pointer-events-none flex flex-col gap-2.5">
          {/* Compass & GIS Datum */}
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/60 rounded-xl p-2.5 shadow-xl flex items-center gap-3">
            <div className="relative w-8 h-8 rounded-full border border-cyan-500/40 bg-slate-950 flex items-center justify-center">
              <Compass className="w-5 h-5 text-cyan-400 animate-spin-slow" />
              <span className="absolute -top-1 text-[7px] font-mono font-bold text-rose-400">N</span>
            </div>
            <div>
              <div className="text-[10px] font-mono font-bold text-slate-200 flex items-center gap-1.5">
                <Globe className="w-3 h-3 text-emerald-400" />
                <span>GIS WGS-84 PROJECTION</span>
              </div>
              <div className="text-[9px] font-mono text-cyan-400">
                {cursorGis ? `${toDms(cursorGis.lat, true)}, ${toDms(cursorGis.lng, false)}` : '21°09\'08" N, 79°05\'17" E'}
              </div>
            </div>
          </div>

          {/* GIS Distance Scale Bar */}
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/60 rounded-xl px-3 py-1.5 shadow-xl flex items-center gap-3 w-fit">
            <span className="text-[9px] font-mono text-slate-400">SCALE</span>
            <div className="flex flex-col items-center">
              <div className="w-24 h-1 bg-cyan-400/80 rounded-sm relative">
                <div className="absolute left-0 -top-1 w-0.5 h-3 bg-cyan-300" />
                <div className="absolute left-1/2 -top-1 w-0.5 h-2 bg-cyan-300/60" />
                <div className="absolute right-0 -top-1 w-0.5 h-3 bg-cyan-300" />
              </div>
              <div className="flex justify-between w-24 text-[8px] font-mono text-slate-400 mt-0.5">
                <span>0</span>
                <span>50 km</span>
                <span>100 km</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Legend Bar */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex flex-wrap items-center justify-center gap-4 sm:gap-6 bg-slate-900/90 backdrop-blur-md border border-slate-700/60 rounded-full px-5 py-2 shadow-2xl pointer-events-auto">
           <div className="flex items-center gap-2">
             <div className="w-4 h-1.5 bg-cyan-400 shadow-[0_0_6px_#22d3ee] rounded-sm"></div>
             <span className="text-[10px] font-mono text-slate-300 uppercase font-bold">UP Main Line</span>
           </div>
           <div className="flex items-center gap-2">
             <div className="w-4 h-1.5 bg-sky-400 shadow-[0_0_6px_#38bdf8] rounded-sm"></div>
             <span className="text-[10px] font-mono text-slate-300 uppercase font-bold">DN Main Line</span>
           </div>
           <div className="flex items-center gap-2">
             <div className="w-4 h-1.5 bg-amber-400 shadow-[0_0_6px_#fbbf24] rounded-sm"></div>
             <span className="text-[10px] font-mono text-slate-300 uppercase font-bold">Turnout Switches</span>
           </div>
           <div className="flex items-center gap-2">
             <div className="w-4 h-1.5 bg-purple-500 shadow-[0_0_8px_#a855f7] rounded-sm"></div>
             <span className="text-[10px] font-mono text-slate-300 uppercase font-bold">AI Optimal Path</span>
           </div>
           <div className="w-px h-4 bg-slate-700 hidden sm:block" />
           <div className="flex items-center gap-2">
             <div className="w-2.5 h-2.5 rounded bg-sky-400 shadow-[0_0_5px_#38bdf8]"></div>
             <span className="text-[10px] font-mono text-slate-300 uppercase">Vande Bharat</span>
           </div>
           <div className="flex items-center gap-2">
             <div className="w-2.5 h-2.5 rounded bg-rose-400 shadow-[0_0_5px_#f43f5e]"></div>
             <span className="text-[10px] font-mono text-slate-300 uppercase">Rajdhani</span>
           </div>
           <div className="flex items-center gap-2">
             <div className="w-2.5 h-2.5 rounded bg-amber-400 shadow-[0_0_5px_#fbbf24]"></div>
             <span className="text-[10px] font-mono text-slate-300 uppercase">Freight</span>
           </div>
        </div>

      </div>

      {/* Electronic Interlocking Yard Inspector Modal */}
      {selectedStationYard && (
        <StationYardModal
          station={selectedStationYard}
          allTrains={trains}
          onClose={() => setSelectedStationYard(null)}
          onReassignPlatform={handleReassignPlatform}
          onToggleSignal={handleToggleSignal}
        />
      )}

    </div>
  );
}
