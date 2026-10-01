import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { NotificationsScreen } from '@/features/account-management/screens/NotificationsScreen';
import { notificationsApi, type NotificationDto } from '@/features/account-management/notifications-api';
import { useAuthStore } from '@/store/auth-store';

// isLiveApi is computed at module load, so live mode has to be forced with a hoisted mock.
vi.mock('@/core/config/env', () => ({
  env: { apiBaseUrl: 'https://api.example.test/api', useMockApi: false, appEnv: 'test' },
  isDev: true,
  isLiveApi: true,
}));

function notification(id: number, isRead: boolean): NotificationDto {
  return {
    notificationId: id,
    type: 'ORDER',
    title: `Thông báo ${id}`,
    body: `Nội dung ${id}`,
    relatedEntityType: 'ORDER',
    relatedEntityId: id,
    isRead,
    sentAt: '2026-09-30T10:00:00Z',
  };
}

function mount() {
  useAuthStore.setState({
    user: {
      id: '9',
      fullName: 'Khách',
      phone: '0905000201',
      password: '',
      role_code: 'CUSTOMER',
      account_status: 'ACTIVE',
    },
    sessionExpired: false,
  });
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <NotificationsScreen />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('notifications (live)', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    useAuthStore.setState({ user: null, sessionExpired: false });
  });

  it('lists the backend notifications and marks one read', async () => {
    const list = vi
      .spyOn(notificationsApi, 'list')
      .mockResolvedValue({ items: [notification(2, false), notification(1, true)], hasMore: false });
    const markRead = vi.spyOn(notificationsApi, 'markRead').mockResolvedValue(undefined);

    mount();

    fireEvent.click(await screen.findByText('Thông báo 2'));
    await waitFor(() => expect(markRead).toHaveBeenCalledWith(2));
    // Marking refreshes the list from the backend.
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
    expect(screen.getByText('Nội dung 1')).toBeInTheDocument();
  });

  it('offers "Đọc hết" only while something is unread', async () => {
    vi.spyOn(notificationsApi, 'list').mockResolvedValue({
      items: [notification(3, false)],
      hasMore: false,
    });
    const markAll = vi.spyOn(notificationsApi, 'markAllRead').mockResolvedValue(undefined);

    mount();

    fireEvent.click(await screen.findByText('Đọc hết'));
    await waitFor(() => expect(markAll).toHaveBeenCalledTimes(1));
  });

  it('shows the empty state when there is nothing', async () => {
    vi.spyOn(notificationsApi, 'list').mockResolvedValue({ items: [], hasMore: false });

    mount();

    expect(await screen.findByText('Chưa có thông báo')).toBeInTheDocument();
    expect(screen.queryByText('Đọc hết')).not.toBeInTheDocument();
  });
});
