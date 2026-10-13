import {
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
  type HubConnection,
} from '@microsoft/signalr';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getAccessToken } from '@/core/api/token-storage';
import { ApiError, errorMessage } from '@/core/api/problem';
import { env, isLiveApi } from '@/core/config/env';
import { assistantApi } from './assistant-api';
import { applyAssistantEvent, mergeMessages, optimistic } from './assistant-state';
import type {
  AssistantConversation,
  AssistantEvent,
  AssistantLocation,
  AssistantMessage,
  AssistantPageContext,
  AssistantRole,
  Capabilities,
  SendRequest,
  ResponseStyle,
} from './types';

export function useAssistant(role: AssistantRole, accountKey: string) {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [conversations, setConversations] = useState<AssistantConversation[]>([]);
  const [conversationId, setConversationId] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [status, setStatusLabel] = useState('');
  const [trail, setTrail] = useState<string[]>([]);
  const setStatus = useCallback((label: string) => {
    setStatusLabel(label);
    setTrail((current) =>
      !label ? [] : current.at(-1) === label ? current : [...current, label].slice(-4),
    );
  }, []);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const [capabilities, setCapabilities] = useState<Capabilities>();
  const [before, setBefore] = useState<string | null>(null);
  const [conversationBefore, setConversationBefore] = useState<string | null>(null);
  const selected = useRef<string | undefined>(undefined);
  const connection = useRef<HubConnection | undefined>(undefined);
  const abort = useRef<AbortController | undefined>(undefined);
  const mounted = useRef(true);
  const activeId = useRef<string | undefined>(undefined);
  const lastRequest = useRef<SendRequest | undefined>(undefined);
  const posting = useRef(false);
  const eventSequence = useRef(new Map<string, number>());
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const isAccount = role !== 'GUEST';
  const canUseApi = isLiveApi && isAccount;

  const refresh = useCallback(
    async (id = selected.current) => {
      if (!id || !canUseApi) return;
      const result = await assistantApi.history(id);
      if (!mounted.current || id !== selected.current) return;
      setMessages((current) => mergeMessages(current, result.items));
      setBefore(result.nextCursor);
      const active = result.items.find((m) => m.status === 'GENERATING');
      activeId.current = active?.id;
      setBusy(Boolean(active) || posting.current);
    },
    [canUseApi],
  );

  const loadConversations = useCallback(
    async (more = false) => {
      if (!canUseApi) return;
      const page = await assistantApi.conversations(
        more ? (conversationBefore ?? undefined) : undefined,
      );
      if (mounted.current) {
        setConversations((current) => (more ? [...current, ...page.items] : page.items));
        setConversationBefore(page.nextCursor);
      }
    },
    [canUseApi, conversationBefore],
  );

  useEffect(() => {
    mounted.current = true;
    if (isLiveApi)
      void assistantApi
        .capabilities()
        .then((c) => {
          if (mounted.current) setCapabilities(c);
        })
        .catch((e) => {
          if (mounted.current) setError(errorMessage(e));
        });
    if (canUseApi)
      void assistantApi
        .conversations()
        .then((p) => {
          if (mounted.current) {
            setConversations(p.items);
            setConversationBefore(p.nextCursor);
          }
        })
        .catch((e) => {
          if (mounted.current) setError(errorMessage(e));
        });
    return () => {
      mounted.current = false;
      abort.current?.abort();
    };
  }, [accountKey, canUseApi]);

  useEffect(() => {
    if (!canUseApi || import.meta.env.MODE === 'test') return;
    const url = new URL(env.apiBaseUrl, window.location.origin);
    url.pathname = `${url.pathname.replace(/\/$/, '').replace(/\/api$/, '')}/hubs/chatbot`;
    url.search = '';
    url.hash = '';
    const hub = new HubConnectionBuilder()
      .withUrl(url.toString(), {
        accessTokenFactory: () => getAccessToken() ?? '',
        withCredentials: false,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .configureLogging(LogLevel.Warning)
      .build();
    connection.current = hub;
    let disposed = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const onEvent = (event: AssistantEvent) => {
      if (disposed || event.conversationId !== selected.current) return;
      const previous = eventSequence.current.get(event.messageId) ?? 0;
      if (event.sequence <= previous) return;
      eventSequence.current.set(event.messageId, event.sequence);
      if (previous && event.sequence > previous + 1) void refresh().catch(() => undefined);
      setMessages((current) => applyAssistantEvent(current, event));
      if (event.type === 'started') {
        activeId.current = event.messageId;
        setBusy(true);
      }
      if (event.type === 'status') setStatus(event.payload.label);
      if (event.type === 'completed' || event.type === 'failed' || event.type === 'cancelled') {
        activeId.current = undefined;
        setBusy(false);
        setStatus('');
      }
    };
    hub.on('ChatbotEvent', onEvent);
    const subscribed = async () => {
      if (disposed) return;
      if (selected.current) await hub.invoke('SubscribeConversation', selected.current);
      setConnected(true);
      await refresh();
    };
    hub.onreconnecting(() => {
      if (!disposed) setConnected(false);
    });
    hub.onreconnected(() =>
      subscribed().catch(() => {
        if (!disposed) setConnected(false);
      }),
    );
    hub.onclose(() => {
      if (!disposed) {
        setConnected(false);
        clearTimeout(retry);
        retry = setTimeout(() => void start(), 10000);
      }
    });
    const start = async () => {
      if (disposed) return;
      try {
        await hub.start();
        if (disposed) {
          await hub.stop();
          return;
        }
        await subscribed();
      } catch {
        await hub.stop();
        if (!disposed) {
          setConnected(false);
          clearTimeout(retry);
          retry = setTimeout(() => void start(), 10000);
        }
      }
    };
    void start();
    return () => {
      disposed = true;
      clearTimeout(retry);
      hub.off('ChatbotEvent', onEvent);
      connection.current = undefined;
      void hub.stop();
    };
  }, [canUseApi, accountKey, refresh, setStatus]);

  useEffect(() => {
    if (!busy || !canUseApi) return;
    // Snapshots restore missed deltas and terminal state even when WebSockets are unavailable.
    const timer = setInterval(() => void refresh().catch(() => undefined), 4000);
    return () => clearInterval(timer);
  }, [busy, canUseApi, refresh]);

  const select = async (id?: string) => {
    if (busy || posting.current) return;
    selected.current = id;
    setConversationId(id);
    setMessages([]);
    setBefore(null);
    setError('');
    eventSequence.current.clear();
    lastRequest.current = undefined;
    if (id && connection.current?.state === HubConnectionState.Connected)
      await connection.current.invoke('SubscribeConversation', id).catch(() => undefined);
    if (id) await refresh(id).catch((e) => setError(errorMessage(e)));
  };

  const send = async (
    content: string,
    context?: AssistantPageContext,
    retryOf?: string,
    replay = false,
    attachmentIds?: string[],
    responseStyle?: ResponseStyle,
    location?: AssistantLocation,
  ) => {
    if (busy || posting.current || !content.trim()) return;
    if (!navigator.onLine && isLiveApi) {
      setError('Bạn đang mất mạng. Kết nối lại để tra cứu dữ liệu mới.');
      return;
    }
    posting.current = true;
    setError('');
    setBusy(true);
    setStatus('Đang tiếp nhận câu hỏi…');
    const request: SendRequest =
      replay && lastRequest.current
        ? lastRequest.current
        : {
            clientRequestId: crypto.randomUUID(),
            content: content.trim(),
            pageContext: context,
            retryOfMessageId: retryOf,
            attachmentIds,
            responseStyle,
            ...(location ? { location } : {}),
          };
    lastRequest.current = request;
    const controller = new AbortController();
    abort.current = controller;
    const ordinal = (messagesRef.current.at(-1)?.ordinal ?? 0) + 1;
    const localUser = {
      ...optimistic(request.content, request.clientRequestId, ordinal),
      hasAttachments: Boolean(request.attachmentIds?.length),
      responseStyle: request.responseStyle,
    };
    setMessages((current) => mergeMessages(current, [localUser]));
    try {
      if (!isLiveApi) {
        const demo: AssistantMessage = {
          ...localUser,
          id: crypto.randomUUID(),
          sender: 'ASSISTANT',
          ordinal: ordinal + 1,
          content:
            '[Mô phỏng] Trợ lý hỗ trợ theo vai trò của bạn. Bật kết nối backend để tra cứu hồ sơ, nguồn dữ liệu và lưu hội thoại. Trong chế độ này không có yêu cầu nào được gửi đến dịch vụ AI.',
          isAiGenerated: true,
          version: 1,
        };
        setMessages((current) => mergeMessages(current, [demo]));
        return;
      }
      if (!isAccount) {
        const answer = await assistantApi.guest(
          request.content,
          controller.signal,
          request.responseStyle,
        );
        if (mounted.current)
          setMessages((current) =>
            mergeMessages(current, [
              { ...answer, clientRequestId: request.clientRequestId, ordinal: ordinal + 1 },
            ]),
          );
        return;
      }
      let id = selected.current;
      if (!id) {
        const created = await assistantApi.create(request.clientRequestId);
        if (!mounted.current) return;
        id = created.id;
        selected.current = id;
        setConversationId(id);
      }
      if (connection.current?.state === HubConnectionState.Connected)
        await connection.current.invoke('SubscribeConversation', id).catch(() => undefined);
      const result = await assistantApi.send(id, request, controller.signal);
      if (!mounted.current || id !== selected.current) return;
      setMessages((current) =>
        mergeMessages(current, [result.userMessage, result.assistantMessage]),
      );
      activeId.current =
        result.assistantMessage.status === 'GENERATING' ? result.assistantMessage.id : undefined;
      await loadConversations();
      return result.assistantMessage;
    } catch (e) {
      if (!mounted.current) return;
      setError(errorMessage(e));
      if (e instanceof ApiError && e.activeMessageId && selected.current) {
        activeId.current = e.activeMessageId;
        await refresh().catch(() => undefined);
      } else if (selected.current) await refresh().catch(() => undefined);
    } finally {
      posting.current = false;
      if (mounted.current) {
        setBusy(Boolean(activeId.current));
        setStatus('');
      }
    }
  };

  /** Adds turns produced outside this hook (voice relay) to the visible conversation. */
  const ingest = useCallback((conversation: string, incoming: AssistantMessage[]) => {
    if (conversation !== selected.current) return;
    setMessages((current) => mergeMessages(current, incoming));
  }, []);

  const stop = async () => {
    if (selected.current && activeId.current) {
      try {
        const snapshot = await assistantApi.cancel(selected.current, activeId.current);
        if (mounted.current) setMessages((current) => mergeMessages(current, [snapshot]));
      } catch (e) {
        if (mounted.current) setError(errorMessage(e));
        return;
      }
    }
    abort.current?.abort();
    activeId.current = undefined;
    setBusy(false);
    setStatus('');
  };

  const remove = async () => {
    if (!conversationId || busy) return;
    try {
      await assistantApi.delete(conversationId);
      await select();
      await loadConversations();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const loadOlder = async () => {
    if (!conversationId || !before) return;
    try {
      const page = await assistantApi.history(conversationId, before);
      if (mounted.current && conversationId === selected.current) {
        setMessages((current) => mergeMessages(current, page.items));
        setBefore(page.nextCursor);
      }
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const feedback = async (message: AssistantMessage, helpful: boolean) => {
    if (!canUseApi || !selected.current) return;
    try {
      await assistantApi.feedback(selected.current, message.id, helpful);
      return true;
    } catch (e) {
      setError(errorMessage(e));
      return false;
    }
  };

  return {
    messages,
    conversations,
    conversationId,
    busy,
    status,
    trail,
    error,
    connected,
    capabilities,
    before,
    conversationBefore,
    select,
    send,
    stop,
    remove,
    loadOlder,
    loadConversations,
    feedback,
    ingest,
    retryRequest: () =>
      lastRequest.current &&
      send(lastRequest.current.content, lastRequest.current.pageContext, undefined, true),
  };
}
