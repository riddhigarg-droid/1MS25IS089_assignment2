import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatWorkspace } from './components/ChatWorkspace';
import { ExecutionPanel } from './components/ExecutionPanel';
import { SettingsModal } from './components/SettingsModal';
import { useConversations } from './hooks/useConversations';
import { useAgentStream } from './hooks/useAgentStream';
import { fetchSettingsStatus } from './services/api';
import type { MessageItem, SettingsStatus, SearchResultItem } from './types';

export const App: React.FC = () => {
  const {
    conversations,
    activeConversationId,
    currentConversation,
    selectConversation,
    startNewChat,
    renameConversation,
    deleteConv,
    clearCurrentChat,
    appendMessageToCurrent,
  } = useConversations();

  const {
    isGenerating,
    executionSteps,
    accumulatedSources,
    currentStreamingAnswer,
    startStream,
    stopStream,
  } = useAgentStream();

  const [settingsStatus, setSettingsStatus] = useState<SettingsStatus | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Settings in local state / storage
  const [geminiApiKey, setGeminiApiKey] = useState(
    () => localStorage.getItem('nexus_gemini_key') || ''
  );
  const [selectedModel, setSelectedModel] = useState(
    () => localStorage.getItem('nexus_selected_model') || 'gemini-3.5-flash-lite'
  );
  const [searchProvider, setSearchProvider] = useState(
    () => localStorage.getItem('nexus_search_provider') || 'duckduckgo'
  );
  const [maxIterations, setMaxIterations] = useState<number>(
    () => parseInt(localStorage.getItem('nexus_max_iterations') || '5', 10)
  );

  useEffect(() => {
    fetchSettingsStatus()
      .then((data) => {
        setSettingsStatus(data);
        if (!localStorage.getItem('nexus_selected_model') && data.selected_model) {
          setSelectedModel(data.selected_model);
        }
      })
      .catch((err) => console.warn('Could not fetch settings status', err));

    // Theme initialization
    const savedTheme = localStorage.getItem('nexus_theme') || 'dark';
    if (savedTheme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, []);

  const handleSendMessage = async (query: string) => {
    let targetConv = currentConversation;
    if (!targetConv) {
      targetConv = await startNewChat();
    }

    const userMessage: MessageItem = {
      id: crypto.randomUUID(),
      role: 'user',
      content: query,
      timestamp: new Date().toISOString(),
      sources: [],
      steps: [],
      iteration_count: 1,
    };

    appendMessageToCurrent(userMessage);

    // Auto-open panel so the student/user sees the live ReAct timeline
    setIsPanelOpen(true);

    startStream(query, {
      conversationId: targetConv.id,
      model: selectedModel,
      maxIterations,
      searchProvider,
      apiKey: geminiApiKey || undefined,
      onFinalAnswer: (answer: string, sources: SearchResultItem[], steps: any[]) => {
        const assistantMessage: MessageItem = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: answer,
          timestamp: new Date().toISOString(),
          sources,
          steps,
          iteration_count: steps.length > 0 ? steps[steps.length - 1].iteration || 1 : 1,
        };
        appendMessageToCurrent(assistantMessage);
      },
      onError: (errorMsg) => {
        // If error occurred (e.g. key missing), prompt setting modal
        if (errorMsg.includes('GEMINI_API_KEY') || errorMsg.includes('Configuration Required')) {
          setIsSettingsOpen(true);
        }
      },
    });
  };

  const handleSaveSettings = (newSettings: {
    apiKey: string;
    model: string;
    searchProvider: string;
    maxIterations: number;
    theme: string;
  }) => {
    setGeminiApiKey(newSettings.apiKey);
    setSelectedModel(newSettings.model);
    setSearchProvider(newSettings.searchProvider);
    setMaxIterations(newSettings.maxIterations);
    // Refresh connection status
    fetchSettingsStatus()
      .then(setSettingsStatus)
      .catch(console.error);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#090a0f] text-slate-100">
      {/* 1. Left Sidebar */}
      <Sidebar
        conversations={conversations}
        activeId={activeConversationId}
        onSelect={selectConversation}
        onNewChat={startNewChat}
        onDelete={deleteConv}
        onRename={renameConversation}
        onOpenSettings={() => setIsSettingsOpen(true)}
        settingsStatus={settingsStatus}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* 2. Main Chat Workspace */}
      <ChatWorkspace
        messages={currentConversation?.messages || []}
        isGenerating={isGenerating}
        currentStreamingAnswer={currentStreamingAnswer}
        streamingSources={accumulatedSources}
        onSendMessage={handleSendMessage}
        onStop={stopStream}
        onClear={clearCurrentChat}
        onTogglePanel={() => setIsPanelOpen(!isPanelOpen)}
        isPanelOpen={isPanelOpen}
        selectedModel={selectedModel}
        maxIterations={maxIterations}
      />

      {/* 3. Right ReAct Execution Panel */}
      <ExecutionPanel
        steps={executionSteps}
        sources={accumulatedSources}
        isGenerating={isGenerating}
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
      />

      {/* 4. Settings Configuration Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        status={settingsStatus}
        onSave={handleSaveSettings}
      />
    </div>
  );
};

export default App;
