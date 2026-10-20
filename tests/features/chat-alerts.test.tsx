import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, vi } from 'vitest';

import type { ChatConversation } from '@/features/chat/types/chat.types';

const chatApi = vi.hoisted(() => ({ conversations: vi.fn() }));
vi.mock('@/features/chat/api/chatApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/chat/api/chatApi')>();
  return { ...actual, chatApi: { ...actual.chatApi, ...chatApi } };
});
// Chat is announced without sound; the chime is for new orders only.
const chime = vi.hoisted(() => ({
  playChime: vi.fn(() => true),
  unlockChime: vi.fn(async () => true),
  unlockChimeOnFirstGesture: vi.fn(() => () => undefined),
  chimeReady: vi.fn(() => true),
}));
vi.mock('@/core/attention/chime', () => chime);
const toast = vi.hoisted(() => ({ showToast: vi.fn() }));
vi.mock('@/components/feedback', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/feedback')>()),
  ...toast,
}));

const { detectNewMessages, newMessageAlert } =
  await import('@/features/chat/alerts/new-message-detection');
const { useChatAlerts } = await import('@/features/chat/alerts/useChatAlerts');
const { ChatNotificationPrompt } = await import('@/features/chat/alerts/ChatNotificationPrompt');

const thread = (
  conversationId: number,
  lastMessageAt: string | null,
  extra: Partial<ChatConversation> = {},
): ChatConversation => ({
  conversationId,
  storefrontId: 1,
  storefrontName: 'Bánh mì & Xôi Cô Lan',
  storefrontImageUrl: null,
  customerUserId: 7,
  customerName: 'Nguyễn Khách Hàng',
  counterpartName: 'Nguyễn Khách Hàng',
  createdAt: '2026-10-04T06:00:00Z',
  lastMessageAt,
  lastMessagePreview: 'Còn bánh mì không quán?',
  lastMessageFromMe: false,
  unreadCount: 1,
  ...extra,
});

describe('detectNewMessages', () => {
  const at = (minute: number) => `2026-10-04T07:${String(minute).padStart(2, '0')}:00Z`;

  it('only sets a baseline on the first look', () => {
    const result = detectNewMessages(null, [thread(1, at(5))]);
    expect(result.arrived).toEqual([]);
    expect(result.seenUpTo).toBe(Date.parse(at(5)));
  });

  it('announces the other side’s new message once', () => {
    const base = Date.parse(at(5));
    const first = detectNewMessages(base, [thread(1, at(6)), thread(2, at(4))]);
    expect(first.arrived.map((t) => t.conversationId)).toEqual([1]);
    expect(detectNewMessages(first.seenUpTo, [thread(1, at(6))]).arrived).toEqual([]);
  });

  it('ignores a reply sent from this account’s other device', () => {
    const base = Date.parse(at(5));
    expect(
      detectNewMessages(base, [thread(1, at(6), { lastMessageFromMe: true })]).arrived,
    ).toEqual([]);
  });

  it('names the newest thread and counts the rest', () => {
    const alert = newMessageAlert([
      thread(1, at(7), { counterpartName: 'Chị Lan' }),
      thread(2, at(6)),
    ]);
    expect(alert.title).toBe('Tin nhắn mới từ Chị Lan');
    expect(alert.body).toBe('Còn bánh mì không quán? (và 1 cuộc trò chuyện khác)');
  });
});

describe('useChatAlerts', () => {
  let client: QueryClient;
  const renderAt = (path: string) =>
    renderHook(() => useChatAlerts(true, '/vendor/chat'), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>
          <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>
        </QueryClientProvider>
      ),
    });
  const loaded = () =>
    waitFor(() => expect(client.getQueryCache().getAll()[0]?.state.status).toBe('success'));
  const refresh = () => act(() => client.invalidateQueries({ queryKey: ['chat'] }));

  beforeEach(() => {
    vi.clearAllMocks();
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.title = 'StreetBiz';
  });

  it('toasts a new message, silently, but not the ones already there', async () => {
    chatApi.conversations.mockResolvedValueOnce([thread(1, '2026-10-04T07:00:00Z')]);
    renderAt('/vendor/home');
    await loaded();
    expect(toast.showToast).not.toHaveBeenCalled();

    chatApi.conversations.mockResolvedValueOnce([thread(1, '2026-10-04T07:01:00Z')]);
    await refresh();

    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith(
        'Tin nhắn mới từ Nguyễn Khách Hàng: Còn bánh mì không quán?',
      ),
    );
    expect(chime.playChime).not.toHaveBeenCalled();
  });

  it('stays quiet for the thread the person is reading', async () => {
    chatApi.conversations.mockResolvedValueOnce([thread(4, '2026-10-04T07:00:00Z')]);
    renderAt('/vendor/chat/4');
    await loaded();

    chatApi.conversations.mockResolvedValueOnce([thread(4, '2026-10-04T07:01:00Z')]);
    await refresh();
    await waitFor(() => expect(chatApi.conversations).toHaveBeenCalledTimes(2));

    expect(chime.playChime).not.toHaveBeenCalled();
    expect(toast.showToast).not.toHaveBeenCalled();
  });

  it('notifies a hidden tab, one notification per thread', async () => {
    const shown: { title: string; tag?: string; notification: { onclick?: () => void } }[] = [];
    vi.stubGlobal(
      'Notification',
      Object.assign(
        function (
          this: { onclick?: () => void; close?: () => void },
          title: string,
          options: NotificationOptions,
        ) {
          this.close = () => undefined;
          shown.push({ title, tag: options.tag, notification: this });
        },
        { permission: 'granted' },
      ),
    );
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    chatApi.conversations.mockResolvedValueOnce([]);
    renderAt('/vendor/chat/9'); // even the open thread, since nobody is looking
    await loaded();

    chatApi.conversations.mockResolvedValueOnce([thread(9, '2026-10-04T07:01:00Z')]);
    await refresh();

    await waitFor(() => expect(shown).toHaveLength(1));
    expect(shown[0]!.tag).toBe('chat-9');
    // Only a toast and a notification: the tab title is left alone.
    expect(document.title).toBe('StreetBiz');
  });
});

describe('ChatNotificationPrompt', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('asks the browser once, on a tap, then gets out of the way', async () => {
    const requestPermission = vi.fn(async () => 'granted' as NotificationPermission);
    vi.stubGlobal('Notification', { permission: 'default', requestPermission });
    render(<ChatNotificationPrompt />);

    await userEvent.click(screen.getByRole('button', { name: 'Bật thông báo' }));

    expect(requestPermission).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Bật thông báo' })).not.toBeInTheDocument();
  });

  it.each(['granted', 'denied'] as const)('is not shown once the browser has answered (%s)', (permission) => {
    vi.stubGlobal('Notification', { permission, requestPermission: vi.fn() });
    const { container } = render(<ChatNotificationPrompt />);
    expect(container).toBeEmptyDOMElement();
  });
});
