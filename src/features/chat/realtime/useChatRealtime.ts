import {
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
  type HubConnection,
} from '@microsoft/signalr';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { getAccessToken } from '@/core/api/token-storage';
import { env, isLiveApi } from '@/core/config/env';
import { chatKeys } from '../hooks/chat-unread';

type ChatMessageReceived = {
  conversationId: number;
  messageId: number;
  senderUserId: number;
  body: string;
  sentAtUtc: string;
};

export function getChatHubUrl(apiBaseUrl = env.apiBaseUrl): string {
  const url = new URL(apiBaseUrl, window.location.origin);
  url.pathname = `${url.pathname.replace(/\/$/, '').replace(/\/api$/, '')}/hubs/chat`;
  url.search = '';
  url.hash = '';
  return url.toString().replace(/\/$/, '');
}

/**
 * Keeps one open thread live. The hub only says "something arrived"; the thread
 * is refetched over HTTP so read receipts and ordering stay server-authoritative.
 * Returns whether the socket is up, so the caller can fall back to polling.
 */
export function useChatRealtime(
  conversationId: string | number | undefined,
  enabled: boolean,
): boolean {
  const cache = useQueryClient();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!enabled || !conversationId || !isLiveApi || import.meta.env.MODE === 'test') {
      setConnected(false);
      return;
    }

    let disposed = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const numericId = Number(conversationId);

    const onMessage = (message: ChatMessageReceived) => {
      if (message.conversationId !== numericId) return;
      void Promise.all([
        cache.invalidateQueries({ queryKey: chatKeys.thread(numericId) }),
        cache.invalidateQueries({ queryKey: chatKeys.conversations }),
        cache.invalidateQueries({ queryKey: chatKeys.unread }),
      ]);
    };

    const connection: HubConnection = new HubConnectionBuilder()
      .withUrl(getChatHubUrl(), {
        accessTokenFactory: () => getAccessToken() ?? '',
        // SignalR sends its negotiate request with credentials by default, and the
        // browser then demands Access-Control-Allow-Credentials from the API. The
        // API deliberately does not send it (auth is a bearer token, not a cookie),
        // so without this the handshake is blocked by CORS and chat silently falls
        // back to polling.
        withCredentials: false,
      })
      .withAutomaticReconnect([0, 2_000, 5_000, 10_000])
      .configureLogging(LogLevel.Warning)
      .build();

    connection.on('ChatMessageReceived', onMessage);
    connection.onreconnecting(() => setConnected(false));
    connection.onreconnected(async () => {
      if (disposed) return;
      try {
        await connection.invoke('SubscribeConversation', numericId);
        setConnected(true);
        // Anything that arrived while the socket was down is only in the database.
        await cache.invalidateQueries({ queryKey: chatKeys.thread(numericId) });
      } catch {
        setConnected(false);
      }
    });
    connection.onclose(() => setConnected(false));

    const start = async () => {
      try {
        await connection.start();
        if (disposed) {
          await connection.stop();
          return;
        }
        await connection.invoke('SubscribeConversation', numericId);
        setConnected(true);
      } catch {
        setConnected(false);
        if (connection.state !== HubConnectionState.Disconnected) {
          await connection.stop().catch(() => undefined);
        }
        if (!disposed) retryTimer = setTimeout(() => void start(), 10_000);
      }
    };

    void start();
    return () => {
      disposed = true;
      setConnected(false);
      if (retryTimer) clearTimeout(retryTimer);
      connection.off('ChatMessageReceived', onMessage);
      if (connection.state === HubConnectionState.Connected) {
        void connection
          .invoke('UnsubscribeConversation', numericId)
          .catch(() => undefined)
          .finally(() => connection.stop());
      } else {
        void connection.stop();
      }
    };
  }, [cache, conversationId, enabled]);

  return connected;
}
