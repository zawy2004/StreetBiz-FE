import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

// ORD-02 / ORD-05 / CHAT-01 live updates. The hooks switch themselves off under MODE=test,
// so MODE is stubbed and @microsoft/signalr is replaced by a scriptable fake connection.
type Handler = (...args: never[]) => unknown;

class FakeConnection {
  state = 'Disconnected';
  handlers = new Map<string, Handler>();
  reconnecting?: () => void;
  reconnected?: () => Promise<void> | void;
  closed?: () => void;
  start = vi.fn(async () => {
    this.state = 'Connected';
  });
  stop = vi.fn(async () => {
    this.state = 'Disconnected';
  });
  invoke = vi.fn(async (_method: string, ..._args: unknown[]) => undefined);
  on(name: string, handler: Handler) {
    this.handlers.set(name, handler);
  }
  off(name: string) {
    this.handlers.delete(name);
  }
  onreconnecting(cb: () => void) {
    this.reconnecting = cb;
  }
  onreconnected(cb: () => Promise<void>) {
    this.reconnected = cb;
  }
  onclose(cb: () => void) {
    this.closed = cb;
  }
  emit(name: string, payload?: unknown) {
    (this.handlers.get(name) as ((p: unknown) => void) | undefined)?.(payload);
  }
}

const hub = vi.hoisted(() => ({ connections: [] as unknown[], urls: [] as string[], options: [] as unknown[], next: null as unknown }));

vi.mock('@microsoft/signalr', () => {
  class HubConnectionBuilder {
    withUrl(url: string, options: unknown) {
      hub.urls.push(url);
      hub.options.push(options);
      return this;
    }
    withAutomaticReconnect() {
      return this;
    }
    configureLogging() {
      return this;
    }
    build() {
      const connection = hub.next ?? new FakeConnection();
      hub.next = null;
      hub.connections.push(connection);
      return connection;
    }
  }
  return { HubConnectionBuilder, HubConnectionState: { Connected: 'Connected', Disconnected: 'Disconnected' }, LogLevel: { Warning: 3, None: 6 } };
});

vi.mock('@/core/config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/config/env')>();
  return { ...actual, isLiveApi: true, env: { ...actual.env, apiBaseUrl: 'https://api.example.test/api', useMockApi: false } };
});

const { useChatRealtime } = await import('@/features/chat/realtime/useChatRealtime');
const { useChatInboxFeed } = await import('@/features/chat/realtime/useChatInboxFeed');
const { useOrderRealtime } = await import('@/features/orders/realtime/useOrderRealtime');
const { useVendorOrderFeed } = await import('@/features/orders/realtime/useVendorOrderFeed');
const { useOrderAlertStore } = await import('@/features/orders/alerts/order-alert-store');
const { setTokens, clearTokens } = await import('@/core/api/token-storage');

let cache: QueryClient;
let invalidated: unknown[][];

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={cache}>{children}</QueryClientProvider>;
}

const latest = () => hub.connections.at(-1) as FakeConnection;
const keys = () => invalidated.map((k) => JSON.stringify(k));

beforeEach(() => {
  vi.stubEnv('MODE', 'production');
  hub.connections.length = 0;
  hub.urls.length = 0;
  hub.options.length = 0;
  cache = new QueryClient();
  invalidated = [];
  vi.spyOn(cache, 'invalidateQueries').mockImplementation(async (filters) => {
    invalidated.push([...((filters as { queryKey: unknown[] }).queryKey ?? [])]);
  });
  setTokens({ accessToken: 'tok-9', refreshToken: 'r', accessTokenExpiresAtUtc: '2099-01-01T00:00:00Z' });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
  clearTokens();
});

