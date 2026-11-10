export type EventType =
  | 'agent_started'
  | 'planning'
  | 'tool_call'
  | 'tool_started'
  | 'tool_result'
  | 'observation'
  | 'final_answer'
  | 'agent_completed'
  | 'agent_error';

export interface SearchResultItem {
  title: string;
  url: string;
  snippet: string;
  domain: string;
}

export interface AgentEvent {
  event: EventType;
  timestamp: string;
  iteration: number;
  step_title: string;
  step_description: string;
  data: Record<string, any>;
  error?: string | null;
}

export interface ExecutionStep {
  id: string;
  event: EventType;
  title: string;
  description: string;
  timestamp: string;
  iteration: number;
  status: 'pending' | 'running' | 'completed' | 'error';
  data: Record<string, any>;
  error?: string | null;
}

export interface MessageItem {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  sources: SearchResultItem[];
  steps: any[];
  iteration_count: number;
}

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages: MessageItem[];
}

export interface ModelOption {
  id: string;
  name: string;
  description: string;
}

export interface SearchProviderOption {
  id: string;
  name: string;
  status: string;
  active: boolean;
}

export interface SettingsStatus {
  gemini_api_key_configured: boolean;
  gemini_connection: {
    connected: boolean;
    model: string;
    message: string;
  };
  selected_model: string;
  available_models: ModelOption[];
  search_providers: SearchProviderOption[];
  max_iterations: number;
  search_max_results: number;
}
