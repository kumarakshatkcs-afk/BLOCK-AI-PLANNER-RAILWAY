import React, { useState } from 'react';
import { 
  Calendar, Clock, CheckCircle2, AlertTriangle, Sparkles, Wrench, 
  Radio, Zap, Train as TrainIcon, ArrowRight, ShieldCheck, 
  TrendingUp, BarChart3, Info, Lock
} from 'lucide-react';
import { GanttBlockItem } from '../types';

interface Props {
  ganttItems: GanttBlockItem[];
  onNavigateToConflict: () => void;
  onNavigateToApproval: () => void;
}

export const MainAIBlockPlannerGantt: React.FC<Props> = ({
  ganttItems = [],
  onNavigateToConflict,
  onNavigateToApproval
}) => {
  const safeGanttItems = Array.isArray(ganttItems) ? ganttItems : [];
  const [selectedItem, setSelectedItem] = useState<GanttBlockItem | null>(safeGanttItems[0] || null);
  const [selectedBlockWindow, setSelectedBlockWindow] = useState<{ start: number; end: number }>({ start: 10, end: 12 });

  // Hourly timeline marks: 08:00 to 15:00 (7 hours span)
  const timeHours = [8, 9, 10, 11, 12, 13, 14, 15];
  const minHour = 8;
  const maxHour = 15;
  const totalHours = maxHour - minHour;

  const getLeftPercentage = (hour: number) => {
    return Math.max(0, Math.min(100, ((hour - minHour) / totalHours) * 100));
  };

  const getWidthPercentage = (start: number, end: number) => {
    const s = Math.max(minHour, start);
    const e = Math.min(maxHour, end);
    return Math.max(2, ((e - s) / totalHours) * 100);
  };

  // Group items by lane
  const engineeringItems = safeGanttItems.filter(i => i.department === 'Engineering');
  const stItems = safeGanttItems.filter(i => i.department === 'S&T');
  const tractionItems = safeGanttItems.filter(i => i.department === 'Traction');
  const passengerItems = safeGanttItems.filter(i => i.department === 'Passenger');
  const goodsItems = safeGanttItems.filter(i => i.department === 'Goods');

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold tracking-wider uppercase px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                Pillar 3: Main AI Block Planner ⭐⭐⭐
              </span>
              <span className="text-xs text-slate-400">Core Star Feature</span>
            </div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-400" />
              Integrated Multi-Track Timeline & Shadow Block Optimizer
            </h2>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl">
              Dynamically synchronizes civil track machines, signal tests, and overhead power isolations with train timetable slots to eliminate separate disruptive corridor closures.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="btn-goto-conflict-matrix"
              onClick={onNavigateToConflict}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition border border-slate-700 cursor-pointer"
            >
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Conflict Matrix →
            </button>
            <button
              id="btn-goto-official-approval"
              onClick={onNavigateToApproval}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              Proceed to Sanction Approval →
            </button>
          </div>
        </div>
      </div>

      {/* Main Gantt Grid Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl space-y-4">
        {/* Timeline Header Time Ticks */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
          <div className="w-36 sm:w-44 font-bold text-slate-400 uppercase tracking-wider pl-2">
            Track / Department
          </div>
          <div className="flex-1 relative h-7">
            {timeHours.map((hour) => {
              const left = getLeftPercentage(hour);
              const hourStr = hour < 10 ? `0${hour}:00` : `${hour}:00`;
              return (
                <div 
                  key={hour} 
                  className="absolute -translate-x-1/2 flex flex-col items-center"
                  style={{ left: `${left}%` }}
                >
                  <span className="font-mono text-[11px] font-bold text-slate-300">
                    {hour < 10 ? `0${hour}` : hour}
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono">00</span>
                  <div className="w-px h-2 bg-slate-700 mt-0.5" />
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Recommended Block Window Visual Highlight (10:00 - 12:00) */}
        <div className="relative">
          {/* Vertical Guide Overlay for 10:00 - 12:00 */}
          <div 
            className="absolute top-0 bottom-0 pointer-events-none z-10 border-x-2 border-dashed border-emerald-500/60 bg-emerald-500/5 rounded-md flex flex-col justify-between"
            style={{
              left: `calc(9rem + (100% - 9rem) * ${(10 - minHour) / totalHours})`,
              width: `calc((100% - 9rem) * ${(2 / totalHours)})`
            }}
          >
            <div className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 self-center rounded-b border border-emerald-500/40">
              🤖 10:00 – 12:00 AI Shadow Block
            </div>
            <div className="bg-emerald-500/20 text-emerald-300 text-[9px] font-mono font-bold px-1.5 py-0.5 self-center rounded-t border border-emerald-500/40">
              Zero Conflicts (3 Tasks)
            </div>
          </div>

          {/* Lane 1: Engineering */}
          <div className="flex items-center py-2.5 border-b border-slate-800/80 hover:bg-slate-800/20 transition">
            <div className="w-36 sm:w-44 font-semibold text-xs text-blue-400 flex items-center gap-1.5 pl-2 shrink-0">
              <Wrench className="w-3.5 h-3.5" />
              <span>Engineering</span>
            </div>
            <div className="flex-1 relative h-9 bg-slate-950/60 rounded border border-slate-800/60">
              {engineeringItems.map(item => (
                <div
                  key={item.id}
                  id={item.id}
                  onClick={() => setSelectedItem(item)}
                  style={{
                    left: `${getLeftPercentage(item.startHour)}%`,
                    width: `${getWidthPercentage(item.startHour, item.endHour)}%`
                  }}
                  className={`absolute top-1 bottom-1 rounded px-2 flex items-center justify-between text-xs font-bold text-white transition cursor-pointer shadow-md overflow-hidden ${
                    selectedItem?.id === item.id 
                      ? 'bg-blue-600 ring-2 ring-blue-300' 
                      : 'bg-blue-600/90 hover:bg-blue-500'
                  }`}
                >
                  <span className="truncate">{item.label}</span>
                  <span className="text-[10px] font-mono opacity-80 shrink-0 hidden sm:inline">
                    {item.timeRangeStr}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Lane 2: S&T */}
          <div className="flex items-center py-2.5 border-b border-slate-800/80 hover:bg-slate-800/20 transition">
            <div className="w-36 sm:w-44 font-semibold text-xs text-emerald-400 flex items-center gap-1.5 pl-2 shrink-0">
              <Radio className="w-3.5 h-3.5" />
              <span>S&T</span>
            </div>
            <div className="flex-1 relative h-9 bg-slate-950/60 rounded border border-slate-800/60">
              {stItems.map(item => (
                <div
                  key={item.id}
                  id={item.id}
                  onClick={() => setSelectedItem(item)}
                  style={{
                    left: `${getLeftPercentage(item.startHour)}%`,
                    width: `${getWidthPercentage(item.startHour, item.endHour)}%`
                  }}
                  className={`absolute top-1 bottom-1 rounded px-2 flex items-center justify-between text-xs font-bold text-white transition cursor-pointer shadow-md overflow-hidden ${
                    selectedItem?.id === item.id 
                      ? 'bg-emerald-600 ring-2 ring-emerald-300' 
                      : 'bg-emerald-600/90 hover:bg-emerald-500'
                  }`}
                >
                  <span className="truncate">{item.label}</span>
                  <span className="text-[10px] font-mono opacity-80 shrink-0 hidden sm:inline">
                    {item.timeRangeStr}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Lane 3: Traction (OHE) */}
          <div className="flex items-center py-2.5 border-b border-slate-800/80 hover:bg-slate-800/20 transition">
            <div className="w-36 sm:w-44 font-semibold text-xs text-amber-400 flex items-center gap-1.5 pl-2 shrink-0">
              <Zap className="w-3.5 h-3.5" />
              <span>Traction</span>
            </div>
            <div className="flex-1 relative h-9 bg-slate-950/60 rounded border border-slate-800/60">
              {tractionItems.map(item => (
                <div
                  key={item.id}
                  id={item.id}
                  onClick={() => setSelectedItem(item)}
                  style={{
                    left: `${getLeftPercentage(item.startHour)}%`,
                    width: `${getWidthPercentage(item.startHour, item.endHour)}%`
                  }}
                  className={`absolute top-1 bottom-1 rounded px-2 flex items-center justify-between text-xs font-bold text-white transition cursor-pointer shadow-md overflow-hidden ${
                    selectedItem?.id === item.id 
                      ? 'bg-amber-600 ring-2 ring-amber-300' 
                      : 'bg-amber-600/90 hover:bg-amber-500'
                  }`}
                >
                  <span className="truncate">{item.label}</span>
                  <span className="text-[10px] font-mono opacity-80 shrink-0 hidden sm:inline">
                    {item.timeRangeStr}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Lane 4: Passenger Trains */}
          <div className="flex items-center py-2.5 border-b border-slate-800/80 hover:bg-slate-800/20 transition">
            <div className="w-36 sm:w-44 font-semibold text-xs text-purple-400 flex items-center gap-1.5 pl-2 shrink-0">
              <TrainIcon className="w-3.5 h-3.5" />
              <span>Passenger</span>
            </div>
            <div className="flex-1 relative h-9 bg-slate-950/60 rounded border border-slate-800/60">
              {passengerItems.map(item => (
                <div
                  key={item.id}
                  id={item.id}
                  onClick={() => setSelectedItem(item)}
                  style={{
                    left: `${getLeftPercentage(item.startHour)}%`,
                    width: `${getWidthPercentage(item.startHour, item.endHour)}%`
                  }}
                  className={`absolute top-1 bottom-1 rounded px-2 flex items-center justify-between text-xs font-medium text-purple-100 transition cursor-pointer shadow-sm overflow-hidden ${
                    selectedItem?.id === item.id 
                      ? 'bg-purple-600 ring-2 ring-purple-300' 
                      : 'bg-purple-900/80 hover:bg-purple-800 border border-purple-700/50'
                  }`}
                >
                  <span className="truncate flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                    {item.label}
                  </span>
                  <span className="text-[10px] font-mono opacity-75 shrink-0 hidden sm:inline">
                    {item.timeRangeStr}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Lane 5: Goods Trains */}
          <div className="flex items-center py-2.5 hover:bg-slate-800/20 transition">
            <div className="w-36 sm:w-44 font-semibold text-xs text-slate-400 flex items-center gap-1.5 pl-2 shrink-0">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Goods / Freight</span>
            </div>
            <div className="flex-1 relative h-9 bg-slate-950/60 rounded border border-slate-800/60">
              {goodsItems.map(item => (
                <div
                  key={item.id}
                  id={item.id}
                  onClick={() => setSelectedItem(item)}
                  style={{
                    left: `${getLeftPercentage(item.startHour)}%`,
                    width: `${getWidthPercentage(item.startHour, item.endHour)}%`
                  }}
                  className={`absolute top-1 bottom-1 rounded px-2 flex items-center justify-between text-xs font-medium text-slate-300 transition cursor-pointer shadow-sm overflow-hidden ${
                    selectedItem?.id === item.id 
                      ? 'bg-slate-600 ring-2 ring-slate-300 text-white' 
                      : 'bg-slate-800 hover:bg-slate-700 border border-slate-700'
                  }`}
                >
                  <span className="truncate flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    {item.label}
                  </span>
                  <span className="text-[10px] font-mono opacity-75 shrink-0 hidden sm:inline">
                    {item.timeRangeStr}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ⭐⭐⭐ Exact AI Recommendation Card (Matching Prompt Requirement) */}
      <div className="bg-slate-900 border-2 border-emerald-500/40 rounded-xl p-6 shadow-2xl relative overflow-hidden">
        {/* Glow corner */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider border border-emerald-500/30 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                🤖 AI Recommended Block
              </span>
              <span className="text-xs text-slate-400">Co-located Shadow Window</span>
            </div>

            <div className="text-3xl font-black text-white font-mono tracking-tight">
              10:00 AM – 12:00 PM
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="text-sm font-bold text-slate-200">
                Combined Tasks: <span className="text-emerald-400 font-mono">3</span>
              </div>
              <ul className="space-y-1 text-xs text-slate-300 pl-1">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="font-semibold text-blue-300">Engineering</span> — Track repair (Track-24 rail defect renewal)
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="font-semibold text-emerald-300">S&T</span> — Signal maintenance (Signal-08 Point 104B test)
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="font-semibold text-amber-300">Traction</span> — OHE maintenance (OHE-17 wire tensioning)
                </li>
              </ul>
            </div>
          </div>

          {/* 3 Simulation Metric KPIs */}
          <div className="grid grid-cols-3 gap-3 w-full lg:w-auto shrink-0">
            <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 text-center">
              <div className="text-xs text-slate-400 font-medium">Train Conflicts</div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono mt-1">
                0
              </div>
              <div className="text-[10px] text-emerald-500/80 font-bold mt-0.5">✓ Zero Delay</div>
            </div>

            <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 text-center">
              <div className="text-xs text-slate-400 font-medium">Block Utilization</div>
              <div className="text-2xl sm:text-3xl font-black text-white font-mono mt-1">
                92%
              </div>
              <div className="text-[10px] text-blue-400 font-bold mt-0.5">Optimal density</div>
            </div>

            <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 text-center">
              <div className="text-xs text-slate-400 font-medium">Downtime Reduction</div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono mt-1">
                28%*
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">*Simulation</div>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-400 gap-2">
          <span className="italic text-slate-500">
            *Prototype simulation metric. Calculated against separate individual department block allocations.
          </span>
          <div className="flex items-center gap-3">
            <button
              id="btn-verify-conflict-check"
              onClick={onNavigateToConflict}
              className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
            >
              Verify Conflict Matrix <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Selected Task Inspector Details */}
      {selectedItem && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-bold text-slate-400 uppercase">Selected Task Inspector</div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${
                selectedItem.department === 'Engineering' ? 'bg-blue-500' :
                selectedItem.department === 'S&T' ? 'bg-emerald-500' :
                selectedItem.department === 'Traction' ? 'bg-amber-500' : 'bg-purple-500'
              }`} />
              {selectedItem.label} ({selectedItem.assetOrTrain})
            </div>
            <div className="text-xs text-slate-300">{selectedItem.description}</div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-xs text-slate-400 block font-mono">Time Window</span>
            <span className="text-sm font-bold text-white font-mono">{selectedItem.timeRangeStr}</span>
          </div>
        </div>
      )}
    </div>
  );
};