describe('useChatRealtime', () => {
  it('subscribes to the open thread, sends the bearer token without credentials, and reports live', async () => {
    const { result } = renderHook(() => useChatRealtime(7, true), { wrapper });

    await waitFor(() => expect(result.current).toBe(true));
    expect(hub.urls[0]).toBe('https://api.example.test/hubs/chat');
    const options = hub.options[0] as { accessTokenFactory: () => string; withCredentials: boolean };
    expect(options.withCredentials).toBe(false);
    expect(options.accessTokenFactory()).toBe('tok-9');
    expect(latest().invoke).toHaveBeenCalledWith('SubscribeConversation', 7);
  });

  it('refetches the thread, inbox and badge only for a message in this thread', async () => {
    const { result } = renderHook(() => useChatRealtime('7', true), { wrapper });
    await waitFor(() => expect(result.current).toBe(true));

    latest().emit('ChatMessageReceived', { conversationId: 8 });
    expect(invalidated).toHaveLength(0);
    latest().emit('ChatMessageReceived', { conversationId: 7 });

    expect(keys()).toEqual(['["chat","thread","7"]', '["chat","conversations"]', '["chat","unread"]']);
  });

  it('goes offline while reconnecting, resubscribes and catches up afterwards', async () => {
    const { result } = renderHook(() => useChatRealtime(7, true), { wrapper });
    await waitFor(() => expect(result.current).toBe(true));

    act(() => latest().reconnecting!());
    expect(result.current).toBe(false);
    await act(async () => {
      await latest().reconnected!();
    });

    expect(result.current).toBe(true);
    expect(latest().invoke).toHaveBeenLastCalledWith('SubscribeConversation', 7);
    expect(keys()).toContain('["chat","thread","7"]');

    act(() => latest().closed!());
    expect(result.current).toBe(false);
  });

  it('a failed resubscribe after reconnecting stays offline', async () => {
    const { result } = renderHook(() => useChatRealtime(7, true), { wrapper });
    await waitFor(() => expect(result.current).toBe(true));
    latest().invoke.mockRejectedValueOnce(new Error('hub gone'));

    await act(async () => {
      await latest().reconnected!();
    });

    expect(result.current).toBe(false);
  });

  it('unsubscribes and stops when the thread closes', async () => {
    const { result, unmount } = renderHook(() => useChatRealtime(7, true), { wrapper });
    await waitFor(() => expect(result.current).toBe(true));
    const connection = latest();

    unmount();

    await waitFor(() => expect(connection.stop).toHaveBeenCalled());
    expect(connection.invoke).toHaveBeenCalledWith('UnsubscribeConversation', 7);
    expect(connection.handlers.has('ChatMessageReceived')).toBe(false);
  });

  it('retries ten seconds after a failed start and stops the half-open socket', async () => {
    vi.useFakeTimers();
    const failing = new FakeConnection();
    failing.start.mockImplementationOnce(async () => {
      failing.state = 'Connecting';
      throw new Error('negotiate failed');
    });
    hub.next = failing;
    const { result } = renderHook(() => useChatRealtime(7, true), { wrapper });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current).toBe(false);
    expect(failing.stop).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(failing.start).toHaveBeenCalledTimes(2);
    expect(result.current).toBe(true);
  });

  it('does nothing when disabled or without a thread', () => {
    renderHook(() => useChatRealtime(undefined, true), { wrapper });
    renderHook(() => useChatRealtime(7, false), { wrapper });

    expect(hub.connections).toHaveLength(0);
  });
});

describe('useChatInboxFeed', () => {
  it('subscribes to the inbox and refetches inbox, badge and the changed thread', async () => {
    renderHook(() => useChatInboxFeed(true), { wrapper });
    await waitFor(() => expect(latest().invoke).toHaveBeenCalledWith('SubscribeInbox'));

    latest().emit('ChatInboxChanged', { conversationId: 3 });

    expect(keys()).toEqual(['["chat","conversations"]', '["chat","unread"]', '["chat","thread","3"]']);
  });

  it('catches up after a reconnect, tolerates a failed resubscribe, and unsubscribes on unmount', async () => {
    const { unmount } = renderHook(() => useChatInboxFeed(true), { wrapper });
    await waitFor(() => expect(latest().invoke).toHaveBeenCalledWith('SubscribeInbox'));
    const connection = latest();

    await act(async () => {
      await connection.reconnected!();
    });
    expect(keys()).toEqual(['["chat","conversations"]', '["chat","unread"]']);
    connection.invoke.mockRejectedValueOnce(new Error('x'));
    await act(async () => {
      await connection.reconnected!();
    });

    unmount();
    await waitFor(() => expect(connection.stop).toHaveBeenCalled());
    expect(connection.invoke).toHaveBeenCalledWith('UnsubscribeInbox');
  });

  it('retries fifteen seconds after a failed start', async () => {
    vi.useFakeTimers();
    const failing = new FakeConnection();
    failing.start.mockRejectedValueOnce(new Error('down'));
    hub.next = failing;
    renderHook(() => useChatInboxFeed(true), { wrapper });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(14_999);
    });
    expect(failing.start).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(failing.start).toHaveBeenCalledTimes(2);
  });
});

