import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, AlertCircle, Play, RotateCcw, 
  Terminal, ShieldAlert, Combine, Network, CheckCircle2,
  Satellite, Map as MapIcon, OctagonAlert, Radio, RefreshCw,
  Train as TrainIcon, Wifi, Layers, Gauge, MapPin, Sparkles,
  Volume2, Zap, AlertTriangle, Compass, Calendar, UserCheck
} from 'lucide-react';
import { 
  DashboardData, OptimizationResult, Train, DelayIdentificationReport,
  MaintenanceRequest, GanttBlockItem, CorridorAssetSummary
} from './types';
import { 
  INITIAL_MAINTENANCE_REQUESTS, 
  INITIAL_GANTT_ITEMS, 
  INITIAL_CORRIDOR_SUMMARIES 
} from './data/blockPlannerData';
import { formatTime } from './utils';
import { NetworkMap } from './components/NetworkMap';
import { AnalyticsPanel } from './components/AnalyticsPanel';
import { TrackHeatmap } from './components/TrackHeatmap';
import { OfficialPlanReviewModal } from './components/OfficialPlanReviewModal';
import { DelayResolutionModal } from './components/DelayResolutionModal';
import { AIVoiceAgentPanel } from './components/AIVoiceAgentPanel';
import { WhereIsMyTrainModal } from './components/WhereIsMyTrainModal';

// Block Planning Suite Components
import { UnifiedWorkflowNav, WorkflowStepId } from './components/UnifiedWorkflowNav';
import { IntegratedMaintenanceIntake } from './components/IntegratedMaintenanceIntake';
import { AIPriorityScoringView } from './components/AIPriorityScoringView';
import { MainAIBlockPlannerGantt } from './components/MainAIBlockPlannerGantt';
import { ConflictDetectionView } from './components/ConflictDetectionView';
import { CorridorMapSchematic } from './components/CorridorMapSchematic';
import { WhatIfSimulationView } from './components/WhatIfSimulationView';
import { HumanApprovalView } from './components/HumanApprovalView';

