import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiGet, apiPost } from '@/core/api/client';
import { isLiveApi } from '@/core/config/env';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';

/** GET /api/notifications row. Written by the BE workflows (orders, fees, reviews...). */
export type NotificationDto = {
  notificationId: number;
  type: string;
  title: string;
  body: string;
  relatedEntityType: string | null;
  relatedEntityId: number | null;
  isRead: boolean;
  sentAt: string;
};

export type NotificationPage = { items: NotificationDto[]; hasMore: boolean };

export const notificationsApi = {
  list: (take = 50) => apiGet<NotificationPage>(`/notifications?take=${take}`),
  unreadCount: () => apiGet<{ unreadCount: number }>('/notifications/unread-count'),
  markRead: (notificationId: number) => apiPost<void>(`/notifications/${notificationId}/read`),
  markAllRead: () => apiPost<void>('/notifications/read-all'),
};

/** What the screen renders, whichever mode supplied it. */
export type NotificationItem = {
  id: number | string;
  title: string;
  body: string;
  read: boolean;
  sentAt: string;
};

const keys = {
  all: (userId: string | undefined) => ['notifications', userId] as const,
  list: (userId: string | undefined) => ['notifications', userId, 'list'] as const,
  unread: (userId: string | undefined) => ['notifications', userId, 'unread'] as const,
};

/** The newest 50 notifications, plus mark-read actions. */
export function useNotifications() {
  const userId = useAuthStore((s) => s.user?.id);
  const client = useQueryClient();

  const query = useQuery({
    queryKey: keys.list(userId),
    queryFn: () => notificationsApi.list(),
    enabled: isLiveApi,
  });
  const refresh = () => client.invalidateQueries({ queryKey: keys.all(userId) });
  const markRead = useMutation({
    mutationFn: (id: number) => notificationsApi.markRead(id),
    onSuccess: refresh,
  });
  const markAllRead = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: refresh,
  });

  const mockNotifications = useMockDb((s) => s.notifications);
  const mockMarkRead = useMockDb((s) => s.markNotificationRead);

  if (!isLiveApi) {
    const mine = mockNotifications.filter((n) => n.userId === userId).slice().reverse();
    return {
      items: mine.map((n) => ({ id: n.id, title: n.title, body: n.body, read: n.read, sentAt: n.created_at })),
      isLoading: false,
      isError: false,
      error: null,
      refetch: () => undefined,
      markRead: (id: NotificationItem['id']) => mockMarkRead(String(id)),
      markAllRead: () => mine.filter((n) => !n.read).forEach((n) => mockMarkRead(n.id)),
    };
  }

  return {
    items: (query.data?.items ?? []).map(
      (n): NotificationItem => ({
        id: n.notificationId,
        title: n.title,
        body: n.body,
        read: n.isRead,
        sentAt: n.sentAt,
      }),
    ),
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: () => void query.refetch(),
    markRead: (id: NotificationItem['id']) => markRead.mutate(Number(id)),
    markAllRead: () => markAllRead.mutate(),
  };
}

/** Unread total for the bell badge. Polls while the app is in the foreground, like chat. */
export function useNotificationUnreadCount(): number {
  const userId = useAuthStore((s) => s.user?.id);
  const query = useQuery({
    queryKey: keys.unread(userId),
    queryFn: async () => (await notificationsApi.unreadCount()).unreadCount,
    enabled: isLiveApi && Boolean(userId),
    refetchInterval: isLiveApi ? 30_000 : false,
    refetchIntervalInBackground: false,
  });
  const mockUnread = useMockDb(
    (s) => s.notifications.filter((n) => n.userId === userId && !n.read).length,
  );
  return isLiveApi ? (query.data ?? 0) : mockUnread;
}
