import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion } from 'framer-motion';
import {
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  User,
  Compass,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { MessageItem as MessageItemType } from '../types';
import { SearchCard } from './SearchCard';

interface MessageItemProps {
  message: MessageItemType;
  onRegenerate?: (query: string) => void;
  lastUserQuery?: string;
  isStreaming?: boolean;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  onRegenerate,
  lastUserQuery,
  isStreaming = false,
}) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [showAllSources, setShowAllSources] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const visibleSources = showAllSources
    ? message.sources
    : message.sources?.slice(0, 4);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`group w-full max-w-4xl mx-auto py-5 px-4 md:px-6 rounded-2xl transition-colors ${
        isUser
          ? 'bg-transparent text-right'
          : 'bg-slate-900/40 border border-white/5 shadow-lg shadow-black/20'
      }`}
    >
      <div className={`flex items-start gap-3.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div
          className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
            isUser
              ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/20'
              : 'bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/20'
          }`}
        >
          {isUser ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
        </div>

        {/* Content Body */}
        <div className={`flex-1 min-w-0 ${isUser ? 'text-right' : 'text-left'}`}>
          {/* Header metadata */}
          <div
            className={`flex items-center gap-2 mb-2 ${
              isUser ? 'justify-end' : 'justify-start'
            }`}
          >
            <span className="text-xs font-semibold text-slate-300">
              {isUser ? 'You' : 'NEXUS Agent'}
            </span>
            {!isUser && (
              <>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-mono">
                  ReAct Loop
                </span>
                {message.iteration_count > 1 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono flex items-center gap-1">
                    <Layers className="w-2.5 h-2.5" />
                    {message.iteration_count} iterations
                  </span>
                )}
                {message.sources && message.sources.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono flex items-center gap-1">
                    <Compass className="w-2.5 h-2.5" />
                    {message.sources.length} sources
                  </span>
                )}
              </>
            )}
            <span className="text-[10px] text-slate-500">
              {new Date(message.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>

          {/* Sources Section for Assistant Messages */}
          {!isUser && message.sources && message.sources.length > 0 && (
            <div className="mb-4 p-3 rounded-xl bg-slate-950/60 border border-white/5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-cyan-400" />
                  Verified Sources ({message.sources.length})
                </span>
                {message.sources.length > 4 && (
                  <button
                    onClick={() => setShowAllSources(!showAllSources)}
                    className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
                  >
                    {showAllSources ? (
                      <>
                        Show less <ChevronUp className="w-3 h-3" />
                      </>
                    ) : (
                      <>
                        Show all ({message.sources.length}) <ChevronDown className="w-3 h-3" />
                      </>
                    )}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {visibleSources.map((source, idx) => (
                  <SearchCard key={idx} source={source} index={idx} />
                ))}
              </div>
            </div>
          )}

          {/* Markdown Content */}
          <div
            className={`prose prose-invert max-w-none text-sm leading-relaxed ${
              isUser ? 'inline-block text-slate-100 bg-purple-600/20 border border-purple-500/30 px-4 py-2.5 rounded-2xl rounded-tr-none text-left' : 'text-slate-200'
            }`}
          >
            {isUser ? (
              <p className="whitespace-pre-wrap">{message.content}</p>
            ) : (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ node, ...props }) => (
                    <h1 className="text-lg font-bold text-white mt-4 mb-2 border-b border-white/10 pb-1" {...props} />
                  ),
                  h2: ({ node, ...props }) => (
                    <h2 className="text-base font-semibold text-white mt-3.5 mb-1.5 text-purple-300" {...props} />
                  ),
                  h3: ({ node, ...props }) => (
                    <h3 className="text-sm font-semibold text-cyan-300 mt-2.5 mb-1" {...props} />
                  ),
                  p: ({ node, ...props }) => <p className="mb-3 leading-relaxed text-slate-300" {...props} />,
                  ul: ({ node, ...props }) => <ul className="list-disc list-inside space-y-1 my-2 text-slate-300" {...props} />,
                  ol: ({ node, ...props }) => <ol className="list-decimal list-inside space-y-1 my-2 text-slate-300" {...props} />,
                  li: ({ node, ...props }) => <li className="text-slate-300" {...props} />,
                  table: ({ node, ...props }) => (
                    <div className="overflow-x-auto my-3 rounded-lg border border-white/10">
                      <table className="min-w-full divide-y divide-white/10 text-xs" {...props} />
                    </div>
                  ),
                  th: ({ node, ...props }) => (
                    <th className="bg-slate-800/80 px-3 py-2 text-left font-semibold text-slate-200" {...props} />
                  ),
                  td: ({ node, ...props }) => (
                    <td className="px-3 py-2 text-slate-300 border-t border-white/5" {...props} />
                  ),
                  a: ({ node, ...props }) => (
                    <a
                      className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors"
                      target="_blank"
                      rel="noopener noreferrer"
                      {...props}
                    />
                  ),
                  code: ({ node, className, children, ...props }: any) => {
                    const match = /language-(\w+)/.exec(className || '');
                    const isInline = !match && typeof children === 'string' && !children.includes('\n');
                    if (isInline) {
                      return (
                        <code
                          className="bg-slate-800 px-1.5 py-0.5 rounded text-purple-300 font-mono text-[12px] border border-white/5"
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    }
                    return (
                      <div className="relative my-3 rounded-xl overflow-hidden border border-white/10 bg-slate-950">
                        <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-900 border-b border-white/5 text-[11px] text-slate-400 font-mono">
                          <span>{match ? match[1] : 'code'}</span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
                            }}
                            className="hover:text-white flex items-center gap-1 transition-colors"
                          >
                            <Copy className="w-3 h-3" /> Copy
                          </button>
                        </div>
                        <pre className="p-3.5 overflow-x-auto text-xs text-slate-200 font-mono">
                          <code className={className} {...props}>
                            {children}
                          </code>
                        </pre>
                      </div>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            )}
            {isStreaming && (
              <span className="inline-block w-2 h-4 ml-1 bg-purple-400 animate-pulse" />
            )}
          </div>

          {/* Assistant Action Buttons */}
          {!isUser && !isStreaming && (
            <div className="flex items-center gap-2 mt-3 pt-2 border-t border-white/5 text-slate-400">
              <button
                onClick={handleCopy}
                className="text-xs px-2.5 py-1 rounded-md hover:bg-slate-800/80 hover:text-slate-200 flex items-center gap-1.5 transition-colors"
                title="Copy response"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>

              {onRegenerate && lastUserQuery && (
                <button
                  onClick={() => onRegenerate(lastUserQuery)}
                  className="text-xs px-2.5 py-1 rounded-md hover:bg-slate-800/80 hover:text-slate-200 flex items-center gap-1.5 transition-colors"
                  title="Regenerate response"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Regenerate</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
