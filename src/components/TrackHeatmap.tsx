import React, { useMemo } from 'react';
import { TrackSegment } from '../types';
import { Layers, CloudLightning } from 'lucide-react';

export function TrackHeatmap({ segments, weather }: { segments: TrackSegment[], weather: string }) {
  const sortedSegments = useMemo(() => {
    return [...segments].sort((a, b) => b.maintenanceRisk - a.maintenanceRisk);
  }, [segments]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-slate-700/50 bg-slate-950/40 flex justify-between items-center shrink-0">
         <span className="text-[10px] font-mono text-slate-300 font-bold uppercase tracking-widest flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-amber-400" /> 
            Asset Risk Matrix
         </span>
         
         <div className="flex items-center gap-1.5 text-[9px] font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
           {weather === 'Clear' ? (
              <span className="text-emerald-400">🌤️ {weather}</span>
           ) : (
              <span className="text-amber-400 font-bold animate-pulse"><CloudLightning className="w-3 h-3 inline pb-0.5" /> {weather}</span>
           )}
         </div>
      </div>
      
      <div className="flex-1 overflow-auto custom-scrollbar p-2 space-y-1">
        {sortedSegments.slice(0, 15).map(seg => (
          <div key={seg.id} className="bg-slate-950/50 border border-slate-800 rounded p-2 hover:bg-slate-800 transition-colors">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-mono text-slate-200 font-bold uppercase">{seg.name}</span>
              <span className={`text-[10px] font-mono font-bold ${seg.maintenanceRisk > 80 ? 'text-rose-400 animate-pulse' : seg.maintenanceRisk > 50 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {seg.maintenanceRisk.toFixed(1)}% RISK
              </span>
            </div>
            
            <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden mt-1 relative">
              <div 
                className={`absolute top-0 left-0 h-full transition-all duration-1000 ${seg.maintenanceRisk > 80 ? 'bg-rose-500' : seg.maintenanceRisk > 50 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                style={{ width: `${seg.maintenanceRisk}%` }}
              />
            </div>
            
            <div className="flex justify-between mt-1 text-[8px] font-mono text-slate-500 uppercase">
               <span>LOAD: {seg.currentLoad}%</span>
               <span>{seg.status === 'Degraded' ? 'MAINTENANCE REQ' : 'OPERATIONAL'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
