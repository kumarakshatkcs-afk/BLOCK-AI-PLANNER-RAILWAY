import React, { useState } from 'react';
import { Bot, Sparkles, Send, Loader2 } from 'lucide-react';
import { TrackSegment } from '../types';

interface AiCopilotProps {
  segments: TrackSegment[];
}

export function AiCopilot({ segments }: AiCopilotProps) {
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [chat, setChat] = useState<{role: 'user'|'ai', text: string}[]>([
     { role: 'ai', text: 'I am the Rail-AI Copilot. Ask me to simulate track closures, predict delay propagation, or find the best maintenance blocks.' }
  ]);

  const handleChatSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;
    
    const userQ = query;
    setChat(prev => [...prev, { role: 'user', text: userQ }]);
    setQuery("");
    setLoading(true);

    try {
      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userQ, segmentId: segments[0]?.id })
      });
      const data = await res.json();
      setChat(prev => [...prev, { role: 'ai', text: data.text }]);
    } catch (err) {
      setChat(prev => [...prev, { role: 'ai', text: "Connection to AI Agent lost." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl flex flex-col h-full overflow-hidden shadow-xl">
      <div className="p-2 border-b border-slate-800 bg-slate-950/50 flex items-center gap-2">
        <Bot className="w-4 h-4 text-purple-400" />
        <h3 className="font-semibold text-slate-200 text-[10px] font-mono tracking-wider uppercase">AI Railway Copilot</h3>
      </div>

      <div className="flex-1 flex flex-col p-3 overflow-hidden">
        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
           {chat.map((msg, i) => (
             <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-slate-700' : 'bg-purple-900/50 border border-purple-500/30'}`}>
                   {msg.role === 'user' ? <span className="text-[10px] text-slate-300">U</span> : <Sparkles className="w-3 h-3 text-purple-400" />}
                </div>
                <div className={`p-2 rounded-lg text-xs leading-relaxed max-w-[85%] ${msg.role === 'user' ? 'bg-slate-800 text-slate-200' : 'bg-purple-950/20 text-slate-300 border border-purple-900/30 font-sans'}`}>
                   {msg.text}
                </div>
             </div>
           ))}
           {loading && (
             <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-purple-900/50 border border-purple-500/30 flex items-center justify-center shrink-0">
                   <Loader2 className="w-3 h-3 text-purple-400 animate-spin" />
                </div>
                <div className="p-2 rounded-lg text-xs bg-purple-950/20 text-slate-400 border border-purple-900/30">
                   Reasoning over network graph...
                </div>
             </div>
           )}
        </div>

        <form onSubmit={handleChatSubmit} className="mt-3 relative">
           <input 
             type="text" 
             value={query}
             onChange={e => setQuery(e.target.value)}
             placeholder="Try: 'Which is the best time for TDL-CNB?'" 
             className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-3 pr-10 py-2 text-xs font-sans text-slate-200 focus:outline-none focus:border-purple-500 transition-colors"
           />
           <button type="submit" disabled={loading} className="absolute right-2 top-1/2 -translate-y-1/2 text-purple-400 hover:text-purple-300 disabled:opacity-50 p-1">
             <Send className="w-3 h-3" />
           </button>
        </form>
      </div>
    </div>
  );
}
