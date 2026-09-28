/** Local time of day. The API always sends UTC with a trailing Z. */
export function messageTime(sentAt: string): string {
  return new Date(sentAt).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** "14:05" for today, otherwise "27/09" - enough to place a thread without noise. */
export function conversationTimestamp(value: string | null): string {
  if (!value) return '';
  const at = new Date(value);
  const today = new Date();
  const sameDay =
    at.getDate() === today.getDate() &&
    at.getMonth() === today.getMonth() &&
    at.getFullYear() === today.getFullYear();
  return sameDay
    ? at.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : at.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}
