import React, { useState } from 'react';
import { 
  ShieldAlert, Sparkles, ChevronRight, HelpCircle, CheckCircle2, 
  AlertTriangle, Wrench, Radio, Zap, ArrowRight, Gauge, Activity, Cpu
} from 'lucide-react';
import { MaintenanceRequest } from '../types';

interface Props {
  requests: MaintenanceRequest[];
  selectedRequest: MaintenanceRequest | null;
  onSelectRequest: (req: MaintenanceRequest) => void;
  onNavigateToGantt: () => void;
}

export const AIPriorityScoringView: React.FC<Props> = ({
  requests = [],
  selectedRequest,
  onSelectRequest,
  onNavigateToGantt
}) => {
  const safeRequests = Array.isArray(requests) ? requests : [];
  const currentItem = selectedRequest || safeRequests[0] || {
    id: "M001",
    department: "Engineering",
    asset: "Track-24",
    problem: "Rail defect (Squat & Gauge Face Spalling)",
    severity: "Critical",
    durationHours: 2,
    durationStr: "2h",
    priorityScore: 89,
    isOverdue: true,
    status: "Pending",
    corridorId: "CORR-AB",
    corridorName: "Section A–B (Ghaziabad – Aligarh Up Main)",
    scores: {
      severity: 90,
      assetCriticality: 85,
      urgency: 95,
      safetyRisk: 92,
      trafficImpact: 72
    },
    recommendationBadge: "🔴 CRITICAL - Schedule in next suitable block",
    explainWhy: "High priority because of critical defect, asset importance, safety risk and overdue status.",
    detailedXAI: "Track-24 on Section A-B carries 130 km/h high-speed passenger traffic. Postponing this block increases risk.",
    assignedCrew: "Civil Engineering P-Way Gang 04"
  };

  const [showExplanation, setShowExplanation] = useState(true);
  const [isDeepExplaining, setIsDeepExplaining] = useState(false);
  const [deepExplanation, setDeepExplanation] = useState<string | null>(null);

  const fetchDeepGeminiExplanation = async () => {
    setIsDeepExplaining(true);
    try {
      const res = await fetch('/api/block-planner/explain-priority', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: currentItem.id })
      });
      if (res.ok) {
        const json = await res.json();
        setDeepExplanation(json.technicalBreakdown || json.explainWhy);
        setShowExplanation(true);
      }
    } catch (e) {
      setDeepExplanation(currentItem.detailedXAI || currentItem.explainWhy);
    } finally {
      setIsDeepExplaining(false);
    }
  };

  const scores = currentItem?.scores || {
    severity: 90,
    assetCriticality: 85,
    urgency: 95,
    safetyRisk: 92,
    trafficImpact: 72
  };

  const scoreItems = [
    { label: "Severity", value: scores.severity, color: "bg-red-500", barFill: "w-[90%]" },
    { label: "Asset Criticality", value: scores.assetCriticality, color: "bg-amber-500", barFill: "w-[85%]" },
    { label: "Urgency", value: scores.urgency, color: "bg-red-500", barFill: "w-[95%]" },
    { label: "Safety Risk", value: scores.safetyRisk, color: "bg-rose-500", barFill: "w-[92%]" },
    { label: "Traffic Impact", value: scores.trafficImpact, color: "bg-blue-500", barFill: "w-[72%]" }
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                Pillar 2: AI Prioritization & Explainability ⭐⭐⭐
              </span>
              <span className="text-xs text-slate-400">Explainable AI (XAI) Model</span>
            </div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Cpu className="w-5 h-5 text-purple-400" />
              “AI Decides WHAT Needs Attention First”
            </h2>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl">
              Multi-objective priority engine evaluating ultrasonic rail defects, signal point failures, and OHE electrical fatigue to objectively score criticality and prevent human scheduling bias.
            </p>
          </div>

          <button
            id="btn-goto-block-planner-from-priority"
            onClick={onNavigateToGantt}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition shadow-sm cursor-pointer whitespace-nowrap"
          >
            <Sparkles className="w-4 h-4" />
            Proceed to Block Planner (Gantt) →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Asset Selector List */}
        <div className="lg:col-span-4 bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between px-1 mb-2">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Asset Queue ({requests.length})
            </h3>
            <span className="text-[10px] text-slate-400">Ranked by AI Score</span>
          </div>

          <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1 custom-scrollbar">
            {requests.map(req => {
              const isSelected = req.id === currentItem.id;
              return (
                <div
                  key={req.id}
                  id={`asset-card-${req.id}`}
                  onClick={() => {
                    onSelectRequest(req);
                    setDeepExplanation(null);
                  }}
                  className={`p-3 rounded-lg border transition cursor-pointer ${
                    isSelected 
                      ? 'bg-purple-950/40 border-purple-500 shadow-md ring-1 ring-purple-500/50' 
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                      {req.department === 'Engineering' && <Wrench className="w-3 h-3 text-blue-400" />}
                      {req.department === 'S&T' && <Radio className="w-3 h-3 text-emerald-400" />}
                      {req.department === 'Traction' && <Zap className="w-3 h-3 text-amber-400" />}
                      {req.asset}
                    </span>
                    <span className={`text-xs font-bold font-mono px-1.5 py-0.5 rounded ${
                      req.priorityScore >= 85 
                        ? 'bg-red-500/20 text-red-400' 
                        : req.priorityScore >= 75 
                        ? 'bg-amber-500/20 text-amber-400' 
                        : 'bg-slate-800 text-slate-300'
                    }`}>
                      {req.priorityScore}/100
                    </span>
                  </div>
                  <div className="text-xs text-slate-300 line-clamp-1">
                    {req.problem}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-800/60">
                    <span>{req.department} • {req.durationStr}</span>
                    <span className={req.severity === 'Critical' ? 'text-red-400 font-bold' : 'text-amber-400'}>
                      {req.severity}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Exact AI Priority Scorecard & Explainability */}
        <div className="lg:col-span-8 space-y-5">
          {/* Main Priority Card matching prompt specs */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl relative overflow-hidden">
            {/* Background glowing gradient */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

            {/* Asset Title Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
              <div>
                <div className="text-xs text-purple-400 font-bold uppercase tracking-wider mb-1">
                  {currentItem.id} • {currentItem.corridorName}
                </div>
                <h2 className="text-2xl font-black text-white font-mono tracking-tight flex items-center gap-2">
                  {currentItem.asset}
                </h2>
                <div className="text-sm text-slate-300 mt-0.5">
                  {currentItem.problem}
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs text-slate-400 font-medium">Composite AI Priority</div>
                <div className="text-3xl sm:text-4xl font-black text-white font-mono text-purple-400">
                  {currentItem.priorityScore}
                  <span className="text-lg text-slate-500 font-normal">/100</span>
                </div>
              </div>
            </div>

            {/* Decorative Divider */}
            <div className="w-full text-slate-700 select-none py-1 font-mono tracking-widest text-xs overflow-hidden">
              ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            </div>

            {/* Exact 5-Dimensional AI Score Bars */}
            <div className="space-y-4 my-5 bg-slate-950/60 p-5 rounded-xl border border-slate-800">
              {scoreItems.map((item, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-300 w-36">{item.label}</span>
                    <div className="flex items-center gap-3">
                      <div className="font-mono text-slate-500 text-[10px] hidden sm:block">
                        {"█".repeat(Math.round(item.value / 10))}
                      </div>
                      <span className="font-mono text-white font-bold w-8 text-right">
                        {item.value}
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        item.value >= 90 ? 'bg-red-500' : item.value >= 80 ? 'bg-amber-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* AI Recommendation Badge matching prompt */}
            <div className="bg-red-950/30 border border-red-500/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-red-400 mb-0.5">
                  AI Recommendation:
                </div>
                <div className="text-base font-bold text-white flex items-center gap-2">
                  {currentItem.recommendationBadge}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Est. Block Duration Required: <span className="text-white font-bold">{currentItem.durationStr}</span> • Assigned: {currentItem.assignedCrew}
                </div>
              </div>

              {/* Explain Why Button */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  id="btn-explain-why"
                  onClick={() => setShowExplanation(!showExplanation)}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-700"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-purple-400" />
                  {showExplanation ? 'Hide Explanation' : 'Explain Why'}
                </button>
                <button
                  id="btn-deep-xai-gemini"
                  onClick={fetchDeepGeminiExplanation}
                  disabled={isDeepExplaining}
                  className="px-3.5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {isDeepExplaining ? 'Computing...' : 'AI Deep Explainer'}
                </button>
              </div>
            </div>

            {/* Explainable AI Reveal Box */}
            {showExplanation && (
              <div className="mt-4 p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-2 animate-fadeIn">
                <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  Explainable AI (XAI) Rationale:
                </div>
                <p className="text-sm text-slate-200 leading-relaxed font-medium">
                  {currentItem.explainWhy}
                </p>
                
                {deepExplanation && (
                  <div className="mt-2 pt-2 border-t border-purple-500/20 text-xs text-slate-300 leading-relaxed bg-purple-900/10 p-3 rounded-lg">
                    <span className="font-bold text-purple-200 block mb-1">Chief Safety Engineer Technical Analysis:</span>
                    {deepExplanation}
                  </div>
                )}
                <div className="text-[11px] text-purple-400/80 italic pt-1">
                  ✓ This makes the AI explainable, compliant with CRS (Commissioner of Railway Safety) audit standards.
                </div>
              </div>
            )}
          </div>

          {/* Cross-Department Bundling Feasibility Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Integrated Department Bundling Opportunity
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Because <span className="font-bold text-white">{currentItem.asset}</span> is located on <span className="font-bold text-white">{currentItem.corridorName}</span>, the AI Block Planner automatically co-locates <span className="text-blue-400 font-bold">Track-24 (Civil)</span>, <span className="text-emerald-400 font-bold">Signal-08 (S&T)</span>, and <span className="text-amber-400 font-bold">OHE-17 (Traction)</span> inside the same 2-hour shadow block, cutting total corridor closure from 4.5 hours down to 2 hours.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
