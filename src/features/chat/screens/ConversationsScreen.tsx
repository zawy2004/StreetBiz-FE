import { useNavigate } from 'react-router-dom';

import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { AppHeader, Screen } from '@/components/layout';
import { errorMessage } from '@/core/api';
import { useAuthStore } from '@/store/auth-store';
import { ChatNotificationPrompt } from '../alerts/ChatNotificationPrompt';
import { ConversationRow } from '../components/ConversationRow';
import { useCanChat, useChatConversations } from '../hooks/useChat';

/** The chat inbox. The same screen serves buyers and sellers. */
export function ConversationsScreen() {
  const navigate = useNavigate();
  const role = useAuthStore((state) => state.user?.role_code);
  const canChat = useCanChat();
  const conversations = useChatConversations();

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
        />
      </Screen>
    );
  }
  if (conversations.isPending) return <LoadingState />;
  if (conversations.isError) {
    return (
      <ErrorState
        message={errorMessage(conversations.error)}
        onRetry={() => conversations.refetch()}
      />
    );
  }

  const rows = conversations.data ?? [];
  return (
    <Screen>
      <AppHeader title="Tin nhắn" />
      <ChatNotificationPrompt />
      {rows.length === 0 ? (
        <EmptyState
          icon="chat-outline"
          title="Chưa có cuộc trò chuyện"
          description={
            role === 'VENDOR'
              ? 'Khi khách nhắn tin cho gian hàng của bạn, cuộc trò chuyện sẽ hiện ở đây.'
              : 'Mở một gian hàng và bấm “Nhắn tin cho người bán” để bắt đầu.'
          }
        />
      ) : (
        rows.map((conversation) => (
          <ConversationRow
            key={conversation.conversationId}
            conversation={conversation}
            onOpen={() => navigate(threadPath(conversation.conversationId))}
          />
        ))
      )}
    </Screen>
  );
}
