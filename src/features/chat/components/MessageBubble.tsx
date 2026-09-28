import type { ChatMessage } from '../types/chat.types';
import { messageTime } from './chat-format';

export function MessageBubble({ message }: { message: ChatMessage }) {
  const mine = message.fromMe;
  return (
    <div className={`flex w-full ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[78%] flex-col ${mine ? 'items-end' : 'items-start'}`}>
        <div
          className={`whitespace-pre-wrap break-words rounded-2xl px-md py-sm text-body-md ${
            mine ? 'bg-primary text-on-primary' : 'bg-sunken text-text'
          }`}
        >
          {message.body}
        </div>
        <span className="mt-2xs px-2xs text-body-sm text-muted">
          {messageTime(message.sentAt)}
          {mine ? (message.readAt ? ' · Đã xem' : ' · Đã gửi') : ''}
        </span>
      </div>
    </div>
  );
}
