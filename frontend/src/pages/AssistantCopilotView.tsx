import React, { useState } from 'react';
import { Bot, Send, Sparkles, ArrowRight, User, AlertOctagon, HelpCircle, ShieldCheck } from 'lucide-react';
import { apiClient } from '../services/api';

interface AssistantCopilotViewProps {
  onSelectProject: (id: string) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  highlighted_projects?: Array<{
    project_id: string;
    work_name: string;
    district: string;
    risk_score: number;
    risk_level: string;
    primary_reason: string;
  }>;
  suggested_queries?: string[];
  metrics_summary?: Record<string, string | number>;
  timestamp: string;
}

export const AssistantCopilotView: React.FC<AssistantCopilotViewProps> = ({ onSelectProject }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'assistant',
      text: 'Welcome to **MPLAD Sentinel AI Copilot**. I analyze live MPLADS multi-signal risk matrices, peer benchmarks, NLP duplicate candidates, and agency performance.\n\nYou can query me regarding specific projects, regional risk distributions, timeline slippages, or duplicate candidates.',
      suggested_queries: [
        'Why is DEMO-001 high risk?',
        'Show potential duplicate works in Ghaziabad',
        'Which projects have expenditure progress mismatch?',
        'Which agencies have the highest delay rate?'
      ],
      timestamp: new Date().toLocaleTimeString()
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const samplePrompts = [
    'Why is DEMO-001 high risk?',
    'Why is DEMO-003 high risk?',
    'Show potential duplicate works in Ghaziabad',
    'Which agencies have the highest delay rate?',
    'Show high-risk projects in Uttar Pradesh',
    'Summarize overall platform risk intelligence'
  ];

  const handleSend = async (queryToSend?: string) => {
    const query = (queryToSend || inputQuery).trim();
    if (!query || isTyping) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setIsTyping(true);

    try {
      const response = await apiClient.queryAssistant(query);
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: response.answer,
        highlighted_projects: response.highlighted_projects,
        suggested_queries: response.suggested_queries,
        metrics_summary: response.metrics_summary,
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: `Error querying intelligence engine: ${err.message}`,
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-slate-100 uppercase tracking-wider">
              MPLAD Sentinel AI Intelligence Copilot
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Natural language decision support powered by deterministic risk features and multi-signal metrics
          </p>
        </div>

        <span className="text-xs font-bold px-2.5 py-1 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 self-start sm:self-auto">
          Multi-Signal Query Mode
        </span>
      </div>

      {/* Suggested Prompt Chips */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Suggested Queries:
        </span>
        {samplePrompts.map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleSend(prompt)}
            className="text-xs px-2.5 py-1 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Chat Messages Container */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl space-y-5 min-h-[460px] max-h-[620px] overflow-y-auto">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'assistant' && (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-teal-600 flex items-center justify-center shrink-0 shadow-md">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}

            <div
              className={`max-w-2xl rounded-xl p-4 text-xs space-y-3 ${
                msg.sender === 'user'
                  ? 'bg-teal-600/20 text-teal-100 border border-teal-500/40'
                  : 'bg-slate-950/80 text-slate-200 border border-slate-800'
              }`}
            >
              {/* Message text with basic markdown rendering */}
              <div className="whitespace-pre-line leading-relaxed">
                {msg.text.split('\n').map((line, idx) => {
                  if (line.startsWith('**') && line.endsWith('**')) {
                    return <p key={idx} className="font-bold text-slate-100 text-sm mt-1">{line.replace(/\*\*/g, '')}</p>;
                  }
                  return <p key={idx} className="mt-0.5">{line}</p>;
                })}
              </div>

              {/* Metrics Summary Pills if available */}
              {msg.metrics_summary && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800/80">
                  {Object.entries(msg.metrics_summary).map(([k, v]) => (
                    <div key={k} className="px-2.5 py-1 rounded bg-slate-900 text-[11px] border border-slate-700">
                      <span className="text-slate-400">{k}: </span>
                      <span className="font-bold text-teal-300 font-mono">{v}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Highlighted Project Action Cards */}
              {msg.highlighted_projects && msg.highlighted_projects.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Direct Dossier Inspection Links:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {msg.highlighted_projects.map((proj) => (
                      <div
                        key={proj.project_id}
                        onClick={() => onSelectProject(proj.project_id)}
                        className="p-2.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-teal-500/40 cursor-pointer transition flex items-center justify-between gap-2"
                      >
                        <div className="overflow-hidden">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-teal-400 text-[11px]">{proj.project_id}</span>
                            <span className="text-[10px] text-slate-400 truncate">({proj.district})</span>
                          </div>
                          <p className="text-[10px] text-slate-300 truncate mt-0.5">{proj.work_name}</p>
                        </div>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 shrink-0">
                          {proj.risk_score} pts
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested Followup Query Chips */}
              {msg.suggested_queries && msg.suggested_queries.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-800/60">
                  {msg.suggested_queries.map((sq, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(sq)}
                      className="text-[10px] px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 transition"
                    >
                      {sq}
                    </button>
                  ))}
                </div>
              )}

              <span className="text-[10px] text-slate-500 block text-right pt-1">{msg.timestamp}</span>
            </div>

            {msg.sender === 'user' && (
              <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-3 items-center text-xs text-slate-400">
            <div className="w-8 h-8 rounded-lg bg-cyan-600/30 flex items-center justify-center">
              <Bot className="w-4 h-4 text-cyan-300 animate-pulse" />
            </div>
            <span>Evaluating risk features and peer matrices...</span>
          </div>
        )}
      </div>

      {/* Input Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-xl flex items-center gap-2">
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask Sentinel AI about projects, risk scores, duplicate works, or agencies..."
          className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
        />
        <button
          onClick={() => handleSend()}
          disabled={!inputQuery.trim() || isTyping}
          className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition disabled:opacity-40 shadow-md shadow-teal-600/20"
        >
          <span>Query</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
