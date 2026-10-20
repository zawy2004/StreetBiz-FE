import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';

import { isLiveApi } from '@/core/config/env';
import { useAuthStore } from '@/store/auth-store';
import { chatApi } from '../api/chatApi';
import { useChatRealtime } from '../realtime/useChatRealtime';
import type { ChatMessage } from '../types/chat.types';

export const chatKeys = {
  conversations: ['chat', 'conversations'] as const,
  thread: (id: string | number) => ['chat', 'thread', String(id)] as const,
  unread: ['chat', 'unread'] as const,
};

/** Chat is for buyers and sellers only; nobody else has a thread to show. */
export function useCanChat(): boolean {
  const role = useAuthStore((state) => state.user?.role_code);
  return isLiveApi && (role === 'CUSTOMER' || role === 'VENDOR');
}

/**
 * Only a buyer may open a thread, so only a buyer is offered the button. A
 * vendor pressing it would get a 403 from the backend.
 */
export function useCanStartChat(): boolean {
  const role = useAuthStore((state) => state.user?.role_code);
  return isLiveApi && role === 'CUSTOMER';
}

export function useChatConversations() {
  const enabled = useCanChat();
  return useQuery({
    queryKey: chatKeys.conversations,
    queryFn: chatApi.conversations,
    enabled,
    // The inbox has no socket of its own, so it polls while it is on screen.
    refetchInterval: enabled ? 20_000 : false,
    refetchIntervalInBackground: false,
  });
}

export function useChatUnreadCount() {
  const enabled = useCanChat();
  return useQuery({
    queryKey: chatKeys.unread,
    queryFn: async () => (await chatApi.unreadCount()).unreadCount,
    enabled,
    refetchInterval: enabled ? 30_000 : false,
    refetchIntervalInBackground: false,
  });
}

export function useChatThread(conversationId: string | number | undefined) {
  const enabled = useCanChat() && Boolean(conversationId);
  const realtimeConnected = useRef(false);

  const query = useQuery({
    queryKey: chatKeys.thread(conversationId ?? ''),
    queryFn: () => chatApi.thread(conversationId!),
    enabled,
    // Polling is the fallback for a refused or dropped socket; once the hub is
    // connected it would only duplicate what the hub already pushes.
    refetchInterval: () => (realtimeConnected.current ? false : 8_000),
    refetchIntervalInBackground: false,
  });

  realtimeConnected.current = useChatRealtime(conversationId, enabled);
  return query;
}

/** Union of two pages by message id, newest data winning, oldest message first. */
function mergeById(current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const byId = new Map(current.map((message) => [message.messageId, message]));
  for (const message of incoming) byId.set(message.messageId, message);
  return [...byId.values()].sort((a, b) => a.messageId - b.messageId);
}

/**
 * The thread as the reader sees it.
 *
 * The server always answers with a fixed-size window of the newest messages, so
 * the window slides forward every time somebody sends something. Rendering only
 * "older pages + current window" would drop whatever the slide pushed out and
 * leave a hole mid-conversation, so every message seen so far is kept and the
 * fresh window is merged over it - that also refreshes read receipts in place.
 */
export function useChatMessages(conversationId: string | number | undefined) {
  const thread = useChatThread(conversationId);
  const [loaded, setLoaded] = useState<ChatMessage[]>([]);
  const [olderHasMore, setOlderHasMore] = useState<boolean | null>(null);

  useEffect(() => {
    setLoaded([]);
    setOlderHasMore(null);
  }, [conversationId]);

  const latestPage = thread.data?.messages;
  useEffect(() => {
    if (latestPage?.length) setLoaded((current) => mergeById(current, latestPage));
  }, [latestPage]);

  // Merged again here so the first render shows the window without waiting a tick.
  const messages = useMemo(() => mergeById(loaded, latestPage ?? []), [loaded, latestPage]);
  const oldestLoadedId = messages[0]?.messageId;

  const loadOlder = useMutation({
    mutationFn: () => chatApi.olderMessages(conversationId!, oldestLoadedId!),
    onSuccess: (page) => {
      setLoaded((current) => mergeById(current, page.messages));
      setOlderHasMore(page.hasMore);
    },
  });

  return {
    thread,
    messages,
    hasMore: (olderHasMore ?? thread.data?.hasMore ?? false) && Boolean(oldestLoadedId),
    loadOlder: () => loadOlder.mutate(),
    loadingOlder: loadOlder.isPending,
    olderError: loadOlder.isError ? loadOlder.error : undefined,
  };
}

export function useSendChatMessage(conversationId: string | number | undefined) {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => chatApi.send(conversationId!, body),
    onSuccess: async () => {
      await Promise.all([
        cache.invalidateQueries({ queryKey: chatKeys.thread(conversationId ?? '') }),
        cache.invalidateQueries({ queryKey: chatKeys.conversations }),
      ]);
    },
  });
}

/**
 * Opens the thread for a storefront. The backend reuses an existing thread, so
 * pressing "chat with seller" twice does not create a second one.
 */
export function useStartChat() {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (storefrontId: number) => chatApi.start(storefrontId),
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: chatKeys.conversations });
    },
  });
}
