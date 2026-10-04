import { Avatar, Card } from '@/components/common';
import type { ChatConversation } from '../types/chat.types';
import { conversationTimestamp } from './chat-format';

type Props = {
  conversation: ChatConversation;
  onOpen: () => void;
};

export function ConversationRow({ conversation, onOpen }: Props) {
  const unread = conversation.unreadCount > 0;
  const preview = conversation.lastMessagePreview
    ? `${conversation.lastMessageFromMe ? 'Bạn: ' : ''}${conversation.lastMessagePreview}`
    : 'Chưa có tin nhắn nào';

  return (
    <button type="button" onClick={onOpen} className="w-full text-left">
      <Card>
        <div className="flex items-center gap-sm">
          <Avatar
            uri={conversation.storefrontImageUrl ?? undefined}
            name={conversation.counterpartName}
            shape="rounded"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-sm">
              <p className="truncate text-headline-sm text-text">
                {conversation.counterpartName}
              </p>
              <span className="shrink-0 text-body-sm text-muted">
                {conversationTimestamp(conversation.lastMessageAt)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-sm">
              <p
                className={`truncate text-body-md ${unread ? 'font-semibold text-text' : 'text-muted'}`}
              >
                {preview}
              </p>
              {unread ? (
                <span className="ml-auto shrink-0 rounded-full bg-primary-solid px-xs py-2xs text-body-sm text-on-primary">
                  {conversation.unreadCount}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </Card>
    </button>
  );
}
