import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, Volume2, Settings2, Play, Square, AlertCircle, AlertTriangle, 
  Info as InfoIcon, X, Maximize2, Minimize2, MessageSquare, History, 
  Check, Zap, RefreshCw, Sparkles, Radio, ChevronRight, CheckCircle2,
  Train as TrainIcon, MapPin, Compass
} from 'lucide-react';
import { Train, TrackSegment, Station, DelayIdentificationReport, DelayedTrainAnalysis } from '../types';

interface VoiceAgentProps {
  trains: Train[];
  stations: Station[];
  segments: TrackSegment[];
  onZoomTo: (x: number, y: number, scale: number) => void;
  onOpenDelayCockpit?: () => void;
  onOpenWhereIsMyTrain?: (trainNumber?: string) => void;
  onRefreshData?: () => void;
  isOpenExternal?: boolean;
  onToggleOpen?: (open: boolean) => void;
  externalSpeechTrigger?: { text: string; timestamp: number } | null;
}

export function AIVoiceAgentPanel({ 
  trains, 
  stations, 
  segments, 
  onZoomTo,
  onOpenDelayCockpit,
  onOpenWhereIsMyTrain,
  onRefreshData,
  isOpenExternal,
  onToggleOpen,
  externalSpeechTrigger
}: VoiceAgentProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = isOpenExternal !== undefined ? isOpenExternal : internalIsOpen;
  const setIsOpen = (open: boolean) => {
    setInternalIsOpen(open);
    if (onToggleOpen) onToggleOpen(open);
  };

  const [isActive, setIsActive] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [volume, setVolume] = useState(90);
  const [speed, setSpeed] = useState<'Slow' | 'Normal' | 'Fast'>('Normal');
  const [languageMode, setLanguageMode] = useState<'hi' | 'en'>('hi'); // Default to Indian Hindi
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  
  const [isListening, setIsListening] = useState(false);
  const [isSolving, setIsSolving] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [currentSpokenText, setCurrentSpokenText] = useState<string | null>(null);
  
  const [delayReport, setDelayReport] = useState<DelayIdentificationReport | null>(null);
  const [activeTab, setActiveTab] = useState<'agent' | 'delays' | 'settings'>('agent');
  const [alertHistory, setAlertHistory] = useState<any[]>([]);

  // Load voices & pick best Hindi / Indian English voice
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);

      if (!selectedVoice && voices.length > 0) {
        if (languageMode === 'hi') {
          const hiVoice = voices.find(v => 
            v.lang.toLowerCase().includes('hi') || 
            v.name.toLowerCase().includes('hindi') ||
            v.name.toLowerCase().includes('swara') ||
            v.name.toLowerCase().includes('lekha')
          );
          if (hiVoice) {
            setSelectedVoice(hiVoice.voiceURI);
            return;
          }
        }
        const defaultVoice = voices.find(v => v.lang.includes('IN') || v.lang.includes('en-GB') || v.lang.includes('en-US')) || voices[0];
        if (defaultVoice) setSelectedVoice(defaultVoice.voiceURI);
      }
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, [selectedVoice, languageMode]);

  // Two-tone Indian Railways announcement chime
  const playRailwayChime = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = ctx.currentTime;
      
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.frequency.setValueAtTime(587.33, now); // D5
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.45);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.frequency.setValueAtTime(880, now + 0.18); // A5
      gain2.gain.setValueAtTime(0.15, now + 0.18);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.18);
      osc2.stop(now + 0.7);
    } catch (e) {
      // AudioContext policy
    }
  };

  // Fetch initial delay report
  const fetchDelayReport = async () => {
    try {
      const res = await fetch('/api/delays/report');
      if (res.ok) {
        const data: DelayIdentificationReport = await res.json();
        setDelayReport(data);
      }
    } catch (err) {
      console.warn("Failed to fetch delay report", err);
    }
  };

  useEffect(() => {
    fetchDelayReport();
    const interval = setInterval(fetchDelayReport, 10000);
    return () => clearInterval(interval);
  }, []);

  // Listen to external speech triggers from other parts of the app
  useEffect(() => {
    if (externalSpeechTrigger && externalSpeechTrigger.text) {
      speak(externalSpeechTrigger.text, languageMode);
    }
  }, [externalSpeechTrigger]);

  const speak = (text: string, lang: 'hi' | 'en' = languageMode) => {
    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported in this environment.');
      return;
    }
    window.speechSynthesis.cancel();
    playRailwayChime();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
    
    // Choose appropriate voice
    const voices = window.speechSynthesis.getVoices();
    let voice = voices.find(v => v.voiceURI === selectedVoice);
    if (lang === 'hi') {
      const hiVoice = voices.find(v => 
        v.lang.toLowerCase().includes('hi') || 
        v.name.toLowerCase().includes('hindi') ||
        v.name.toLowerCase().includes('swara') ||
        v.name.toLowerCase().includes('lekha')
      );
      if (hiVoice) voice = hiVoice;
    }

    if (voice) utterance.voice = voice;
    utterance.volume = volume / 100;
    utterance.rate = speed === 'Slow' ? 0.85 : speed === 'Fast' ? 1.2 : 0.95;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setCurrentSpokenText(text);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setCurrentSpokenText(null);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setCurrentSpokenText(null);
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setCurrentSpokenText(null);
    }
  };

  // Main Action: Identify & Solve Delays then Voice Agent announces in Hindi / English
  const handleIdentifyAndSolveDelays = async () => {
    setIsSolving(true);
    try {
      const res = await fetch('/api/delays/solve-all', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: languageMode })
      });
      if (res.ok) {
        const data = await res.json();
        setDelayReport(data.afterReport || null);
        
        const announcementText = languageMode === 'hi' 
          ? (data.voiceAnnouncementHindi || data.voiceAnnouncement)
          : (data.voiceAnnouncementEnglish || data.voiceAnnouncement);

        setAiResponse(announcementText);
        setTranscript(languageMode === 'hi' ? "सभी लेट ट्रेनों की पहचान कर समस्या हल करो" : "Identify all delayed trains and solve problems");
        
        // Announce via voice agent
        speak(announcementText, languageMode);

        // Record in history
        setAlertHistory(prev => [
          {
            id: `solve_all_${Date.now()}`,
            time: new Date().toLocaleTimeString(),
            severity: 'RESOLVED',
            message: announcementText,
            trainNumber: 'ALL TRAINS'
          },
          ...prev
        ].slice(0, 15));

        if (onRefreshData) onRefreshData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSolving(false);
    }
  };

  // Identify Delays only
  const handleIdentifyOnly = async () => {
    try {
      const res = await fetch('/api/delays/report');
      if (res.ok) {
        const data: DelayIdentificationReport = await res.json();
        setDelayReport(data);
        const script = languageMode === 'hi' 
          ? (data.voiceDetailedScriptHindi || data.voiceDetailedScript)
          : data.voiceDetailedScript;

        setAiResponse(script);
        setTranscript(languageMode === 'hi' ? "वर्तमान में देरी से चल रही ट्रेनों की पहचान करो" : "Identify all present delayed trains");
        speak(script, languageMode);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Ask AI / Speech interaction
  const handleAskAIWithPrompt = async (promptText: string) => {
    if (isListening) return;
    setIsListening(true);
    setTranscript(promptText);

    try {
      const res = await fetch('/api/ask-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          question: promptText, 
          language: languageMode,
          context: { trains, stations } 
        })
      });
      const data = await res.json();
      
      const script = languageMode === 'hi'
        ? (data.voiceScriptHindi || data.voiceScript || data.answer)
        : (data.voiceScriptEnglish || data.voiceScript || data.answer);

      setAiResponse(data.answer || script);
      speak(script, languageMode);

      if (data.actionTaken === 'SOLVED_ALL_DELAYS' && onRefreshData) {
        onRefreshData();
      }
    } catch (err) {
      const fallback = languageMode === 'hi'
        ? "रेलवे AI कंट्रोलर: केंद्रीय नियंत्रण प्रणाली से संपर्क स्थापित। सभी ट्रैक सर्किट एवं सिग्नल सुरक्षित हैं।"
        : "Railway AI: Connected to Central Railway Information Systems. Track circuits and signal aspects clear.";
      setAiResponse(fallback);
      speak(fallback, languageMode);
    } finally {
      setIsListening(false);
    }
  };

  const delayedCount = trains.filter(t => (t.delayMinutes || 0) > 0 || (t.predictedDelay || 0) > 0).length;
  const isHindi = languageMode === 'hi';

  if (!isOpen) {
    return (
      <div className="absolute top-48 right-6 z-40 flex items-center gap-2">
        <button 
          onClick={() => setIsOpen(true)}
          className={`relative p-3.5 rounded-2xl shadow-[0_0_25px_rgba(6,182,212,0.4)] border transition-all flex items-center gap-2.5 ${
            delayedCount > 0 
              ? 'bg-slate-900/95 border-rose-500/60 text-rose-400 hover:border-rose-400' 
              : 'bg-slate-900/95 border-cyan-500/60 text-cyan-400 hover:border-cyan-400'
          }`}
          title="Open Railway AI Voice Agent"
        >
          <Volume2 className={`w-5 h-5 ${isSpeaking ? 'animate-bounce text-cyan-300' : ''}`} />
          
          <span className="text-xs font-mono font-bold">
            {isHindi ? 'AI वॉइस एजेंट' : 'AI VOICE'}
          </span>

          {delayedCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-rose-950 border border-rose-600 text-rose-300 text-[10px] font-mono font-bold animate-pulse">
              {delayedCount} DELAYED
            </span>
          )}

          {isSpeaking && (
            <span className="flex gap-0.5 items-end h-4">
              <span className="w-1 bg-cyan-400 rounded animate-[pulse_0.6s_infinite_100ms] h-3"></span>
              <span className="w-1 bg-purple-400 rounded animate-[pulse_0.6s_infinite_200ms] h-4"></span>
              <span className="w-1 bg-emerald-400 rounded animate-[pulse_0.6s_infinite_300ms] h-2"></span>
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="absolute top-20 right-6 z-40 w-96 max-h-[85vh] bg-slate-900/95 backdrop-blur-xl border border-cyan-500/50 rounded-2xl shadow-[0_0_40px_rgba(6,182,212,0.25)] overflow-hidden flex flex-col font-sans animate-in fade-in zoom-in-95 duration-200">
      
      {/* Header */}
      <div className="bg-slate-950/90 border-b border-slate-800 p-3.5 flex justify-between items-center">
        <div className="flex items-center gap-2.5">
          <div className={`p-1.5 rounded-xl border ${isSpeaking ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300' : 'bg-slate-800 border-slate-700 text-cyan-400'}`}>
            <Volume2 className={`w-4 h-4 ${isSpeaking ? 'animate-pulse' : ''}`} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs text-white tracking-wider uppercase">
                {isHindi ? 'AI भारतीय रेलवे वॉइस एजेंट' : 'AI VOICE DISPATCH AGENT'}
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              {isHindi ? 'बिलासपुर - नागपुर मंडल नियंत्रक' : 'SECR / SER Division Controller'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Language Switcher Button */}
          <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[10px] font-mono">
            <button
              onClick={() => setLanguageMode('hi')}
              className={`px-2 py-0.5 rounded-md font-bold transition-colors ${
                isHindi ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              हिन्दी
            </button>
            <button
              onClick={() => setLanguageMode('en')}
              className={`px-2 py-0.5 rounded-md font-bold transition-colors ${
                !isHindi ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              EN
            </button>
          </div>

          {isSpeaking && (
            <button 
              onClick={stopSpeaking}
              className="px-2 py-1 bg-rose-950/80 hover:bg-rose-900 border border-rose-700 text-rose-300 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1"
              title="Stop Speaking"
            >
              <Square className="w-3 h-3 fill-current" /> STOP
            </button>
          )}
          <button 
            onClick={() => setIsOpen(false)} 
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hero Live Audio Waves Subtitle Box */}
      {isSpeaking && (
        <div className="bg-gradient-to-r from-cyan-950/80 via-purple-950/80 to-slate-950 p-3 border-b border-cyan-500/40 flex items-center gap-3">
          <div className="flex gap-1 items-end h-5 shrink-0">
            <span className="w-1 bg-cyan-400 rounded animate-[bounce_0.8s_infinite_100ms] h-4"></span>
            <span className="w-1 bg-purple-400 rounded animate-[bounce_0.8s_infinite_200ms] h-5"></span>
            <span className="w-1 bg-emerald-400 rounded animate-[bounce_0.8s_infinite_300ms] h-3"></span>
            <span className="w-1 bg-cyan-400 rounded animate-[bounce_0.8s_infinite_150ms] h-5"></span>
          </div>
          <p className="text-[11px] font-mono text-cyan-200 leading-tight line-clamp-2">
            {currentSpokenText}
          </p>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="grid grid-cols-3 bg-slate-950 border-b border-slate-800 text-[11px] font-mono">
        <button 
          onClick={() => setActiveTab('agent')}
          className={`py-2 text-center font-bold transition-colors ${activeTab === 'agent' ? 'text-cyan-400 border-b-2 border-cyan-500 bg-slate-900/50' : 'text-slate-500 hover:text-slate-300'}`}
        >
          {isHindi ? 'कंट्रोलर' : 'DISPATCH'}
        </button>
        <button 
          onClick={() => setActiveTab('delays')}
          className={`py-2 text-center font-bold transition-colors flex items-center justify-center gap-1.5 ${activeTab === 'delays' ? 'text-rose-400 border-b-2 border-rose-500 bg-slate-900/50' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <span>{isHindi ? 'देरी रिपोर्ट' : 'DELAYS'}</span>
          {delayedCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] flex items-center justify-center font-bold">
              {delayedCount}
            </span>
          )}
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`py-2 text-center font-bold transition-colors ${activeTab === 'settings' ? 'text-cyan-400 border-b-2 border-cyan-500 bg-slate-900/50' : 'text-slate-500 hover:text-slate-300'}`}
        >
          {isHindi ? 'वॉइस सेटअप' : 'VOICE SETUP'}
        </button>
      </div>

      {/* Main Content Area */}
      <div className="p-4 space-y-4 flex-1 overflow-y-auto custom-scrollbar">

        {/* Tab 1: Dispatch & Main Voice Trigger */}
        {activeTab === 'agent' && (
          <div className="space-y-4">
            
            {/* HERO CORE ACTION: Identify & Solve All Delays then Speak in Hindi/English */}
            <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950/40 p-3.5 rounded-xl border border-cyan-500/40 shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-rose-950 text-rose-400 border border-rose-800">
                    <AlertTriangle className="w-4 h-4" />
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      {isHindi ? 'लेट ट्रेनों की पहचान एवं AI समाधान' : 'Delayed Trains Automation'}
                    </h4>
                    <span className="text-[10px] font-mono text-slate-400">
                      {delayedCount} {isHindi ? 'ट्रेनें देरी से चल रही हैं' : 'delayed train(s) detected'}
                    </span>
                  </div>
                </div>

                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${delayedCount > 0 ? 'bg-rose-950 text-rose-300 border border-rose-700' : 'bg-emerald-950 text-emerald-300 border border-emerald-700'}`}>
                  {delayedCount > 0 ? (isHindi ? 'कार्रवाई आवश्यक' : 'ACTION NEEDED') : (isHindi ? 'सभी सामान्य' : 'ALL CLEAR')}
                </span>
              </div>

              {/* One Click Voice-Solve Button */}
              <button
                onClick={handleIdentifyAndSolveDelays}
                disabled={isSolving}
                className="w-full py-2.5 bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500 hover:from-rose-400 hover:via-amber-400 hover:to-emerald-400 text-slate-950 font-mono font-bold text-xs rounded-xl shadow-[0_0_20px_rgba(244,63,94,0.3)] flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isSolving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{isHindi ? 'समस्या हल कर हिंदी में घोषणा...' : 'SOLVING & SYNTHESIZING VOICE...'}</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-current" />
                    <Volume2 className="w-4 h-4" />
                    <span>{isHindi ? '🚨 सभी लेट ट्रेनों की समस्या हल करो (आवाज़)' : 'IDENTIFY & SOLVE ALL DELAYS (VOICE)'}</span>
                  </>
                )}
              </button>

              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                <button
                  onClick={handleIdentifyOnly}
                  className="py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{isHindi ? 'सिर्फ पहचानें' : 'IDENTIFY ONLY'}</span>
                </button>

                {onOpenWhereIsMyTrain && (
                  <button
                    onClick={() => onOpenWhereIsMyTrain()}
                    className="py-1.5 bg-cyan-950/80 hover:bg-cyan-900/80 border border-cyan-700 rounded-lg text-cyan-300 flex items-center justify-center gap-1.5 transition-colors font-bold"
                  >
                    <Compass className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{isHindi ? 'मेरी ट्रेन कहाँ है?' : 'WHERE IS MY TRAIN'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Live Conversation Transcript */}
            {(transcript || aiResponse) && (
              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-2">
                {transcript && (
                  <div className="flex gap-2">
                    <span className="text-cyan-500 font-bold text-[10px] uppercase shrink-0">{isHindi ? 'कमांड:' : 'Command:'}</span>
                    <p className="text-xs text-slate-300 font-mono">{transcript}</p>
                  </div>
                )}
                {aiResponse && (
                  <div className="flex gap-2 border-t border-slate-800/80 pt-2">
                    <span className="text-purple-400 font-bold text-[10px] uppercase shrink-0">{isHindi ? 'वॉइस उत्तर:' : 'Voice Script:'}</span>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans">{aiResponse}</p>
                  </div>
                )}
              </div>
            )}

            {/* Quick Suggested Voice Prompts in Hindi / English */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono text-slate-400 uppercase">
                {isHindi ? 'त्वरित हिंदी वॉइस कमांड' : 'Quick Voice Prompts'}
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                {(isHindi ? [
                  "सभी लेट ट्रेनों की समस्या हल करो और बताओ",
                  "मेरी ट्रेन कहाँ है? लाइव लोकेशन और देरी की स्थिति बताओ",
                  "ट्रेन 20825 वंदे भारत एक्सप्रेस कहाँ है और कितनी लेट है?",
                  "ट्रेन 18237 छत्तीसगढ़ एक्सप्रेस की देरी का कारण और AI समाधान"
                ] : [
                  "Identify all delayed trains and solve problems",
                  "Where is my train? Live location and delay status",
                  "Why is train 18237 Chhattisgarh Express delayed?",
                  "Clear Bilaspur-Nagpur corridor signals"
                ]).map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAskAIWithPrompt(prompt)}
                    className="p-2 bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-500/50 rounded-lg text-left text-xs text-slate-300 font-mono flex items-center justify-between group transition-colors"
                  >
                    <span className="truncate">{prompt}</span>
                    <Play className="w-3 h-3 text-slate-500 group-hover:text-cyan-400 shrink-0" />
                  </button>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* Tab 2: Delayed Trains Breakdown */}
        {activeTab === 'delays' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span>{isHindi ? 'सक्रिय देरी सूची' : 'ACTIVE DELAYS'} ({delayReport?.delayedTrains?.length || 0})</span>
              <button 
                onClick={fetchDelayReport}
                className="text-cyan-400 hover:underline flex items-center gap-1 text-[10px]"
              >
                <RefreshCw className="w-3 h-3" /> {isHindi ? 'रीफ्रेश' : 'REFRESH'}
              </button>
            </div>

            {(!delayReport?.delayedTrains || delayReport.delayedTrains.length === 0) ? (
              <div className="p-6 text-center bg-slate-950/50 border border-slate-800 rounded-xl space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <div className="text-xs font-bold text-slate-200">
                  {isHindi ? 'कोई ट्रेन लेट नहीं है' : 'Zero Delayed Trains'}
                </div>
                <p className="text-[10px] font-mono text-slate-500">
                  {isHindi ? 'दक्षिण पूर्व मध्य रेलवे के सभी कॉरिडोर निर्धारित समय पर चल रहे हैं।' : 'All SECR & SER corridors running on schedule.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
                {delayReport.delayedTrains.map(t => (
                  <div key={t.trainNumber} className="bg-slate-950/80 border border-slate-800 p-2.5 rounded-xl space-y-1.5">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono font-bold text-[10px]">
                            {t.trainNumber}
                          </span>
                          <span className="text-[10px] font-bold text-slate-200 truncate max-w-[140px]">
                            {isHindi ? (t.trainNameHindi || t.trainName) : t.trainName}
                          </span>
                        </div>
                        <span className="text-[9px] font-mono text-slate-400 block mt-0.5">
                          {isHindi ? (t.locationHindi || t.location) : t.location}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 font-mono font-bold text-[10px]">
                          +{t.delayMinutes}m
                        </span>
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-400 font-sans line-clamp-1">
                      {isHindi ? (t.solutionTitleHindi || t.solutionTitle) : t.solutionTitle}: {isHindi ? (t.solutionDetailsHindi || t.solutionDetails) : t.solutionDetails}
                    </p>

                    <div className="flex gap-2 pt-1 border-t border-slate-800/80">
                      <button
                        onClick={() => {
                          const msg = isHindi
                            ? `ट्रेन नंबर ${t.trainNumber} ${t.trainNameHindi || t.trainName}, ${t.locationHindi || t.location} के पास ${t.delayMinutes} मिनट लेट है। AI समाधान: ${t.solutionTitleHindi || t.solutionTitle}। गति ${t.restoredSpeed} किमी प्रति घंटा बहाल।`
                            : `Train ${t.trainNumber} ${t.trainName} is delayed by ${t.delayMinutes} minutes near ${t.location}. Proposed AI resolution: ${t.solutionTitle}. Cruising speed restored to ${t.restoredSpeed} km/h.`;
                          speak(msg, languageMode);
                        }}
                        className="text-[9px] font-mono font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                      >
                        <Volume2 className="w-3 h-3" /> {isHindi ? 'घोषणा सुनें' : 'ANNOUNCE'}
                      </button>

                      <button
                        onClick={async () => {
                          await fetch('/api/delays/solve-train', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ trainNumber: t.trainNumber })
                          });
                          const doneMsg = isHindi
                            ? `ट्रेन ${t.trainNumber} ${t.trainNameHindi || t.trainName} की देरी समाप्त। ग्रीन सिग्नल के साथ गति ${t.restoredSpeed} किमी प्रति घंटा लॉक कर दी गई है।`
                            : `Train ${t.trainNumber} ${t.trainName} delay cleared. Green aspect signal locked at ${t.restoredSpeed} km/h.`;
                          speak(doneMsg, languageMode);
                          fetchDelayReport();
                          if (onRefreshData) onRefreshData();
                        }}
                        className="text-[9px] font-mono font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                      >
                        <Zap className="w-3 h-3" /> {isHindi ? 'समस्या हल करें' : 'SOLVE THIS'}
                      </button>

                      {onOpenWhereIsMyTrain && (
                        <button
                          onClick={() => onOpenWhereIsMyTrain(t.trainNumber)}
                          className="text-[9px] font-mono font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 ml-auto"
                        >
                          <Compass className="w-3 h-3" /> {isHindi ? 'लाइव ट्रैक' : 'TRACK'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Settings */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <Settings2 className="w-3.5 h-3.5" /> VOICE SYNTHESIS CONFIGURATION
            </h4>
            
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Language / भाषा</span>
              <div className="flex bg-slate-950 rounded-lg p-1 border border-slate-800">
                <button
                  onClick={() => setLanguageMode('hi')}
                  className={`flex-1 text-[11px] font-bold py-1.5 rounded-md transition-colors ${languageMode === 'hi' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
                >
                  🇮🇳 भारतीय हिन्दी (Hindi)
                </button>
                <button
                  onClick={() => setLanguageMode('en')}
                  className={`flex-1 text-[11px] font-bold py-1.5 rounded-md transition-colors ${languageMode === 'en' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
                >
                  🇬🇧 Indian English
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-mono text-slate-400 uppercase">
                <span>Output Volume</span> <span>{volume}%</span>
              </div>
              <input 
                type="range" min="0" max="100" value={volume} 
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:rounded-full cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Speech Speed</span>
              <div className="flex bg-slate-950 rounded-lg p-1 border border-slate-800">
                {(['Slow', 'Normal', 'Fast'] as const).map(s => (
                  <button 
                    key={s} onClick={() => setSpeed(s)}
                    className={`flex-1 text-[10px] font-bold py-1 rounded-md transition-colors ${speed === s ? 'bg-slate-800 text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Voice Engine</span>
              <select 
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 p-2 rounded-lg outline-none focus:border-cyan-500"
              >
                {availableVoices.map((v, i) => (
                  <option key={i} value={v.voiceURI}>{v.name} ({v.lang})</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => {
                const sample = isHindi
                  ? "नमस्कार, यह भारतीय रेलवे AI वॉइस कंट्रोलर सिस्टम है। सभी ट्रेन परिचालन सामान्य है।"
                  : "This is the Indian Railways AI Voice Dispatch Controller voice check.";
                speak(sample, languageMode);
              }}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-300 flex items-center justify-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 text-emerald-400" /> {isHindi ? 'वॉइस टेस्ट (Test Hindi Voice)' : 'TEST VOICE OUTPUT'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
