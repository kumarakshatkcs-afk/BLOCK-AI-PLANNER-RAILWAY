import React from 'react';
import { OptimizationResult } from '../types';
import { Cpu, CheckCircle2, AlertTriangle, ChevronRight, Zap, XCircle, Edit2, ShieldAlert, Sparkles, ArrowRight } from 'lucide-react';

interface AnalyticsPanelProps {
  optimization: OptimizationResult | null;
  planStatus: 'pending' | 'approved' | 'modified';
  onAction: (action: 'approve' | 'reject' | 'modify') => void;
  onOpenOfficialReviewModal?: () => void;
  onApplyOption?: (optionId: string) => void;
}

export function AnalyticsPanel({ 
  optimization, 
  planStatus, 
  onAction,
  onOpenOfficialReviewModal,
  onApplyOption 
}: AnalyticsPanelProps) {
  if (!optimization) {
    return (
      <div className="flex flex-col h-full">
         <div className="p-3 border-b border-slate-700/50 bg-slate-950/40 flex justify-between items-center shrink-0">
            <span className="text-[10px] font-mono text-slate-300 font-bold uppercase tracking-widest flex items-center gap-2">
               <Cpu className="w-3.5 h-3.5 text-purple-400" /> 
               Hybrid AI Solver
            </span>
            <span className="text-[9px] font-mono text-slate-500">IDLE</span>
         </div>
         <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500 space-y-4">
            <Cpu className="w-10 h-10 text-slate-700 animate-pulse" />
            <div className="text-[10px] font-mono uppercase tracking-widest leading-relaxed">
              Awaiting execution trigger.<br/><br/>
              Select two stations on the map or click EXEC_PLANNER to optimize network state and review live issues.
            </div>
            {onOpenOfficialReviewModal && (
              <button
                onClick={onOpenOfficialReviewModal}
                className="px-3.5 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-colors shadow-lg"
              >
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                Open Plan Review Cockpit
              </button>
            )}
         </div>
      </div>
    );
  }

  // Dynamic Theme based on Plan Status
  const getThemeColors = () => {
     if(planStatus === 'approved') return { bg: 'bg-emerald-950/20', border: 'border-emerald-900/50', header: 'bg-emerald-950/60', text: 'text-emerald-400', shadow: 'shadow-[0_0_15px_rgba(16,185,129,0.1)]' };
     if(planStatus === 'modified') return { bg: 'bg-amber-950/20', border: 'border-amber-900/50', header: 'bg-amber-950/60', text: 'text-amber-400', shadow: 'shadow-[0_0_15px_rgba(245,158,11,0.1)]' };
     return { bg: 'bg-purple-950/20', border: 'border-purple-900/50', header: 'bg-purple-950/60', text: 'text-purple-400', shadow: 'shadow-[0_0_15px_rgba(168,85,247,0.1)]' };
  };
  const theme = getThemeColors();

  return (
    <div className={`flex flex-col h-full ${theme.bg}`}>
      <div className={`p-3 border-b ${theme.border} ${theme.header} flex justify-between items-center shrink-0 ${theme.shadow}`}>
         <span className={`text-[10px] font-mono ${planStatus === 'approved' ? 'text-emerald-300' : planStatus === 'modified' ? 'text-amber-300' : 'text-purple-200'} font-bold uppercase tracking-widest flex items-center gap-2`}>
            {planStatus === 'approved' ? <CheckCircle2 className={`w-3.5 h-3.5 ${theme.text}`} /> : planStatus === 'modified' ? <Edit2 className={`w-3.5 h-3.5 ${theme.text}`} /> : <Cpu className={`w-3.5 h-3.5 ${theme.text}`} />} 
            {planStatus === 'approved' ? 'AI PLAN EXECUTING' : planStatus === 'modified' ? 'MANUAL OVERRIDE' : 'AI PLAN GENERATED'}
         </span>
         <div className="flex items-center gap-2">
           <span className="text-[9px] font-mono bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30">CONF: {optimization.confidenceScore}%</span>
           {onOpenOfficialReviewModal && (
             <button
               onClick={onOpenOfficialReviewModal}
               className="text-[9px] font-mono bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 px-2 py-0.5 rounded border border-rose-500/40 flex items-center gap-1 transition-colors font-bold"
               title="Open full official review modal"
             >
               <ShieldAlert className="w-3 h-3 text-rose-400" /> REVIEW
             </button>
           )}
         </div>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar p-3 space-y-3.5">
         
         {/* Live Issue Alert & Solving Cockpit */}
         {optimization.issue && (
           <div className="bg-rose-950/40 border border-rose-500/40 rounded-xl p-2.5 shadow-lg">
             <div className="flex items-center justify-between mb-1.5">
               <span className="text-[9px] font-mono font-bold text-rose-400 uppercase tracking-widest flex items-center gap-1.5">
                 <AlertTriangle className="w-3 h-3 text-rose-400 animate-pulse" />
                 Live Issue: {optimization.issue.type}
               </span>
               <span className={`text-[8px] font-mono px-1.5 py-0.2 rounded font-bold ${
                 optimization.issue.severity === 'CRITICAL' ? 'bg-rose-600 text-white' : 'bg-amber-600 text-white'
               }`}>
                 {optimization.issue.severity}
               </span>
             </div>
             <p className="text-[10px] text-slate-200 font-sans mb-1.5 leading-relaxed">
               {optimization.issue.description}
             </p>
             <div className="text-[9px] font-mono text-cyan-300 flex items-center justify-between border-t border-rose-900/50 pt-1">
               <span>Location: {optimization.issue.location}</span>
               <span>Impact: +{optimization.issue.projectedDelayMinutes}m delay</span>
             </div>
           </div>
         )}

         {/* Plan Options Selector */}
         {optimization.options && optimization.options.length > 0 && (
           <div className="space-y-1.5">
             <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 uppercase">
               <span className="flex items-center gap-1"><Sparkles className="w-3 h-3 text-amber-400" /> Select Solving Option</span>
               <span className="text-cyan-400 font-bold">{optimization.options.length} Available</span>
             </div>
             <div className="space-y-1.5">
               {optimization.options.map((opt) => (
                 <div 
                   key={opt.id}
                   className={`p-2 rounded-lg border text-left transition-all ${
                     opt.recommended 
                       ? 'bg-emerald-950/30 border-emerald-500/50' 
                       : 'bg-slate-900/60 border-slate-800'
                   }`}
                 >
                   <div className="flex items-center justify-between mb-1">
                     <span className="text-[10px] font-bold text-slate-100 flex items-center gap-1.5">
                       {opt.title}
                       {opt.recommended && (
                         <span className="text-[8px] bg-emerald-500/20 text-emerald-300 px-1 py-0.2 rounded border border-emerald-500/40">AI REC</span>
                       )}
                     </span>
                     <span className="text-[9px] font-mono text-emerald-400 font-bold">-{opt.delaySavings}m</span>
                   </div>
                   <p className="text-[9px] text-slate-400 mb-1.5 line-clamp-2">{opt.description}</p>
                   
                   {onApplyOption && (
                     <button
                       onClick={() => onApplyOption(opt.id)}
                       className={`w-full py-1 px-2 rounded text-[9px] font-mono font-bold flex items-center justify-center gap-1 transition-colors ${
                         opt.recommended
                           ? 'bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40'
                           : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                       }`}
                     >
                       Apply to Live Train <ArrowRight className="w-3 h-3" />
                     </button>
                   )}
                 </div>
               ))}
             </div>
           </div>
         )}

         {/* Metrics */}
         <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-950/50 p-2 rounded border border-slate-800 text-center">
               <div className="text-[9px] font-mono text-slate-500 uppercase mb-1">Delay Reduced</div>
               <div className="text-xl font-bold text-emerald-400 flex items-center justify-center gap-1">
                 <Zap className="w-4 h-4" /> {optimization.systemDelayReduction}m
               </div>
            </div>
            <div className="bg-slate-950/50 p-2 rounded border border-slate-800 text-center">
               <div className="text-[9px] font-mono text-slate-500 uppercase mb-1">Path Nodes</div>
               <div className="text-xl font-bold text-cyan-400">{optimization.routePath?.length || 0}</div>
            </div>
         </div>

         {/* XAI Reasoning */}
         <div>
            <h4 className="text-[9px] font-mono text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
              <ChevronRight className={`w-3 h-3 ${theme.text}`}/> XAI Reasoning
            </h4>
            <div className="space-y-1 pl-1">
               {optimization.xaiReasoning.map((reason, i) => (
                  <div key={i} className="flex gap-2 text-[9px] font-mono text-slate-300">
                     <span className={`${theme.text} shrink-0`}>►</span>
                     <span>{reason}</span>
                  </div>
               ))}
            </div>
         </div>

         {/* Constraint Satisfaction */}
         <div>
            <h4 className="text-[9px] font-mono text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
              <ChevronRight className="w-3 h-3 text-emerald-500"/> Constraint Satisfaction
            </h4>
            <div className="space-y-1.5">
               {optimization.constraints.map((c, i) => (
                  <div key={i}>
                     <div className="flex justify-between text-[9px] font-mono mb-0.5">
                        <span className="text-slate-300">{c.name}</span>
                        <span className={c.satisfaction > 95 ? 'text-emerald-400' : 'text-amber-400'}>{c.satisfaction}%</span>
                     </div>
                     <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{width: `${c.satisfaction}%`}} />
                     </div>
                  </div>
               ))}
            </div>
         </div>

         {/* Action Bar (For Railway Officials) */}
         <div className={`mt-3 pt-2.5 border-t ${theme.border}`}>
            {planStatus === 'pending' ? (
               <div className="flex flex-col gap-2">
                  <div className="text-[9px] font-mono text-slate-400 uppercase text-center mb-0.5">Official Plan Review Required</div>
                  <div className="flex gap-1.5">
                     <button onClick={() => onAction('approve')} className="flex-1 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/50 py-1.5 rounded flex justify-center items-center gap-1 text-xs font-bold transition-colors">
                        <CheckCircle2 className="w-3.5 h-3.5" /> APPROVE
                     </button>
                     <button onClick={() => onAction('modify')} className="flex-1 bg-amber-600/20 hover:bg-amber-600/40 text-amber-400 border border-amber-500/50 py-1.5 rounded flex justify-center items-center gap-1 text-xs font-bold transition-colors">
                        <Edit2 className="w-3.5 h-3.5" /> MODIFY
                     </button>
                     <button onClick={() => onAction('reject')} className="flex-1 bg-rose-600/20 hover:bg-rose-600/40 text-rose-400 border border-rose-500/50 py-1.5 rounded flex justify-center items-center gap-1 text-xs font-bold transition-colors">
                        <XCircle className="w-3.5 h-3.5" /> REJECT
                     </button>
                  </div>
               </div>
            ) : planStatus === 'approved' ? (
               <div className="bg-emerald-900/30 border border-emerald-500/30 p-2 rounded text-center flex flex-col items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest">Plan Approved & Locked</span>
               </div>
            ) : (
               <div className="bg-amber-900/30 border border-amber-500/30 p-2 rounded text-center flex flex-col items-center gap-1">
                  <Edit2 className="w-4 h-4 text-amber-400" />
                  <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest">Manual Modification Active</span>
               </div>
            )}
         </div>

      </div>
    </div>
  );
}
