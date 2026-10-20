import type { ChatMessage } from '../types/chat.types';

/**
 * Display-only layout of a thread: where the day dividers go and which
 * messages sit together. The order is never touched; it stays by messageId.
 */

const VN_DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const VN_WEEKDAY = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  weekday: 'long',
});
// en-GB gives "06/10" everywhere; some ICU builds print vi-VN day-month as "06-10".
const VN_DATE = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Ho_Chi_Minh',
  day: '2-digit',
  month: '2-digit',
});
const VN_FULL = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  weekday: 'long',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const GROUP_GAP_MS = 5 * 60 * 1000;

function dayKey(value: string): string {
  const at = new Date(value);
  return Number.isNaN(at.getTime()) ? '' : VN_DAY.format(at);
}

/** "Hôm nay", "Hôm qua", or "Thứ Hai, 06/10". */
export function dayLabel(value: string, now: Date = new Date()): string {
  const at = new Date(value);
  if (Number.isNaN(at.getTime())) return '';
  const key = VN_DAY.format(at);
  if (key === VN_DAY.format(now)) return 'Hôm nay';
  if (key === VN_DAY.format(new Date(now.getTime() - 24 * 3600 * 1000))) return 'Hôm qua';
  const weekday = VN_WEEKDAY.format(at);
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${VN_DATE.format(at)}`;
}

/** Full date and time for a bubble's tooltip. */
export function fullStamp(value: string): string {
  const at = new Date(value);
  return Number.isNaN(at.getTime()) ? '' : VN_FULL.format(at);
}

export type ThreadItem = {
  message: ChatMessage;
  /** A day divider goes before this message. */
  dayBreak?: string;
  /** Same sender within five minutes as the message before / after it. */
  joinsPrevious: boolean;
  joinsNext: boolean;
};

export function layoutThread(messages: ChatMessage[], now: Date = new Date()): ThreadItem[] {
  const close = (a: ChatMessage | undefined, b: ChatMessage | undefined) =>
    Boolean(
      a &&
      b &&
      a.fromMe === b.fromMe &&
      a.senderUserId === b.senderUserId &&
      dayKey(a.sentAt) === dayKey(b.sentAt) &&
      Math.abs(new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()) <= GROUP_GAP_MS,
    );
  return messages.map((message, index) => {
    const previous = messages[index - 1];
    const next = messages[index + 1];
    const newDay = !previous || dayKey(previous.sentAt) !== dayKey(message.sentAt);
    return {
      message,
      dayBreak: newDay ? dayLabel(message.sentAt, now) || undefined : undefined,
      joinsPrevious: !newDay && close(previous, message),
      joinsNext: close(message, next) && dayKey(next!.sentAt) === dayKey(message.sentAt),
    };
  });
}
