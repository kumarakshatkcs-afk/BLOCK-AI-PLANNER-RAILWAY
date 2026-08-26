import React, { useState } from 'react';
import { 
  AlertTriangle, CheckCircle2, ShieldAlert, Cpu, Zap, GitBranch, 
  Crown, ArrowRight, Gauge, Clock, ChevronRight, X, Sparkles, Check,
  Radio, Train as TrainIcon, Navigation
} from 'lucide-react';
import { OptimizationResult, PlanOption, Train } from '../types';

interface OfficialPlanReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  optimization: OptimizationResult | null;
  trains: Train[];
  onApplyOption: (optionId: string, customTrainId?: string) => Promise<void>;
  currentPlanStatus: 'pending' | 'approved' | 'modified';
}

export function OfficialPlanReviewModal({
  isOpen,
  onClose,
  optimization,
  trains,
  onApplyOption,
  currentPlanStatus
}: OfficialPlanReviewModalProps) {
  const [selectedOptionId, setSelectedOptionId] = useState<string>('approve_ai');
  const [selectedTrainId, setSelectedTrainId] = useState<string | undefined>(undefined);
  const [isApplying, setIsApplying] = useState(false);
  const [appliedSuccessMsg, setAppliedSuccessMsg] = useState<string | null>(null);

  if (!isOpen || !optimization) return null;

  const issue = optimization.issue;
  const options = optimization.options || [
    {
      id: 'approve_ai',
      title: 'Approve AI Dynamic Resolution',
      label: 'AI Smart Reroute & Precedence',
      badge: 'RECOMMENDED (100% RECOVERY)',
      description: 'Execute optimal multi-objective routing: clear high-speed green block for premium express rake and bypass failure zone.',
      trainEffect: 'Reroutes live train onto clear green track, accelerates speed to 130 km/h, and completely clears predicted delay to 0m.',
      delaySavings: 42,
      speedLimit: 130,
      riskLevel: 'LOW',
      recommended: true
    },
    {
      id: 'loop_divert',
      title: 'Divert onto Loop Line / Bypass Corridor',
      label: 'Loop Line Regulation',
      badge: 'TRAFFIC REGULATION',
      description: 'Divert train into loop line siding at 45 km/h to allow critical maintenance inspection on the mainline.',
      trainEffect: 'Train takes turnout onto Loop Line 2, adjusts speed to 45 km/h, maintains steady progress with +4m controlled dwell.',
      delaySavings: 28,
      speedLimit: 45,
      riskLevel: 'LOW',
      recommended: false
    },
    {
      id: 'precedence',
      title: 'Grant Priority Precedence (Vande Bharat First)',
      label: 'Express Priority Precedence',
      badge: 'SUPERFAST CORRIDOR',
      description: 'Force trailing or conflicting freight/passenger rakes into holding sidings, granting absolute line priority.',
      trainEffect: 'Immediate green signal clearance for live Vande Bharat / Rajdhani train, speed unlocked to 130 km/h.',
      delaySavings: 38,
      speedLimit: 130,
      riskLevel: 'LOW',
      recommended: false
    },
    {
      id: 'tsr_30',
      title: 'Issue Caution Order (TSR 30 km/h)',
      label: 'Caution Order TSR 30',
      badge: 'CONTROLLED PASSAGE',
      description: 'Allow live train to proceed cautiously through the degraded block under Temporary Speed Restriction of 30 km/h.',
      trainEffect: 'Live train throttles speed to exactly 30 km/h with flashing caution beacon until block clearing point.',
      delaySavings: 12,
      speedLimit: 30,
      riskLevel: 'MEDIUM',
      recommended: false
    },
    {
      id: 'manual',
      title: 'Manual Section Controller Override',
      label: 'Manual Dispatch Control',
      badge: 'MANUAL OVERRIDE',
      description: 'Transfer routing authority back to manual dispatch controller desk, bypassing automated AI interlocking.',
      trainEffect: 'Live train switches to manual state, speed governed by manual signal aspects.',
      delaySavings: 0,
      speedLimit: 60,
      riskLevel: 'HIGH',
      recommended: false
    }
  ];

  const currentOption = options.find(o => o.id === selectedOptionId) || options[0];

  const affectedTrainsList = (issue?.affectedTrainIds || [])
    .map(id => trains.find(t => t.id === id))
    .filter((t): t is Train => Boolean(t));

  const activeTargetTrain = (selectedTrainId ? trains.find(t => t.id === selectedTrainId) : null) || affectedTrainsList[0] || trains[0];

  const handleExecute = async () => {
    setIsApplying(true);
    try {
      await onApplyOption(selectedOptionId, activeTargetTrain?.id);
      setAppliedSuccessMsg(`Plan "${currentOption.label}" successfully executed! Live moving train ${activeTargetTrain?.id || ''} has been updated.`);
      setTimeout(() => {
        setAppliedSuccessMsg(null);
        onClose();
      }, 1600);
    } catch (err) {
      console.error(err);
    } finally {
      setIsApplying(false);
    }
  };

  const getOptionIcon = (id: string) => {
    switch (id) {
      case 'approve_ai': return <Zap className="w-4 h-4 text-emerald-400" />;
      case 'loop_divert': return <GitBranch className="w-4 h-4 text-amber-400" />;
      case 'precedence': return <Crown className="w-4 h-4 text-purple-400" />;
      case 'tsr_30': return <AlertTriangle className="w-4 h-4 text-rose-400" />;
      default: return <Cpu className="w-4 h-4 text-cyan-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div 
        id="official-plan-review-modal" 
        className="bg-slate-900 border border-cyan-500/30 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-[0_0_50px_rgba(6,182,212,0.15)] overflow-hidden"
      >
        
        {/* Header Bar */}
        <div className="p-4 sm:px-6 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  OFFICIAL PLAN REVIEW & LIVE ISSUE RESOLUTION
                </h2>
                <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase">
                  Action Required
                </span>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                  AI Conf: {optimization.confidenceScore}%
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Division Traffic Control Cockpit • Section Interlocking Override Desk
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
          
          {/* TOP SECTION: SOLVING ISSUE OVERVIEW */}
          <div className="bg-slate-950/70 border border-rose-900/40 rounded-xl p-4 shadow-inner">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <ShieldAlert className="w-4 h-4 animate-pulse" />
                <span>IDENTIFIED ISSUE: {issue?.title || 'Track Degradation & Block Section Conflict'}</span>
              </div>
              <span className="text-xs font-mono text-slate-400">
                Location: <strong className="text-slate-200">{issue?.location || 'Bhilai ➔ Raipur Corridor'}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
              <div className="md:col-span-2 space-y-2">
                <div className="text-xs text-slate-300">
                  <span className="text-slate-400 font-mono uppercase text-[10px] block">Root Cause & Infrastructure Telemetry:</span>
                  {issue?.rootCause || 'Insulated Rail Joint (IRJ) track circuit de-energization combined with 25kV OHE dropper vibration on UP line.'}
                </div>
                <div className="text-xs text-slate-400">
                  <span className="text-rose-400 font-mono uppercase text-[10px] font-bold block">Cascade Delay Risk:</span>
                  {issue?.cascadeImpact || '4 following rakes in SECR corridor at risk of +45m cascaded delay if not re-routed or regulated.'}
                </div>
              </div>

              {/* Delay Impact Card */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span>Projected Delay</span>
                  <span className="text-rose-400 font-bold">+{issue?.projectedDelayMinutes || 42} min</span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono text-slate-400 mt-2">
                  <span>AI Delay Savings</span>
                  <span className="text-emerald-400 font-bold">-{optimization.systemDelayReduction || 42} min</span>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-800 text-[10px] font-mono text-emerald-400 flex items-center gap-1 font-bold">
                  <Sparkles className="w-3 h-3" /> 100% Recovery with AI Option
                </div>
              </div>
            </div>

            {/* Affected Live Trains */}
            <div className="mt-4 pt-3 border-t border-slate-800/80">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-2">
                Impacted Live Moving Trains in Block:
              </span>
              <div className="flex flex-wrap gap-2">
                {(affectedTrainsList.length > 0 ? affectedTrainsList : trains.slice(0, 3)).map(train => {
                  const isSelected = activeTargetTrain?.id === train.id;
                  return (
                    <button
                      key={train.id}
                      onClick={() => setSelectedTrainId(train.id)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-mono flex items-center gap-2 transition-all ${
                        isSelected 
                          ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-[0_0_10px_rgba(6,182,212,0.3)]' 
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <TrainIcon className={`w-3.5 h-3.5 ${isSelected ? 'text-cyan-400' : 'text-slate-400'}`} />
                      <span className="font-bold">{train.trainNumber || train.id} ({train.trainName})</span>
                      <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">{train.category || train.type}</span>
                      <span className={`text-[10px] font-bold ${train.predictedDelay > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        +{train.predictedDelay}m
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* STEP-BY-STEP SOLVING MECHANISM */}
          <div className="space-y-2">
            <h3 className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-bold flex items-center gap-2">
              <Navigation className="w-3.5 h-3.5" /> AI Step-by-Step Solving Mechanism
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {(issue?.resolutionSteps || [
                { step: 1, title: 'Traffic Regulation', description: 'Hold trailing freight on Loop Line 2 at Durg.', status: 'completed' },
                { step: 2, title: 'Crossover Switch', description: 'Point machine P-102 & P-104 interlocked reverse.', status: 'in_progress' },
                { step: 3, title: 'Platform Allocation', description: 'Reserve Platform 1 at Raipur with auto-clear.', status: 'pending' },
                { step: 4, title: 'Speed Restoration', description: 'Unlock 130 km/h aspect across bypass corridor.', status: 'pending' }
              ]).map((step, idx) => (
                <div key={idx} className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono text-cyan-400 font-bold">STEP 0{step.step}</span>
                      <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded font-bold ${
                        step.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        step.status === 'in_progress' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {step.status}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-200">{step.title}</div>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CHOOSE OFFICIAL PLAN REVIEW OPTION */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono uppercase tracking-widest text-slate-300 font-bold flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                Select Official Plan Decision for Live Moving Train:
              </h3>
              <span className="text-xs font-mono text-slate-400">
                Target Train: <strong className="text-cyan-400">{activeTargetTrain?.id} ({activeTargetTrain?.type})</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {options.map((opt) => {
                const isSelected = selectedOptionId === opt.id;
                return (
                  <div
                    key={opt.id}
                    onClick={() => setSelectedOptionId(opt.id)}
                    className={`cursor-pointer rounded-xl border p-4 transition-all flex flex-col justify-between ${
                      isSelected
                        ? opt.id === 'approve_ai'
                          ? 'bg-emerald-950/40 border-emerald-500/70 shadow-[0_0_20px_rgba(16,185,129,0.2)] ring-1 ring-emerald-500'
                          : opt.id === 'loop_divert'
                          ? 'bg-amber-950/40 border-amber-500/70 shadow-[0_0_20px_rgba(245,158,11,0.2)] ring-1 ring-amber-500'
                          : opt.id === 'precedence'
                          ? 'bg-purple-950/40 border-purple-500/70 shadow-[0_0_20px_rgba(168,85,247,0.2)] ring-1 ring-purple-500'
                          : 'bg-slate-900 border-cyan-500/60 shadow-[0_0_15px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500'
                        : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 hover:bg-slate-900/50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getOptionIcon(opt.id)}
                          <span className="font-bold text-xs text-white">{opt.label}</span>
                        </div>
                        {isSelected && (
                          <div className="p-0.5 bg-emerald-500 text-slate-950 rounded-full">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </div>

                      <div className="mb-2">
                        <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold ${
                          opt.recommended 
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {opt.badge}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-300 leading-relaxed mb-3">
                        {opt.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-800/80 space-y-1.5 text-[10px] font-mono">
                      <div className="flex justify-between text-slate-400">
                        <span>Speed Ceiling:</span>
                        <strong className="text-slate-200">{opt.speedLimit} km/h</strong>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Delay Recovery:</span>
                        <strong className="text-emerald-400">+{opt.delaySavings} min shaved</strong>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Operational Risk:</span>
                        <strong className={opt.riskLevel === 'LOW' ? 'text-emerald-400' : opt.riskLevel === 'MEDIUM' ? 'text-amber-400' : 'text-rose-400'}>
                          {opt.riskLevel}
                        </strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* REAL-TIME IMPACT PREVIEW ON LIVE MOVING TRAIN */}
          <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-cyan-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                <Gauge className="w-4 h-4" /> Live Impact on Moving Train {activeTargetTrain?.id}:
              </span>
              <span className="text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded">
                Real-Time Simulation Sync
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
              <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 text-center">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Speed Change</div>
                <div className="text-sm font-bold text-white flex items-center justify-center gap-2 mt-1 font-mono">
                  <span className="text-slate-500">{activeTargetTrain?.speed || 40} km/h</span>
                  <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-emerald-400 font-bold">{currentOption.speedLimit} km/h</span>
                </div>
              </div>

              <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 text-center">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Delay Status</div>
                <div className="text-sm font-bold text-white flex items-center justify-center gap-2 mt-1 font-mono">
                  <span className="text-rose-400">+{activeTargetTrain?.predictedDelay || 25}m</span>
                  <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-emerald-400 font-bold">
                    {Math.max(0, (activeTargetTrain?.predictedDelay || 25) - currentOption.delaySavings)}m
                  </span>
                </div>
              </div>

              <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 text-center">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Live Interlocking Status</div>
                <div className="text-xs font-bold text-cyan-300 mt-1 font-mono truncate">
                  {currentOption.id === 'approve_ai' ? 'Mainline PF-1 Route Locked' :
                   currentOption.id === 'loop_divert' ? 'Turnout Loop 2 Locked' :
                   currentOption.id === 'precedence' ? 'Priority Green Corridor' :
                   'Caution TSR 30 Active'}
                </div>
              </div>
            </div>

            <div className="mt-3 p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 flex items-start gap-2">
              <ChevronRight className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Active Telemetry Instruction: </strong>
                {currentOption.trainEffect}
              </div>
            </div>
          </div>

          {appliedSuccessMsg && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-500 rounded-xl text-emerald-300 font-mono text-xs flex items-center gap-2 animate-bounce">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{appliedSuccessMsg}</span>
            </div>
          )}

        </div>

        {/* Modal Action Footer */}
        <div className="p-4 sm:px-6 border-t border-slate-800 bg-slate-950/90 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs font-mono text-slate-400">
            Official Decision: <strong className="text-white">{currentOption.title}</strong>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              disabled={isApplying}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-mono font-bold transition-colors w-full sm:w-auto"
            >
              CANCEL
            </button>
            <button
              onClick={handleExecute}
              disabled={isApplying}
              className={`px-6 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center gap-2 w-full sm:w-auto shadow-lg uppercase tracking-wider ${
                isApplying 
                  ? 'bg-cyan-900/50 text-cyan-400 border border-cyan-500 cursor-wait' 
                  : selectedOptionId === 'approve_ai'
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.4)]'
              }`}
            >
              {isApplying ? <Zap className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {isApplying ? 'APPLYING TO LIVE TRAIN...' : 'APPLY OPTION TO LIVE TRAIN'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
