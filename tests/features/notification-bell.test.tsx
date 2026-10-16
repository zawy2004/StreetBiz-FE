import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NotificationBell } from '@/features/notifications/NotificationBell';
import { notificationsApi, type NotificationDto } from '@/features/notifications/notifications-api';
import type { RoleCode } from '@/core/types/role';
import { useAuthStore } from '@/store/auth-store';

// isLiveApi is computed at module load, so live mode has to be forced with a hoisted mock.
vi.mock('@/core/config/env', () => ({
  env: { apiBaseUrl: 'https://api.example.test/api', useMockApi: false, appEnv: 'test' },
  isDev: true,
  isLiveApi: true,
}));

function dto(partial: Partial<NotificationDto> & { notificationId: number }): NotificationDto {
  return {
    type: 'ORDER',
    title: `Thông báo ${partial.notificationId}`,
    body: `Nội dung ${partial.notificationId}`,
    relatedEntityType: 'ORDER',
    relatedEntityId: partial.notificationId,
    isRead: false,
    sentAt: new Date().toISOString(),
    ...partial,
  };
}

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

function mount(role: RoleCode) {
  useAuthStore.setState({
    user: {
      id: '9',
      fullName: 'Người dùng',
      phone: '0905000201',
      password: '',
      role_code: role,
      account_status: 'ACTIVE',
    } as never,
    sessionExpired: false,
  });
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/start']}>
        <NotificationBell />
        <Routes>
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  // jsdom has no matchMedia; report a desktop-width viewport.
  window.matchMedia = ((query: string) => ({
    matches: true,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  useAuthStore.setState({ user: null, sessionExpired: false });
});

describe('NotificationBell', () => {
  it('shows the unread count and loads the list only when opened', async () => {
    vi.spyOn(notificationsApi, 'unreadCount').mockResolvedValue({ unreadCount: 3 });
    const list = vi
      .spyOn(notificationsApi, 'list')
      .mockResolvedValue({ items: [dto({ notificationId: 1 })], hasMore: false });

    mount('CUSTOMER');

    const bell = await screen.findByLabelText('Thông báo, 3 chưa đọc');
    expect(list).not.toHaveBeenCalled();

    fireEvent.click(bell);
    expect(await screen.findByRole('dialog', { name: 'Thông báo' })).toBeInTheDocument();
    expect(await screen.findByText('Thông báo 1')).toBeInTheDocument();
    expect(screen.getByText('Mới')).toBeInTheDocument();
  });

  it('marks a notice read and opens what it is about, then closes', async () => {
    vi.spyOn(notificationsApi, 'unreadCount').mockResolvedValue({ unreadCount: 1 });
    vi.spyOn(notificationsApi, 'list').mockResolvedValue({
      items: [dto({ notificationId: 42 })],
      hasMore: false,
    });
    const markRead = vi.spyOn(notificationsApi, 'markRead').mockResolvedValue(undefined);

    mount('VENDOR');

    fireEvent.click(await screen.findByLabelText('Thông báo, 1 chưa đọc'));
    fireEvent.click(await screen.findByText('Thông báo 42'));

    await waitFor(() => expect(markRead).toHaveBeenCalledWith(42));
    expect(screen.getByTestId('where')).toHaveTextContent('/vendor/orders/42');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('keeps the panel open for a notice that has nowhere to go', async () => {
    vi.spyOn(notificationsApi, 'unreadCount').mockResolvedValue({ unreadCount: 1 });
    vi.spyOn(notificationsApi, 'list').mockResolvedValue({
      items: [dto({ notificationId: 5, type: 'CONTENT_MODERATION', relatedEntityType: 'ReportedContent' })],
      hasMore: false,
    });
    const markRead = vi.spyOn(notificationsApi, 'markRead').mockResolvedValue(undefined);

    mount('CUSTOMER');

    fireEvent.click(await screen.findByLabelText('Thông báo, 1 chưa đọc'));
    fireEvent.click(await screen.findByText('Thông báo 5'));

    await waitFor(() => expect(markRead).toHaveBeenCalledWith(5));
    expect(screen.getByTestId('where')).toHaveTextContent('/start');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('filters to unread and marks everything read from the menu', async () => {
    vi.spyOn(notificationsApi, 'unreadCount').mockResolvedValue({ unreadCount: 1 });
    vi.spyOn(notificationsApi, 'list').mockResolvedValue({
      items: [dto({ notificationId: 1 }), dto({ notificationId: 2, isRead: true })],
      hasMore: false,
    });
    const markAll = vi.spyOn(notificationsApi, 'markAllRead').mockResolvedValue(undefined);

    mount('CUSTOMER');

    fireEvent.click(await screen.findByLabelText('Thông báo, 1 chưa đọc'));
    expect(await screen.findByText('Thông báo 2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Chưa đọc' }));
    expect(screen.queryByText('Thông báo 2')).not.toBeInTheDocument();
    expect(screen.getByText('Thông báo 1')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Tuỳ chọn thông báo'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Đánh dấu tất cả là đã đọc' }));
    await waitFor(() => expect(markAll).toHaveBeenCalledTimes(1));
  });

  it('closes on Escape and hands focus back to the bell', async () => {
    vi.spyOn(notificationsApi, 'unreadCount').mockResolvedValue({ unreadCount: 0 });
    vi.spyOn(notificationsApi, 'list').mockResolvedValue({ items: [], hasMore: false });

    mount('WARD_AUTHORITY');

    const bell = await screen.findByLabelText('Thông báo');
    fireEvent.click(bell);
    expect(await screen.findByText('Chưa có thông báo')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(bell).toHaveFocus();
  });
});
