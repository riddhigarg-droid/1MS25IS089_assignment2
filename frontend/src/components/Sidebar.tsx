import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  MessageSquare,
  Trash2,
  Edit2,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Search,
  Cpu,
  Check,
  X,
  Compass,
} from 'lucide-react';
import type { Conversation, SettingsStatus } from '../types';

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newTitle: string) => void;
  onOpenSettings: () => void;
  settingsStatus: SettingsStatus | null;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeId,
  onSelect,
  onNewChat,
  onDelete,
  onRename,
  onOpenSettings,
  settingsStatus,
  isCollapsed,
  onToggleCollapse,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const startRename = (conv: Conversation) => {
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const saveRename = (id: string) => {
    if (editTitle.trim()) {
      onRename(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const isGeminiConnected = settingsStatus?.gemini_connection?.connected ?? false;

  return (
    <motion.aside
      animate={{ width: isCollapsed ? 72 : 280 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="relative flex flex-col h-full bg-[#08090e] border-r border-white/5 z-20 flex-shrink-0 select-none"
    >
      {/* Brand Header */}
      <div className="p-3.5 border-b border-white/5 flex items-center justify-between">
        {!isCollapsed && (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-500 p-[1px] flex-shrink-0 shadow-lg shadow-purple-900/30">
              <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center text-purple-400">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold tracking-wider text-white truncate">
                NEXUS
              </h1>
              <p className="text-[10px] text-purple-400/90 font-mono tracking-tight">
                ReAct Intelligence
              </p>
            </div>
          </div>
        )}

        {isCollapsed && (
          <div className="w-8 h-8 mx-auto rounded-xl bg-gradient-to-tr from-purple-600 to-cyan-500 flex items-center justify-center text-white">
            <Sparkles className="w-4 h-4" />
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <button
          onClick={onNewChat}
          className={`w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-purple-600/90 to-indigo-600/90 hover:from-purple-500 hover:to-indigo-500 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-950/40 transition-all duration-200 cursor-pointer ${
            isCollapsed ? 'px-0' : ''
          }`}
          title="Start new research chat"
        >
          <Plus className="w-4 h-4" />
          {!isCollapsed && <span>New Research</span>}
        </button>
      </div>

      {/* Search conversations */}
      {!isCollapsed && conversations.length > 3 && (
        <div className="px-3 pb-2">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950/60 border border-white/5 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-purple-500/40 transition-colors"
            />
          </div>
        </div>
      )}

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-1">
        {!isCollapsed && (
          <div className="px-2 pt-2 pb-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Recent Research
          </div>
        )}

        {filtered.map((conv) => {
          const isActive = conv.id === activeId;
          const isEditing = editingId === conv.id;

          return (
            <div
              key={conv.id}
              onClick={() => !isEditing && onSelect(conv.id)}
              className={`group relative flex items-center justify-between p-2 rounded-xl text-xs transition-all cursor-pointer ${
                isActive
                  ? 'bg-slate-800/80 text-white font-medium border border-purple-500/30 shadow-md shadow-black/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <MessageSquare
                  className={`w-3.5 h-3.5 flex-shrink-0 ${
                    isActive ? 'text-purple-400' : 'text-slate-500'
                  }`}
                />
                {!isCollapsed && (
                  <div className="min-w-0 flex-1">
                    {isEditing ? (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveRename(conv.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          autoFocus
                          className="w-full bg-slate-950 border border-purple-500/50 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none"
                        />
                        <button
                          onClick={() => saveRename(conv.id)}
                          className="p-1 hover:text-emerald-400 text-slate-400"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1 hover:text-rose-400 text-slate-400"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <span className="truncate block">{conv.title}</span>
                    )}
                  </div>
                )}
              </div>

              {!isCollapsed && !isEditing && (
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startRename(conv);
                    }}
                    className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-700/60"
                    title="Rename"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(conv.id);
                    }}
                    className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-700/60"
                    title="Delete"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {conversations.length === 0 && !isCollapsed && (
          <div className="text-center py-8 text-slate-600 text-xs">
            No research sessions yet.
          </div>
        )}
      </div>

      {/* Activity metrics widget */}
      {!isCollapsed && (
        <div className="m-3 p-3 rounded-xl bg-slate-950/60 border border-white/5 text-[11px] space-y-1.5 text-slate-400">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Cpu className="w-3 h-3 text-purple-400" /> Model
            </span>
            <span className="font-mono text-slate-200 text-[10px]">
              {settingsStatus?.selected_model?.replace('gemini-', '') || '3.5-flash-lite'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Compass className="w-3 h-3 text-cyan-400" /> Search Tool
            </span>
            <span className="font-mono text-slate-200 capitalize">
              {settingsStatus?.search_providers?.[0]?.name?.split(' ')[0] || 'DuckDuckGo'}
            </span>
          </div>
        </div>
      )}

      {/* Footer & Status */}
      <div className="p-3 border-t border-white/5 flex items-center justify-between">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isGeminiConnected
                  ? 'bg-emerald-400 shadow-sm shadow-emerald-400 animate-pulse'
                  : 'bg-amber-400'
              }`}
            />
            <span className="text-[11px] text-slate-400">
              {isGeminiConnected ? 'AI Connected' : 'API Key Ready'}
            </span>
          </div>
        )}

        <button
          onClick={onOpenSettings}
          className={`p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors ${
            isCollapsed ? 'mx-auto' : ''
          }`}
          title="Open Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </motion.aside>
  );
};
