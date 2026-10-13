import { useLayoutEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Button, Icon } from '@/components/common';
import { EmptyState, ErrorState } from '@/components/feedback';
import { SegmentedControl } from '@/components/forms';
import { AppHeader, Screen } from '@/components/layout';
import { errorMessage } from '@/core/api';
import { useAuthStore } from '@/store/auth-store';
import { ChatNotificationPrompt } from '../alerts/ChatNotificationPrompt';
import {
  InboxEmptyArt,
  InboxPlaceholderPane,
  InboxSkeleton,
  InboxSummary,
} from '../components/ChatParts';
import { ConversationRow } from '../components/ConversationRow';
import { useCanChat, useChatConversations } from '../hooks/useChat';
import type { ChatConversation } from '../types/chat.types';
import '../chat.css';

type Filter = 'all' | 'unread';

/**
 * When a refresh moves a thread to the top (the server's order), slide every
 * row from where it was to where it is now. Presentation only.
 */
function useRowSlide(order: string) {
  const nodes = useRef(new Map<number, HTMLLIElement>());
  const tops = useRef(new Map<number, number>());
  useLayoutEffect(() => {
    const reduce =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const next = new Map<number, number>();
    nodes.current.forEach((node, id) => {
      // Relative to the list itself, so scrolling between refreshes does not count as a move.
      const top = node.offsetTop;
      next.set(id, top);
      const before = tops.current.get(id);
      if (!reduce && before !== undefined && before !== top && typeof node.animate === 'function') {
        node.animate([{ transform: `translateY(${before - top}px)` }, { transform: 'none' }], {
          duration: 300,
          easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
        });
      }
    });
    tops.current = next;
  }, [order]);
  return (id: number) => (node: HTMLLIElement | null) => {
    if (node) nodes.current.set(id, node);
    else nodes.current.delete(id);
  };
}

function matches(conversation: ChatConversation, query: string) {
  const q = query.trim().toLocaleLowerCase('vi');
  if (!q) return true;
  return [conversation.counterpartName, conversation.storefrontName]
    .filter(Boolean)
    .some((name) => name.toLocaleLowerCase('vi').includes(q));
}

