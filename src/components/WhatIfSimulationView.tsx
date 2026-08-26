import React, { useState } from 'react';
import { 
  Play, RotateCcw, AlertTriangle, CheckCircle2, Sparkles, 
  ArrowRight, ShieldCheck, Cpu, RefreshCw, Layers, ArrowDown, Activity, Clock
} from 'lucide-react';
import { ConflictSlotOption } from '../types';

interface Props {
  onNavigateToApproval: (recommendedWindow: string) => void;
  onNavigateToGantt: () => void;
}

export const WhatIfSimulationView: React.FC<Props> = ({
  onNavigateToApproval,
  onNavigateToGantt
}) => {
  const [simulationState, setSimulationState] = useState<'IDLE' | 'SIMULATING' | 'RECALCULATED'>('IDLE');
  const [scenarioType, setScenarioType] = useState<string>('block_unavailable');
  const [selectedSlot, setSelectedSlot] = useState<string>('12:30–14:30');

  const handleRunWhatIf = () => {
    setSimulationState('SIMULATING');
    setTimeout(() => {
      setSimulationState('RECALCULATED');
    }, 900);
  };

  const handleReset = () => {
    setSimulationState('IDLE');
  };

  const recalculatedOptions = [
    {
      window: "08:00–10:00",
      status: "✓ Feasible",
      score: 82,
      conflicts: 0,
      utilization: "76%",
      desc: "Passed. Early morning slot prior to primary inspection rake arrival."
    },
    {
      window: "12:30–14:30",
      status: "✓ AI RECOMMENDED",
      score: 94,
      conflicts: 0,
      utilization: "94%",
      isBest: true,
      desc: "Best match. Accommodates full 2h joint block (Civil + S&T + OHE) with 0 passenger delay."
    },
    {
      window: "15:00–17:00",
      status: "✓ Feasible",
      score: 76,
      conflicts: 0,
      utilization: "79%",
      desc: "Feasible secondary slot, but borders evening industrial freight rush."
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold tracking-wider uppercase px-2.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                Pillar 6: What-If Simulation ⭐⭐
              </span>
              <span className="text-xs text-slate-400">Dynamic AI Real-Time Re-Planner</span>
            </div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Cpu className="w-5 h-5 text-indigo-400" />
              Dynamic “What-If” Resilience & Disruption Simulator
            </h2>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl">
              Simulates live railway disruptions—such as sudden emergency train paths, weather cautions, or cancelled block windows—and watches the AI re-optimize alternative slots in sub-seconds.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {simulationState === 'RECALCULATED' ? (
              <button
                id="btn-reset-what-if"
                onClick={handleReset}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition border border-slate-700 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Reset Plan
              </button>
            ) : null}

            <button
              id="btn-run-what-if"
              onClick={handleRunWhatIf}
              disabled={simulationState === 'SIMULATING'}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition shadow-lg shadow-indigo-900/40 cursor-pointer disabled:opacity-50"
            >
              {simulationState === 'SIMULATING' ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  AI Re-calculating...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  “What if current block becomes unavailable?”
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Disruption Trigger Selector */}
      <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
            Simulate Disruption Event:
          </span>
          <select
            value={scenarioType}
            onChange={(e) => {
              setScenarioType(e.target.value);
              if (simulationState === 'RECALCULATED') setSimulationState('IDLE');
            }}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-semibold"
          >
            <option value="block_unavailable">Emergency VIP / Military Special Train cancels 10:00-12:00 slot</option>
            <option value="weather_monsoon">Severe Monsoon Waterlogging: Speed curtailed to 30 km/h</option>
            <option value="crew_delay">P-Way Tamping Machine delayed by 45 minutes</option>
          </select>
        </div>

        <div className="text-slate-400 font-mono text-[11px]">
          Target Section: <span className="text-white font-bold">Section A–B (Ghaziabad–Aligarh)</span>
        </div>
      </div>

      {/* Recalculation Flowchart matching prompt layout */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-2xl space-y-8">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Dynamic Optimization Pipeline (Deterministic Multi-Objective Solvers)
        </div>

        {/* Step-by-Step Flow Chart matching exact prompt ASCII diagram */}
        <div className="max-w-2xl mx-auto space-y-4 font-mono text-center">
          {/* Box 1: Current Plan */}
          <div className="bg-slate-950/90 border border-slate-800 p-4 rounded-xl shadow-md">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              CURRENT PLAN
            </div>
            <div className="text-2xl font-black text-white mt-1">
              10:00 – 12:00
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              3 Departments Combined (Track-24, Signal-08, OHE-17)
            </div>
          </div>

          <div className="flex justify-center">
            <ArrowDown className="w-6 h-6 text-slate-600" />
          </div>

          {/* Box 2: Block Unavailable / Event */}
          <div className={`p-4 rounded-xl border transition-all duration-300 ${
            simulationState === 'IDLE' 
              ? 'bg-slate-950/40 border-slate-800 text-slate-500' 
              : 'bg-red-950/50 border-red-500/60 text-red-200 shadow-lg shadow-red-950/50'
          }`}>
            <div className="text-xs font-bold uppercase tracking-wider">
              TRIGGER EVENT
            </div>
            <div className="text-lg font-black mt-1 flex items-center justify-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              BLOCK UNAVAILABLE ⚠️
            </div>
            <div className="text-xs opacity-80 mt-0.5">
              {simulationState === 'IDLE' 
                ? 'Awaiting simulation trigger...' 
                : 'Corridor booked for high-priority express train / track emergency.'}
            </div>
          </div>

          <div className="flex justify-center">
            <ArrowDown className={`w-6 h-6 transition ${
              simulationState === 'IDLE' ? 'text-slate-700' : 'text-indigo-400 animate-pulse'
            }`} />
          </div>

          {/* Box 3: AI Re-optimization */}
          <div className={`p-4 rounded-xl border transition-all duration-300 ${
            simulationState === 'IDLE' 
              ? 'bg-slate-950/40 border-slate-800 text-slate-500' 
              : 'bg-indigo-950/50 border-indigo-500/60 text-indigo-200 shadow-lg shadow-indigo-950/50'
          }`}>
            <div className="text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              AI RE-OPTIMIZATION ENGINE
            </div>
            <div className="text-xs opacity-90 mt-1">
              Scanned 4 Candidate Timetable Windows against Safety Headways
            </div>

            {/* Candidate Box */}
            <div className="mt-4 bg-slate-950 p-4 rounded-lg border border-slate-800 text-left space-y-2">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1 border-b border-slate-800 pb-1">
                Candidate Timetable Evaluations:
              </div>
              {recalculatedOptions.map((opt, idx) => (
                <div 
                  key={idx}
                  className={`flex items-center justify-between text-xs p-2 rounded ${
                    opt.isBest && simulationState === 'RECALCULATED' 
                      ? 'bg-emerald-950/60 border border-emerald-500/50 font-bold text-white' 
                      : 'text-slate-300'
                  }`}
                >
                  <span className="font-mono text-sm">{opt.window}</span>
                  <div className="flex items-center gap-3">
                    <span className={opt.isBest ? 'text-emerald-400' : 'text-slate-400'}>
                      {opt.status}
                    </span>
                    <span className="font-mono text-[11px] text-slate-400">
                      Score: {opt.score}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center">
            <ArrowDown className={`w-6 h-6 transition ${
              simulationState === 'RECALCULATED' ? 'text-emerald-400 animate-bounce' : 'text-slate-700'
            }`} />
          </div>

          {/* Box 4: AI Recommends New Slot */}
          <div className={`p-5 rounded-xl border-2 transition-all duration-300 ${
            simulationState === 'RECALCULATED' 
              ? 'bg-emerald-950/50 border-emerald-500 text-white shadow-2xl shadow-emerald-950/60' 
              : 'bg-slate-950/40 border-slate-800 text-slate-500'
          }`}>
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              AI RECOMMENDS
            </div>
            <div className="text-3xl font-black font-mono tracking-tight mt-1 text-white">
              12:30 – 14:30
            </div>
            <div className="text-xs text-slate-300 mt-2 max-w-md mx-auto">
              ✓ All 3 departments re-scheduled seamlessly. Zero passenger delays across Section A-B.
            </div>

            {simulationState === 'RECALCULATED' && (
              <div className="mt-4 pt-3 border-t border-emerald-500/30 flex items-center justify-center gap-3">
                <button
                  id="btn-approve-recalculated-plan"
                  onClick={() => onNavigateToApproval("12:30 – 14:30")}
                  className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Proceed to Official Sanction with 12:30–14:30 →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
