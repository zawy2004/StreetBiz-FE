import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import type { ChatConversation, ChatMessage, ChatThread } from '@/features/chat/types/chat.types';

const chatApi = vi.hoisted(() => ({
  conversations: vi.fn(),
  start: vi.fn(),
  thread: vi.fn(),
  olderMessages: vi.fn(),
  send: vi.fn(),
  unreadCount: vi.fn(),
}));

vi.mock('@/features/chat/api/chatApi', () => ({ chatApi }));
vi.mock('@/core/config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/config/env')>();
  return { ...actual, isLiveApi: true };
});

const { ConversationsScreen } = await import('@/features/chat/screens/ConversationsScreen');
const { ChatThreadScreen } = await import('@/features/chat/screens/ChatThreadScreen');
const { useAuthStore } = await import('@/store/auth-store');

const conversation: ChatConversation = {
  conversationId: 1,
  storefrontId: 3,
  storefrontName: 'Bánh mì & Xôi Cô Lan',
  storefrontImageUrl: null,
  customerUserId: 9,
  customerName: 'Nguyễn Khách Hàng',
  counterpartName: 'Bánh mì & Xôi Cô Lan',
  createdAt: '2026-09-27T10:00:00Z',
  lastMessageAt: '2026-09-27T10:05:00Z',
  lastMessagePreview: 'Bánh mì còn không ạ?',
  lastMessageFromMe: true,
  unreadCount: 0,
};

const messages: ChatMessage[] = [
  {
    messageId: 1,
    conversationId: 1,
    senderUserId: 9,
    senderName: 'Nguyễn Khách Hàng',
    fromMe: true,
    body: 'Bánh mì còn không ạ?',
    sentAt: '2026-09-27T10:05:00Z',
    readAt: null,
  },
  {
    messageId: 2,
    conversationId: 1,
    senderUserId: 5,
    senderName: 'Phạm Thị Lan',
    fromMe: false,
    body: 'Còn bạn nhé.',
    sentAt: '2026-09-27T10:06:00Z',
    readAt: null,
  },
];

const thread: ChatThread = { conversation, messages, hasMore: false };

function signIn(role: 'CUSTOMER' | 'VENDOR') {
  useAuthStore.setState({
    user: {
      id: role === 'CUSTOMER' ? '9' : '5',
      fullName: role === 'CUSTOMER' ? 'Nguyễn Khách Hàng' : 'Phạm Thị Lan',
      phone: '0905000201',
      password: '',
      role_code: role,
      account_status: 'ACTIVE',
    },
    sessionExpired: false,
  });
}

