import {
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
  type HubConnection,
} from '@microsoft/signalr';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { getAccessToken } from '@/core/api/token-storage';
import { isLiveApi } from '@/core/config/env';
import { chatKeys } from '../hooks/useChat';
import { getChatHubUrl } from './useChatRealtime';

type InboxChanged = { conversationId: number };

/**
 * Every thread of the signed-in account, live on any screen. The server says
 * which thread changed and nothing else; the inbox, the unread badge and that
 * thread are refetched over HTTP, so read state stays server-authoritative.
 */
export function useChatInboxFeed(enabled: boolean) {
  const cache = useQueryClient();

  useEffect(() => {
    if (!enabled || !isLiveApi || import.meta.env.MODE === 'test') return;

    let disposed = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const refreshInbox = () =>
      Promise.all([
        cache.invalidateQueries({ queryKey: chatKeys.conversations }),
        cache.invalidateQueries({ queryKey: chatKeys.unread }),
      ]);

    const connection: HubConnection = new HubConnectionBuilder()
      .withUrl(getChatHubUrl(), {
        accessTokenFactory: () => getAccessToken() ?? '',
        // See useChatRealtime: the API sends no Access-Control-Allow-Credentials.
        withCredentials: false,
      })
      .withAutomaticReconnect([0, 2_000, 5_000, 10_000, 30_000])
      .configureLogging(LogLevel.Warning)
      .build();

    connection.on('ChatInboxChanged', (message: InboxChanged) => {
      void refreshInbox();
      void cache.invalidateQueries({ queryKey: chatKeys.thread(message.conversationId) });
    });
    connection.onreconnected(async () => {
      if (disposed) return;
      try {
        await connection.invoke('SubscribeInbox');
        // Whatever arrived while the socket was down is only in the database.
        await refreshInbox();
      } catch {
        // Polling still covers the inbox until the next reconnect.
      }
    });

    const start = async () => {
      try {
        await connection.start();
        if (disposed) {
          await connection.stop();
          return;
        }
        await connection.invoke('SubscribeInbox');
      } catch {
        if (connection.state !== HubConnectionState.Disconnected) {
          await connection.stop().catch(() => undefined);
        }
        if (!disposed) retryTimer = setTimeout(() => void start(), 15_000);
      }
    };

    void start();
    return () => {
      disposed = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (connection.state === HubConnectionState.Connected) {
        void connection
          .invoke('UnsubscribeInbox')
          .catch(() => undefined)
          .finally(() => connection.stop());
      } else {
        void connection.stop();
      }
    };
  }, [cache, enabled]);
}
