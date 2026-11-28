import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mode = vi.hoisted(() => ({ live: true }));
vi.mock('@/core/config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/config/env')>();
  return {
    ...actual,
    get isLiveApi() {
      return mode.live;
    },
  };
});

const { ApiError } = await import('@/core/api/problem');
const { assistantApi } = await import('@/features/assistant/assistant-api');
const { useAssistant } = await import('@/features/assistant/useAssistant');
type AssistantMessage = import('@/features/assistant/types').AssistantMessage;

/** The assistant hook against the server (the SignalR hub is off under test). */
let seq = 0;
const msg = (over: Record<string, unknown> = {}): AssistantMessage =>
  ({
    id: `m${++seq}`,
    conversationId: 'c1',
    clientRequestId: `r${seq}`,
    sender: 'ASSISTANT',
    status: 'COMPLETED',
    content: 'Trả lời',
    isAiGenerated: true,
    sources: [],
    cards: [],
    actions: [],
    createdAt: '2026-11-27T00:00:00Z',
    completedAt: null,
    ordinal: seq,
    version: 1,
    error: null,
    ...over,
  }) as unknown as AssistantMessage;

let api: Record<string, ReturnType<typeof vi.spyOn>>;
beforeEach(() => {
  mode.live = true;
  seq = 0;
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => true });
  api = {
    capabilities: vi
      .spyOn(assistantApi, 'capabilities')
      .mockResolvedValue({ voice: true } as never),
    conversations: vi
      .spyOn(assistantApi, 'conversations')
      .mockResolvedValue({ items: [{ id: 'c1', title: 'Cũ' }], nextCursor: 'cur' } as never),
    history: vi
      .spyOn(assistantApi, 'history')
      .mockResolvedValue({ items: [msg()], nextCursor: 'old' } as never),
    create: vi.spyOn(assistantApi, 'create').mockResolvedValue({ id: 'c1' } as never),
    send: vi.spyOn(assistantApi, 'send'),
    guest: vi.spyOn(assistantApi, 'guest'),
    cancel: vi.spyOn(assistantApi, 'cancel'),
    delete: vi.spyOn(assistantApi, 'delete').mockResolvedValue(undefined as never),
    feedback: vi.spyOn(assistantApi, 'feedback').mockResolvedValue(undefined as never),
  };
});
afterEach(() => vi.restoreAllMocks());