function renderAt(path: string, route: string, element: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={route} element={element} />
          <Route path="/customer/chat/:conversationId" element={<div>thread destination</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('chat', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    signIn('CUSTOMER');
  });

  it('shows an empty inbox with role-specific guidance', async () => {
    chatApi.conversations.mockResolvedValue([]);
    renderAt('/customer/chat', '/customer/chat', <ConversationsScreen />);
    expect(await screen.findByText('Chưa có cuộc trò chuyện')).toBeInTheDocument();
    expect(screen.getByText(/Nhắn tin cho người bán/)).toBeInTheDocument();
  });

  it('tells a vendor to wait for buyers rather than to start a thread', async () => {
    signIn('VENDOR');
    chatApi.conversations.mockResolvedValue([]);
    renderAt('/vendor/chat', '/vendor/chat', <ConversationsScreen />);
    expect(await screen.findByText('Chưa có cuộc trò chuyện')).toBeInTheDocument();
    expect(screen.getByText(/Khi khách nhắn tin/)).toBeInTheDocument();
  });

  it('marks who sent the last message and shows the unread badge', async () => {
    chatApi.conversations.mockResolvedValue([{ ...conversation, unreadCount: 4 }]);
    renderAt('/customer/chat', '/customer/chat', <ConversationsScreen />);
    expect(await screen.findByText('Bạn: Bánh mì còn không ạ?')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('opens a thread from the inbox', async () => {
    chatApi.conversations.mockResolvedValue([conversation]);
    const user = userEvent.setup();
    renderAt('/customer/chat', '/customer/chat', <ConversationsScreen />);
    await user.click(await screen.findByText('Bánh mì & Xôi Cô Lan'));
    expect(await screen.findByText('thread destination')).toBeInTheDocument();
  });

  it('renders both sides of a thread', async () => {
    chatApi.thread.mockResolvedValue(thread);
    renderAt('/customer/chat/1', '/customer/chat/:conversationId', <ChatThreadScreen />);
    expect(await screen.findByText('Bánh mì còn không ạ?')).toBeInTheDocument();
    expect(screen.getByText('Còn bạn nhé.')).toBeInTheDocument();
  });

  it('sends a trimmed message and refuses an empty one', async () => {
    chatApi.thread.mockResolvedValue(thread);
    chatApi.send.mockResolvedValue(messages[0]);
    const user = userEvent.setup();
    renderAt('/customer/chat/1', '/customer/chat/:conversationId', <ChatThreadScreen />);

    const sendButton = await screen.findByRole('button', { name: 'Gửi' });
    expect(sendButton).toBeDisabled();

    await user.type(screen.getByPlaceholderText('Nhập tin nhắn…'), '  Cho mình 2 ổ  ');
    await user.click(screen.getByRole('button', { name: 'Gửi' }));

    await waitFor(() => expect(chatApi.send).toHaveBeenCalledWith('1', 'Cho mình 2 ổ'));
  });

  it('sends on Enter, the way a chat box is expected to behave', async () => {
    chatApi.thread.mockResolvedValue(thread);
    chatApi.send.mockResolvedValue(messages[0]);
    const user = userEvent.setup();
    renderAt('/customer/chat/1', '/customer/chat/:conversationId', <ChatThreadScreen />);

    await user.type(await screen.findByPlaceholderText('Nhập tin nhắn…'), 'Cho mình 2 ổ{Enter}');

    await waitFor(() => expect(chatApi.send).toHaveBeenCalledWith('1', 'Cho mình 2 ổ'));
  });

  it('keeps the input on one row beside the button, not stretched by the send button', async () => {
    chatApi.thread.mockResolvedValue(thread);
    renderAt('/customer/chat/1', '/customer/chat/:conversationId', <ChatThreadScreen />);

    const input = await screen.findByPlaceholderText('Nhập tin nhắn…');
    const button = screen.getByRole('button', { name: 'Gửi' });

    // The regression: the button rendered full width and squeezed the input to
    // a sliver, because StickyActions sizes its children like buttons.
    expect(button.className).not.toMatch(/\bw-full\b/);
    expect(input.className).toMatch(/flex-1/);
    expect(input.closest('form')).toContainElement(button);
  });

  it('keeps the typed message when sending fails', async () => {
    chatApi.thread.mockResolvedValue(thread);
    chatApi.send.mockRejectedValue(new Error('mạng lỗi'));
    const user = userEvent.setup();
    renderAt('/customer/chat/1', '/customer/chat/:conversationId', <ChatThreadScreen />);

    const input = await screen.findByPlaceholderText('Nhập tin nhắn…');
    await user.type(input, 'Cho mình 2 ổ');
    await user.click(screen.getByRole('button', { name: 'Gửi' }));

    await waitFor(() => expect(chatApi.send).toHaveBeenCalled());
    // Losing the draft here would throw away what the user wrote.
    expect(input).toHaveValue('Cho mình 2 ổ');
  });

  it('clears the box once the message is on its way', async () => {
    chatApi.thread.mockResolvedValue(thread);
    chatApi.send.mockResolvedValue(messages[0]);
    const user = userEvent.setup();
    renderAt('/customer/chat/1', '/customer/chat/:conversationId', <ChatThreadScreen />);

    const input = await screen.findByPlaceholderText('Nhập tin nhắn…');
    await user.type(input, 'Cho mình 2 ổ');
    await user.click(screen.getByRole('button', { name: 'Gửi' }));

    await waitFor(() => expect(input).toHaveValue(''));
  });

  it('offers older messages only when the server says more exist', async () => {
    chatApi.thread.mockResolvedValue(thread);
    renderAt('/customer/chat/1', '/customer/chat/:conversationId', <ChatThreadScreen />);
    await screen.findByText('Bánh mì còn không ạ?');
    expect(screen.queryByRole('button', { name: 'Xem tin nhắn cũ hơn' })).not.toBeInTheDocument();
  });

  it('prepends an older page above the messages already shown', async () => {
    chatApi.thread.mockResolvedValue({ ...thread, hasMore: true });
    chatApi.olderMessages.mockResolvedValue({
      messages: [{ ...messages[0], messageId: 0, body: 'Tin nhắn từ hôm qua' }],
      hasMore: false,
    });
    const user = userEvent.setup();
    renderAt('/customer/chat/1', '/customer/chat/:conversationId', <ChatThreadScreen />);

    await user.click(await screen.findByRole('button', { name: 'Xem tin nhắn cũ hơn' }));

    // Paged from the oldest message currently on screen, walking backwards.
    await waitFor(() => expect(chatApi.olderMessages).toHaveBeenCalledWith('1', 1));
    expect(await screen.findByText('Tin nhắn từ hôm qua')).toBeInTheDocument();
    // Nothing older remains, so the button retires.
    expect(screen.queryByRole('button', { name: 'Xem tin nhắn cũ hơn' })).not.toBeInTheDocument();
  });

  it('does not drop a message that a new arrival pushes out of the newest page', async () => {
    // The server returns a fixed-size window of the newest messages. Once older
    // pages are open, a new message shifts that window and its oldest entry falls
    // out - it must not vanish from the screen.
    const windowed = (ids: number[]) =>
      ids.map((id) => ({ ...messages[0], messageId: id, body: `tin ${id}` }));

    chatApi.thread.mockResolvedValue({
      conversation,
      messages: windowed([11, 12]),
      hasMore: true,
    });
    chatApi.olderMessages.mockResolvedValue({ messages: windowed([10]), hasMore: false });

    const user = userEvent.setup();
    renderAt('/customer/chat/1', '/customer/chat/:conversationId', <ChatThreadScreen />);
    await user.click(await screen.findByRole('button', { name: 'Xem tin nhắn cũ hơn' }));
    expect(await screen.findByText('tin 10')).toBeInTheDocument();

    // A new message arrives; the window slides from 11-12 to 12-13.
    chatApi.thread.mockResolvedValue({
      conversation,
      messages: windowed([12, 13]),
      hasMore: true,
    });
    await waitFor(() => expect(screen.getByText('tin 13')).toBeInTheDocument(), {
      timeout: 12_000,
    });

    expect(screen.getByText('tin 10')).toBeInTheDocument();
    expect(screen.getByText('tin 11')).toBeInTheDocument();
    expect(screen.getByText('tin 12')).toBeInTheDocument();
    // Waits for the 8s polling refetch that stands in for a realtime push.
  }, 20_000);

  it('does not call the API for a role that has no chat', async () => {
    useAuthStore.setState({ user: null, sessionExpired: false });
    renderAt('/customer/chat', '/customer/chat', <ConversationsScreen />);
    expect(await screen.findByText('Chưa đăng nhập')).toBeInTheDocument();
    expect(chatApi.conversations).not.toHaveBeenCalled();
  });
});
