import React, { useState } from 'react';
import { 
  AlertTriangle, CheckCircle2, ShieldAlert, Zap, Volume2, 
  Play, Square, RefreshCw, X, Radio, ArrowRight, Activity, 
  Sparkles, Gauge, Train as TrainIcon, Clock, ChevronRight
} from 'lucide-react';
import { Train, DelayedTrainAnalysis, DelayIdentificationReport } from '../types';

interface DelayResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: DelayIdentificationReport | null;
  isLoading: boolean;
  onSolveAll: () => Promise<void>;
  onSolveSingleTrain: (trainNumber: string) => Promise<void>;
  onSpeak: (text: string, lang?: 'hi' | 'en') => void;
  isSpeaking: boolean;
}

export function DelayResolutionModal({
  isOpen,
  onClose,
  report,
  isLoading,
  onSolveAll,
  onSolveSingleTrain,
  onSpeak,
  isSpeaking
}: DelayResolutionModalProps) {
  const [selectedTrainNum, setSelectedTrainNum] = useState<string | null>(null);
  const [isSolving, setIsSolving] = useState(false);
  const [solvingSingle, setSolvingSingle] = useState<string | null>(null);
  const [language, setLanguage] = useState<'hi' | 'en'>('hi');

  if (!isOpen) return null;

  const isHindi = language === 'hi';
  const delayedTrains = report?.delayedTrains || [];
  const selectedTrain = delayedTrains.find(t => t.trainNumber === selectedTrainNum) || delayedTrains[0];

  const handleSolveAll = async () => {
    setIsSolving(true);
    try {
      await onSolveAll();
    } finally {
      setIsSolving(false);
    }
  };

  const handleSolveSingle = async (trainNumber: string) => {
    setSolvingSingle(trainNumber);
    try {
      await onSolveSingleTrain(trainNumber);
    } finally {
      setSolvingSingle(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-cyan-500/40 rounded-2xl w-full max-w-5xl max-h-[90vh] shadow-[0_0_50px_rgba(6,182,212,0.2)] flex flex-col overflow-hidden font-sans">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500/20 to-amber-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  {isHindi ? 'AI लेट ट्रेन पहचान एवं समाधान केंद्र' : 'AI DELAY IDENTIFICATION & RESOLUTION COCKPIT'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-950 text-rose-300 border border-rose-800">
                  {report?.totalDelayedTrains || 0} {isHindi ? 'लेट ट्रेनें' : 'DELAYED TRAINS'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                CRIS / NTES Telemetry • {isHindi ? 'कुल देरी' : 'Cumulative Delay'}: {report?.totalDelayMinutes || 0}m
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Switcher */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 font-mono text-xs">
              <button
                onClick={() => setLanguage('hi')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                  isHindi ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                हिन्दी
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                  !isHindi ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                EN
              </button>
            </div>

            <button
              onClick={() => {
                const script = isHindi
                  ? (report?.voiceDetailedScriptHindi || report?.voiceSummaryHindi || "सभी ट्रेनें समय पर चल रही हैं।")
                  : (report?.voiceDetailedScript || report?.voiceSummaryText || "No delayed trains detected.");
                onSpeak(script, language);
              }}
              className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
                isSpeaking 
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400 animate-pulse' 
                  : 'bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border-cyan-700/60'
              }`}
            >
              <Volume2 className="w-4 h-4" />
              {isSpeaking ? (isHindi ? 'आवाज़ बज रही है...' : 'VOICE SPEAKING...') : (isHindi ? '🔊 हिंदी में सुनें' : 'PLAY SUMMARY')}
            </button>
            <button 
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Hero Voice Agent Announcement Banner */}
        <div className="bg-gradient-to-r from-slate-950 via-cyan-950/30 to-slate-950 border-b border-slate-800/80 px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex gap-1 shrink-0">
              <span className="w-1 h-4 bg-cyan-400 rounded-full animate-[bounce_1s_infinite_100ms]"></span>
              <span className="w-1 h-5 bg-purple-400 rounded-full animate-[bounce_1s_infinite_200ms]"></span>
              <span className="w-1 h-3 bg-emerald-400 rounded-full animate-[bounce_1s_infinite_300ms]"></span>
            </div>
            <div className="text-xs font-mono text-slate-300 truncate">
              <span className="text-cyan-400 font-bold mr-2">{isHindi ? 'वॉइस एजेंट घोषणा:' : 'VOICE SCRIPT:'}</span>
              <span>{isHindi ? (report?.voiceSummaryHindi || "ट्रेनों की देरी की जांच जारी...") : (report?.voiceSummaryText || "Scanning network for headway delays...")}</span>
            </div>
          </div>

          <button
            onClick={handleSolveAll}
            disabled={isSolving || isLoading || (report?.totalDelayedTrains || 0) === 0}
            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-mono font-bold text-xs rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.4)] flex items-center gap-2 shrink-0 transition-all disabled:opacity-50"
          >
            {isSolving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-current" />}
            {isSolving ? (isHindi ? 'समस्या हल की जा रही है...' : 'RESOLVING DELAYS...') : (isHindi ? '⚡ सभी लेट ट्रेनों की समस्या हल करें' : 'SOLVE ALL DELAYS NOW')}
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-0">
          
          {/* Left Column: Delayed Trains Master List */}
          <div className="lg:col-span-5 border-r border-slate-800/80 bg-slate-950/50 flex flex-col overflow-hidden">
            <div className="p-3 border-b border-slate-800/60 flex items-center justify-between text-xs font-mono text-slate-400">
              <span>{isHindi ? 'पहचानी गई लेट ट्रेनें' : 'IDENTIFIED DELAYED TRAINS'} ({delayedTrains.length})</span>
              <span className="text-rose-400">{isHindi ? 'क्रम: अधिकतम देरी' : 'Sort: Highest Delay'}</span>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2.5">
              {delayedTrains.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-2" />
                  <span className="font-bold text-slate-300">{isHindi ? 'सभी ट्रेनें समय पर चल रही हैं' : 'All Trains Running On Time'}</span>
                  <span className="text-xs text-slate-500 mt-1">{isHindi ? 'दक्षिण पूर्व मध्य रेलवे मंडल में कोई देरी नहीं है।' : 'Zero active headway detention detected in SECR/SER corridors.'}</span>
                </div>
              ) : (
                delayedTrains.map(t => {
                  const isSelected = selectedTrain?.trainNumber === t.trainNumber;
                  const isVb = t.category === 'Vande Bharat';
                  const isRaj = t.category === 'Rajdhani' || t.category === 'Duronto';
                  const isFrt = t.category === 'Freight';

                  const badgeBg = isVb 
                    ? 'bg-sky-950 text-sky-300 border-sky-600'
                    : isRaj 
                    ? 'bg-rose-950 text-rose-300 border-rose-600'
                    : isFrt 
                    ? 'bg-amber-950 text-amber-300 border-amber-600'
                    : 'bg-purple-950 text-purple-300 border-purple-600';

                  return (
                    <div
                      key={t.trainNumber}
                      onClick={() => setSelectedTrainNum(t.trainNumber)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-slate-800/90 border-cyan-500 shadow-md ring-1 ring-cyan-500/50' 
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-700 text-cyan-300 font-mono font-bold text-xs">
                              {t.trainNumber}
                            </span>
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${badgeBg}`}>
                              {t.category}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-slate-100 mt-1 truncate max-w-[220px]">
                            {isHindi ? (t.trainNameHindi || t.trainName) : t.trainName}
                          </h4>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="px-2 py-0.5 rounded bg-rose-950/80 border border-rose-700/60 text-rose-400 font-mono font-bold text-xs">
                            +{t.delayMinutes}m
                          </span>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            {t.priorityLevel}
                          </div>
                        </div>
                      </div>

                      <div className="mt-2 text-[11px] font-mono text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
                        <span className="text-slate-400 truncate max-w-[200px]">{isHindi ? (t.locationHindi || t.location) : t.location}</span>
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          {isHindi ? `बचत ${t.delaySavings}m` : `Reclaim ${t.delaySavings}m`} <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Selected Train AI Diagnosis & Solution */}
          <div className="lg:col-span-7 bg-slate-900/70 p-5 flex flex-col justify-between overflow-y-auto custom-scrollbar">
            {selectedTrain ? (
              <div className="space-y-4">
                
                {/* Train Header Card */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded bg-cyan-950 text-cyan-300 font-mono font-bold text-sm border border-cyan-800">
                          {selectedTrain.trainNumber}
                        </span>
                        <span className="text-xs font-mono text-slate-400 uppercase">
                          {selectedTrain.category}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-white mt-1">
                        {isHindi ? (selectedTrain.trainNameHindi || selectedTrain.trainName) : selectedTrain.trainName}
                      </h3>
                      <p className="text-xs text-slate-400 font-mono mt-1">
                        {isHindi ? 'ब्लॉक सेक्शन:' : 'Block Section:'} <span className="text-cyan-300 font-semibold">{isHindi ? (selectedTrain.locationHindi || selectedTrain.location) : selectedTrain.location}</span>
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="text-rose-400 font-mono text-2xl font-bold">
                        +{selectedTrain.delayMinutes} <span className="text-xs text-slate-400 font-normal">{isHindi ? 'मिनट लेट' : 'MIN DELAY'}</span>
                      </div>
                      <span className="text-[10px] font-mono text-amber-400">
                        {isHindi ? 'सिग्नल होल्ड' : 'Signal & Block Hold'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Root Cause Card */}
                <div className="bg-rose-950/20 border border-rose-800/40 rounded-xl p-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-rose-400 font-mono text-xs font-bold uppercase">
                    <AlertTriangle className="w-4 h-4" /> {isHindi ? 'देरी का मुख्य कारण (Root Cause)' : 'Root Cause Diagnosis'}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    {isHindi ? (selectedTrain.causeHindi || selectedTrain.cause) : selectedTrain.cause}
                  </p>
                </div>

                {/* AI Solution Plan */}
                <div className="bg-emerald-950/20 border border-emerald-800/40 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-bold uppercase">
                      <Sparkles className="w-4 h-4" /> {isHindi ? 'AI प्रस्तावित समाधान' : 'Proposed AI Resolution'}
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-900/60 border border-emerald-600 text-emerald-300 font-mono text-[10px] font-bold">
                      100% RECOVERY (-{selectedTrain.delaySavings}m)
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-100">
                      {isHindi ? (selectedTrain.solutionTitleHindi || selectedTrain.solutionTitle) : selectedTrain.solutionTitle}
                    </h4>
                    <p className="text-xs text-slate-300 font-sans mt-1 leading-relaxed">
                      {isHindi ? (selectedTrain.solutionDetailsHindi || selectedTrain.solutionDetails) : selectedTrain.solutionDetails}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-emerald-900/30 text-xs font-mono">
                    <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                      <span className="text-slate-500 text-[10px] uppercase">{isHindi ? 'पुनर्प्राप्त गति' : 'Speed Target'}</span>
                      <div className="text-cyan-300 font-bold mt-0.5">{selectedTrain.restoredSpeed} km/h</div>
                    </div>
                    <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                      <span className="text-slate-500 text-[10px] uppercase">{isHindi ? 'सिग्नल स्थिति' : 'Interlocking State'}</span>
                      <div className="text-emerald-400 font-bold mt-0.5">Green Lock PF-1/2</div>
                    </div>
                  </div>
                </div>

                {/* Individual Action Controls */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => {
                      const msg = isHindi
                        ? `सावधान: ट्रेन नंबर ${selectedTrain.trainNumber} ${selectedTrain.trainNameHindi || selectedTrain.trainName}, ${selectedTrain.locationHindi || selectedTrain.location} के पास ${selectedTrain.delayMinutes} मिनट लेट है। समाधान: ${selectedTrain.solutionTitleHindi || selectedTrain.solutionTitle} लागू किया गया।`
                        : `Attention Control: For train ${selectedTrain.trainNumber} ${selectedTrain.trainName} delayed by ${selectedTrain.delayMinutes} minutes near ${selectedTrain.location}. Executing ${selectedTrain.solutionTitle}: ${selectedTrain.solutionDetails}. Speed restored to ${selectedTrain.restoredSpeed} kilometers per hour.`;
                      onSpeak(msg, language);
                    }}
                    className="flex-1 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-200 flex items-center justify-center gap-2 transition-colors"
                  >
                    <Volume2 className="w-4 h-4 text-cyan-400" />
                    {isHindi ? '🔊 हिंदी में घोषणा' : 'ANNOUNCE THIS TRAIN'}
                  </button>

                  <button
                    onClick={() => handleSolveSingle(selectedTrain.trainNumber)}
                    disabled={solvingSingle === selectedTrain.trainNumber}
                    className="flex-1 px-3 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-50"
                  >
                    {solvingSingle === selectedTrain.trainNumber ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-current" />}
                    {isHindi ? `ट्रेन ${selectedTrain.trainNumber} की समस्या हल करें` : `SOLVE TRAIN ${selectedTrain.trainNumber}`}
                  </button>
                </div>

              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs font-mono">
                {isHindi ? 'कारण एवं AI समाधान देखने के लिए बाईं सूची से ट्रेन चुनें।' : 'Select a delayed train from the left panel to inspect root cause & AI resolution.'}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
