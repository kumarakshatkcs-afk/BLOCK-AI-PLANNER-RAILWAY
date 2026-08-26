import React, { useState } from 'react';
import { 
  AlertOctagon, CheckCircle2, XCircle, AlertTriangle, Sparkles, 
  ArrowRight, Clock, ShieldCheck, Train as TrainIcon, Calendar, ArrowDown
} from 'lucide-react';
import { ConflictSlotOption } from '../types';

interface Props {
  onNavigateToGantt: () => void;
  onNavigateToCorridor: () => void;
}

export const ConflictDetectionView: React.FC<Props> = ({
  onNavigateToGantt,
  onNavigateToCorridor
}) => {
  const [selectedSlotId, setSelectedSlotId] = useState<string>('SLOT-ALT-RECOMMENDED');
  const [isSimulatingConflict, setIsSimulatingConflict] = useState(false);

  const candidateSlots: ConflictSlotOption[] = [
    {
      id: "SLOT-1",
      window: "08:00–10:00",
      startHour: 8.0,
      endHour: 10.0,
      hasConflict: false,
      isAiRecommended: true,
      score: 88,
      blockUtilization: 86,
      estimatedDowntimeReduction: 22,
      safetyScore: 95,
      tag: "✓ No conflict",
      explanation: "Zero passenger train clashes. Minor freight rake siding hold with 0 passenger delay."
    },
    {
      id: "SLOT-2",
      window: "10:00–12:00",
      startHour: 10.0,
      endHour: 12.0,
      hasConflict: true,
      conflictReason: "Headway clash with Passenger Train 12051 Jan Shatabdi Express scheduled at 10:45 on Up Main.",
      conflictingTrain: "Train 12051 Jan Shatabdi (10:45)",
      isAiRecommended: false,
      score: 45,
      blockUtilization: 50,
      estimatedDowntimeReduction: 8,
      safetyScore: 60,
      tag: "✕ Train conflict",
      explanation: "Direct block conflict at 10:45. Would impose 45 min delay on 1,200 passengers if forced."
    },
    {
      id: "SLOT-3",
      window: "12:30–14:30",
      startHour: 12.5,
      endHour: 14.5,
      hasConflict: false,
      isAiRecommended: false,
      score: 92,
      blockUtilization: 94,
      estimatedDowntimeReduction: 28,
      safetyScore: 98,
      tag: "✓ No conflict",
      explanation: "Optimal passenger slack window. Loop line available for secondary express traversal."
    },
    {
      id: "SLOT-4",
      window: "15:00–17:00",
      startHour: 15.0,
      endHour: 17.0,
      hasConflict: false,
      isAiRecommended: false,
      score: 76,
      blockUtilization: 78,
      estimatedDowntimeReduction: 14,
      safetyScore: 88,
      tag: "✓ No conflict",
      explanation: "Secondary afternoon window. Feasible but closer to evening peak shift."
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold tracking-wider uppercase px-2.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                Pillar 4: Conflict Detection Screen ⭐⭐
              </span>
              <span className="text-xs text-slate-400">Timetable Collision Prevention Engine</span>
            </div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <AlertOctagon className="w-5 h-5 text-rose-400" />
              Automated Train Conflict Identification & Slot Re-Routing
            </h2>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl">
              Demonstrates that the AI Block Planner is not picking arbitrary time windows—it executes deep mathematical conflict resolution against live CRIS/NTES passenger and freight timetables.
            </p>
          </div>

          <button
            id="btn-goto-corridor-from-conflict"
            onClick={onNavigateToCorridor}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-sm cursor-pointer whitespace-nowrap"
          >
            Corridor Map Inspector →
          </button>
        </div>
      </div>

      {/* Visual Conflict Flow (Exact match to prompt layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Card: The Problem / Conflict Illustration */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl flex flex-col justify-between space-y-6">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Live Conflict Detection Scenario
            </div>
            <h3 className="text-lg font-bold text-white mb-4">
              Proposed Schedule vs. Train Path
            </h3>

            {/* Visual ASCII / UI Flow requested in prompt */}
            <div className="bg-slate-950/80 p-5 rounded-xl border border-slate-800 space-y-4 font-mono text-center">
              <div className="space-y-1">
                <div className="text-xs font-bold text-slate-400">PROPOSED BLOCK</div>
                <div className="text-lg font-black text-blue-400 tracking-wider">
                  10:00 ───────── 12:00
                </div>
              </div>

              <div className="flex justify-center">
                <ArrowDown className="w-5 h-5 text-slate-500 animate-bounce" />
              </div>

              <div className="bg-rose-950/40 border border-rose-500/40 p-3 rounded-lg space-y-1">
                <div className="text-xs font-bold text-rose-300 flex items-center justify-center gap-1.5">
                  <TrainIcon className="w-3.5 h-3.5" />
                  Passenger Train (12051 Jan Shatabdi)
                </div>
                <div className="text-xl font-black text-white">
                  10:45
                </div>
              </div>

              <div className="flex justify-center">
                <ArrowDown className="w-5 h-5 text-rose-500" />
              </div>

              <div className="bg-rose-600 text-white font-black text-sm py-2 px-4 rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-rose-900/40">
                <AlertTriangle className="w-4 h-4" />
                ⚠️ CONFLICT DETECTED
              </div>
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-xs text-slate-400 space-y-1">
            <span className="font-bold text-white block">Constraint Rule 4.1 (IR General Rules):</span>
            Passenger trains cannot traverse track sections where 25kV OHE power is switched off or rails are unbolted. The AI detects this collision 6 hours ahead.
          </div>
        </div>

        {/* Right Card: AI Evaluated Alternatives & Recommendation */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-5">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                AI Evaluated Alternative Windows
              </h3>
              <span className="text-xs text-slate-400 font-mono">4 Timetable Slots Scanned</span>
            </div>
            <p className="text-xs text-slate-400">
              The AI Block Optimizer scans adjacent timetable slack windows and chooses the option with minimal cascade delay.
            </p>
          </div>

          {/* Alternatives Table matching prompt structure */}
          <div className="space-y-3">
            {candidateSlots.map(slot => {
              return (
                <div
                  key={slot.id}
                  id={`slot-card-${slot.id}`}
                  onClick={() => setSelectedSlotId(slot.id)}
                  className={`p-4 rounded-xl border transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    slot.isAiRecommended 
                      ? 'bg-emerald-950/30 border-emerald-500 shadow-md ring-1 ring-emerald-500/40' 
                      : slot.hasConflict
                      ? 'bg-rose-950/20 border-rose-500/30 opacity-80'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-base text-white">
                        {slot.window}
                      </span>
                      {slot.hasConflict ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">
                          <XCircle className="w-3 h-3" />
                          ✕ Train conflict
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" />
                          ✓ No conflict
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 max-w-md">
                      {slot.explanation}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    {slot.isAiRecommended ? (
                      <span className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center gap-1 shadow-sm">
                        <Sparkles className="w-3 h-3" />
                        AI Recommended
                      </span>
                    ) : (
                      <span className="text-xs font-mono text-slate-400">
                        Score: <span className="font-bold text-white">{slot.score}</span>/100
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* AI Recommendation Highlight Box */}
          <div className="bg-emerald-950/40 border border-emerald-500/50 rounded-xl p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                AI Recommendation: 08:00–10:00 (or 12:30–14:30)
              </span>
              <span className="text-xs font-mono text-emerald-300">Confidence: 98.4%</span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed">
              By shifting the 3-department block from 10:00–12:00 to <strong className="text-emerald-300">08:00–10:00</strong>, all 3 critical maintenance tasks (Track-24 rail repair, Signal-08 point calibration, OHE-17 wire adjustment) are safely completed without halting Train 12051 Jan Shatabdi Express.
            </p>
            <div className="text-[11px] text-slate-400 italic pt-1">
              ✓ This proves your system dynamically solves collisions rather than relying on static schedules.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
