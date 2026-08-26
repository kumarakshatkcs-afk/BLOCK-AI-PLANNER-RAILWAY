import React, { useState } from 'react';
import { 
  MapPin, ShieldAlert, AlertTriangle, CheckCircle2, Clock, 
  ArrowRight, Train as TrainIcon, Sparkles, Layers, Activity, Info, Wrench, Radio, Zap
} from 'lucide-react';
import { CorridorAssetSummary } from '../types';

interface Props {
  corridors: CorridorAssetSummary[];
  onNavigateToWhatIf: () => void;
  onNavigateToGantt: () => void;
}

export const CorridorMapSchematic: React.FC<Props> = ({
  corridors = [],
  onNavigateToWhatIf,
  onNavigateToGantt
}) => {
  const safeCorridors = Array.isArray(corridors) ? corridors : [];
  const [selectedCorridorId, setSelectedCorridorId] = useState<string>(safeCorridors[0]?.id || 'CORR-TATA-CKP');
  const [viewMode, setViewMode] = useState<'schematic' | 'satellite'>('schematic');

  const selectedCorridor = safeCorridors.find(c => c.id === selectedCorridorId) || safeCorridors[0] || {
    id: "CORR-TATA-CKP",
    sectionCode: "A–B (TATA–CKP)",
    fromCode: "TATA",
    fromName: "Station A (Tatanagar Jn)",
    toCode: "CKP",
    toName: "Station B (Chakradharpur)",
    status: "Critical",
    statusColor: "red",
    totalAssets: 47,
    criticalAssets: 3,
    pendingMaintenance: 8,
    nextTrainTime: "10:25",
    nextTrainNumber: "20825",
    nextTrainName: "Vande Bharat Express",
    recommendedBlockWindow: "10:00–12:00",
    engineeringAssets: 18,
    stAssets: 16,
    tractionAssets: 13,
    activeTSR: "TSR 30 km/h at Km 284/12",
    keyDefectNotice: "Track-24 rail fissure & Signal-08 point bounce active (SER Zone)."
  };

  const stations = [
    { id: "STA", code: "TATA", name: "Tatanagar Jn", zone: "SER", km: "0 km", role: "Steel City Junction" },
    { id: "STB", code: "CKP", name: "Chakradharpur", zone: "SER", km: "62 km", role: "Divisional HQ" },
    { id: "STC", code: "BSP", name: "Bilaspur Jn", zone: "SECR", km: "378 km", role: "Zonal HQ" },
    { id: "STD", code: "R", name: "Raipur Jn", zone: "SECR", km: "489 km", role: "Divisional HQ" },
    { id: "STE", code: "DURG", name: "Durg Jn", zone: "SECR", km: "526 km", role: "Bhilai Steel Junction" },
    { id: "STF", code: "NGP", name: "Nagpur Jn", zone: "SECR / CR", km: "791 km", role: "Diamond Crossing" },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Available':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            🟢 Available
          </span>
        );
      case 'Maintenance':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            🟡 Maintenance
          </span>
        );
      case 'Blocked':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/30">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            🔴 Blocked
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            ⚠️ Critical Asset
          </span>
        );
    }
  };

  // Map segments for the 5 corridor spans between the 6 stations
  const segmentConfigs = [
    { id: 'CORR-TATA-CKP', label: 'TATA–CKP', color: 'bg-red-500', activeGlow: 'shadow-red-500/50', hover: 'hover:bg-red-400' },
    { id: 'CORR-CKP-BSP', label: 'CKP–BSP', color: 'bg-amber-500', activeGlow: 'shadow-amber-500/50', hover: 'hover:bg-amber-400' },
    { id: 'CORR-BSP-R', label: 'BSP–R', color: 'bg-emerald-500', activeGlow: 'shadow-emerald-500/50', hover: 'hover:bg-emerald-400' },
    { id: 'CORR-R-DURG', label: 'R–DURG', color: 'bg-amber-500', activeGlow: 'shadow-amber-500/50', hover: 'hover:bg-amber-400' },
    { id: 'CORR-DURG-NGP', label: 'DURG–NGP', color: 'bg-emerald-500', activeGlow: 'shadow-emerald-500/50', hover: 'hover:bg-emerald-400' },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-xs font-bold tracking-wider uppercase px-2.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                Pillar 5: Corridor Map ⭐⭐
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                SECR & SER ZONES
              </span>
              <span className="text-xs text-slate-400">High-Density Freight & Trunk Line Corridor</span>
            </div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-cyan-400" />
              South Eastern (SER) & South East Central (SECR) Trunk Corridor Schematic
            </h2>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl">
              Geographical representation of the Tatanagar – Chakradharpur – Bilaspur – Raipur – Durg – Nagpur trunk corridor. Visualizes real-time block states, heavy-haul coal/steel asset conditions, and coordinated maintenance shadow blocks across interlockings.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="btn-goto-what-if"
              onClick={onNavigateToWhatIf}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow-sm cursor-pointer whitespace-nowrap"
            >
              <Sparkles className="w-4 h-4" />
              What-If Simulation Simulator →
            </button>
          </div>
        </div>
      </div>

      {/* Legend Bar & Zonal Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-bold text-slate-400 uppercase tracking-wider text-[11px]">Status Legend:</span>
          <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> 🟢 Available
          </span>
          <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> 🟡 Maintenance
          </span>
          <span className="flex items-center gap-1.5 text-red-400 font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" /> 🔴 Blocked
          </span>
          <span className="flex items-center gap-1.5 text-rose-300 font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600" /> ⚠️ Critical Asset
          </span>
        </div>

        <div className="flex items-center gap-2 text-slate-400 text-xs">
          <span className="text-slate-500">Divisions:</span>
          <span className="text-cyan-300 font-medium">Chakradharpur (SER)</span>
          <span>•</span>
          <span className="text-cyan-300 font-medium">Bilaspur & Raipur (SECR)</span>
          <span>•</span>
          <span className="text-cyan-300 font-medium">Nagpur (SECR/CR)</span>
        </div>
      </div>

      {/* Primary Simplified Railway Map Schematic */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-2xl space-y-8 relative overflow-hidden">
        {/* Glowing backdrop */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-32 bg-cyan-500/5 blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            High-Speed & Heavy-Haul Trunk Corridor Schematic (UP / DOWN Main Lines)
          </div>
          <div className="text-[11px] font-mono text-slate-400 bg-slate-950/70 px-2.5 py-1 rounded border border-slate-800">
            TATA ── CKP ── BSP ── R ── DURG ── NGP
          </div>
        </div>

        {/* The Linear Schematic Line */}
        <div className="relative py-14 px-4 sm:px-8">
          {/* Main Track Line Bar */}
          <div className="absolute top-1/2 left-8 right-8 h-2.5 bg-slate-800 -translate-y-1/2 rounded-full z-0 overflow-hidden">
            {/* 5 Continuous Colored Segment Overlays */}
            <div className="w-full h-full flex">
              {segmentConfigs.map((seg) => {
                const isSelected = selectedCorridorId === seg.id;
                return (
                  <div
                    key={seg.id}
                    onClick={() => setSelectedCorridorId(seg.id)}
                    title={`Click to inspect ${seg.label}`}
                    className={`w-1/5 h-full cursor-pointer transition ${seg.color} ${
                      isSelected ? `brightness-125 shadow-lg ${seg.activeGlow}` : 'opacity-80 hover:opacity-100'
                    }`}
                  />
                );
              })}
            </div>
          </div>

          {/* Active Block Callout Box over TATA–CKP section */}
          <div className="absolute top-[-4px] left-[10%] sm:left-[10%] z-20 flex flex-col items-center">
            <div className="bg-red-950/95 border border-red-500 px-3 py-1.5 rounded-lg shadow-xl text-center backdrop-blur-md">
              <div className="text-[11px] font-black text-red-300 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                🔴 10:00-12:00 SHADOW BLOCK
              </div>
              <div className="text-[10px] font-mono text-slate-200 font-bold mt-0.5">
                Track-24 / Signal-08 / OHE-17 (SER)
              </div>
            </div>
            <div className="w-0.5 h-6 bg-red-500/80 mt-0.5" />
          </div>

          {/* Station Nodes (TATA, CKP, BSP, R, DURG, NGP) */}
          <div className="relative z-10 flex items-center justify-between">
            {stations.map((sta) => (
              <div 
                key={sta.id} 
                className="flex flex-col items-center group cursor-pointer"
                title={`${sta.name} (${sta.zone}) - ${sta.role}`}
              >
                {/* Station Node Dot */}
                <div className="w-8 h-8 rounded-full bg-slate-950 border-3 border-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-500/30 group-hover:scale-115 group-hover:border-white transition">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-300" />
                </div>
                
                {/* Station Label */}
                <div className="mt-3 text-center">
                  <span className="font-mono text-xs sm:text-sm font-bold text-white block">
                    {sta.code}
                  </span>
                  <span className="text-[11px] font-medium text-slate-300 max-w-[90px] sm:max-w-[120px] truncate block">
                    {sta.name}
                  </span>
                  <span className="text-[9px] font-mono text-cyan-400/80 block mt-0.5">
                    {sta.zone}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Corridor Selector Buttons (5 SECR & SER Corridors) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-4 border-t border-slate-800/80">
          {safeCorridors.map(corr => {
            const isSelected = corr.id === selectedCorridorId;
            return (
              <button
                key={corr.id}
                id={`btn-select-corr-${corr.id}`}
                onClick={() => setSelectedCorridorId(corr.id)}
                className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                  isSelected 
                    ? 'bg-cyan-950/50 border-cyan-500 shadow-md ring-1 ring-cyan-500/50' 
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold text-xs sm:text-sm text-white truncate">
                      {corr.sectionCode}
                    </span>
                    {getStatusBadge(corr.status)}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {corr.fromName} → {corr.toName}
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 pt-1 border-t border-slate-800">
                  <span>{corr.totalAssets} Assets</span>
                  <span className="text-cyan-400 font-bold">{corr.recommendedBlockWindow}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Corridor Inspector Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="text-xs text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-2">
              <span>Corridor Detailed Telemetry Inspector</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-300 font-mono">{selectedCorridor.fromCode} to {selectedCorridor.toCode} Section</span>
            </div>
            <h3 className="text-2xl font-black text-white font-mono flex items-center gap-2">
              Corridor: {selectedCorridor.sectionCode} ({selectedCorridor.fromName} – {selectedCorridor.toName})
            </h3>
            <p className="text-xs text-slate-400 max-w-xl">
              {selectedCorridor.keyDefectNotice}
            </p>
            {selectedCorridor.activeTSR && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 text-xs font-semibold border border-amber-500/30">
                <AlertTriangle className="w-3.5 h-3.5" />
                Active Caution Order: {selectedCorridor.activeTSR}
              </div>
            )}
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 w-full lg:w-auto shrink-0">
            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 text-center">
              <div className="text-[11px] text-slate-400 font-medium">Assets</div>
              <div className="text-2xl font-black text-white font-mono mt-0.5">
                {selectedCorridor.totalAssets}
              </div>
              <div className="text-[9px] text-slate-500">Monitored</div>
            </div>

            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 text-center">
              <div className="text-[11px] text-slate-400 font-medium">Critical</div>
              <div className="text-2xl font-black text-red-400 font-mono mt-0.5">
                {selectedCorridor.criticalAssets}
              </div>
              <div className="text-[9px] text-red-500/80">Immediate</div>
            </div>

            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 text-center">
              <div className="text-[11px] text-slate-400 font-medium">Pending Maint.</div>
              <div className="text-2xl font-black text-amber-400 font-mono mt-0.5">
                {selectedCorridor.pendingMaintenance}
              </div>
              <div className="text-[9px] text-amber-500/80">3 Departments</div>
            </div>

            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 text-center">
              <div className="text-[11px] text-slate-400 font-medium">Next Train</div>
              <div className="text-base font-black text-purple-300 font-mono mt-1">
                {selectedCorridor.nextTrainTime}
              </div>
              <div className="text-[9px] text-purple-400/80 truncate max-w-[80px]">
                {selectedCorridor.nextTrainName}
              </div>
            </div>

            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-emerald-500/40 text-center col-span-2 sm:col-span-1">
              <div className="text-[11px] text-emerald-400 font-medium">Recommended Block</div>
              <div className="text-sm font-black text-white font-mono mt-1">
                {selectedCorridor.recommendedBlockWindow}
              </div>
              <div className="text-[9px] text-emerald-500 font-bold">Zero Clash</div>
            </div>
          </div>
        </div>

        {/* 3 Department Breakdown for this Corridor */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-4 border-t border-slate-800/80">
          <div className="bg-slate-950/60 p-3 rounded-lg border border-blue-500/20 flex items-center justify-between">
            <span className="text-xs text-blue-400 flex items-center gap-1.5 font-semibold">
              <Wrench className="w-3.5 h-3.5" /> Civil Engineering Assets
            </span>
            <span className="font-mono font-bold text-white text-sm">
              {selectedCorridor.engineeringAssets}
            </span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-lg border border-emerald-500/20 flex items-center justify-between">
            <span className="text-xs text-emerald-400 flex items-center gap-1.5 font-semibold">
              <Radio className="w-3.5 h-3.5" /> Signalling & Telecom Assets
            </span>
            <span className="font-mono font-bold text-white text-sm">
              {selectedCorridor.stAssets}
            </span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-lg border border-amber-500/20 flex items-center justify-between">
            <span className="text-xs text-amber-400 flex items-center gap-1.5 font-semibold">
              <Zap className="w-3.5 h-3.5" /> Electrical Traction / OHE
            </span>
            <span className="font-mono font-bold text-white text-sm">
              {selectedCorridor.tractionAssets}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

