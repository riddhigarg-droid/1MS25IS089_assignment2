import { useState, useEffect, useCallback } from 'react';
import type { Conversation, MessageItem } from '../types';
import {
  fetchConversations,
  createConversation,
  getConversation,
  updateConversationTitle,
  deleteConversation,
  clearConversationMessages,
} from '../services/api';

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadConversations = useCallback(async () => {
    try {
      setIsLoading(true);
      const list = await fetchConversations();
      setConversations(list);
      if (list.length > 0 && !activeConversationId) {
        setActiveConversationId(list[0].id);
        setCurrentConversation(list[0]);
      }
    } catch (err) {
      console.error('Error loading conversations:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeConversationId]);

  useEffect(() => {
    loadConversations();
  }, []);

  const selectConversation = useCallback(async (id: string) => {
    try {
      setActiveConversationId(id);
      const conv = await getConversation(id);
      setCurrentConversation(conv);
    } catch (err) {
      console.error('Error selecting conversation:', err);
    }
  }, []);

  const startNewChat = useCallback(async () => {
    try {
      const newConv = await createConversation();
      setConversations((prev) => [newConv, ...prev]);
      setActiveConversationId(newConv.id);
      setCurrentConversation(newConv);
      return newConv;
    } catch (err) {
      console.error('Error creating new conversation:', err);
      // Fallback local conversation
      const fallback: Conversation = {
        id: crypto.randomUUID(),
        title: 'New Research Chat',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        messages: [],
      };
      setConversations((prev) => [fallback, ...prev]);
      setActiveConversationId(fallback.id);
      setCurrentConversation(fallback);
      return fallback;
    }
  }, []);

  const renameConversation = useCallback(async (id: string, newTitle: string) => {
    try {
      const updated = await updateConversationTitle(id, newTitle);
      setConversations((prev) => prev.map((c) => (c.id === id ? updated : c)));
      if (currentConversation?.id === id) {
        setCurrentConversation(updated);
      }
    } catch (err) {
      console.error('Error renaming conversation:', err);
    }
  }, [currentConversation]);

  const deleteConv = useCallback(async (id: string) => {
    try {
      await deleteConversation(id);
      const remaining = conversations.filter((c) => c.id !== id);
      setConversations(remaining);
      if (activeConversationId === id) {
        if (remaining.length > 0) {
          setActiveConversationId(remaining[0].id);
          setCurrentConversation(remaining[0]);
        } else {
          setActiveConversationId(null);
          setCurrentConversation(null);
        }
      }
    } catch (err) {
      console.error('Error deleting conversation:', err);
    }
  }, [conversations, activeConversationId]);

  const clearCurrentChat = useCallback(async () => {
    if (!activeConversationId) return;
    try {
      const cleared = await clearConversationMessages(activeConversationId);
      setCurrentConversation(cleared);
      setConversations((prev) => prev.map((c) => (c.id === activeConversationId ? cleared : c)));
    } catch (err) {
      console.error('Error clearing chat:', err);
    }
  }, [activeConversationId]);

  const appendMessageToCurrent = useCallback((msg: MessageItem) => {
    setCurrentConversation((prev) => {
      if (!prev) return null;
      const updated = {
        ...prev,
        messages: [...prev.messages, msg],
        updated_at: new Date().toISOString(),
      };
      return updated;
    });

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === activeConversationId) {
          const title =
            c.title === 'New Research Chat' && msg.role === 'user'
              ? msg.content.substring(0, 36) + (msg.content.length > 36 ? '...' : '')
              : c.title;
          return {
            ...c,
            title,
            updated_at: new Date().toISOString(),
          };
        }
        return c;
      })
    );
  }, [activeConversationId]);

  return {
    conversations,
    activeConversationId,
    currentConversation,
    isLoading,
    loadConversations,
    selectConversation,
    startNewChat,
    renameConversation,
    deleteConv,
    clearCurrentChat,
    appendMessageToCurrent,
  };
}
