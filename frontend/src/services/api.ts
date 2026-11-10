import type { Conversation, SettingsStatus } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export async function fetchHealth(): Promise<any> {
  const res = await fetch(`${API_BASE}/api/health`);
  if (!res.ok) throw new Error('Failed to fetch health');
  return res.json();
}

export async function fetchSettingsStatus(): Promise<SettingsStatus> {
  const res = await fetch(`${API_BASE}/api/settings/status`);
  if (!res.ok) throw new Error('Failed to fetch settings status');
  return res.json();
}

export async function testGeminiKey(apiKey: string, model?: string): Promise<{ connected: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/api/settings/test-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey, model }),
  });
  if (!res.ok) throw new Error('Key test request failed');
  return res.json();
}

export async function fetchConversations(): Promise<Conversation[]> {
  const res = await fetch(`${API_BASE}/api/conversations`);
  if (!res.ok) throw new Error('Failed to fetch conversations');
  return res.json();
}

export async function createConversation(): Promise<Conversation> {
  const res = await fetch(`${API_BASE}/api/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to create conversation');
  return res.json();
}

export async function getConversation(id: string): Promise<Conversation> {
  const res = await fetch(`${API_BASE}/api/conversations/${id}`);
  if (!res.ok) throw new Error('Failed to get conversation');
  return res.json();
}

export async function updateConversationTitle(id: string, title: string): Promise<Conversation> {
  const res = await fetch(`${API_BASE}/api/conversations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error('Failed to update conversation title');
  return res.json();
}

export async function deleteConversation(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/conversations/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete conversation');
}

export async function clearConversationMessages(id: string): Promise<Conversation> {
  const res = await fetch(`${API_BASE}/api/conversations/${id}/clear`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to clear conversation');
  return res.json();
}

export async function cancelAgentRun(sessionId: string): Promise<void> {
  await fetch(`${API_BASE}/api/agent/cancel/${sessionId}`, {
    method: 'POST',
  });
}
