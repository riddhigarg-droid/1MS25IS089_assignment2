import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Cpu,
  Search,
  Eye,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  Globe,
  Compass,
  Code2,
  Copy,
  Check,
  X,
  Loader2,
  Database,
  ExternalLink,
} from 'lucide-react';
import type { ExecutionStep, SearchResultItem } from '../types';

interface ExecutionPanelProps {
  steps: ExecutionStep[];
  sources: SearchResultItem[];
  isGenerating: boolean;
  isOpen: boolean;
  onClose: () => void;
}

export const ExecutionPanel: React.FC<ExecutionPanelProps> = ({
  steps,
  sources,
  isGenerating,
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'timeline' | 'sources' | 'events'>('timeline');
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);
  const [copiedEvents, setCopiedEvents] = useState(false);

  const toggleStep = (id: string) => {
    setExpandedStepId(expandedStepId === id ? null : id);
  };

  const handleCopyEvents = () => {
    navigator.clipboard.writeText(JSON.stringify(steps, null, 2));
    setCopiedEvents(true);
    setTimeout(() => setCopiedEvents(false), 2000);
  };

  // Compute current execution state badge
  const currentStep = steps[steps.length - 1];
  let statusBadge = {
    label: 'Idle',
    color: 'bg-slate-800 text-slate-400 border-slate-700',
    icon: <Activity className="w-3 h-3" />,
  };

  if (isGenerating) {
    if (currentStep?.event === 'tool_started' || currentStep?.event === 'tool_call') {
      statusBadge = {
        label: 'Searching Web',
        color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30 animate-pulse',
        icon: <Search className="w-3 h-3" />,
      };
    } else if (currentStep?.event === 'observation') {
      statusBadge = {
        label: 'Observing Results',
        color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30 animate-pulse',
        icon: <Eye className="w-3 h-3" />,
      };
    } else {
      statusBadge = {
        label: 'Reasoning & Planning',
        color: 'bg-purple-500/20 text-purple-300 border-purple-500/30 animate-pulse',
        icon: <Cpu className="w-3 h-3" />,
      };
    }
  } else if (steps.length > 0) {
    const hasError = steps.some((s) => s.event === 'agent_error');
    if (hasError) {
      statusBadge = {
        label: 'Error Occurred',
        color: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
        icon: <AlertTriangle className="w-3 h-3" />,
      };
    } else {
      statusBadge = {
        label: 'Completed',
        color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        icon: <CheckCircle2 className="w-3 h-3" />,
      };
    }
  }

  const getStepIcon = (event: string, status: string) => {
    if (status === 'error') return <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />;
    switch (event) {
      case 'agent_started':
        return <Activity className="w-3.5 h-3.5 text-purple-400" />;
      case 'planning':
        return <Cpu className="w-3.5 h-3.5 text-indigo-400" />;
      case 'tool_call':
      case 'tool_started':
        return <Search className="w-3.5 h-3.5 text-cyan-400" />;
      case 'tool_result':
        return <Database className="w-3.5 h-3.5 text-emerald-400" />;
      case 'observation':
        return <Eye className="w-3.5 h-3.5 text-amber-400" />;
      case 'final_answer':
      case 'agent_completed':
        return <Sparkles className="w-3.5 h-3.5 text-emerald-400" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <aside
      className={`fixed lg:static top-0 right-0 h-full w-80 sm:w-96 lg:w-[400px] z-30 flex flex-col bg-[#0b0d14]/95 backdrop-blur-xl border-l border-white/5 transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
      }`}
    >
      {/* Header */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-slate-200">ReAct Execution Panel</h3>
            <p className="text-[10px] text-slate-400">Live Reasoning & Action Cycle</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full border font-mono flex items-center gap-1.5 ${statusBadge.color}`}
          >
            {statusBadge.icon}
            {statusBadge.label}
          </span>
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center px-4 border-b border-white/5 text-xs">
        <button
          onClick={() => setActiveTab('timeline')}
          className={`py-2.5 px-3 border-b-2 font-medium flex items-center gap-1.5 transition-colors ${
            activeTab === 'timeline'
              ? 'border-purple-500 text-purple-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          Timeline ({steps.length})
        </button>

        <button
          onClick={() => setActiveTab('sources')}
          className={`py-2.5 px-3 border-b-2 font-medium flex items-center gap-1.5 transition-colors ${
            activeTab === 'sources'
              ? 'border-purple-500 text-purple-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          Sources ({sources.length})
        </button>

        <button
          onClick={() => setActiveTab('events')}
          className={`py-2.5 px-3 border-b-2 font-medium flex items-center gap-1.5 transition-colors ${
            activeTab === 'events'
              ? 'border-purple-500 text-purple-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          Raw Log
        </button>
      </div>

      {/* Body Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* TAB 1: TIMELINE */}
        {activeTab === 'timeline' && (
          <div className="relative pl-6 space-y-4">
            {steps.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-40 text-purple-400 animate-pulse" />
                <p className="text-xs">No active execution.</p>
                <p className="text-[11px] text-slate-600 mt-1">
                  Send a prompt to observe the live ReAct cycle.
                </p>
              </div>
            ) : (
              <>
                {/* Vertical connecting line */}
                <div className="absolute left-2.5 top-3 bottom-3 w-[1.5px] bg-gradient-to-b from-purple-500/50 via-cyan-500/30 to-slate-800" />

                {steps.map((step, idx) => {
                  const isExpanded = expandedStepId === step.id;
                  const isLatest = idx === steps.length - 1 && isGenerating;

                  return (
                    <motion.div
                      key={step.id}
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="relative group text-left"
                    >
                      {/* Node circle */}
                      <div
                        className={`absolute -left-6 top-1 w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                          isLatest
                            ? 'bg-purple-950 border-purple-400 ring-2 ring-purple-500/30 ring-offset-1 ring-offset-[#0b0d14]'
                            : step.status === 'error'
                            ? 'bg-rose-950 border-rose-500'
                            : 'bg-slate-900 border-slate-700 group-hover:border-slate-500'
                        }`}
                      >
                        {isLatest ? (
                          <Loader2 className="w-3 h-3 text-purple-300 animate-spin" />
                        ) : (
                          getStepIcon(step.event, step.status)
                        )}
                      </div>

                      {/* Step Card */}
                      <div
                        onClick={() => toggleStep(step.id)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                          isLatest
                            ? 'bg-purple-950/20 border-purple-500/30 shadow-md shadow-purple-950/30'
                            : 'bg-slate-900/50 border-white/5 hover:border-white/10 hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-medium text-slate-200 line-clamp-1">
                            {step.title}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500 flex-shrink-0">
                            {new Date(step.timestamp).toLocaleTimeString([], {
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {step.description}
                        </p>

                        {/* Collapsible details preview */}
                        {step.data && Object.keys(step.data).length > 0 && (
                          <div className="mt-2 flex items-center justify-between text-[10px] text-purple-400 pt-1.5 border-t border-white/5">
                            <span>
                              {step.event === 'tool_result'
                                ? `${step.data.results_count || 0} results · ${step.data.duration_ms || 0}ms`
                                : step.event === 'tool_call'
                                ? `Query: "${step.data.arguments?.query || ''}"`
                                : 'View details'}
                            </span>
                            {isExpanded ? (
                              <ChevronDown className="w-3 h-3" />
                            ) : (
                              <ChevronRight className="w-3 h-3" />
                            )}
                          </div>
                        )}

                        <AnimatePresence>
                          {isExpanded && step.data && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-2 pt-2 border-t border-white/10 text-[10px] font-mono overflow-hidden"
                            >
                              <pre className="p-2 rounded bg-black/60 text-slate-300 overflow-x-auto max-h-40 whitespace-pre-wrap">
                                {JSON.stringify(step.data, null, 2)}
                              </pre>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {/* TAB 2: SOURCES */}
        {activeTab === 'sources' && (
          <div className="space-y-2">
            {sources.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Compass className="w-8 h-8 mx-auto mb-2 opacity-40 text-cyan-400" />
                <p className="text-xs">No sources discovered yet.</p>
                <p className="text-[11px] text-slate-600 mt-1">
                  Sources collected by the search tool will show up here.
                </p>
              </div>
            ) : (
              sources.map((src, i) => (
                <a
                  key={i}
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-white/5 hover:border-cyan-500/30 transition-all text-left group"
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-semibold flex items-center justify-center flex-shrink-0">
                        {i + 1}
                      </span>
                      <Globe className="w-3 h-3 text-slate-400 flex-shrink-0" />
                      <span className="text-[11px] text-slate-400 font-mono truncate">
                        {src.domain}
                      </span>
                    </div>
                    <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-cyan-400 transition-colors flex-shrink-0" />
                  </div>
                  <h5 className="text-xs font-medium text-slate-200 group-hover:text-white line-clamp-1">
                    {src.title}
                  </h5>
                  <p className="text-[10px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                    {src.snippet}
                  </p>
                </a>
              ))
            )}
          </div>
        )}

        {/* TAB 3: RAW EVENTS LOG */}
        {activeTab === 'events' && (
          <div className="space-y-2 text-left">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400">Structured SSE Log</span>
              <button
                onClick={handleCopyEvents}
                className="text-xs px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 transition-colors"
              >
                {copiedEvents ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Copy JSON
                  </>
                )}
              </button>
            </div>
            <pre className="p-3 rounded-xl bg-black/80 border border-white/5 text-[10px] font-mono text-cyan-300/90 overflow-x-auto max-h-[500px]">
              {JSON.stringify(steps, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </aside>
  );
};
