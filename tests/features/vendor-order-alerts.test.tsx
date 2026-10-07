import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, vi } from 'vitest';

import type { Order } from '@/features/orders/types/order.types';

const orderApi = vi.hoisted(() => ({ vendorOrders: vi.fn() }));
vi.mock('@/features/orders/api/orderApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/orders/api/orderApi')>();
  return { ...actual, orderApi: { ...actual.orderApi, ...orderApi } };
});
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

const { detectNewOrder, newOrderMessage, summariseItems } = await import(
  '@/features/orders/alerts/new-order-detection'
);
const { useVendorOrderAlerts } = await import('@/features/orders/alerts/useVendorOrderAlerts');
const { useOrderAlertStore } = await import('@/features/orders/alerts/order-alert-store');
const { OrderLiveBar } = await import('@/features/orders/alerts/OrderLiveBar');

const order = (orderId: number, items = 1): Order => ({
  orderId,
  orderCode: `SB-${orderId}`,
  customerName: 'Nguyễn Khách Hàng',
  orderStatus: 'PLACED',
  storefront: { storefrontId: 1, storefrontName: 'Bánh mì', imageUrl: null },
  subtotalAmount: 75_000,
  totalAmount: 75_000,
  createdAt: '2026-10-04T07:00:00Z',
  items: Array.from({ length: items }, (_, index) => ({
    orderItemId: index + 1,
    menuItemId: index + 1,
    itemName: ['Bánh mì chả cá', 'Xôi gà xé', 'Xôi xéo', 'Sữa đậu nành'][index] ?? `Món ${index}`,
    unitPrice: 25_000,
    quantity: index + 1,
    lineTotal: 25_000,
  })),
  statusHistory: [],
});
const page = (items: Order[], totalItems = items.length) => ({
  items,
  page: 1,
  pageSize: 1,
  totalItems,
  totalPages: totalItems,
});

describe('detectNewOrder', () => {
  it('only sets a baseline on the first look, so opening the app does not ring', () => {
    expect(detectNewOrder(null, order(7))).toEqual({ seenUpTo: 7, arrived: null });
    expect(detectNewOrder(null, undefined)).toEqual({ seenUpTo: 0, arrived: null });
  });

  it('announces a newer order once, however many refreshes see it', () => {
    const first = detectNewOrder(7, order(9));
    expect(first.arrived?.orderId).toBe(9);
    expect(detectNewOrder(first.seenUpTo, order(9)).arrived).toBeNull();
  });

  it('stays quiet when the newest new order is an older one (the newer was accepted)', () => {
    expect(detectNewOrder(9, order(8))).toEqual({ seenUpTo: 9, arrived: null });
    expect(detectNewOrder(9, undefined)).toEqual({ seenUpTo: 9, arrived: null });
  });

  it('announces the first order of the day after an empty board', () => {
    expect(detectNewOrder(0, order(3)).arrived?.orderId).toBe(3);
  });

  it('says who, how much and what to make', () => {
    expect(summariseItems(order(1, 4))).toBe('1× Bánh mì chả cá, 2× Xôi gà xé và 2 món khác');
    expect(newOrderMessage(order(1, 1)).title).toMatch(/^Đơn mới từ Nguyễn Khách Hàng · 75\.000/);
  });
});

