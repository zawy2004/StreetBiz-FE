import type { ChatConversation } from '../types/chat.types';

const time = (value: string | null) => (value ? Date.parse(value) : 0);

/**
 * Which threads have news since the last look. Works off the inbox itself, so
 * it gives the same answer whether the refresh came from the socket or from a
 * poll, and a message counts once however many refreshes see it.
 *
 * The first look only sets the baseline: opening the app must not ring for
 * messages that were already waiting. Only the other side's messages count -
 * a reply typed on this account's other device is not news.
 */
export function detectNewMessages(
  seenUpTo: number | null,
  conversations: ChatConversation[],
): { seenUpTo: number; arrived: ChatConversation[] } {
  const latest = Math.max(0, ...conversations.map((thread) => time(thread.lastMessageAt)));
  if (seenUpTo === null) return { seenUpTo: latest, arrived: [] };
  const arrived = conversations
    .filter((thread) => !thread.lastMessageFromMe && time(thread.lastMessageAt) > seenUpTo)
    .sort((a, b) => time(b.lastMessageAt) - time(a.lastMessageAt));
  return { seenUpTo: Math.max(seenUpTo, latest), arrived };
}

/** The words of a new-message alert, shared by the toast and the system notification. */
export function newMessageAlert(arrived: ChatConversation[]): { title: string; body: string } {
  const [newest, ...others] = arrived;
  const preview = newest?.lastMessagePreview?.trim() || 'Đã gửi một tin nhắn.';
  return {
    title: `Tin nhắn mới từ ${newest?.counterpartName ?? 'cuộc trò chuyện'}`,
    body: others.length > 0 ? `${preview} (và ${others.length} cuộc trò chuyện khác)` : preview,
  };
}
