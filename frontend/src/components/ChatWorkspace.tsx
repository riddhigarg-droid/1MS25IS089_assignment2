import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowUp,
  Square,
  Sparkles,
  Compass,
  Layers,
  Activity,
  Trash2,
  Cpu,
  Zap,
} from 'lucide-react';
import type { MessageItem as MessageItemType, SearchResultItem } from '../types';
import { MessageItem } from './MessageItem';

interface ChatWorkspaceProps {
  messages: MessageItemType[];
  isGenerating: boolean;
  currentStreamingAnswer: string;
  streamingSources: SearchResultItem[];
  onSendMessage: (message: string) => void;
  onStop: () => void;
  onClear: () => void;
  onTogglePanel: () => void;
  isPanelOpen: boolean;
  selectedModel: string;
  maxIterations: number;
}

const STARTER_PROMPTS = [
  {
    title: 'Artificial Intelligence',
    prompt: 'Research the latest developments in artificial intelligence.',
    desc: 'Reasoning models, agentic workflows & industry breakthroughs',
    icon: <Sparkles className="w-4 h-4 text-purple-400" />,
  },
  {
    title: 'FastAPI vs Flask',
    prompt: 'Compare FastAPI and Flask for production applications.',
    desc: 'Performance, async architecture, ecosystem & benchmark comparison',
    icon: <Zap className="w-4 h-4 text-cyan-400" />,
  },
  {
    title: 'Open-Source Agents',
    prompt: 'Find the best open-source agent frameworks.',
    desc: 'LangGraph, AutoGen, CrewAI, LlamaIndex comparison & suitability',
    icon: <Cpu className="w-4 h-4 text-indigo-400" />,
  },
  {
    title: 'Renewable Energy',
    prompt: 'Research the latest developments in renewable energy.',
    desc: 'Solar efficiency, solid-state batteries & grid integration stats',
    icon: <Compass className="w-4 h-4 text-emerald-400" />,
  },
];

export const ChatWorkspace: React.FC<ChatWorkspaceProps> = ({
  messages,
  isGenerating,
  currentStreamingAnswer,
  streamingSources,
  onSendMessage,
  onStop,
  onClear,
  onTogglePanel,
  isPanelOpen,
  selectedModel,
  maxIterations,
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentStreamingAnswer]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!input.trim() || isGenerating) return;
    const query = input.trim();
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    onSendMessage(query);
  };

  const handleInputResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`;
  };

  const lastUserQuery = [...messages].reverse().find((m) => m.role === 'user')?.content;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0a0c13] relative">
      {/* Top action bar */}
      <div className="h-12 border-b border-white/5 flex items-center justify-between px-4 sm:px-6 bg-[#0a0c13]/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-300">NEXUS Research Workspace</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-mono">
            {selectedModel}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={onClear}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800/60 transition-colors"
              title="Clear chat messages"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={onTogglePanel}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              isPanelOpen
                ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Activity className={`w-3.5 h-3.5 ${isGenerating ? 'animate-pulse text-purple-400' : ''}`} />
            <span>Execution Panel</span>
          </button>
        </div>
      </div>

      {/* Main Chat Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 ? (
          /* Welcome Hero View */
          <div className="max-w-2xl mx-auto py-8 sm:py-16 text-center space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-mono shadow-inner">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>NEXUS v1.0 — Autonomous ReAct Intelligence</span>
              </div>

              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                What would you like to{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-indigo-400 to-cyan-400">
                  research
                </span>{' '}
                today?
              </h2>

              <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
                An autonomous agent that reasons, queries the live web, observes real results, and compiles fully verified and cited reports.
              </p>
            </motion.div>

            {/* Starter Prompt Cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.1 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left"
            >
              {STARTER_PROMPTS.map((starter, i) => (
                <div
                  key={i}
                  onClick={() => onSendMessage(starter.prompt)}
                  className="p-3.5 rounded-2xl bg-slate-900/50 hover:bg-slate-800/80 border border-white/5 hover:border-purple-500/30 transition-all duration-200 cursor-pointer group shadow-lg shadow-black/20"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    {starter.icon}
                    <h4 className="text-xs font-semibold text-slate-200 group-hover:text-white">
                      {starter.title}
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-400 group-hover:text-slate-300 leading-relaxed">
                    {starter.desc}
                  </p>
                </div>
              ))}
            </motion.div>
          </div>
        ) : (
          /* Message Stream View */
          <div className="space-y-4 max-w-4xl mx-auto">
            {messages.map((msg) => (
              <MessageItem
                key={msg.id}
                message={msg}
                onRegenerate={onSendMessage}
                lastUserQuery={lastUserQuery}
              />
            ))}

            {/* Currently Streaming Assistant Response */}
            {isGenerating && currentStreamingAnswer && (
              <MessageItem
                message={{
                  id: 'streaming-message',
                  role: 'assistant',
                  content: currentStreamingAnswer,
                  timestamp: new Date().toISOString(),
                  sources: streamingSources,
                  steps: [],
                  iteration_count: 1,
                }}
                isStreaming={true}
              />
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Sticky Bottom Prompt Input Area */}
      <div className="p-4 sm:p-6 bg-gradient-to-t from-[#0a0c13] via-[#0a0c13]/95 to-transparent">
        <div className="max-w-4xl mx-auto">
          <div className="relative rounded-2xl bg-slate-900/80 border border-white/10 shadow-2xl shadow-black/50 focus-within:border-purple-500/50 focus-within:ring-2 focus-within:ring-purple-500/10 transition-all">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={handleInputResize}
              onKeyDown={handleKeyDown}
              placeholder="Ask Nexus anything. I'll research it for you..."
              className="w-full bg-transparent px-4 py-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none resize-none max-h-44"
            />

            <div className="flex items-center justify-between px-3.5 py-2 border-t border-white/5">
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span className="flex items-center gap-1 font-mono text-purple-400">
                  <Layers className="w-3 h-3" /> Max {maxIterations} cycles
                </span>
                <span className="hidden sm:inline text-slate-600">·</span>
                <span className="hidden sm:inline text-slate-500">Live Search Grounded</span>
              </div>

              <div className="flex items-center gap-2">
                {isGenerating ? (
                  <button
                    onClick={onStop}
                    className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Stop</span>
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={!input.trim()}
                    className="p-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-md shadow-purple-900/40 transition-all cursor-pointer"
                    title="Send query"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-2 px-1 text-[10px] text-slate-500">
            <span>Press <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">Enter</kbd> to research, <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">Shift+Enter</kbd> for new line</span>
            <span className="hidden sm:inline font-mono">NEXUS Agent Engine · Built for Assignment 2</span>
          </div>
        </div>
      </div>
    </div>
  );
};