describe('useVendorOrderAlerts', () => {
  let client: QueryClient;
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  const refresh = () => act(() => client.invalidateQueries({ queryKey: ['orders', 'vendor'] }));
  // The first answer must land before the next refresh, or it is cancelled and
  // the second becomes the baseline - which, rightly, does not ring.
  const loaded = () =>
    waitFor(() => expect(client.getQueryCache().getAll()[0]?.state.status).toBe('success'));

  beforeEach(() => {
    vi.clearAllMocks();
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    useOrderAlertStore.setState({ alerts: true });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.title = 'StreetBiz';
  });

  it('rings, toasts and badges when a new order arrives - but not for the ones already there', async () => {
    orderApi.vendorOrders.mockResolvedValueOnce(page([order(7)], 1));
    const { result } = renderHook(() => useVendorOrderAlerts(true), { wrapper });
    await waitFor(() => expect(result.current).toBe(1));
    expect(chime.playChime).not.toHaveBeenCalled();
    expect(toast.showToast).not.toHaveBeenCalled();

    orderApi.vendorOrders.mockResolvedValueOnce(page([order(9, 2)], 2));
    await refresh();

    await waitFor(() => expect(result.current).toBe(2));
    expect(chime.playChime).toHaveBeenCalledTimes(1);
    expect(toast.showToast).toHaveBeenCalledWith(expect.stringContaining('1× Bánh mì chả cá, 2× Xôi gà xé'));

    // The same order seen again by the next poll is not news.
    orderApi.vendorOrders.mockResolvedValueOnce(page([order(9, 2)], 2));
    await refresh();
    expect(chime.playChime).toHaveBeenCalledTimes(1);
  });

  it('stays silent with alerts off, but still shows the toast', async () => {
    useOrderAlertStore.setState({ alerts: false });
    orderApi.vendorOrders.mockResolvedValueOnce(page([], 0));
    renderHook(() => useVendorOrderAlerts(true), { wrapper });
    await loaded();

    orderApi.vendorOrders.mockResolvedValueOnce(page([order(3)], 1));
    await refresh();

    await waitFor(() => expect(toast.showToast).toHaveBeenCalled());
    expect(chime.playChime).not.toHaveBeenCalled();
  });

  it('raises a system notification and marks the title when the tab is hidden', async () => {
    const shown: { title: string; options: NotificationOptions }[] = [];
    vi.stubGlobal(
      'Notification',
      Object.assign(
        function (this: unknown, title: string, options: NotificationOptions) {
          shown.push({ title, options });
        },
        { permission: 'granted' },
      ),
    );
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    orderApi.vendorOrders.mockResolvedValueOnce(page([], 0));
    renderHook(() => useVendorOrderAlerts(true), { wrapper });
    await loaded();

    orderApi.vendorOrders.mockResolvedValueOnce(page([order(4)], 1));
    await refresh();

    await waitFor(() => expect(shown).toHaveLength(1));
    expect(shown[0]!.title).toMatch(/^Đơn mới từ/);
    expect(shown[0]!.options.tag).toBe('order-4');
    expect(document.title).toBe('(1) StreetBiz');
  });

  it('does nothing for anyone but a signed-in seller', () => {
    const { result } = renderHook(() => useVendorOrderAlerts(false), { wrapper });
    expect(result.current).toBe(0);
    expect(orderApi.vendorOrders).not.toHaveBeenCalled();
  });
});

describe('OrderLiveBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('says whether the board is live', () => {
    useOrderAlertStore.setState({ live: true, alerts: true });
    const { rerender } = render(<OrderLiveBar />);
    expect(screen.getByRole('status')).toHaveTextContent('Trực tiếp');

    act(() => useOrderAlertStore.setState({ live: false }));
    rerender(<OrderLiveBar />);
    expect(screen.getByRole('status')).toHaveTextContent('vẫn tự cập nhật mỗi 20 giây');
  });

  it('turning alerts on unlocks sound, plays it once and asks about notifications', async () => {
    const requestPermission = vi.fn(async () => 'granted' as NotificationPermission);
    vi.stubGlobal('Notification', { permission: 'default', requestPermission });
    useOrderAlertStore.setState({ alerts: false });
    render(<OrderLiveBar />);

    await userEvent.click(screen.getByRole('switch', { name: /Âm báo đơn mới: tắt/ }));

    expect(useOrderAlertStore.getState().alerts).toBe(true);
    expect(chime.unlockChime).toHaveBeenCalled();
    expect(chime.playChime).toHaveBeenCalledTimes(1);
    expect(requestPermission).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('offers to allow notifications when alerts are on but the browser was never asked', async () => {
    const requestPermission = vi.fn(async () => 'granted' as NotificationPermission);
    vi.stubGlobal('Notification', { permission: 'default', requestPermission });
    useOrderAlertStore.setState({ alerts: true });
    render(<OrderLiveBar />);

    await userEvent.click(screen.getByRole('button', { name: 'Cho phép báo khi ẩn tab' }));

    expect(requestPermission).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Cho phép báo khi ẩn tab' })).not.toBeInTheDocument();
  });
});
