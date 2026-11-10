import { useState, useRef, useCallback } from 'react';
import type { AgentEvent, ExecutionStep, SearchResultItem } from '../types';
import { cancelAgentRun } from '../services/api';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

interface StreamOptions {
  conversationId?: string;
  model?: string;
  maxIterations?: number;
  searchProvider?: string;
  apiKey?: string;
  onFinalAnswer?: (answer: string, sources: SearchResultItem[], steps: any[]) => void;
  onError?: (error: string) => void;
}

export function useAgentStream() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [executionSteps, setExecutionSteps] = useState<ExecutionStep[]>([]);
  const [accumulatedSources, setAccumulatedSources] = useState<SearchResultItem[]>([]);
  const [currentStreamingAnswer, setCurrentStreamingAnswer] = useState<string>('');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const stopStream = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (activeSessionId) {
      try {
        await cancelAgentRun(activeSessionId);
      } catch (e) {
        console.error('Failed to notify backend of cancellation', e);
      }
    }
    setIsGenerating(false);
  }, [activeSessionId]);

  const startStream = useCallback(async (
    message: string,
    options: StreamOptions = {}
  ) => {
    setIsGenerating(true);
    setExecutionSteps([]);
    setAccumulatedSources([]);
    setCurrentStreamingAnswer('');

    const sessionId = options.conversationId || crypto.randomUUID();
    setActiveSessionId(sessionId);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch(`${API_BASE}/api/agent/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          message,
          conversation_id: sessionId,
          model: options.model,
          max_iterations: options.maxIterations,
          search_provider: options.searchProvider,
          api_key: options.apiKey,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Response body stream not available');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const block of lines) {
          if (!block.trim()) continue;

          let dataStr = '';

          for (const line of block.split('\n')) {
            if (line.startsWith('data: ')) {
              dataStr = line.substring(6).trim();
            }
          }

          if (dataStr) {
            try {
              const parsed: AgentEvent = JSON.parse(dataStr);

              // Update execution timeline
              setExecutionSteps((prev) => {
                const newStep: ExecutionStep = {
                  id: `${parsed.event}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                  event: parsed.event,
                  title: parsed.step_title,
                  description: parsed.step_description,
                  timestamp: parsed.timestamp,
                  iteration: parsed.iteration,
                  status:
                    parsed.event === 'agent_error'
                      ? 'error'
                      : parsed.event === 'agent_completed' || parsed.event === 'final_answer'
                      ? 'completed'
                      : 'running',
                  data: parsed.data || {},
                  error: parsed.error,
                };
                return [...prev, newStep];
              });

              // Process specific events
              if (parsed.event === 'tool_result' && parsed.data?.results) {
                const results: SearchResultItem[] = parsed.data.results;
                setAccumulatedSources((prev) => {
                  const existingUrls = new Set(prev.map((s) => s.url));
                  const fresh = results.filter((r) => !existingUrls.has(r.url));
                  return [...prev, ...fresh];
                });
              } else if (parsed.event === 'final_answer') {
                const answer = parsed.data?.answer || '';
                const sources = parsed.data?.sources || [];
                const steps = parsed.data?.steps || [];
                setCurrentStreamingAnswer(answer);
                if (options.onFinalAnswer) {
                  options.onFinalAnswer(answer, sources, steps);
                }
              } else if (parsed.event === 'agent_error') {
                if (options.onError) {
                  options.onError(parsed.error || parsed.step_description);
                }
              }
            } catch (err) {
              console.warn('Error parsing SSE json chunk:', err, dataStr);
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Streaming error:', err);
        setExecutionSteps((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            event: 'agent_error',
            title: 'Stream Connection Error',
            description: err.message || 'Failed to communicate with agent backend.',
            timestamp: new Date().toISOString(),
            iteration: 1,
            status: 'error',
            data: {},
            error: err.message,
          },
        ]);
        if (options.onError) {
          options.onError(err.message || 'Streaming failed');
        }
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  }, []);

  return {
    isGenerating,
    executionSteps,
    accumulatedSources,
    currentStreamingAnswer,
    startStream,
    stopStream,
  };
}