describe('useOrderRealtime', () => {
  it('a customer order refetches its detail and list when it changes', async () => {
    const { result } = renderHook(() => useOrderRealtime(12, 'customer', true), { wrapper });
    await waitFor(() => expect(result.current).toBe(true));
    expect(hub.urls[0]).toBe('https://api.example.test/hubs/orders');
    expect(latest().invoke).toHaveBeenCalledWith('SubscribeOrder', 12);

    latest().emit('OrderUpdated', { orderId: 99, orderStatus: 'ACCEPTED' });
    latest().emit('OrderUpdated', { orderId: 12, orderStatus: 'ACCEPTED' });

    expect(keys()).toEqual(['["orders","customer","detail","12"]', '["orders","customer","list"]']);
  });

  it('a vendor order also refreshes the sales figures', async () => {
    const { result } = renderHook(() => useOrderRealtime('12', 'vendor', true), { wrapper });
    await waitFor(() => expect(result.current).toBe(true));

    latest().emit('OrderUpdated', { orderId: 12, orderStatus: 'COMPLETED' });

    expect(keys()).toContain('["orders","vendor","sales"]');
  });

  it('follows the socket through reconnects and closes cleanly', async () => {
    const { result, unmount } = renderHook(() => useOrderRealtime(12, 'customer', true), { wrapper });
    await waitFor(() => expect(result.current).toBe(true));
    const connection = latest();

    act(() => connection.reconnecting!());
    expect(result.current).toBe(false);
    await act(async () => {
      await connection.reconnected!();
    });
    expect(result.current).toBe(true);
    connection.invoke.mockRejectedValueOnce(new Error('x'));
    await act(async () => {
      await connection.reconnected!();
    });
    expect(result.current).toBe(false);

    unmount();
    await waitFor(() => expect(connection.stop).toHaveBeenCalled());
    expect(connection.invoke).toHaveBeenCalledWith('UnsubscribeOrder', 12);
  });

  it('stops a socket that finished starting after the screen had already closed', async () => {
    let release!: () => void;
    const slow = new FakeConnection();
    slow.start.mockImplementationOnce(() => new Promise<void>((resolve) => {
      release = () => {
        slow.state = 'Connected';
        resolve();
      };
    }));
    hub.next = slow;
    const { unmount } = renderHook(() => useOrderRealtime(12, 'customer', true), { wrapper });

    unmount();
    await act(async () => release());

    await waitFor(() => expect(slow.stop).toHaveBeenCalledTimes(2));
    expect(slow.invoke).not.toHaveBeenCalledWith('SubscribeOrder', 12);
  });
});

describe('useVendorOrderFeed', () => {
  beforeEach(() => useOrderAlertStore.getState().setLive(false));

  it('marks the board live and refetches every vendor order query on any change', async () => {
    renderHook(() => useVendorOrderFeed(true), { wrapper });
    await waitFor(() => expect(useOrderAlertStore.getState().live).toBe(true));
    expect(latest().invoke).toHaveBeenCalledWith('SubscribeVendorOrders');

    latest().emit('VendorOrderChanged');

    expect(keys()).toEqual(['["orders","vendor"]']);
  });

  it('drops to not-live while the socket is down and catches up after it returns', async () => {
    const { unmount } = renderHook(() => useVendorOrderFeed(true), { wrapper });
    await waitFor(() => expect(useOrderAlertStore.getState().live).toBe(true));
    const connection = latest();

    act(() => connection.reconnecting!());
    expect(useOrderAlertStore.getState().live).toBe(false);
    await act(async () => {
      await connection.reconnected!();
    });
    expect(useOrderAlertStore.getState().live).toBe(true);
    expect(keys()).toEqual(['["orders","vendor"]']);

    connection.invoke.mockRejectedValueOnce(new Error('x'));
    await act(async () => {
      await connection.reconnected!();
    });
    expect(useOrderAlertStore.getState().live).toBe(false);
    act(() => connection.closed!());

    unmount();
    await waitFor(() => expect(connection.stop).toHaveBeenCalled());
    expect(connection.invoke).toHaveBeenCalledWith('UnsubscribeVendorOrders');
  });

  it('is never live when switched off', () => {
    useOrderAlertStore.getState().setLive(true);

    renderHook(() => useVendorOrderFeed(false), { wrapper });

    expect(useOrderAlertStore.getState().live).toBe(false);
    expect(hub.connections).toHaveLength(0);
  });
});