export default function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [optimization, setOptimization] = useState<OptimizationResult | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [logs, setLogs] = useState<{time: string, msg: string, type: 'info'|'warn'|'error'|'emergency'}[]>([]);
  
  // Navigation & Suite Modes
  const [mainViewMode, setMainViewMode] = useState<'block_suite' | 'network_map' | 'analytics' | 'telemetry'>('block_suite');
  const [activeWorkflowStep, setActiveWorkflowStep] = useState<WorkflowStepId>('gantt');

  // Block Planning Suite Data State
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>(INITIAL_MAINTENANCE_REQUESTS);
  const [ganttItems, setGanttItems] = useState<GanttBlockItem[]>(INITIAL_GANTT_ITEMS);
  const [corridors, setCorridors] = useState<CorridorAssetSummary[]>(INITIAL_CORRIDOR_SUMMARIES);
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(INITIAL_MAINTENANCE_REQUESTS[0] || null);
  const [sanctionedWindow, setSanctionedWindow] = useState<string>("10:00 – 12:00");

  // Track the state of the official's decision on the AI Plan
  const [planStatus, setPlanStatus] = useState<'pending' | 'approved' | 'modified'>('pending');
  const [mapMode, setMapMode] = useState<'schematic' | 'satellite'>('schematic');
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isDelayModalOpen, setIsDelayModalOpen] = useState(false);
  const [isWhereIsMyTrainOpen, setIsWhereIsMyTrainOpen] = useState(false);
  const [whereIsMyTrainInitialTrain, setWhereIsMyTrainInitialTrain] = useState<string>('20825');
  const [isRefreshingFeed, setIsRefreshingFeed] = useState(false);
  const [mapTransform, setMapTransform] = useState<{x: number, y: number, k: number} | null>(null);

  // Delay Identification & Voice Agent state
  const [delayReport, setDelayReport] = useState<DelayIdentificationReport | null>(null);
  const [isVoicePanelOpen, setIsVoicePanelOpen] = useState(false);
  const [isSolvingDelays, setIsSolvingDelays] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [externalSpeechTrigger, setExternalSpeechTrigger] = useState<{ text: string; timestamp: number } | null>(null);

  const addLog = (msg: string, type: 'info'|'warn'|'error'|'emergency' = 'info') => {
    setLogs(prev => [{ time: new Date().toLocaleTimeString(), msg, type }, ...prev].slice(0, 15));
  };

  const fetchBlockPlannerData = async () => {
    try {
      const [reqsRes, ganttRes, corrRes] = await Promise.all([
        fetch('/api/block-planner/requests'),
        fetch('/api/block-planner/gantt'),
        fetch('/api/block-planner/corridors')
      ]);

      if (reqsRes.ok) {
        const reqsData = await reqsRes.json();
        const reqsList: MaintenanceRequest[] = Array.isArray(reqsData) 
          ? reqsData 
          : (reqsData.requests && Array.isArray(reqsData.requests) ? reqsData.requests : []);
        if (reqsList.length > 0) {
          setMaintenanceRequests(reqsList);
          setSelectedRequest(prev => prev || reqsList[0]);
        }
      }
      if (ganttRes.ok) {
        const gData = await ganttRes.json();
        const gList: GanttBlockItem[] = Array.isArray(gData)
          ? gData
          : (gData.ganttItems && Array.isArray(gData.ganttItems) ? gData.ganttItems : []);
        if (gList.length > 0) {
          setGanttItems(gList);
        }
      }
      if (corrRes.ok) {
        const corrData = await corrRes.json();
        const corrList: CorridorAssetSummary[] = Array.isArray(corrData)
          ? corrData
          : (corrData.corridors && Array.isArray(corrData.corridors) ? corrData.corridors : []);
        if (corrList.length > 0) {
          setCorridors(corrList);
        }
      }
    } catch (e) {
      console.error("Error fetching block planner data", e);
    }
  };

  const fetchDelayReport = async () => {
    try {
      const res = await fetch('/api/delays/report');
      if (res.ok) {
        const json: DelayIdentificationReport = await res.json();
        setDelayReport(json);
      }
    } catch (e) {
      // silent
    }
  };

  const fetchData = async () => {
    try {
      const res = await fetch('/api/data');
      const json = await res.json();
      
      if (data && json.activeAlerts > data.activeAlerts && !isOptimizing) {
         addLog("⚠️ DISRUPTION DETECTED: Auto-triggering AI Emergency Re-Planner...", "emergency");
         runOptimization();
      }
      
      setData(json);
    } catch (err) {
      // Server might be restarting
    }
  };

  useEffect(() => {
    fetchData();
    fetchDelayReport();
    fetchBlockPlannerData();

    const interval = setInterval(() => {
      fetchData();
      fetchDelayReport();
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const handleAddDefect = async (newDefect: Partial<MaintenanceRequest>) => {
    try {
      const res = await fetch('/api/block-planner/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDefect)
      });
      if (res.ok) {
        const created = await res.json();
        addLog(`INTAKE: Logged new defect for ${created.asset} (${created.department}). AI Score: ${created.priorityScore}/100`, 'info');
        await fetchBlockPlannerData();
        setSelectedRequest(created);
        setActiveWorkflowStep('priority');
      }
    } catch (e) {
      addLog("Failed to submit defect.", 'error');
    }
  };

  const triggerVoiceAnnouncement = (text: string) => {
    setIsSpeaking(true);
    setExternalSpeechTrigger({ text, timestamp: Date.now() });
    setTimeout(() => setIsSpeaking(false), 5000);
  };

  // Identify all delayed trains and solve problems then voice agent announcement
  const handleSolveAllDelays = async () => {
    setIsSolvingDelays(true);
    addLog("🚨 AI DELAY CONTROLLER: Identifying all delayed trains and computing optimal multi-objective routing...", "warn");
    try {
      const res = await fetch('/api/delays/solve-all', { method: 'POST' });
      if (res.ok) {
        const result = await res.json();
        setDelayReport(result.afterReport || null);
        addLog(`✅ AI RESOLUTION COMPLETE: ${result.resolvedSummary}`, "info");
        
        // Voice agent speaks the official announcement
        triggerVoiceAnnouncement(result.voiceAnnouncement);
        
        // Refresh simulation data
        await fetchData();
      }
    } catch (err) {
      addLog("Failed to execute automatic delay resolution.", "error");
    } finally {
      setIsSolvingDelays(false);
    }
  };

  const handleSolveSingleTrain = async (trainNumber: string) => {
    try {
      const res = await fetch('/api/delays/solve-train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trainNumber })
      });
      if (res.ok) {
        const result = await res.json();
        addLog(`AI RESOLUTION: Train ${trainNumber} delay cleared to 0m. Green aspect signal locked.`, 'info');
        triggerVoiceAnnouncement(result.voiceAnnouncement);
        await fetchData();
        await fetchDelayReport();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const refreshLiveFeed = async () => {
    setIsRefreshingFeed(true);
    try {
      const res = await fetch('/api/refresh-live-feed', { method: 'POST' });
      if (res.ok) {
        addLog("LIVE DATA LAYER: CRIS/NTES authentic telemetry feed refreshed.", 'info');
        await fetchData();
        await fetchDelayReport();
        await fetchBlockPlannerData();
      }
    } catch (e) {
      addLog("LIVE FEED: Refresh request encountered network delay.", 'warn');
    } finally {
      setIsRefreshingFeed(false);
    }
  };

  const resetSimulation = async () => {
    try {
      const res = await fetch('/api/reset', { method: 'POST' });
      const json = await res.json();
      setData(json.db);
      setOptimization(null);
      setPlanStatus('pending');
      await fetchDelayReport();
      await fetchBlockPlannerData();
      addLog("Digital Twin simulation reset with authentic Indian Railways timetable.", 'warn');
    } catch (err) {
      console.error("Failed to reset", err);
    }
  };

  const runOptimization = async (overrideSegmentId?: string, sourceId?: string, targetId?: string) => {
    if (!data && !overrideSegmentId && !sourceId) return;
    
    setIsOptimizing(true);
    if (sourceId && targetId) {
        addLog(`Initiating Pathfinding AI from ${sourceId} to ${targetId}...`, 'warn');
    } else {
        addLog(`Initiating Level 3 Hybrid AI block planning for live Indian Railways traffic...`, 'warn');
    }
    
    try {
      const res = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segmentId: overrideSegmentId, sourceId, targetId })
      });
      const result = await res.json();
      setOptimization(result);
      setPlanStatus('pending');
      setIsReviewModalOpen(true);
      addLog(`Optimization converged. Confidence: ${result.confidenceScore}%. Awaiting official review.`, 'info');
    } catch (err) {
      addLog("Optimization engine failed to respond.", 'error');
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleApplyOption = async (optionId: string, customTrainId?: string) => {
    try {
      const res = await fetch('/api/plan/apply-option', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optionId, customTrainId })
      });
      const result = await res.json();
      if (result.success) {
        setPlanStatus('approved');
        addLog(`OFFICIAL ACTION APPLIED: Option "${result.appliedOption.title}" executed on live train ${result.appliedTrain?.trainNumber || ''}! Speed set to ${result.trainEffect.speed} km/h.`, 'info');
        fetchData();
        fetchDelayReport();
      }
    } catch (err) {
      console.error("Failed to apply option", err);
    }
  };

  const handleOptimizeRoute = (sourceId: string, targetId: string) => {
    runOptimization(undefined, sourceId, targetId);
  };

  const injectDisruption = async () => {
    try {
      const res = await fetch('/api/inject-disruption', { method: 'POST' });
      if(res.ok) {
        const result = await res.json();
        setOptimization(null);
        setPlanStatus('pending');
        addLog(`CRITICAL: Infrastructure failure detected on segment ${result.segment.name}. Maintenance required.`, 'error');
        fetchData();
        fetchDelayReport();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePlanAction = (action: 'approve' | 'reject' | 'modify') => {
     if (action === 'approve') {
       setPlanStatus('approved');
       addLog('COMMAND: AI Route Plan APPROVED by Division Control. Locking signals.', 'info');
     } else if (action === 'reject') {
       setOptimization(null);
       setPlanStatus('pending');
       addLog('COMMAND: AI Route Plan REJECTED by Division Control. Path cleared.', 'warn');
     } else if (action === 'modify') {
       setPlanStatus('modified');
       addLog('COMMAND: AI Route Plan flagged for MANUAL MODIFICATION in Sandbox.', 'warn');
     }
  };

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-cyan-400">
        <div className="flex flex-col items-center gap-4">
          <Network className="w-12 h-12 animate-pulse" />
          <span className="font-mono text-sm tracking-widest uppercase font-bold">BOOTING IR-ABPAS AI BLOCK PLANNER ENGINE...</span>
        </div>
      </div>
    );
  }

  const liveTrains = data.trains || [];
  const delayedTrainCount = delayReport?.totalDelayedTrains || liveTrains.filter(t => (t.delayMinutes || 0) > 0 || (t.predictedDelay || 0) > 0).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans flex flex-col overflow-hidden">
      
      {/* Top Command Header Bar */}
      <header className="h-16 border-b border-slate-800/80 bg-slate-900/95 backdrop-blur-md flex flex-col justify-center px-4 sm:px-6 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="flex items-center gap-2.5 text-white font-black tracking-wider shrink-0 text-base sm:text-lg">
              <div className="p-1.5 rounded-lg bg-blue-600 text-white shadow-md shadow-blue-900/50">
                <Combine className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="leading-tight text-white font-mono font-black text-sm sm:text-base">
                  IR-ABPAS
                </span>
                <span className="text-[10px] text-blue-400 font-sans font-bold tracking-widest uppercase">
                  AI Block Planner Suite
                </span>
              </div>
            </div>
            
            <div className="h-7 w-px bg-slate-800 hidden md:block"></div>
            
            {/* Suite / Digital Twin View Mode Switcher */}
            <div className="flex items-center bg-slate-950/90 p-1 rounded-xl border border-slate-800 text-xs font-bold">
              <button
                id="btn-switch-suite"
                onClick={() => setMainViewMode('block_suite')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  mainViewMode === 'block_suite' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Block Planning Suite (8-Screen)</span>
              </button>
              <button
                id="btn-switch-network"
                onClick={() => setMainViewMode('network_map')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  mainViewMode === 'network_map' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <MapIcon className="w-3.5 h-3.5" />
                <span>Live Digital Twin Map</span>
              </button>
            </div>

            {/* Live Data Feed Badge */}
            <div className="hidden xl:flex items-center gap-2 bg-slate-950/80 border border-slate-800 px-3 py-1 rounded-xl text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-slate-300 font-bold">CRIS / NTES LIVE</span>
              <span className="text-slate-500">•</span>
              <span className="text-cyan-400 font-bold">3 Depts Synchronized</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Actions */}
            <button
              onClick={() => {
                setWhereIsMyTrainInitialTrain(liveTrains[0]?.trainNumber || '20825');
                setIsWhereIsMyTrainOpen(true);
              }}
              className="hidden lg:flex px-3 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700 text-cyan-300 rounded-xl text-xs font-mono font-bold items-center gap-1.5 transition-all shadow-sm"
              title="Where Is My Train - Live GPS & Delay Tracking"
            >
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              <span>WHERE IS MY TRAIN</span>
            </button>

            <button 
              onClick={() => setIsVoicePanelOpen(true)}
              className="p-2 text-slate-300 hover:text-cyan-400 bg-slate-800/80 hover:bg-slate-800 rounded-xl border border-slate-700 transition"
              title="AI Voice Dispatch Agent"
            >
              <Volume2 className="w-4 h-4 text-cyan-400" />
            </button>

            <button onClick={resetSimulation} className="p-2 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-xl transition" title="Reset Simulation Data">
              <RotateCcw className="w-4 h-4" />
            </button>
            
            <button 
              onClick={() => {
                if (mainViewMode === 'block_suite') {
                  setActiveWorkflowStep('approval');
                } else {
                  setIsReviewModalOpen(true);
                }
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-lg flex items-center gap-1.5 cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>OFFICIAL SANCTION</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col bg-slate-950 overflow-hidden relative">
        {mainViewMode === 'block_suite' ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Step-by-Step 7-Stage Workflow Navigation Bar */}
            <UnifiedWorkflowNav 
              activeStep={activeWorkflowStep} 
              onSelectStep={(step) => setActiveWorkflowStep(step)} 
            />

            {/* Scrollable Stage Content View */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar bg-slate-950">
              <div className="max-w-7xl mx-auto pb-12">
                {/* STEP 1: Integrated 3-Department Intake Screen */}
                {activeWorkflowStep === 'intake' && (
                  <IntegratedMaintenanceIntake 
                    requests={maintenanceRequests}
                    selectedRequest={selectedRequest}
                    onSelectRequest={(req) => setSelectedRequest(req)}
                    onAddRequest={handleAddDefect}
                    onNavigateToPriority={(req) => {
                      setSelectedRequest(req);
                      setActiveWorkflowStep('priority');
                    }}
                    onNavigateToGantt={() => setActiveWorkflowStep('gantt')}
                  />
                )}

                {/* STEP 2: AI Priority Scoring View (89/100, Explain Why) */}
                {activeWorkflowStep === 'priority' && (
                  <AIPriorityScoringView 
                    requests={maintenanceRequests}
                    selectedRequest={selectedRequest}
                    onSelectRequest={(req) => setSelectedRequest(req)}
                    onNavigateToGantt={() => setActiveWorkflowStep('gantt')}
                  />
                )}

                {/* STEP 3: ⭐⭐⭐ Main AI Block Planner (Gantt/Timeline & Shadow Block) */}
                {activeWorkflowStep === 'gantt' && (
                  <MainAIBlockPlannerGantt 
                    ganttItems={ganttItems}
                    onNavigateToConflict={() => setActiveWorkflowStep('conflict')}
                    onNavigateToApproval={() => setActiveWorkflowStep('approval')}
                  />
                )}

                {/* STEP 4: Conflict Detection Screen (10:45 Train Clash & Alternatives) */}
                {activeWorkflowStep === 'conflict' && (
                  <ConflictDetectionView 
                    onNavigateToGantt={() => setActiveWorkflowStep('gantt')}
                    onNavigateToCorridor={() => setActiveWorkflowStep('corridor')}
                  />
                )}

                {/* STEP 5: Corridor Map Schematic (Trunk Line Station A–B–C–D) */}
                {activeWorkflowStep === 'corridor' && (
                  <CorridorMapSchematic 
                    corridors={corridors}
                    onNavigateToWhatIf={() => setActiveWorkflowStep('whatif')}
                    onNavigateToGantt={() => setActiveWorkflowStep('gantt')}
                  />
                )}

                {/* STEP 6: What-If Simulation View */}
                {activeWorkflowStep === 'whatif' && (
                  <WhatIfSimulationView 
                    onNavigateToApproval={(recWindow) => {
                      setSanctionedWindow(recWindow);
                      setActiveWorkflowStep('approval');
                    }}
                    onNavigateToGantt={() => setActiveWorkflowStep('gantt')}
                  />
                )}

                {/* STEP 7: Human-in-the-Loop Approval & Sanction Memo */}
                {activeWorkflowStep === 'approval' && (
                  <HumanApprovalView 
                    initialWindow={sanctionedWindow}
                    onNavigateToIntake={() => setActiveWorkflowStep('intake')}
                    onNavigateToGantt={() => setActiveWorkflowStep('gantt')}
                  />
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Live Digital Twin Map / Analytics / Telemetry View */
          <div className="flex-1 flex flex-col overflow-hidden relative">
            <div className="flex bg-slate-900 border-b border-slate-800/80 px-4 sm:px-6 h-12 items-center justify-between shrink-0 z-20 shadow-sm relative">
              <div className="flex items-center gap-2 sm:gap-6 h-full">
                <button 
                  onClick={() => setMainViewMode('network_map')} 
                  className={`px-2 sm:px-4 h-full text-xs sm:text-sm font-mono font-bold border-b-2 transition-colors flex items-center gap-2 ${mainViewMode === 'network_map' ? 'text-cyan-400 border-cyan-400' : 'text-slate-400 border-transparent hover:text-slate-200'}`}
                >
                  <MapIcon className="w-4 h-4" />
                  NETWORK DIGITAL TWIN
                </button>
                <button 
                  onClick={() => setMainViewMode('analytics')} 
                  className={`px-2 sm:px-4 h-full text-xs sm:text-sm font-mono font-bold border-b-2 transition-colors flex items-center gap-2 ${mainViewMode === 'analytics' ? 'text-cyan-400 border-cyan-400' : 'text-slate-400 border-transparent hover:text-slate-200'}`}
                >
                  <Activity className="w-4 h-4" />
                  ANALYTICS & PLAN
                </button>
                <button 
                  onClick={() => setMainViewMode('telemetry')} 
                  className={`px-2 sm:px-4 h-full text-xs sm:text-sm font-mono font-bold border-b-2 transition-colors flex items-center gap-2 ${mainViewMode === 'telemetry' ? 'text-cyan-400 border-cyan-400' : 'text-slate-400 border-transparent hover:text-slate-200'}`}
                >
                  <Radio className="w-4 h-4" />
                  LIVE TELEMETRY
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setMapMode(m => m === 'schematic' ? 'satellite' : 'schematic')} 
                  className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-lg text-xs flex items-center gap-1 font-mono"
                >
                  {mapMode === 'schematic' ? <Satellite className="w-3.5 h-3.5" /> : <MapIcon className="w-3.5 h-3.5" />}
                  <span>{mapMode === 'schematic' ? 'Satellite View' : 'Schematic'}</span>
                </button>
              </div>
            </div>

            <div className="flex-1 relative overflow-hidden">
              {mainViewMode === 'network_map' && (
                <div className="absolute inset-0">
                  <NetworkMap 
                    mapMode={mapMode}
                    divisions={data.divisions} 
                    stations={data.stations} 
                    segments={data.segments} 
                    trains={data.trains} 
                    onOptimizeRoute={handleOptimizeRoute}
                    aiRecommendedPath={optimization?.routePath}
                    planStatus={planStatus}
                    onOpenOfficialReview={() => setIsReviewModalOpen(true)}
                    activeIssueCount={optimization?.issue ? 1 : 0}
                    externalTransform={mapTransform}
                  />
                </div>
              )}

              {mainViewMode === 'analytics' && (
                <div className="absolute inset-0 overflow-y-auto p-4 sm:p-6 custom-scrollbar bg-slate-950">
                  <div className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden min-h-[600px] flex flex-col">
                      <AnalyticsPanel 
                        optimization={optimization} 
                        planStatus={planStatus} 
                        onAction={handlePlanAction} 
                        onOpenOfficialReviewModal={() => setIsReviewModalOpen(true)}
                        onApplyOption={handleApplyOption}
                      />
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden min-h-[600px] flex flex-col">
                      <TrackHeatmap segments={data.segments} weather={data.weather} />
                    </div>
                  </div>
                </div>
              )}

              {mainViewMode === 'telemetry' && (
                <div className="absolute inset-0 overflow-y-auto p-4 sm:p-6 custom-scrollbar bg-slate-950">
                  <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 h-full min-h-[600px]">
                    <div className="lg:col-span-2 flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl lg:h-[calc(100vh-180px)] min-h-[500px]">
                      <div className="p-4 border-b border-slate-800 bg-slate-950/80 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-3">
                          <TrainIcon className="w-5 h-5 text-cyan-400" />
                          <span className="text-sm font-mono text-slate-200 font-bold uppercase tracking-wider">
                            Live Indian Railways Telemetry ({liveTrains.length} Trains)
                          </span>
                        </div>
                      </div>

                      <div className="flex-1 overflow-auto custom-scrollbar p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 content-start">
                        {liveTrains.map(train => (
                          <div 
                            key={train.trainNumber || train.id} 
                            className="p-4 rounded-xl border bg-slate-950/70 border-slate-800 space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="px-2 py-1 bg-slate-900 border border-slate-700 text-cyan-300 font-mono text-sm font-bold rounded">
                                {train.trainNumber}
                              </span>
                              <span className="text-sm font-bold text-slate-100 truncate max-w-[180px]">
                                {train.trainName}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                              <span>Speed: {train.speed} km/h</span>
                              <span className={train.delayMinutes > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                                {train.delayMinutes > 0 ? `+${train.delayMinutes}m delay` : 'On Time'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl lg:h-[calc(100vh-180px)] min-h-[400px]">
                      <div className="p-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                          <Terminal className="w-5 h-5 text-cyan-400" />
                          <span className="text-sm font-mono text-slate-300 font-bold uppercase tracking-wider">Safety & Audit Log</span>
                        </div>
                      </div>
                      <div className="p-4 flex-1 overflow-y-auto font-mono text-xs space-y-2.5 custom-scrollbar">
                        {logs.map((log, i) => (
                          <div key={i} className={`flex gap-2 p-2 rounded-lg ${log.type === 'emergency' ? 'bg-rose-950/40 border border-rose-900/50' : 'hover:bg-slate-800/50'} transition-colors`}>
                            <span className="text-slate-500 shrink-0">[{log.time}]</span>
                            <span className={`leading-relaxed ${log.type === 'error' || log.type === 'emergency' ? 'text-rose-400' : log.type === 'warn' ? 'text-amber-400' : 'text-cyan-400'}`}>
                              {log.msg}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Railway AI Voice Dispatch Agent Floating Panel */}
      <AIVoiceAgentPanel 
        trains={data.trains} 
        stations={data.stations} 
        segments={data.segments} 
        isOpenExternal={isVoicePanelOpen}
        onToggleOpen={(open) => setIsVoicePanelOpen(open)}
        externalSpeechTrigger={externalSpeechTrigger}
        onOpenDelayCockpit={() => setIsDelayModalOpen(true)}
        onOpenWhereIsMyTrain={(trainNum) => {
          if (trainNum) setWhereIsMyTrainInitialTrain(trainNum);
          setIsWhereIsMyTrainOpen(true);
        }}
        onRefreshData={() => {
          fetchData();
          fetchDelayReport();
        }}
        onZoomTo={(x, y, scale) => {
          setMainViewMode('network_map');
          setMapTransform({x, y, k: scale});
        }}
      />

      {/* Where Is My Train Live GPS & AI Problem Solver Modal */}
      <WhereIsMyTrainModal
        isOpen={isWhereIsMyTrainOpen}
        onClose={() => setIsWhereIsMyTrainOpen(false)}
        trains={data.trains}
        initialTrainNumber={whereIsMyTrainInitialTrain}
        onSpeak={(text) => triggerVoiceAnnouncement(text)}
        isSpeaking={isSpeaking}
        onDataRefresh={() => {
          fetchData();
          fetchDelayReport();
        }}
      />

      {/* Delay Identification & Problem Solving Cockpit Modal */}
      <DelayResolutionModal
        isOpen={isDelayModalOpen}
        onClose={() => setIsDelayModalOpen(false)}
        report={delayReport}
        isLoading={isSolvingDelays}
        onSolveAll={handleSolveAllDelays}
        onSolveSingleTrain={handleSolveSingleTrain}
        onSpeak={(text) => triggerVoiceAnnouncement(text)}
        isSpeaking={isSpeaking}
      />

      {/* Official Plan Review & Issue Resolution Cockpit Modal */}
      <OfficialPlanReviewModal 
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        optimization={optimization}
        trains={data.trains}
        onApplyOption={handleApplyOption}
        currentPlanStatus={planStatus}
      />
    </div>
  );
}