/** The chat inbox. The same screen serves buyers and sellers. */
export function ConversationsScreen() {
  const navigate = useNavigate();
  const role = useAuthStore((state) => state.user?.role_code);
  const signedIn = useAuthStore((state) => Boolean(state.user));
  const canChat = useCanChat();
  const conversations = useChatConversations();
  // Local view controls over the loaded list: no request, nothing remembered.
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const rows = conversations.data ?? [];
  const shown = rows.filter(
    (row) => (filter === 'all' || row.unreadCount > 0) && matches(row, query),
  );
  const slideRef = useRowSlide(shown.map((row) => row.conversationId).join(','));

  const threadPath = (conversationId: number) =>
    role === 'VENDOR' ? `/vendor/chat/${conversationId}` : `/customer/chat/${conversationId}`;

  if (!canChat) {
    return (
      <Screen>
        <AppHeader title="Tin nhắn" />
        <EmptyState
          icon="chat-outline"
          title="Chưa đăng nhập"
          description="Đăng nhập bằng tài khoản người mua hoặc người bán để nhắn tin."
          action={
            // Only a visitor gets the way in; a signed-in account in mock mode has nowhere to go.
            signedIn ? undefined : (
              <Link
                to="/auth/sign-in"
                className="inline-flex h-12 items-center gap-xs rounded-[12px] bg-primary px-lg text-[15px] font-semibold text-on-primary shadow-[0_10px_22px_-12px_rgb(var(--c-primary)/0.9)] transition-colors hover:bg-primary-pressed"
              >
                <Icon name="login" size={18} color="currentColor" />
                Đăng nhập
              </Link>
            )
          }
        />
      </Screen>
    );
  }
  if (conversations.isPending) {
    return (
      <Screen>
        <InboxSkeleton />
      </Screen>
    );
  }
  if (conversations.isError) {
    return (
      <ErrorState
        message={errorMessage(conversations.error)}
        onRetry={() => conversations.refetch()}
      />
    );
  }

  const vendor = role === 'VENDOR';
  const unreadTotal = rows.reduce((sum, row) => sum + row.unreadCount, 0);
  const unreadThreads = rows.filter((row) => row.unreadCount > 0).length;

  return (
    <Screen width="wide">
      <AppHeader title="Tin nhắn" />
      <div className="grid grid-cols-1 items-start gap-lg [@container_(min-width:960px)]:grid-cols-[340px_minmax(0,1fr)] [@container_(min-width:1120px)]:grid-cols-[380px_minmax(0,1fr)]">
        <div className="flex w-full min-w-0 max-w-[720px] flex-col gap-md pb-[96px] lg:pb-0">
          {rows.length > 0 ? <InboxSummary unread={unreadTotal} threads={unreadThreads} /> : null}
          <ChatNotificationPrompt />
          {rows.length === 0 ? (
            <div className="flex flex-col items-center px-lg py-2xl text-center">
              <InboxEmptyArt />
              <p className="mt-md font-heading text-[19px] font-bold text-text">
                Chưa có cuộc trò chuyện
              </p>
              <p className="mt-1 max-w-[46ch] text-body-md text-muted">
                {vendor
                  ? 'Khi khách nhắn tin cho gian hàng của bạn, cuộc trò chuyện sẽ hiện ở đây.'
                  : 'Mở một gian hàng và bấm “Nhắn tin cho người bán” để bắt đầu.'}
              </p>
              {vendor ? null : (
                <Link
                  to="/customer/explore"
                  className="mt-md inline-flex h-12 items-center gap-xs rounded-[12px] bg-card px-lg text-[15px] font-semibold text-text ring-1 ring-inset ring-border transition-colors hover:bg-sunken"
                >
                  <Icon name="compass-outline" size={18} color="currentColor" />
                  Khám phá quán
                </Link>
              )}
            </div>
          ) : (
            <>
              {rows.length >= 3 ? (
                <div className="flex flex-col gap-sm [@container_(min-width:560px)]:flex-row [@container_(min-width:560px)]:items-center">
                  <SegmentedControl<Filter>
                    options={[
                      { value: 'all', label: 'Tất cả' },
                      { value: 'unread', label: 'Chưa đọc' },
                    ]}
                    value={filter}
                    onChange={setFilter}
                  />
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Tìm theo tên…"
                    aria-label="Tìm theo tên"
                    className="input-shell h-11 min-w-0 flex-1 rounded-[12px] border border-border bg-card px-sm text-body-lg text-text placeholder:text-muted/80"
                  />
                </div>
              ) : null}
              {shown.length === 0 ? (
                <div className="flex flex-col items-start gap-sm rounded-[20px] bg-card p-md ring-1 ring-border">
                  <p className="text-body-md text-text">Không có cuộc trò chuyện phù hợp.</p>
                  <Button
                    label="Xem tất cả"
                    variant="outline"
                    size="sm"
                    fullWidth={false}
                    onPress={() => {
                      setFilter('all');
                      setQuery('');
                    }}
                  />
                </div>
              ) : (
                <ul className="relative overflow-hidden rounded-[24px] bg-card shadow-card ring-1 ring-border">
                  {shown.map((conversation, index) => (
                    <li
                      key={conversation.conversationId}
                      ref={slideRef(conversation.conversationId)}
                      className={index > 0 ? 'relative border-t border-border' : 'relative'}
                    >
                      <ConversationRow
                        conversation={conversation}
                        showStorefront={vendor}
                        onOpen={() => navigate(threadPath(conversation.conversationId))}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
        <InboxPlaceholderPane vendor={vendor} />
      </div>
    </Screen>
  );
}
