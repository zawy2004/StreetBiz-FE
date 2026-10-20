import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { showToast } from '@/components/feedback';
import { systemNotify } from '@/core/attention/notify';
import { chatApi } from '../api/chatApi';
import { chatKeys } from '../hooks/useChat';
import { useChatInboxFeed } from '../realtime/useChatInboxFeed';
import type { ChatConversation } from '../types/chat.types';
import { detectNewMessages, newMessageAlert } from './new-message-detection';

/** Matches the order board's refresh, so the two feel equally live. */
export const CHAT_INBOX_REFRESH_MS = 20_000;

/**
 * CHAT-02: tells a buyer or a seller about a new message on any screen. The
 * socket says "look again", the inbox is polled anyway as a fallback, and a
 * thread with news gets a toast and - in a hidden tab - a system notification
 * that opens the thread. Deliberately no sound: that is for new orders.
 *
 * Nothing is announced for the thread the person is reading right now: they
 * can see the message land.
 */
export function useChatAlerts(enabled: boolean, chatBase: string) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  useChatInboxFeed(enabled);

  const inbox = useQuery({
    queryKey: chatKeys.conversations,
    queryFn: chatApi.conversations,
    enabled,
    refetchInterval: enabled ? CHAT_INBOX_REFRESH_MS : false,
    // Someone with the tab in the background is exactly who needs this.
    refetchIntervalInBackground: true,
  });

  // Read through a ref: the route changing must not re-run detection.
  const openThread = useRef<number | null>(null);
  const threadId = pathname.startsWith(`${chatBase}/`)
    ? Number(pathname.slice(chatBase.length + 1))
    : NaN;
  openThread.current = Number.isInteger(threadId) ? threadId : null;

  const seenUpTo = useRef<number | null>(null);
  useEffect(() => {
    if (!inbox.data) return;
    const result = detectNewMessages(seenUpTo.current, inbox.data);
    seenUpTo.current = result.seenUpTo;
    const news = result.arrived.filter(
      (thread) => document.hidden || thread.conversationId !== openThread.current,
    );
    if (news.length > 0) {
      announce(news, (id) => navigate(`${chatBase}/${id}`));
    }
  }, [chatBase, inbox.data, navigate]);
}

function announce(threads: ChatConversation[], open: (conversationId: number) => void) {
  const message = newMessageAlert(threads);
  const newest = threads[0]!;
  showToast(`${message.title}: ${message.body}`);
  // Per thread: a burst of messages replaces one notification, not stacks.
  systemNotify({
    ...message,
    tag: `chat-${newest.conversationId}`,
    onClick: () => open(newest.conversationId),
  });
}
