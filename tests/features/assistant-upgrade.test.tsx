import { act, cleanup, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { optimistic } from '@/features/assistant/assistant-state';
import type { AssistantMessage } from '@/features/assistant/types';

const mock = vi.hoisted(() => ({
  send: vi.fn(),
  upload: vi.fn(),
  decode: vi.fn(),
  remove: vi.fn(),
}));
vi.mock('@/core/config/env', () => ({
  isLiveApi: true,
  env: { apiBaseUrl: 'http://localhost:5000/api' },
}));
vi.mock('@/features/assistant/assistant-image', () => ({ screenshotPng: mock.decode }));
vi.mock('@/features/assistant/assistant-api', () => ({
  assistantApi: { upload: mock.upload, removeAttachment: mock.remove },
}));
vi.mock('@/features/assistant/useAssistant', () => ({
  useAssistant: () => ({
    messages: [],
    conversations: [],
    busy: false,
    error: '',
    connected: true,
    capabilities: { enabled: true, attachmentsEnabled: true, maxQuestionCharacters: 4000 },
    send: mock.send,
    select: vi.fn(),
  }),
}));
const { AssistantPanel, MessageBubble } = await import('@/features/assistant/AssistantPanel');
const { useAssistantImage } = await import('@/features/assistant/useAssistantImage');
const file = () => new File(['fake-image'], 'mon-an.png', { type: 'image/png' });
const renderPanel = () =>
  render(
    <MemoryRouter>
      <AssistantPanel
        accountKey="customer"
        role="CUSTOMER"
        open
        fullPage={false}
        onClose={vi.fn()}
      />
    </MemoryRouter>,
  );
beforeEach(() => {
  vi.clearAllMocks();
  mock.decode.mockResolvedValue('cG5n');
  mock.upload.mockResolvedValue({ id: 'image-id', expiresAt: '2099-01-01T00:00:00Z' });
  mock.send.mockResolvedValue(undefined);
  mock.remove.mockResolvedValue(undefined);
});
afterEach(cleanup);

describe('image consent and request presentation', () => {
  it('keeps only the latest failed image temporarily and requires renewed consent', () => {
    vi.useFakeTimers();
    try {
      const { result, unmount } = renderHook(() => useAssistantImage());
      act(() => result.current.remember('first', { png: 'first', name: 'a.png' }));
      act(() => result.current.remember('second', { png: 'second', name: 'b.png' }));
      expect(result.current.restore('first')).toBe(false);
      act(() => {
        expect(result.current.restore('second')).toBe(true);
      });
      expect(result.current.image?.png).toBe('second');
      expect(result.current.consent).toBe(false);
      act(() => {
        result.current.clear();
        vi.advanceTimersByTime(300_001);
      });
      expect(result.current.restore('second')).toBe(false);
      unmount();
    } finally {
      vi.useRealTimers();
    }
  });
  it('previews locally, requires consent, uploads only on send and sends the selected style', async () => {
    const user = userEvent.setup();
    const { container } = renderPanel();
    await user.upload(container.querySelector('input[type=file]')!, file());
    expect(await screen.findByAltText('Ảnh đính kèm đang chờ gửi')).toBeVisible();
    expect(mock.upload).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Gửi câu hỏi' })).toBeDisabled();
    await user.click(screen.getByRole('checkbox', { name: /Tôi đồng ý gửi ảnh/ }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Cách trả lời' }), 'steps');
    await user.click(screen.getByRole('button', { name: 'Gửi câu hỏi' }));
    await waitFor(() =>
      expect(mock.send).toHaveBeenCalledWith(
        'Giúp tôi giải thích nội dung trong ảnh này.',
        undefined,
        undefined,
        false,
        ['image-id'],
        'steps',
      ),
    );
    expect(mock.upload).toHaveBeenCalledTimes(1);
    expect(screen.queryByAltText('Ảnh đính kèm đang chờ gửi')).not.toBeInTheDocument();
    expect(mock.remove).not.toHaveBeenCalled();
  });
  it('removing a preview never uploads it', async () => {
    const user = userEvent.setup();
    const { container } = renderPanel();
    await user.upload(container.querySelector('input[type=file]')!, file());
    await screen.findByAltText('Ảnh đính kèm đang chờ gửi');
    await user.click(screen.getByRole('button', { name: 'Bỏ ảnh' }));
    expect(screen.queryByAltText('Ảnh đính kèm đang chờ gửi')).not.toBeInTheDocument();
    expect(mock.upload).not.toHaveBeenCalled();
  });
  it('retains preview and draft when upload fails', async () => {
    mock.upload.mockRejectedValueOnce(new Error('Không tải được ảnh.'));
    const user = userEvent.setup();
    const { container } = renderPanel();
    await user.upload(container.querySelector('input[type=file]')!, file());
    await screen.findByAltText('Ảnh đính kèm đang chờ gửi');
    await user.click(screen.getByRole('checkbox', { name: /Tôi đồng ý gửi ảnh/ }));
    await user.type(screen.getByRole('textbox'), 'Đây là món gì?');
    await user.click(screen.getByRole('button', { name: 'Gửi câu hỏi' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được ảnh.');
    expect(screen.getByRole('textbox')).toHaveValue('Đây là món gì?');
    expect(screen.getByAltText('Ảnh đính kèm đang chờ gửi')).toBeVisible();
    expect(mock.send).not.toHaveBeenCalled();
  });
  it('does not restore an image removed while decoding', async () => {
    let resolve!: (value: string) => void;
    mock.decode.mockReturnValueOnce(
      new Promise<string>((r) => {
        resolve = r;
      }),
    );
    const { result } = renderHook(() => useAssistantImage());
    let pending!: Promise<void>;
    act(() => {
      pending = result.current.choose(file());
    });
    act(() => result.current.clear());
    await act(async () => {
      resolve('cG5n');
      await pending;
    });
    expect(result.current.image).toBeUndefined();
    expect(result.current.preparing).toBe(false);
  });
});

describe('structured answers', () => {
  it('renders only validated public upload thumbnails, not model-controlled external URLs', () => {
    const message: AssistantMessage = {
      ...optimistic('Các quầy phù hợp', 'request', 1),
      sender: 'ASSISTANT',
      status: 'COMPLETED',
      cards: [
        {
          kind: 'status',
          title: 'Quầy A',
          fields: [],
          actionId: null,
          imageUrl: '/api/uploads/menu-images/1/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.png',
        },
        {
          kind: 'status',
          title: 'Quầy B',
          fields: [],
          actionId: null,
          imageUrl: 'https://untrusted.example/photo.png',
        },
      ],
    };
    render(
      <MessageBubble
        message={message}
        role="CUSTOMER"
        busy={false}
        onNavigate={vi.fn()}
        onRetry={vi.fn()}
        onFeedback={vi.fn()}
      />,
    );
    expect(screen.getByAltText('Ảnh công khai: Quầy A')).toHaveAttribute(
      'src',
      'http://localhost:5000/api/uploads/menu-images/1/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.png',
    );
    expect(screen.queryByAltText('Ảnh công khai: Quầy B')).not.toBeInTheDocument();
  });
  it('shows actionable checklist without allowing cross-role navigation', async () => {
    const message: AssistantMessage = {
      ...optimistic('Đã tra cứu.', 'request', 1),
      sender: 'ASSISTANT',
      status: 'COMPLETED',
      responseStyle: 'steps',
      checklist: [
        { text: 'Đối chiếu hồ sơ của bạn.', actionId: 'safe' },
        { text: 'Xem thêm.', actionId: 'unsafe' },
      ],
      actions: [
        { id: 'safe', label: 'Mở hồ sơ', kind: 'NAVIGATE', route: '/customer/explore/vendors/1' },
        { id: 'unsafe', label: 'Quản trị', kind: 'NAVIGATE', route: '/platform/accounts' },
      ],
    };
    const navigate = vi.fn();
    render(
      <MessageBubble
        message={message}
        role="CUSTOMER"
        busy={false}
        onNavigate={navigate}
        onRetry={vi.fn()}
        onFeedback={vi.fn()}
      />,
    );
    expect(screen.getByText('Đối chiếu hồ sơ của bạn.')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Quản trị' })).not.toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('button', { name: 'Mở hồ sơ' })[0]!);
    expect(navigate).toHaveBeenCalledWith('/customer/explore/vendors/1');
  });
  it('explains that retrying an image answer needs the image again', () => {
    const message: AssistantMessage = {
      ...optimistic('', 'request', 1),
      sender: 'ASSISTANT',
      status: 'FAILED',
      hasAttachments: true,
    };
    render(
      <MessageBubble
        message={message}
        role="CUSTOMER"
        busy={false}
        onNavigate={vi.fn()}
        onRetry={vi.fn()}
        onFeedback={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Thử lại câu hỏi có ảnh' })).toBeVisible();
  });
});
