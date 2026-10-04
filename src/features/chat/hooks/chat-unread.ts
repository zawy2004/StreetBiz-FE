import { useQuery } from '@tanstack/react-query';

import { isLiveApi } from '@/core/config/env';
import { useAuthStore } from '@/store/auth-store';
import { chatApi } from '../api/chatApi';

/*
 * The parts of chat the app shell needs on every page (the unread badge), kept
 * apart from useChat.ts so the shell does not pull in the SignalR realtime
 * client. That client only loads with the chat screens.
 */

export const chatKeys = {
  conversations: ['chat', 'conversations'] as const,
  thread: (id: string | number) => ['chat', 'thread', String(id)] as const,
  unread: ['chat', 'unread'] as const,
};

/** Chat is for buyers and sellers only; nobody else has a thread to show. */
export function useCanChat(): boolean {
  const role = useAuthStore((state) => state.user?.role_code);
  return isLiveApi && (role === 'CUSTOMER' || role === 'VENDOR');
}

export function useChatUnreadCount() {
  const enabled = useCanChat();
  return useQuery({
    queryKey: chatKeys.unread,
    queryFn: async () => (await chatApi.unreadCount()).unreadCount,
    enabled,
    refetchInterval: enabled ? 30_000 : false,
    refetchIntervalInBackground: false,
  });
}
