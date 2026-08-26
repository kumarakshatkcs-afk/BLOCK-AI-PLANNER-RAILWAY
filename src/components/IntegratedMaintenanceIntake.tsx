import React, { useState } from 'react';
import { 
  Filter, Plus, AlertTriangle, Clock, Wrench, Radio, Zap, 
  CheckCircle2, ArrowRight, ShieldAlert, Sparkles, Layers, RefreshCw
} from 'lucide-react';
import { MaintenanceRequest, DepartmentType } from '../types';

interface Props {
  requests: MaintenanceRequest[];
  selectedRequest: MaintenanceRequest | null;
  onSelectRequest: (req: MaintenanceRequest) => void;
  onAddRequest?: (req: Partial<MaintenanceRequest>) => void;
  onNavigateToPriority: (req: MaintenanceRequest) => void;
  onNavigateToGantt: () => void;
}

export const IntegratedMaintenanceIntake: React.FC<Props> = ({
  requests = [],
  selectedRequest,
  onSelectRequest,
  onAddRequest,
  onNavigateToPriority,
  onNavigateToGantt
}) => {
  const safeRequests = Array.isArray(requests) ? requests : [];
  const [filter, setFilter] = useState<'All' | DepartmentType | 'Critical' | 'Overdue'>('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newDept, setNewDept] = useState<DepartmentType>('Engineering');
  const [newAsset, setNewAsset] = useState('Track-31');
  const [newProblem, setNewProblem] = useState('Rail joint weld defect');
  const [newSeverity, setNewSeverity] = useState<'Critical' | 'High' | 'Medium'>('Critical');
  const [newDuration, setNewDuration] = useState('2');

  const filteredRequests = safeRequests.filter(req => {
    if (filter === 'All') return true;
    if (filter === 'Critical') return req.severity === 'Critical';
    if (filter === 'Overdue') return req.isOverdue;
    return req.department === filter;
  });

  const getDeptBadge = (dept: DepartmentType) => {
    switch (dept) {
      case 'Engineering':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
            <Wrench className="w-3 h-3" />
            Engineering
          </span>
        );
      case 'S&T':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <Radio className="w-3 h-3" />
            S&T
          </span>
        );
      case 'Traction':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Zap className="w-3 h-3" />
            Traction
          </span>
        );
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'Critical':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-red-400">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            🔴 Critical
          </span>
        );
      case 'High':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            🟠 High
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400">
            <span className="w-2 h-2 rounded-full bg-slate-500" />
            🟡 Medium
          </span>
        );
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onAddRequest) {
      onAddRequest({
        department: newDept,
        asset: newAsset,
        problem: newProblem,
        severity: newSeverity,
        durationHours: Number(newDuration) || 2,
        durationStr: `${newDuration}h`
      });
    }
    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                Pillar 1: 3-Department Intake
              </span>
              <span className="text-xs text-slate-400">Indian Railways Joint Block Portal</span>
            </div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-400" />
              Unified Multi-Department Maintenance Intake
            </h2>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl">
              Integrates civil engineering track maintenance, signalling & telecom (S&T), and overhead electrical traction (OHE) into a single consolidated register to eliminate fragmented departmental silos.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="btn-add-defect"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Log Asset Defect
            </button>
            <button
              id="btn-goto-block-planner"
              onClick={onNavigateToGantt}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition shadow-sm cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              Auto-Bundle Blocks →
            </button>
          </div>
        </div>

        {/* 3 Department Stat Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-800/80">
          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
            <div className="text-xs text-slate-400">Total Demands</div>
            <div className="text-lg font-bold text-white mt-0.5">{requests.length} Assets</div>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-lg border border-blue-500/20">
            <div className="text-xs text-blue-400 flex items-center gap-1">
              <Wrench className="w-3 h-3" /> Civil Engineering
            </div>
            <div className="text-lg font-bold text-blue-200 mt-0.5">
              {requests.filter(r => r.department === 'Engineering').length} Demands
            </div>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-lg border border-emerald-500/20">
            <div className="text-xs text-emerald-400 flex items-center gap-1">
              <Radio className="w-3 h-3" /> Signalling & Telecom
            </div>
            <div className="text-lg font-bold text-emerald-200 mt-0.5">
              {requests.filter(r => r.department === 'S&T').length} Demands
            </div>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-lg border border-amber-500/20">
            <div className="text-xs text-amber-400 flex items-center gap-1">
              <Zap className="w-3 h-3" /> Electrical Traction (OHE)
            </div>
            <div className="text-lg font-bold text-amber-200 mt-0.5">
              {requests.filter(r => r.department === 'Traction').length} Demands
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/50 p-2 rounded-xl border border-slate-800">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filters:
          </span>
          {(['All', 'Engineering', 'S&T', 'Traction', 'Critical', 'Overdue'] as const).map(tab => {
            const isActive = filter === tab;
            return (
              <button
                key={tab}
                id={`filter-${tab.toLowerCase()}`}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {tab === 'All' ? 'All (Unified)' : tab}
              </button>
            );
          })}
        </div>

        <div className="text-xs text-slate-400 px-2">
          Showing <span className="font-bold text-white">{filteredRequests.length}</span> of {requests.length} maintenance demands
        </div>
      </div>

      {/* Primary 3-Department Intake Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-200">
            <thead className="bg-slate-950/80 text-xs uppercase font-bold tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">ID</th>
                <th className="py-3.5 px-4">Department</th>
                <th className="py-3.5 px-4">Asset</th>
                <th className="py-3.5 px-4">Problem / Defect</th>
                <th className="py-3.5 px-4">Severity</th>
                <th className="py-3.5 px-4">Duration</th>
                <th className="py-3.5 px-4">AI Priority</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredRequests.map(req => {
                const isSelected = selectedRequest?.id === req.id;
                return (
                  <tr 
                    key={req.id}
                    id={`row-${req.id}`}
                    onClick={() => onSelectRequest(req)}
                    className={`hover:bg-slate-800/50 transition cursor-pointer ${
                      isSelected ? 'bg-blue-950/40 border-l-4 border-l-blue-500' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-400">
                      {req.id}
                    </td>
                    <td className="py-3.5 px-4">
                      {getDeptBadge(req.department)}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-white">
                      {req.asset}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 max-w-xs truncate">
                      {req.problem}
                      {req.isOverdue && (
                        <span className="ml-2 text-[10px] uppercase font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                          Overdue
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {getSeverityBadge(req.severity)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 font-mono">
                      {req.durationStr}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${
                          req.priorityScore >= 85 
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                            : req.priorityScore >= 75
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-slate-700 text-slate-300'
                        }`}>
                          {req.priorityScore}
                        </div>
                        <div className="w-16 bg-slate-800 rounded-full h-1.5 hidden sm:block">
                          <div 
                            className={`h-1.5 rounded-full ${
                              req.priorityScore >= 85 ? 'bg-red-500' : req.priorityScore >= 75 ? 'bg-amber-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${req.priorityScore}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        id={`btn-view-priority-${req.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigateToPriority(req);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-blue-600 text-xs font-medium text-slate-200 hover:text-white transition cursor-pointer"
                      >
                        Inspect AI Score <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Asset Quick Summary Card */}
      {selectedRequest && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-blue-400">{selectedRequest.id} Selected</span>
                <span className="text-xs text-slate-400">• {selectedRequest.corridorName}</span>
              </div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                {selectedRequest.asset}: {selectedRequest.problem}
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                {selectedRequest.explainWhy}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                id="btn-inspect-ai-rationale"
                onClick={() => onNavigateToPriority(selectedRequest)}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                View AI Priority Breakdown ({selectedRequest.priorityScore}/100)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Defect Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-400" />
              Log New Asset Maintenance Defect
            </h3>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Department</label>
                <select
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value as DepartmentType)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Engineering">Civil Engineering (Track/P-Way)</option>
                  <option value="S&T">Signalling & Telecommunication (S&T)</option>
                  <option value="Traction">Traction (OHE / Electrical)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Asset Tag / Name</label>
                <input
                  type="text"
                  value={newAsset}
                  onChange={(e) => setNewAsset(e.target.value)}
                  placeholder="e.g. Track-31, Signal-14, OHE-22"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Defect Description</label>
                <input
                  type="text"
                  value={newProblem}
                  onChange={(e) => setNewProblem(e.target.value)}
                  placeholder="Describe track, signal, or OHE fault"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Severity</label>
                  <select
                    value={newSeverity}
                    onChange={(e) => setNewSeverity(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Critical">🔴 Critical</option>
                    <option value="High">🟠 High</option>
                    <option value="Medium">🟡 Medium</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Est. Duration (Hours)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="8"
                    value={newDuration}
                    onChange={(e) => setNewDuration(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-sm"
                >
                  Calculate AI Priority & Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