describe('assistant hook (live account)', () => {
  it('loads capabilities and the conversation list, and pages more', async () => {
    const { result } = renderHook(() => useAssistant('VENDOR', 'u1'));
    await waitFor(() => expect(result.current.conversations).toHaveLength(1));
    expect(result.current.capabilities).toEqual({ voice: true });
    expect(result.current.conversationBefore).toBe('cur');

    api.conversations!.mockResolvedValueOnce({ items: [{ id: 'c2' }], nextCursor: null } as never);
    await act(() => result.current.loadConversations(true));
    expect(api.conversations).toHaveBeenLastCalledWith('cur');
    expect(result.current.conversations.map((c) => c.id)).toEqual(['c1', 'c2']);
  });

  it('shows a failed start-up load', async () => {
    api.capabilities!.mockRejectedValue(new ApiError('server_error', 500, 'Máy chủ lỗi'));
    const { result } = renderHook(() => useAssistant('VENDOR', 'u1'));
    await waitFor(() => expect(result.current.error).toBe('Máy chủ lỗi'));
  });

  it('starts a conversation on the first question, then sends into it', async () => {
    const answer = msg({ status: 'COMPLETED' });
    api.send!.mockResolvedValue({
      userMessage: msg({ sender: 'USER' }),
      assistantMessage: answer,
    } as never);
    const { result } = renderHook(() => useAssistant('VENDOR', 'u1'));

    let returned: unknown;
    await act(async () => {
      returned = await result.current.send(
        '  Phí tháng này? ',
        { route: '/vendor' } as never,
        undefined,
        false,
        ['a1'],
        'SHORT' as never,
        { latitude: 1, longitude: 2 },
      );
    });
    expect(api.create).toHaveBeenCalled();
    expect(api.send!.mock.calls[0]![1]).toMatchObject({
      content: 'Phí tháng này?',
      attachmentIds: ['a1'],
      location: { latitude: 1, longitude: 2 },
    });
    expect(returned).toEqual(answer);
    expect(result.current.conversationId).toBe('c1');
    expect(result.current.busy).toBe(false);

    await act(() => result.current.send('Lần hai'));
    expect(api.create).toHaveBeenCalledTimes(1);
    await act(() => result.current.send('   '));
    expect(api.send).toHaveBeenCalledTimes(2);
  });

  it('replays the last request on retry, and refuses while offline', async () => {
    api.send!.mockResolvedValue({
      userMessage: msg({ sender: 'USER' }),
      assistantMessage: msg(),
    } as never);
    const { result } = renderHook(() => useAssistant('VENDOR', 'u1'));
    await act(() => result.current.send('Hỏi'));
    const first = api.send!.mock.calls[0]![1] as { clientRequestId: string };
    await act(async () => {
      await result.current.retryRequest();
    });
    expect((api.send!.mock.calls[1]![1] as { clientRequestId: string }).clientRequestId).toBe(
      first.clientRequestId,
    );

    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
    await act(() => result.current.send('Mất mạng'));
    expect(result.current.error).toBe('Bạn đang mất mạng. Kết nối lại để tra cứu dữ liệu mới.');
  });

  it('follows an answer still being written, and catches up after a refused send', async () => {
    api.history!.mockResolvedValue({
      items: [msg({ status: 'GENERATING' })],
      nextCursor: null,
    } as never);
    const conflict = Object.assign(new ApiError('conflict', 409, 'Đang trả lời câu trước'), {
      activeMessageId: 'm9',
    });
    api.send!.mockRejectedValue(conflict);
    const { result } = renderHook(() => useAssistant('VENDOR', 'u1'));
    await act(() => result.current.select('c1'));
    expect(result.current.busy).toBe(true);

    // Busy: a second question waits.
    await act(() => result.current.send('Chen ngang'));
    expect(api.send).not.toHaveBeenCalled();

    api.cancel!.mockResolvedValue(msg({ status: 'CANCELLED' }) as never);
    await act(() => result.current.stop());
    expect(result.current.busy).toBe(false);

    await act(() => result.current.send('Hỏi'));
    expect(result.current.error).toBe('Đang trả lời câu trước');
    expect(api.history).toHaveBeenCalledTimes(2);
  });

  it('reports a failed stop and keeps waiting', async () => {
    api.history!.mockResolvedValue({
      items: [msg({ status: 'GENERATING' })],
      nextCursor: null,
    } as never);
    api.cancel!.mockRejectedValue(new ApiError('server_error', 500, 'Không dừng được'));
    const { result } = renderHook(() => useAssistant('VENDOR', 'u1'));
    await act(() => result.current.select('c1'));
    await act(() => result.current.stop());
    expect(result.current.error).toBe('Không dừng được');
    expect(result.current.busy).toBe(true);
  });

  it('opens a conversation, loads older turns, records feedback and deletes it', async () => {
    const { result } = renderHook(() => useAssistant('VENDOR', 'u1'));
    await act(() => result.current.select('c1'));
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.before).toBe('old');

    api.history!.mockResolvedValueOnce({ items: [msg({ ordinal: 0 })], nextCursor: null } as never);
    await act(() => result.current.loadOlder());
    expect(api.history).toHaveBeenLastCalledWith('c1', 'old');
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.before).toBeNull();
    await act(() => result.current.loadOlder());
    expect(api.history).toHaveBeenCalledTimes(2);

    let ok: unknown;
    await act(async () => {
      ok = await result.current.feedback(result.current.messages[0]!, true);
    });
    expect(ok).toBe(true);
    api.feedback!.mockRejectedValueOnce(new Error('x'));
    await act(async () => {
      ok = await result.current.feedback(result.current.messages[0]!, false);
    });
    expect(ok).toBe(false);

    result.current.ingest('other', [msg()]);
    act(() => result.current.ingest('c1', [msg({ id: 'voice' })]));
    expect(result.current.messages.some((m) => m.id === 'voice')).toBe(true);

    await act(() => result.current.remove());
    expect(api.delete).toHaveBeenCalledWith('c1');
    expect(result.current.conversationId).toBeUndefined();
    expect(result.current.messages).toEqual([]);
  });

  it('reports failures to open, page, or delete a conversation', async () => {
    const { result } = renderHook(() => useAssistant('VENDOR', 'u1'));
    api.history!.mockRejectedValueOnce(new Error('Không mở được'));
    await act(() => result.current.select('c1'));
    expect(result.current.error).toBe('Không mở được');

    await act(() => result.current.select('c1'));
    api.history!.mockRejectedValueOnce(new Error('Không tải thêm được'));
    await act(() => result.current.loadOlder());
    expect(result.current.error).toBe('Không tải thêm được');

    api.delete!.mockRejectedValueOnce(new Error('Không xoá được'));
    await act(() => result.current.remove());
    expect(result.current.error).toBe('Không xoá được');
  });
});

describe('assistant hook (guest and demo)', () => {
  it('answers a guest through the public endpoint without a conversation', async () => {
    api.guest!.mockResolvedValue(msg({ content: 'Chào khách' }) as never);
    const { result } = renderHook(() => useAssistant('GUEST', 'guest'));
    await act(() => result.current.send('Xin chào'));
    expect(api.guest).toHaveBeenCalled();
    expect(api.create).not.toHaveBeenCalled();
    expect(api.conversations).not.toHaveBeenCalled();
    expect(result.current.messages.at(-1)!.content).toBe('Chào khách');

    let ok: unknown = 'unset';
    await act(async () => {
      ok = await result.current.feedback(result.current.messages[0]!, true);
    });
    expect(ok).toBeUndefined();
  });

  it('answers with a labelled simulation and calls nothing in the demo', async () => {
    mode.live = false;
    const { result } = renderHook(() => useAssistant('VENDOR', 'u1'));
    await act(() => result.current.send('Hỏi thử'));
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[1]!.content).toMatch(/^\[Mô phỏng\]/);
    expect(api.send).not.toHaveBeenCalled();
    expect(api.capabilities).not.toHaveBeenCalled();
  });
});
