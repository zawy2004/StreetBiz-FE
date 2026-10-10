import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';

import { EmptyState, ErrorState } from '@/components/feedback';
import { AppHeader, Screen } from '@/components/layout';
import { errorMessage } from '@/core/api';
import { useAuthStore } from '@/store/auth-store';
import {
  DayDivider,
  OlderMessagesButton,
  ThreadEmptyArt,
  ThreadSkeleton,
} from '../components/ChatParts';
import { MessageBubble } from '../components/MessageBubble';
import { MessageComposer } from '../components/MessageComposer';
import { ThreadHeader } from '../components/ThreadHeader';
import { layoutThread } from '../components/thread-format';
import { useCanChat, useChatMessages, useSendChatMessage } from '../hooks/useChat';
import '../chat.css';

export function ChatThreadScreen() {
  const { conversationId } = useParams();
  const canChat = useCanChat();
  const role = useAuthStore((state) => state.user?.role_code);
  const { thread, messages, hasMore, loadOlder, loadingOlder, olderError } =
    useChatMessages(conversationId);
  const send = useSendChatMessage(conversationId);
  const bottomRef = useRef<HTMLDivElement>(null);

  const lastMessageId = messages.at(-1)?.messageId;

  // Follow the conversation as it grows, the way a messaging app should.
  // jsdom has no scrollIntoView, so the optional call keeps tests honest.
  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ block: 'end' });
  }, [lastMessageId]);

  // Display only: the newest id already on screen, so a message that arrives
  // later can slide in while history (and older pages) simply appear.
  const newestShown = useRef<number | null>(null);
  useEffect(() => {
    if (lastMessageId === undefined) return;
    newestShown.current = Math.max(newestShown.current ?? lastMessageId, lastMessageId);
  }, [lastMessageId]);

  if (!canChat) {
    return (
      <Screen>
        <AppHeader title="Tin nhắn" back />
        <EmptyState
          icon="chat-outline"
          title="Chưa đăng nhập"
          description="Đăng nhập bằng tài khoản người mua hoặc người bán để nhắn tin."
        />
      </Screen>
    );
  }
  if (thread.isPending) return <ThreadSkeleton />;
  if (thread.isError) {
    return <ErrorState message={errorMessage(thread.error)} onRetry={() => thread.refetch()} />;
  }

  const conversation = thread.data?.conversation;
  const storeLink =
    role === 'CUSTOMER' && conversation
      ? `/customer/explore/stores/${conversation.storefrontId}`
      : undefined;
  const items = layoutThread(messages);

  return (
    <Screen
      padded={false}
      footer={
        <MessageComposer
          sending={send.isPending}
          error={send.isError ? errorMessage(send.error) : undefined}
          onSend={(body) => send.mutateAsync(body)}
        />
      }
    >
      <div className="flex min-h-full flex-col">
        <ThreadHeader conversation={conversation} storeLink={storeLink} />
        <div className="mx-auto flex w-full max-w-[760px] flex-1 flex-col px-md pb-md pt-sm md:px-lg">
          {messages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center px-lg py-2xl text-center">
              <ThreadEmptyArt />
              <p className="mt-md font-heading text-[19px] font-bold text-text">Chưa có tin nhắn</p>
              <p className="mt-1 max-w-[46ch] text-body-md text-muted">
                Gửi tin nhắn đầu tiên để bắt đầu cuộc trò chuyện.
              </p>
            </div>
          ) : (
            <div className="flex flex-1 flex-col justify-end">
              {hasMore ? (
                <div className="flex justify-center py-sm">
                  <OlderMessagesButton loading={loadingOlder} onPress={loadOlder} />
                </div>
              ) : null}
              {olderError ? (
                <p className="text-center text-body-md text-error">{errorMessage(olderError)}</p>
              ) : null}
              <div role="log" aria-live="polite" aria-label="Tin nhắn" className="flex flex-col">
                {items.map(({ message, dayBreak, joinsPrevious, joinsNext }) => (
                  <div key={message.messageId}>
                    {dayBreak ? <DayDivider label={dayBreak} /> : null}
                    <MessageBubble
                      message={message}
                      joinsPrevious={joinsPrevious}
                      joinsNext={joinsNext}
                      arrived={
                        newestShown.current !== null && message.messageId > newestShown.current
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>
    </Screen>
  );
}
