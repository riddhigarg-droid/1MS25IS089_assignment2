import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Key,
  Cpu,
  Search,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sun,
  Moon,
  ExternalLink,
} from 'lucide-react';
import type { SettingsStatus } from '../types';
import { testGeminiKey } from '../services/api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: SettingsStatus | null;
  onSave: (settings: {
    apiKey: string;
    model: string;
    searchProvider: string;
    maxIterations: number;
    theme: string;
  }) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  status,
  onSave,
}) => {
  const [apiKey, setApiKey] = useState(
    () => localStorage.getItem('nexus_gemini_key') || ''
  );
  const [selectedModel, setSelectedModel] = useState(
    () => localStorage.getItem('nexus_selected_model') || status?.selected_model || 'gemini-3.5-flash-lite'
  );
  const [searchProvider, setSearchProvider] = useState(
    () => localStorage.getItem('nexus_search_provider') || 'duckduckgo'
  );
  const [maxIterations, setMaxIterations] = useState<number>(
    () => parseInt(localStorage.getItem('nexus_max_iterations') || '5', 10)
  );
  const [theme, setTheme] = useState(
    () => localStorage.getItem('nexus_theme') || 'dark'
  );

  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ connected: boolean; message: string } | null>(null);

  const handleTestKey = async () => {
    if (!apiKey.trim()) {
      setTestResult({ connected: false, message: 'Please enter an API key to test' });
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testGeminiKey(apiKey.trim(), selectedModel);
      setTestResult(res);
    } catch (e: any) {
      setTestResult({ connected: false, message: e.message || 'Connection test failed' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    localStorage.setItem('nexus_gemini_key', apiKey.trim());
    localStorage.setItem('nexus_selected_model', selectedModel);
    localStorage.setItem('nexus_search_provider', searchProvider);
    localStorage.setItem('nexus_max_iterations', maxIterations.toString());
    localStorage.setItem('nexus_theme', theme);

    if (theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }

    onSave({
      apiKey: apiKey.trim(),
      model: selectedModel,
      searchProvider,
      maxIterations,
      theme,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-xl bg-[#0f111a] border border-white/10 rounded-2xl shadow-2xl shadow-black overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-5 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">NEXUS Configuration</h3>
                <p className="text-[11px] text-slate-400">Agentic Architecture & Model Parameters</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 text-left">
            {/* Gemini API Key */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-purple-400" />
                  Google Gemini API Key
                </label>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
                >
                  Get free key <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>

              <div className="relative flex items-center">
                <input
                  type={showKey ? 'text' : 'password'}
                  placeholder="AIzaSy..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/50 pr-20 font-mono"
                />
                <div className="absolute right-2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={handleTestKey}
                    disabled={isTesting}
                    className="px-2 py-1 rounded bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-[10px] font-medium border border-purple-500/30 transition-colors"
                  >
                    {isTesting ? 'Testing...' : 'Test'}
                  </button>
                </div>
              </div>

              {testResult && (
                <div
                  className={`p-2.5 rounded-lg text-xs flex items-center gap-2 border ${
                    testResult.connected
                      ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {testResult.connected ? (
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>

            {/* Model Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                Gemini Model
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  {
                    id: 'gemini-3.5-flash-lite',
                    title: 'Gemini 3.5 Flash-Lite',
                    badge: 'Recommended',
                    desc: 'Ultra-fast, lowest-cost 3.5 model for high-throughput execution',
                  },
                  {
                    id: 'gemini-3.8-flash',
                    title: 'Gemini 3.8 Flash',
                    badge: 'High Reasoning',
                    desc: 'Lightning fast tool calling & high precision',
                  },
                  {
                    id: 'gemini-2.5-flash',
                    title: 'Gemini 2.5 Flash',
                    badge: 'Balanced',
                    desc: 'High performance multimodal execution',
                  },
                  {
                    id: 'gemini-2.5-pro',
                    title: 'Gemini 2.5 Pro',
                    badge: 'Deep Reasoning',
                    desc: 'Maximum depth for complex multi-hop queries',
                  },
                ].map((m) => (
                  <div
                    key={m.id}
                    onClick={() => setSelectedModel(m.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedModel === m.id
                        ? 'bg-purple-950/40 border-purple-500/60 shadow-md shadow-purple-950/40'
                        : 'bg-slate-950/50 border-white/5 hover:border-white/10 hover:bg-slate-900/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-slate-200">{m.title}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono">
                        {m.badge}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-snug">{m.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Search Provider */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-cyan-400" />
                Live Search Tool Engine
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { id: 'duckduckgo', name: 'DuckDuckGo', desc: 'Zero API Key needed (Default)' },
                  { id: 'tavily', name: 'Tavily AI', desc: 'Requires TAVILY_API_KEY' },
                  { id: 'serper', name: 'Google Serper', desc: 'Requires SERPER_API_KEY' },
                ].map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setSearchProvider(p.id)}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all text-center ${
                      searchProvider === p.id
                        ? 'bg-cyan-950/40 border-cyan-500/60 text-white'
                        : 'bg-slate-950/50 border-white/5 hover:border-white/10 text-slate-400'
                    }`}
                  >
                    <div className="text-xs font-medium text-slate-200">{p.name}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{p.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Max Iterations Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-200">
                  Maximum ReAct Iterations
                </label>
                <span className="text-xs font-mono text-purple-400 font-bold">
                  {maxIterations} {maxIterations === 1 ? 'cycle' : 'cycles'}
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={maxIterations}
                onChange={(e) => setMaxIterations(parseInt(e.target.value, 10))}
                className="w-full accent-purple-500 cursor-pointer"
              />
              <p className="text-[10px] text-slate-500">
                Limits how many times the agent can reason and search consecutively before compiling its final response.
              </p>
            </div>

            {/* Theme Toggle */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-200">Interface Theme</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`flex-1 py-2 px-3 rounded-xl border text-xs flex items-center justify-center gap-2 transition-all ${
                    theme === 'dark'
                      ? 'bg-purple-950/40 border-purple-500/60 text-white'
                      : 'bg-slate-950/40 border-white/5 text-slate-400'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" /> Dark Mode
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`flex-1 py-2 px-3 rounded-xl border text-xs flex items-center justify-center gap-2 transition-all ${
                    theme === 'light'
                      ? 'bg-purple-950/40 border-purple-500/60 text-white'
                      : 'bg-slate-950/40 border-white/5 text-slate-400'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" /> Light Mode
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-white/5 flex items-center justify-end gap-2 bg-slate-950/60">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl text-xs font-medium bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-950/50 transition-all"
            >
              Save Configuration
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
