import React, { useState, useEffect } from 'react';
import { 
  Train as TrainIcon, MapPin, Radio, Clock, AlertTriangle, 
  CheckCircle2, Volume2, Zap, RefreshCw, X, Search, ChevronRight,
  Gauge, Compass, ShieldCheck, ArrowRight, ArrowDown, Sparkles,
  ExternalLink, Sliders, Calendar, Building2, AlertOctagon
} from 'lucide-react';
import { 
  WhereIsMyTrainData, WhereIsMyTrainLiveStop, Train, 
  NTESSpotYourTrainResult, NTESLiveStationEntry, NTESPacingConfig 
} from '../types';

interface WhereIsMyTrainModalProps {
  isOpen: boolean;
  onClose: () => void;
  trains: Train[];
  initialTrainNumber?: string;
  onSpeak?: (text: string, lang?: 'hi' | 'en') => void;
  isSpeaking?: boolean;
  onDataRefresh?: () => void;
}

export function WhereIsMyTrainModal({
  isOpen,
  onClose,
  trains,
  initialTrainNumber,
  onSpeak,
  isSpeaking,
  onDataRefresh
}: WhereIsMyTrainModalProps) {
  const [activeTab, setActiveTab] = useState<'live-tracking' | 'ntes-spot' | 'ntes-station' | 'pacing'>('live-tracking');
  const [selectedTrainNum, setSelectedTrainNum] = useState<string>(initialTrainNumber || '20825');
  const [trainData, setTrainData] = useState<WhereIsMyTrainData | null>(null);
  const [ntesData, setNtesData] = useState<NTESSpotYourTrainResult | null>(null);
  
  // Live Station State
  const [selectedStationCode, setSelectedStationCode] = useState<string>('R');
  const [liveStationTrains, setLiveStationTrains] = useState<NTESLiveStationEntry[]>([]);
  const [liveStationLoading, setLiveStationLoading] = useState(false);

  // Pacing State
  const [pacingConfig, setPacingConfig] = useState<NTESPacingConfig>({
    mode: 'CALM_REALISTIC',
    playbackSpeed: 0.35,
    stepIntervalMs: 800,
    slowOnCautionEnabled: true,
    slowOnApproachEnabled: true,
    ntesGatewayStatus: 'CONNECTED'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSolving, setIsSolving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [language, setLanguage] = useState<'hi' | 'en'>('hi'); // Default to Hindi as requested
  const [solveSuccessMsg, setSolveSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialTrainNumber) {
      setSelectedTrainNum(initialTrainNumber);
    }
  }, [initialTrainNumber]);

  const fetchTrainDetails = async (trainNum: string) => {
    setIsLoading(true);
    try {
      const [wimtRes, ntesRes] = await Promise.all([
        fetch(`/api/where-is-my-train/${trainNum}`),
        fetch(`/api/ntes/spot-your-train/${trainNum}`)
      ]);

      if (wimtRes.ok) {
        const data: WhereIsMyTrainData = await wimtRes.json();
        setTrainData(data);
      }
      if (ntesRes.ok) {
        const nData: NTESSpotYourTrainResult = await ntesRes.json();
        setNtesData(nData);
      }
    } catch (err) {
      console.error("Failed to load train details", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLiveStation = async (code: string) => {
    setLiveStationLoading(true);
    try {
      const res = await fetch(`/api/ntes/live-station/${code}?hours=4`);
      if (res.ok) {
        const data = await res.json();
        setLiveStationTrains(data.trains || []);
      }
    } catch (err) {
      console.error("Failed to fetch NTES live station", err);
    } finally {
      setLiveStationLoading(false);
    }
  };

  const fetchPacing = async () => {
    try {
      const res = await fetch('/api/ntes/pacing');
      if (res.ok) {
        const data = await res.json();
        if (data.config) setPacingConfig(data.config);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const updatePacingSpeed = async (speed: number, mode: 'CALM_REALISTIC' | 'NTES_REALTIME' | 'FAST_SIMULATION') => {
    try {
      const res = await fetch('/api/ntes/pacing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playbackSpeed: speed,
          mode: mode
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.config) setPacingConfig(data.config);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (selectedTrainNum) fetchTrainDetails(selectedTrainNum);
      if (selectedStationCode) fetchLiveStation(selectedStationCode);
      fetchPacing();

      const interval = setInterval(() => {
        if (selectedTrainNum) fetchTrainDetails(selectedTrainNum);
        if (activeTab === 'ntes-station' && selectedStationCode) fetchLiveStation(selectedStationCode);
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [isOpen, selectedTrainNum, selectedStationCode, activeTab]);

  // Voice chime function using Web Audio API
  const playRailwayChime = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = ctx.currentTime;
      
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.frequency.setValueAtTime(587.33, now); // D5
      gain1.gain.setValueAtTime(0.15, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.5);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.frequency.setValueAtTime(880, now + 0.2); // A5
      gain2.gain.setValueAtTime(0.18, now + 0.2);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.2);
      osc2.stop(now + 0.8);
    } catch (e) {
      // AudioContext not allowed before user gesture
    }
  };

  const handleSpeakAnnouncement = (lang: 'hi' | 'en') => {
    if (!trainData) return;
    playRailwayChime();
    const script = lang === 'hi' ? trainData.voiceAnnouncementHindi : trainData.voiceAnnouncementEnglish;
    if (onSpeak) {
      onSpeak(script, lang);
    } else if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(script);
      utt.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
      const voices = window.speechSynthesis.getVoices();
      const hiVoice = voices.find(v => v.lang.includes('hi') || v.name.toLowerCase().includes('hindi') || v.name.toLowerCase().includes('swara') || v.name.toLowerCase().includes('lekha'));
      if (lang === 'hi' && hiVoice) utt.voice = hiVoice;
      window.speechSynthesis.speak(utt);
    }
  };

  // Solve delay with AI
  const handleSolveDelay = async () => {
    if (!trainData) return;
    setIsSolving(true);
    setSolveSuccessMsg(null);
    try {
      const res = await fetch('/api/delays/solve-train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trainNumber: trainData.trainNumber })
      });
      if (res.ok) {
        const result = await res.json();
        setSolveSuccessMsg(
          language === 'hi'
            ? `✅ AI द्वारा समस्या हल: ${trainData.trainNameHindi || trainData.trainName} की देरी समाप्त कर दी गई है। स्पीड 130 किमी/घंटा और सिग्नल ग्रीन लॉक!`
            : `✅ AI SOLVED: Delay cleared for ${trainData.trainName}. Speed restored to 130 km/h and green aspect signal locked!`
        );
        
        // Refresh local details and parent app
        await fetchTrainDetails(trainData.trainNumber);
        if (onDataRefresh) onDataRefresh();

        // Speak solved announcement in selected language
        playRailwayChime();
        const solveScript = language === 'hi' ? result.voiceAnnouncementHindi : result.voiceAnnouncementEnglish;
        if (onSpeak) {
          onSpeak(solveScript || result.voiceAnnouncement, language);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSolving(false);
    }
  };

  if (!isOpen) return null;

  const filteredTrains = trains.filter(t => 
    t.trainNumber.includes(searchQuery) || 
    t.trainName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isHindi = language === 'hi';

  const stationOptions = [
    { code: 'BSP', name: 'Bilaspur Jn (SECR HQ)', hindi: 'बिलासपुर जंक्शन' },
    { code: 'R', name: 'Raipur Jn', hindi: 'रायपुर जंक्शन' },
    { code: 'DURG', name: 'Durg Jn', hindi: 'दुर्ग जंक्शन' },
    { code: 'NGP', name: 'Nagpur Jn', hindi: 'नागपुर जंक्शन' },
    { code: 'G', name: 'Gondia Jn', hindi: 'गोंदिया जंक्शन' },
    { code: 'TATA', name: 'Tatanagar Jn', hindi: 'टाटानगर जंक्शन' },
    { code: 'ROU', name: 'Rourkela Jn', hindi: 'राउरकेला जंक्शन' },
    { code: 'JSG', name: 'Jharsuguda Jn', hindi: 'झारसुगुड़ा जंक्शन' }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-cyan-500/50 rounded-2xl w-full max-w-5xl shadow-[0_0_50px_rgba(6,182,212,0.25)] overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Top Header */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950/70 p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/40 text-cyan-400">
              <TrainIcon className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold text-cyan-400 tracking-widest uppercase">
                  {isHindi ? 'लाइव ट्रेन ट्रैकिंग एवं एनटीईएस' : 'LIVE TRAIN TRACKING & NTES'}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700 text-[10px] font-mono font-bold flex items-center gap-1">
                  <Radio className="w-3 h-3 animate-pulse" />
                  WHERE IS MY TRAIN
                </span>
                <a
                  href="https://enquiry.indianrail.gov.in/mntes/"
                  target="_blank"
                  rel="noreferrer"
                  className="px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-700 text-[10px] font-mono font-bold flex items-center gap-1 hover:bg-blue-900 transition-colors"
                >
                  <span>CRIS NTES SYNCED</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide mt-0.5">
                {isHindi ? 'मेरी ट्रेन कहाँ है? (लाइव स्थिति एवं AI समाधान)' : 'Where Is My Train & NTES Live Railway Gateway'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Switcher */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 font-mono text-xs">
              <button
                onClick={() => setLanguage('hi')}
                className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                  isHindi ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                🇮🇳 हिन्दी
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                  !isHindi ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                🇬🇧 English
              </button>
            </div>

            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* View Navigation Tabs */}
        <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
            <button
              onClick={() => setActiveTab('live-tracking')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'live-tracking'
                  ? 'bg-cyan-500 text-slate-950 shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>{isHindi ? 'लाइव ट्रैकिंग (WIMT)' : 'Live Tracking (WIMT)'}</span>
            </button>

            <button
              onClick={() => setActiveTab('ntes-spot')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'ntes-spot'
                  ? 'bg-blue-500 text-slate-950 shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <TrainIcon className="w-3.5 h-3.5" />
              <span>{isHindi ? 'NTES स्पॉट योर ट्रेन' : 'NTES Spot Your Train'}</span>
            </button>

            <button
              onClick={() => setActiveTab('ntes-station')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'ntes-station'
                  ? 'bg-purple-500 text-slate-950 shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>{isHindi ? 'NTES लाइव स्टेशन' : 'NTES Live Station'}</span>
            </button>

            <button
              onClick={() => setActiveTab('pacing')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'pacing'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{isHindi ? 'स्पीड एवं पेसिंग कंट्रोल' : 'Pacing & Speed'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>NTES PACE: <strong className="text-cyan-300">{pacingConfig.playbackSpeed}x ({pacingConfig.mode})</strong></span>
          </div>
        </div>

        {/* Search & Train Selector Bar */}
        <div className="p-3 bg-slate-950/80 border-b border-slate-800/80 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={isHindi ? "ट्रेन नंबर या नाम खोजें (उदा. 20825, वंदे भारत, हावड़ा मेल)..." : "Search Train Number or Name (e.g. 20825, Vande Bharat, Howrah Mail)..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 placeholder-slate-500 outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto py-1 custom-scrollbar">
            {filteredTrains.slice(0, 6).map(t => (
              <button
                key={t.trainNumber}
                onClick={() => {
                  setSelectedTrainNum(t.trainNumber);
                  setSolveSuccessMsg(null);
                }}
                className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold shrink-0 transition-all ${
                  selectedTrainNum === t.trainNumber
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                <span>{t.trainNumber}</span>
                {t.delayMinutes > 0 && (
                  <span className="ml-1 text-[10px] text-rose-400 font-normal">+{t.delayMinutes}m</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
          
          {isLoading && !trainData && (
            <div className="py-20 flex flex-col items-center justify-center text-cyan-400 gap-3">
              <RefreshCw className="w-8 h-8 animate-spin" />
              <span className="font-mono text-xs tracking-wider">
                {isHindi ? 'एनटीईएस एवं रेलवे टेलीमेट्री डेटा लोड हो रहा है...' : 'LOADING NTES & GPS TELEMETRY...'}
              </span>
            </div>
          )}

          {/* TAB 1: WHERE IS MY TRAIN LIVE TRACKING & AI RESOLUTION */}
          {activeTab === 'live-tracking' && trainData && (
            <>
              {/* Train Hero Banner */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow-lg space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  
                  {/* Left: Train Info */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-1 bg-cyan-950 text-cyan-300 border border-cyan-700 font-mono text-sm font-bold rounded-lg">
                        {trainData.trainNumber}
                      </span>
                      <span className="px-2.5 py-1 bg-purple-950/80 text-purple-300 border border-purple-800 text-xs font-bold rounded-lg">
                        {trainData.category}
                      </span>
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${
                        trainData.delayMinutes > 0 
                          ? 'bg-rose-950/80 text-rose-300 border-rose-700 animate-pulse' 
                          : 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                      }`}>
                        {trainData.delayMinutes > 0 
                          ? (isHindi ? `🚨 ${trainData.delayMinutes} मिनट लेट` : `🚨 DELAYED BY ${trainData.delayMinutes}m`) 
                          : (isHindi ? '🟢 सही समय पर (ON TIME)' : '🟢 ON TIME')}
                      </span>
                    </div>

                    <h3 className="text-lg sm:text-xl font-bold text-white">
                      {isHindi ? trainData.trainNameHindi : trainData.trainName}
                    </h3>
                    <p className="text-xs font-mono text-slate-400">
                      {isHindi ? 'अंतिम स्टेशन:' : 'Last Station:'} <span className="text-slate-200 font-semibold">{isHindi ? trainData.lastStationHindi : trainData.lastStation}</span> • {isHindi ? 'अगला स्टेशन:' : 'Next Station:'} <span className="text-cyan-300 font-semibold">{isHindi ? trainData.nextStationHindi : trainData.nextStation}</span>
                    </p>
                  </div>

                  {/* Right: Audio Announcement Controls */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleSpeakAnnouncement('hi')}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-slate-950 font-bold text-xs font-mono flex items-center gap-2 shadow-lg transition-all"
                      title="Listen in Hindi"
                    >
                      <Volume2 className="w-4 h-4 fill-current" />
                      <span>{isHindi ? '🔊 हिंदी में सुनें (Hindi Audio)' : '🔊 Speak in Hindi'}</span>
                    </button>

                    <button
                      onClick={() => handleSpeakAnnouncement('en')}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white font-mono text-xs flex items-center gap-1.5 transition-colors"
                      title="Listen in English"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>English Audio</span>
                    </button>
                  </div>
                </div>

                {/* Live Location Telemetry Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800/80">
                  <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                    <div className="text-[10px] uppercase font-mono text-slate-400 flex items-center gap-1">
                      <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{isHindi ? 'लाइव गति (Speed)' : 'Current Speed'}</span>
                    </div>
                    <div className="text-base sm:text-lg font-mono font-bold text-white mt-1">
                      {trainData.currentSpeed} <span className="text-xs text-slate-400 font-normal">km/h</span>
                    </div>
                    <div className="text-[10px] font-mono text-cyan-400 mt-0.5 truncate">
                      {isHindi ? trainData.speedStateReasonHindi : trainData.speedStateReason}
                    </div>
                  </div>

                  <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                    <div className="text-[10px] uppercase font-mono text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-rose-400" />
                      <span>{isHindi ? 'अगले स्टेशन की दूरी' : 'Next Station Dist'}</span>
                    </div>
                    <div className="text-base sm:text-lg font-mono font-bold text-cyan-300 mt-1">
                      {trainData.distanceToNextStationKm} <span className="text-xs text-slate-400 font-normal">km</span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                      {isHindi ? trainData.nextStationHindi : trainData.nextStation}
                    </div>
                  </div>

                  <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                    <div className="text-[10px] uppercase font-mono text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{isHindi ? 'संभावित आगमन (ETA)' : 'Expected ETA'}</span>
                    </div>
                    <div className="text-base sm:text-lg font-mono font-bold text-emerald-300 mt-1">
                      {trainData.etaNextStation}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                      PF-{trainData.platformNumber} ({isHindi ? 'प्लेटफार्म' : 'Platform'})
                    </div>
                  </div>

                  <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                    <div className="text-[10px] uppercase font-mono text-slate-400 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isHindi ? 'NTES डेटा शुद्धता' : 'NTES Accuracy'}</span>
                    </div>
                    <div className="text-base sm:text-lg font-mono font-bold text-amber-300 mt-1">
                      ±{trainData.gpsAccuracyMeters}m <span className="text-xs text-slate-400 font-normal font-sans">लाइव</span>
                    </div>
                    <div className="text-[10px] font-mono text-emerald-400 mt-0.5">
                      CRIS Portal Synced
                    </div>
                  </div>
                </div>

                {/* Live Location Description Box */}
                <div className="p-3 bg-cyan-950/30 border border-cyan-500/30 rounded-xl flex items-center gap-3">
                  <Compass className="w-5 h-5 text-cyan-400 shrink-0 animate-spin" />
                  <div className="text-xs font-mono text-cyan-200">
                    <span className="font-bold text-cyan-400 uppercase">{isHindi ? 'लाइव स्थिति: ' : 'LIVE LOCATION: '}</span>
                    {isHindi ? trainData.liveLocationDescHindi : trainData.liveLocationDesc}
                  </div>
                </div>
              </div>

              {/* Success Alert Banner when solved */}
              {solveSuccessMsg && (
                <div className="p-3.5 bg-emerald-950/80 border border-emerald-500 text-emerald-200 rounded-xl text-xs font-mono flex items-center justify-between animate-in zoom-in-95">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>{solveSuccessMsg}</span>
                  </div>
                  <button 
                    onClick={() => setSolveSuccessMsg(null)}
                    className="p-1 text-emerald-400 hover:text-emerald-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Delay Problem & AI Solution Box */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* DELAY PROBLEM DIAGNOSIS */}
                <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider font-mono">
                      <AlertTriangle className="w-4 h-4" />
                      <span>{isHindi ? 'देरी की समस्या (Delay Diagnosis)' : 'Delay Problem Diagnosis'}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 text-[10px] font-mono font-bold">
                      {trainData.delayMinutes > 0 ? `+${trainData.delayMinutes} MIN` : 'ZERO DELAY'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    {isHindi ? trainData.delayCauseHindi : trainData.delayCause}
                  </p>

                  <div className="p-2.5 bg-slate-950/80 rounded-xl border border-rose-900/50 text-[11px] font-mono text-slate-400">
                    <span className="text-rose-400 font-bold">{isHindi ? 'प्रभावित खंड:' : 'Affected Corridor:'}</span> {trainData.lastStation} ➔ {trainData.nextStation}
                  </div>
                </div>

                {/* AI SOLUTION & ONE-CLICK RESOLVER */}
                <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider font-mono">
                        <Sparkles className="w-4 h-4 text-emerald-300" />
                        <span>{isHindi ? 'AI समाधान (AI Solution)' : 'AI Resolution Plan'}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-mono font-bold">
                        100% RECOVERY
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-white">
                      {isHindi ? trainData.aiSolutionTitleHindi : trainData.aiSolutionTitle}
                    </h4>

                    <p className="text-xs text-slate-300 leading-relaxed font-sans">
                      {isHindi ? trainData.aiSolutionDetailsHindi : trainData.aiSolutionDetails}
                    </p>
                  </div>

                  {/* Execute Button */}
                  <button
                    onClick={handleSolveDelay}
                    disabled={isSolving || trainData.delayMinutes === 0}
                    className={`w-full py-2.5 rounded-xl font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
                      trainData.delayMinutes > 0
                        ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                        : 'bg-slate-800 border border-slate-700 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {isSolving ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>{isHindi ? 'AI द्वारा समस्या हल की जा रही है...' : 'SOLVING DELAY WITH AI...'}</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 fill-current text-amber-400" />
                        <span>
                          {trainData.delayMinutes > 0 
                            ? (isHindi ? '⚡ AI द्वारा समस्या हल करें और समय पर चलाएं' : '⚡ SOLVE PROBLEM & RESTORE SCHEDULE WITH AI')
                            : (isHindi ? '✅ ट्रेन समय पर चल रही है (Resolved)' : '✅ TRAIN OPERATING ON TIME')}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Stop-By-Stop Live Route Timeline ("Where Is My Train" Schedule) */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-mono text-xs font-bold text-white uppercase tracking-wider">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    <span>{isHindi ? 'स्टेशन समय सारणी एवं लाइव स्थिति' : 'STATION TIMELINE & LIVE ETA'}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    {trainData.stops.length} {isHindi ? 'स्टेशन' : 'Stations'}
                  </span>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500 text-[10px] uppercase">
                        <th className="pb-2 pl-2">#</th>
                        <th className="pb-2">{isHindi ? 'स्टेशन' : 'Station'}</th>
                        <th className="pb-2">{isHindi ? 'प्लेटफार्म' : 'PF'}</th>
                        <th className="pb-2">{isHindi ? 'दूरी (किमी)' : 'Dist (km)'}</th>
                        <th className="pb-2">{isHindi ? 'निर्धारित समय' : 'Sched (Arr/Dep)'}</th>
                        <th className="pb-2">{isHindi ? 'लाइव आगमन / प्रस्थान' : 'Live ETA'}</th>
                        <th className="pb-2 pr-2 text-right">{isHindi ? 'स्थिति' : 'Status'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {trainData.stops.map((stop, idx) => {
                        const isCurrent = stop.status === 'Current';
                        const isDeparted = stop.status === 'Departed';

                        return (
                          <tr 
                            key={stop.stationCode}
                            className={`transition-colors ${
                              isCurrent 
                                ? 'bg-cyan-950/40 border-l-4 border-l-cyan-400' 
                                : 'hover:bg-slate-900/40'
                            }`}
                          >
                            <td className="py-2.5 pl-2 text-slate-500 font-mono text-[10px]">
                              {idx + 1}
                            </td>

                            <td className="py-2.5 font-bold">
                              <div className="flex items-center gap-2">
                                {isCurrent && (
                                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                                )}
                                <div>
                                  <span className={isCurrent ? 'text-cyan-300 font-bold' : isDeparted ? 'text-slate-400' : 'text-slate-200'}>
                                    {isHindi ? stop.stationNameHindi : stop.stationName}
                                  </span>
                                  <span className="text-[10px] text-slate-500 ml-1.5">({stop.stationCode})</span>
                                </div>
                              </div>
                            </td>

                            <td className="py-2.5">
                              <span className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-[10px] text-slate-300 font-bold">
                                PF-{stop.platform}
                              </span>
                            </td>

                            <td className="py-2.5 text-slate-400">
                              {stop.distanceKm} km
                            </td>

                            <td className="py-2.5 text-slate-400">
                              {stop.scheduledArrival} / {stop.scheduledDeparture}
                            </td>

                            <td className="py-2.5">
                              <div className="flex items-center gap-1.5">
                                <span className={stop.delayMinutes > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                                  {stop.expectedArrival} / {stop.expectedDeparture}
                                </span>
                                {stop.delayMinutes > 0 && (
                                  <span className="text-[10px] text-rose-400 font-mono font-bold">
                                    (+{stop.delayMinutes}m)
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="py-2.5 pr-2 text-right">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                                isDeparted 
                                  ? 'bg-slate-800 text-slate-400' 
                                  : isCurrent 
                                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-600 animate-pulse' 
                                  : 'bg-blue-950/60 text-blue-300 border border-blue-800'
                              }`}>
                                {isDeparted 
                                  ? (isHindi ? 'रवाना (Departed)' : 'DEPARTED') 
                                  : isCurrent 
                                  ? (isHindi ? '📍 वर्तमान स्थान' : '📍 CURRENT') 
                                  : (isHindi ? 'आगामी (Upcoming)' : 'UPCOMING')}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: NTES SPOT YOUR TRAIN (enquiry.indianrail.gov.in) */}
          {activeTab === 'ntes-spot' && ntesData && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 bg-slate-950 rounded-2xl border border-blue-500/30 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 bg-blue-950 text-blue-300 border border-blue-700 rounded text-xs font-mono font-bold">
                        NTES • SPOT YOUR TRAIN
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        Ref: enquiry.indianrail.gov.in/mntes
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white mt-1">
                      {ntesData.trainNumber} - {isHindi ? ntesData.trainNameHindi : ntesData.trainName}
                    </h3>
                  </div>

                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-lg text-xs font-mono font-bold border inline-block ${
                      ntesData.delayMinutes > 0 ? 'bg-rose-950 text-rose-300 border-rose-700' : 'bg-emerald-950 text-emerald-300 border-emerald-700'
                    }`}>
                      {ntesData.delayMinutes > 0 ? `Late by ${ntesData.delayMinutes} mins` : 'Right Time'}
                    </span>
                    <div className="text-[10px] font-mono text-slate-400 mt-1">
                      Last Synced: {ntesData.lastSyncedTimestamp}
                    </div>
                  </div>
                </div>

                {/* Status Summary Banner */}
                <div className="p-3 bg-blue-950/40 border border-blue-500/40 rounded-xl flex items-center gap-3">
                  <TrainIcon className="w-5 h-5 text-blue-400 shrink-0" />
                  <div className="text-xs font-mono text-blue-200">
                    <span className="font-bold text-blue-400 uppercase">{isHindi ? 'NTES स्थिति: ' : 'NTES STATUS: '}</span>
                    {isHindi ? ntesData.statusSummaryHindi : ntesData.statusSummary}
                  </div>
                </div>

                {/* Station Schedule Table */}
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500 text-[10px] uppercase bg-slate-900/60">
                        <th className="p-2">S.No</th>
                        <th className="p-2">Station Code & Name</th>
                        <th className="p-2">Day</th>
                        <th className="p-2">Sch Arr</th>
                        <th className="p-2">Sch Dep</th>
                        <th className="p-2">Act / Exp Arr</th>
                        <th className="p-2">Act / Exp Dep</th>
                        <th className="p-2">Delay</th>
                        <th className="p-2">PF</th>
                        <th className="p-2 pr-2 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {ntesData.stationSchedule.map((st) => (
                        <tr 
                          key={st.stationCode}
                          className={st.status === 'Current' ? 'bg-blue-950/40 font-bold' : 'hover:bg-slate-900/40'}
                        >
                          <td className="p-2 text-slate-500">{st.sNo}</td>
                          <td className="p-2">
                            <span className={st.status === 'Current' ? 'text-blue-300' : 'text-slate-200'}>
                              {isHindi && st.stationNameHindi ? st.stationNameHindi : st.stationName}
                            </span>
                            <span className="text-[10px] text-slate-500 ml-1">({st.stationCode})</span>
                          </td>
                          <td className="p-2 text-slate-400">{st.day}</td>
                          <td className="p-2 text-slate-400">{st.schedArr}</td>
                          <td className="p-2 text-slate-400">{st.schedDep}</td>
                          <td className="p-2 text-emerald-400">{st.actArr}</td>
                          <td className="p-2 text-emerald-400">{st.actDep}</td>
                          <td className="p-2">
                            {st.delayMins > 0 ? (
                              <span className="text-rose-400 font-bold">+{st.delayMins}m</span>
                            ) : (
                              <span className="text-emerald-400">RT</span>
                            )}
                          </td>
                          <td className="p-2">
                            <span className="px-1.5 py-0.5 bg-slate-900 rounded border border-slate-700 text-[10px]">
                              {st.platform}
                            </span>
                          </td>
                          <td className="p-2 text-right">
                            <span className={`px-2 py-0.5 rounded text-[10px] ${
                              st.status === 'Departed' ? 'bg-slate-800 text-slate-400' : st.status === 'Current' ? 'bg-blue-900 text-blue-200 animate-pulse' : 'bg-slate-900 text-slate-400'
                            }`}>
                              {st.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: NTES LIVE STATION BOARD */}
          {activeTab === 'ntes-station' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 bg-slate-950 rounded-2xl border border-purple-500/30 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <span className="px-2.5 py-0.5 bg-purple-950 text-purple-300 border border-purple-700 rounded text-xs font-mono font-bold">
                      NTES • LIVE STATION ENQUIRY (Next 4 Hours)
                    </span>
                    <h3 className="text-lg font-bold text-white mt-1">
                      {stationOptions.find(s => s.code === selectedStationCode)?.name || selectedStationCode}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar">
                    {stationOptions.map(st => (
                      <button
                        key={st.code}
                        onClick={() => setSelectedStationCode(st.code)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                          selectedStationCode === st.code
                            ? 'bg-purple-600 text-white shadow-md'
                            : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        {st.code}
                      </button>
                    ))}
                  </div>
                </div>

                {liveStationLoading ? (
                  <div className="py-12 flex items-center justify-center gap-2 text-purple-400 font-mono text-xs">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Fetching live station departures from NTES...</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-500 text-[10px] uppercase bg-slate-900/60">
                          <th className="p-2">Train No & Name</th>
                          <th className="p-2">Source ➔ Dest</th>
                          <th className="p-2">Sch Arr / Dep</th>
                          <th className="p-2">Exp Arr / Dep</th>
                          <th className="p-2">PF</th>
                          <th className="p-2">Delay</th>
                          <th className="p-2 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {liveStationTrains.map((t) => (
                          <tr key={t.trainNumber} className="hover:bg-slate-900/40">
                            <td className="p-2 font-bold text-white">
                              <div>{t.trainNumber}</div>
                              <div className="text-[10px] text-slate-400 font-normal">{isHindi && t.trainNameHindi ? t.trainNameHindi : t.trainName}</div>
                            </td>
                            <td className="p-2 text-slate-400">
                              {t.sourceStation} ➔ {t.destinationStation}
                            </td>
                            <td className="p-2 text-slate-400">
                              {t.scheduledArrival} / {t.scheduledDeparture}
                            </td>
                            <td className="p-2 text-cyan-300 font-bold">
                              {t.expectedArrival} / {t.expectedDeparture}
                            </td>
                            <td className="p-2">
                              <span className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-[10px]">
                                {t.platform}
                              </span>
                            </td>
                            <td className="p-2">
                              {t.delayMinutes > 0 ? (
                                <span className="text-rose-400 font-bold">+{t.delayMinutes}m</span>
                              ) : (
                                <span className="text-emerald-400 font-bold">On Time</span>
                              )}
                            </td>
                            <td className="p-2 text-right">
                              <span className="px-2 py-0.5 rounded text-[10px] bg-slate-900 text-slate-300 border border-slate-800">
                                {t.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: NTES PACING & SPEED CONTROLS */}
          {activeTab === 'pacing' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 bg-slate-950 rounded-2xl border border-amber-500/30 space-y-4">
                <div>
                  <span className="px-2.5 py-0.5 bg-amber-950 text-amber-300 border border-amber-700 rounded text-xs font-mono font-bold">
                    SIMULATION PACING & REALISTIC DECELERATION CONTROLLER
                  </span>
                  <h3 className="text-lg font-bold text-white mt-1">
                    {isHindi ? 'एनटीईएस लाइव लोकेशन गति नियंत्रण' : 'NTES Live Location Movement Pacing'}
                  </h3>
                  <p className="text-xs text-slate-400 font-sans mt-1">
                    {isHindi 
                      ? 'ट्रेन लाइव लोकेशन को NTES की तरह वास्तविक, शांत गति (Calm Pacing) पर चलाएं, ताकि स्टेशन अप्रोच एवं कॉशन जोन में ट्रेन स्वाभाविक रूप से धीमी (Decelerate) हो सके।'
                      : 'Configure the simulation pace to reflect calm, real-world NTES speed and realistic deceleration when trains approach stations or travel through caution zones.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    onClick={() => updatePacingSpeed(0.35, 'CALM_REALISTIC')}
                    className={`p-4 rounded-xl border text-left space-y-2 transition-all ${
                      pacingConfig.mode === 'CALM_REALISTIC'
                        ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-lg'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="font-bold text-sm text-white flex items-center justify-between">
                      <span>🐢 Calm NTES Realistic</span>
                      <span className="text-xs font-mono text-amber-400 font-bold">0.35x (Default)</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-slate-400 font-sans">
                      {isHindi ? 'शांत व वास्तविक गति; स्टेशन आने पर स्वतः गति धीमी होती है।' : 'Smooth real-time pacing with authentic station approach slowing.'}
                    </p>
                  </button>

                  <button
                    onClick={() => updatePacingSpeed(1.0, 'NTES_REALTIME')}
                    className={`p-4 rounded-xl border text-left space-y-2 transition-all ${
                      pacingConfig.mode === 'NTES_REALTIME'
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-lg'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="font-bold text-sm text-white flex items-center justify-between">
                      <span>⏱️ 1x Real-Time Sync</span>
                      <span className="text-xs font-mono text-cyan-400 font-bold">1.0x</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-slate-400 font-sans">
                      {isHindi ? '1x सामान्य सिमुलेशन गति' : 'Standard 1x playback rate.'}
                    </p>
                  </button>

                  <button
                    onClick={() => updatePacingSpeed(2.5, 'FAST_SIMULATION')}
                    className={`p-4 rounded-xl border text-left space-y-2 transition-all ${
                      pacingConfig.mode === 'FAST_SIMULATION'
                        ? 'bg-purple-500/20 border-purple-400 text-purple-200 shadow-lg'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="font-bold text-sm text-white flex items-center justify-between">
                      <span>⚡ Fast-Forward</span>
                      <span className="text-xs font-mono text-purple-400 font-bold">2.5x</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-slate-400 font-sans">
                      {isHindi ? 'त्वरित सिमुलेशन गति' : 'Rapid dispatch cycle for fast testing.'}
                    </p>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
