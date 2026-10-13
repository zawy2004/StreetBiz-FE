import type { ChatConversation } from '../types/chat.types';
import { conversationTimestamp } from './chat-format';
import { StoreAvatar } from './ChatParts';

type Props = {
  conversation: ChatConversation;
  onOpen: () => void;
  /** Sellers may run several stalls, so they also see which one the buyer wrote to. */
  showStorefront?: boolean;
};

/**
 * One stall in the row of stalls: when a message is waiting, its sign lights
 * up (orange edge, bold name, mango count).
 */
export function ConversationRow({ conversation, onOpen, showStorefront }: Props) {
  const unread = conversation.unreadCount > 0;
  const preview = conversation.lastMessagePreview
    ? `${conversation.lastMessageFromMe ? 'Bạn: ' : ''}${conversation.lastMessagePreview}`
    : 'Chưa có tin nhắn nào';

  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative flex min-h-[72px] w-full items-center gap-sm bg-card px-md py-sm text-left transition-[background-color,transform] duration-150 hover:bg-sunken active:scale-[0.99]"
    >
      {unread ? (
        <span
          aria-hidden="true"
          className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-brand"
        />
      ) : null}
      <StoreAvatar uri={conversation.storefrontImageUrl} size={52} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-baseline justify-between gap-sm">
          <span
            className={`truncate text-headline-sm [[data-surface=VENDOR]_&]:text-[16px] ${unread ? 'font-semibold text-text' : 'font-medium text-text'}`}
          >
            {conversation.counterpartName}
          </span>
          <span
            className={`shrink-0 font-sign text-[12px] leading-4 font-tabular ${unread ? 'font-bold text-primary-pressed' : 'font-medium text-muted'}`}
          >
            {conversationTimestamp(conversation.lastMessageAt)}
          </span>
        </span>
        {showStorefront ? (
          <span className="truncate text-body-sm text-muted">{`tại ${conversation.storefrontName}`}</span>
        ) : null}
        <span className="flex items-center justify-between gap-sm">
          <span
            className={`truncate text-body-md ${unread ? 'font-semibold text-text' : 'text-muted'}`}
          >
            {preview}
          </span>
          {unread ? (
            <span
              key={conversation.unreadCount}
              className="sb-pop ml-auto flex h-[22px] min-w-[22px] shrink-0 items-center justify-center rounded-full bg-accent px-1.5 font-sign text-[12px] font-bold leading-4 text-on-accent font-tabular"
            >
              {conversation.unreadCount}
              <span className="sr-only"> tin chưa đọc</span>
            </span>
          ) : null}
        </span>
      </span>
    </button>
  );
}
