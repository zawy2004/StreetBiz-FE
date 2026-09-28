import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';

import { Button } from '@/components/common';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { AppHeader, Screen } from '@/components/layout';
import { errorMessage } from '@/core/api';
import { MessageBubble } from '../components/MessageBubble';
import { MessageComposer } from '../components/MessageComposer';
import { useCanChat, useChatMessages, useSendChatMessage } from '../hooks/useChat';

export function ChatThreadScreen() {
  const { conversationId } = useParams();
  const canChat = useCanChat();
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
  if (thread.isPending) return <LoadingState />;
  if (thread.isError) {
    return <ErrorState message={errorMessage(thread.error)} onRetry={() => thread.refetch()} />;
  }

  const conversation = thread.data?.conversation;
  return (
    <Screen
      footer={
        <MessageComposer
          sending={send.isPending}
          error={send.isError ? errorMessage(send.error) : undefined}
          onSend={(body) => send.mutateAsync(body)}
        />
      }
    >
      <AppHeader
        title={conversation?.counterpartName ?? 'Tin nhắn'}
        subtitle={conversation?.storefrontName}
        back
      />
      {messages.length === 0 ? (
        <EmptyState
          icon="chat-outline"
          title="Chưa có tin nhắn"
          description="Gửi tin nhắn đầu tiên để bắt đầu cuộc trò chuyện."
        />
      ) : (
        <div className="flex flex-col gap-sm">
          {hasMore ? (
            <Button
              label="Xem tin nhắn cũ hơn"
              variant="ghost"
              loading={loadingOlder}
              onPress={loadOlder}
            />
          ) : null}
          {olderError ? (
            <p className="text-center text-body-md text-error">{errorMessage(olderError)}</p>
          ) : null}
          {messages.map((message) => (
            <MessageBubble key={message.messageId} message={message} />
          ))}
        </div>
      )}
      <div ref={bottomRef} />
    </Screen>
  );
}
