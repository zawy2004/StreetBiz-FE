import { PiCheck, PiChecks } from 'react-icons/pi';

import type { ChatMessage } from '../types/chat.types';
import { messageTime } from './chat-format';
import { fullStamp } from './thread-format';

type Props = {
  message: ChatMessage;
  /** Same sender a moment earlier / later: sit closer and join the corners. */
  joinsPrevious?: boolean;
  joinsNext?: boolean;
  /** Arrived after the thread was first shown (display only). */
  arrived?: boolean;
};

/**
 * Talking across the counter: the other side on white paper to the left, mine
 * in street orange to the right. Every message keeps its own time and receipt.
 */
export function MessageBubble({ message, joinsPrevious, joinsNext, arrived }: Props) {
  const mine = message.fromMe;
  const corners = mine
    ? [joinsPrevious ? 'rounded-tr-[8px]' : '', joinsNext ? 'rounded-br-[8px]' : 'rounded-br-[6px]']
    : [
        joinsPrevious ? 'rounded-tl-[8px]' : '',
        joinsNext ? 'rounded-bl-[8px]' : 'rounded-bl-[6px]',
      ];
  return (
    <div
      className={[
        'flex w-full',
        mine ? 'justify-end' : 'justify-start',
        joinsPrevious ? 'mt-1' : 'mt-sm',
        arrived ? (mine ? 'sb-chat-in-mine' : 'sb-chat-in') : '',
      ].join(' ')}
    >
      <div
        className={`flex max-w-[82%] flex-col sm:max-w-[78%] ${mine ? 'items-end' : 'items-start'}`}
      >
        <div
          title={fullStamp(message.sentAt)}
          className={[
            'whitespace-pre-wrap break-words rounded-2xl px-md py-sm text-[16px] leading-6 [overflow-wrap:anywhere] sm:text-[15px] sm:leading-[22px]',
            mine
              ? 'bg-primary font-medium text-on-primary'
              : 'border border-border bg-card text-text',
            ...corners,
          ].join(' ')}
        >
          <span className="sr-only">{mine ? 'Bạn: ' : `${message.senderName}: `}</span>
          {message.body}
        </div>
        <span className="mt-1 flex items-center gap-1 px-2xs text-body-xs text-muted">
          {mine ? (
            message.readAt ? (
              <PiChecks aria-hidden="true" size={15} className="text-tertiary" />
            ) : (
              <PiCheck aria-hidden="true" size={14} className="text-muted" />
            )
          ) : null}
          <span>
            {messageTime(message.sentAt)}
            {mine ? (message.readAt ? ' · Đã xem' : ' · Đã gửi') : ''}
          </span>
        </span>
      </div>
    </div>
  );
}
