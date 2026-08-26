import React, { useState } from 'react';
import { 
  ShieldCheck, CheckCircle2, AlertTriangle, XCircle, Edit3, 
  FileText, Lock, Sparkles, Printer, UserCheck, ArrowRight, RotateCcw,
  Wrench, Radio, Zap
} from 'lucide-react';
import { BlockApprovalState, DepartmentType } from '../types';

interface Props {
  initialWindow?: string;
  onNavigateToIntake: () => void;
  onNavigateToGantt: () => void;
}

export const HumanApprovalView: React.FC<Props> = ({
  initialWindow = "12:30 – 14:30",
  onNavigateToIntake,
  onNavigateToGantt
}) => {
  const [selectedWindow, setSelectedWindow] = useState<string>(initialWindow);
  const [approvalStatus, setApprovalStatus] = useState<'PENDING' | 'APPROVED' | 'MODIFIED' | 'REJECTED'>('PENDING');
  const [officerName, setOfficerName] = useState<string>('Rajesh Kumar, IRTS (Sr. DOM / SECR)');
  const [isEditingWindow, setIsEditingWindow] = useState(false);
  const [customWindow, setCustomWindow] = useState(initialWindow);
  const [officialMemoNumber, setOfficialMemoNumber] = useState<string>('IR/DOM/BL-SANCTION/2026-942');
  const [approvalTimestamp, setApprovalTimestamp] = useState<string>('');

  const handleApprove = () => {
    setApprovalStatus('APPROVED');
    setApprovalTimestamp(new Date().toLocaleTimeString());
  };

  const handleModifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSelectedWindow(customWindow);
    setIsEditingWindow(false);
    setApprovalStatus('MODIFIED');
    setApprovalTimestamp(new Date().toLocaleTimeString());
  };

  const handleReject = () => {
    setApprovalStatus('REJECTED');
  };

  const handleResetApproval = () => {
    setApprovalStatus('PENDING');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold tracking-wider uppercase px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Pillar 7: Human-in-the-Loop Official Approval ⭐
              </span>
              <span className="text-xs text-slate-400">Final Sanction Authority</span>
            </div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-400" />
              “The AI Recommends. Authorized Railway Personnel Decide.”
            </h2>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl">
              Strict governance compliance: Indian Railways operating rules mandate that AI provides multi-objective optimization, while the Senior Divisional Operations Manager (Sr. DOM) maintains ultimate command.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="btn-back-to-gantt"
              onClick={onNavigateToGantt}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition border border-slate-700 cursor-pointer"
            >
              ← Back to Timeline
            </button>
            <button
              id="btn-back-to-intake"
              onClick={onNavigateToIntake}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition cursor-pointer"
            >
              View Intake Register
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Exact AI Recommendation Card (Matching prompt layout) */}
        <div className="lg:col-span-6 bg-slate-900 border-2 border-emerald-500/40 rounded-xl p-6 shadow-2xl space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                🤖 AI RECOMMENDATION
              </span>
              <span className="text-xs text-slate-400 font-mono">Status: Awaiting Sanction</span>
            </div>
            <h3 className="text-lg font-bold text-white">
              Joint Multi-Department Shadow Block
            </h3>
          </div>

          {/* Structured Details Box */}
          <div className="bg-slate-950/80 p-5 rounded-xl border border-slate-800 space-y-3 font-mono">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-slate-400 text-xs">Block Window:</span>
              <span className="text-xl font-black text-white font-mono">
                {selectedWindow}
              </span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
              <span className="text-slate-400 text-xs font-sans">Departments:</span>
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1">
                <span className="text-blue-400">Engineering</span> + <span className="text-emerald-400">S&T</span> + <span className="text-amber-400">Traction</span>
              </span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
              <span className="text-slate-400 text-xs font-sans">Train Conflicts:</span>
              <span className="text-xs font-bold text-emerald-400">
                0 (Zero Delayed Express Trains)
              </span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
              <span className="text-slate-400 text-xs font-sans">Safety Constraints:</span>
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                ✓ Passed (100% Red Signal Route Lock)
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-xs font-sans">Block Utilization:</span>
              <span className="text-xs font-bold text-white">
                94% (Near-Zero Idle Corridor Time)
              </span>
            </div>
          </div>

          {/* Action Buttons (APPROVE, MODIFY, REJECT) matching prompt */}
          {approvalStatus === 'PENDING' ? (
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-3 gap-3">
                {/* APPROVE */}
                <button
                  id="btn-approve-block"
                  onClick={handleApprove}
                  className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-black transition shadow-lg shadow-emerald-950/60 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  APPROVE
                </button>

                {/* MODIFY */}
                <button
                  id="btn-modify-block"
                  onClick={() => setIsEditingWindow(true)}
                  className="py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-black transition shadow-lg shadow-amber-950/60 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-4 h-4" />
                  MODIFY
                </button>

                {/* REJECT */}
                <button
                  id="btn-reject-block"
                  onClick={handleReject}
                  className="py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-black transition shadow-lg shadow-rose-950/60 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                  REJECT
                </button>
              </div>

              <div className="text-[11px] text-center text-slate-500 italic">
                *Approving immediately generates an authorized Block Sanction Memo and updates COA (Control Office Application).
              </div>
            </div>
          ) : (
            <div className="pt-2">
              <button
                id="btn-reset-approval-state"
                onClick={handleResetApproval}
                className="w-full py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Change Decision / Re-Evaluate
              </button>
            </div>
          )}

          {/* Modify Window Modal / Dialog */}
          {isEditingWindow && (
            <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/40 space-y-3">
              <div className="text-xs font-bold text-amber-400">Modify Sanctioned Time Window</div>
              <form onSubmit={handleModifySubmit} className="space-y-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Adjust Start & End Time:</label>
                  <input
                    type="text"
                    value={customWindow}
                    onChange={(e) => setCustomWindow(e.target.value)}
                    placeholder="e.g. 13:00 – 14:30"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                    required
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingWindow(false)}
                    className="px-3 py-1.5 rounded bg-slate-800 text-xs text-slate-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded bg-amber-600 text-xs font-bold text-white"
                  >
                    Save & Sanction Modified
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Right Column: Official Railway Sanction Certificate / Audit Trail */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" />
              <h3 className="text-base font-bold text-white">
                Official Block Sanction Memo Preview
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-500">COA Gateway Sync</span>
          </div>

          {/* Official IR Memo Template */}
          <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 font-serif text-slate-300 text-xs space-y-4 shadow-inner">
            <div className="text-center pb-3 border-b border-slate-800 space-y-0.5">
              <div className="font-bold text-sm tracking-wider text-white uppercase font-sans">
                INDIAN RAILWAYS / दक्षिण पूर्व मध्य रेलवे
              </div>
              <div className="text-[11px] text-slate-400 font-sans">
                Office of the Senior Divisional Operations Manager
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                MEMO REF: {officialMemoNumber}
              </div>
            </div>

            <div className="space-y-2 text-slate-300 leading-relaxed font-sans">
              <div className="flex justify-between text-[11px] font-mono text-slate-400">
                <span>DATE: 2026-08-26</span>
                <span>STATUS: {approvalStatus}</span>
              </div>
              <p>
                <strong>SANCTION GRANTED TO:</strong> Joint Block Application for Civil Engineering (Track-24 rail repair), S&T (Signal-08 Point 104B test), and Electrical Traction (OHE-17 wire adjustment).
              </p>
              <p>
                <strong>SANCTIONED DURATION:</strong> <span className="font-bold text-white font-mono">{selectedWindow}</span> on Section A–B Up Main Line.
              </p>
              <p>
                <strong>SAFETY CONDITIONS:</strong> Failsafe Route Relay Interlocking engaged in Stop/Red aspect. Traction Power Controller (TPC) authorized to de-energize OHE section. Caution order of 30 km/h active until joint completion memo.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between font-sans">
              <div>
                <div className="text-[10px] text-slate-500">Sanctioning Officer:</div>
                <div className="text-xs font-bold text-white">{officerName}</div>
                <div className="text-[9px] text-slate-400 font-mono">Cryptographic Key: 9F2A-88D1-C993</div>
              </div>

              <div className="text-right">
                {approvalStatus === 'APPROVED' ? (
                  <div className="px-3 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold font-mono text-xs flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    SANCTIONED & LOCKED
                  </div>
                ) : approvalStatus === 'MODIFIED' ? (
                  <div className="px-3 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold font-mono text-xs flex items-center gap-1">
                    <Edit3 className="w-3 h-3" />
                    SANCTIONED (MODIFIED)
                  </div>
                ) : approvalStatus === 'REJECTED' ? (
                  <div className="px-3 py-1 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold font-mono text-xs flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    SANCTION REJECTED
                  </div>
                ) : (
                  <div className="px-3 py-1 rounded-lg bg-slate-800 text-slate-400 font-mono text-xs">
                    PENDING APPROVAL
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Broadcast Confirmation */}
          {approvalStatus === 'APPROVED' && (
            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 space-y-2 animate-fadeIn">
              <div className="text-xs font-bold text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Automated System Broadcast Executed
              </div>
              <ul className="text-xs text-slate-300 space-y-1 pl-2">
                <li>• Section Controller (SCR) console locked for window {selectedWindow}.</li>
                <li>• P-Way Gang 04, S&T Unit Alpha, and Tower Wagon Unit 02 alerted via SMS/App.</li>
                <li>• CRIS / NTES dynamic passenger advisory dispatched.</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
