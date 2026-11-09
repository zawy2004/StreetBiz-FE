import { beforeEach, describe, expect, it, vi } from 'vitest';

// ORD-01..06 client: how backend orders are normalised and which endpoint each action calls.
const client = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}));

vi.mock('@/core/api/client', () => client);

const { mapOrder, orderApi } = await import('@/features/orders/api/orderApi');

const backendOrder = {
  orderId: 7,
  orderCode: 'DH-007',
  orderStatus: 'PLACED',
  storefrontId: 3,
  storefrontName: 'Quán A',
  storefrontImageUrl: null,
  storefrontAddress: '12 Bạch Đằng',
  items: [{ productId: 1, productName: 'Bánh mì', unitPrice: 20000, quantity: 3 }],
  subtotalAmount: 60000,
  totalAmount: 60000,
  createdAt: '2026-11-01T08:30:00',
  placedAt: '2026-11-01T08:30:00.1234567',
  completedAt: null,
  history: [{ toStatus: 'PLACED', changedAt: '2026-11-01T08:30:00' }],
};

beforeEach(() => vi.resetAllMocks());

describe('mapOrder', () => {
  it('builds the storefront from the flat backend fields and computes missing line totals', () => {
    const order = mapOrder(backendOrder as never);

    expect(order.storefront).toEqual({ storefrontId: 3, storefrontName: 'Quán A', imageUrl: null, address: '12 Bạch Đằng' });
    expect(order.items[0]!.lineTotal).toBe(60000);
    expect(order.statusHistory).toHaveLength(1);
  });

  it('reads an offset-less backend timestamp as UTC, keeping milliseconds only', () => {
    const order = mapOrder(backendOrder as never);

    expect(order.createdAt).toBe('2026-11-01T08:30:00.000Z');
    expect(order.placedAt).toBe('2026-11-01T08:30:00.123Z');
    expect(order.statusHistory[0]!.changedAt).toBe('2026-11-01T08:30:00.000Z');
    expect(order.completedAt).toBeNull();
  });

  it('converts a timestamp with an offset to the same instant in UTC', () => {
    const order = mapOrder({ ...backendOrder, createdAt: '2026-11-01T15:30:00+07:00' } as never);

    expect(order.createdAt).toBe('2026-11-01T08:30:00.000Z');
  });

  it('leaves an unrecognised date string untouched instead of throwing', () => {
    const order = mapOrder({ ...backendOrder, createdAt: 'hôm qua' } as never);

    expect(order.createdAt).toBe('hôm qua');
  });

  it('prefers a nested storefront, a given line total and statusHistory over history', () => {
    const storefront = { storefrontId: 9, storefrontName: 'Xe B', imageUrl: '/x.jpg', address: null };
    const order = mapOrder({
      ...backendOrder,
      storefront,
      items: [{ productId: 1, productName: 'Trà', unitPrice: 10000, quantity: 2, lineTotal: 15000 }],
      statusHistory: [
        { toStatus: 'PLACED', changedAt: '2026-11-01T08:30:00Z' },
        { toStatus: 'ACCEPTED', changedAt: '2026-11-01T08:35:00Z' },
      ],
    } as never);

    expect(order.storefront).toEqual(storefront);
    expect(order.items[0]!.lineTotal).toBe(15000);
    expect(order.statusHistory.map((h) => h.toStatus)).toEqual(['PLACED', 'ACCEPTED']);
  });

  it('defaults missing amounts, items and history', () => {
    const order = mapOrder({ orderId: 1, orderCode: 'X', orderStatus: 'PLACED', createdAt: '2026-11-01T00:00:00Z' } as never);

    expect(order).toMatchObject({ subtotalAmount: 0, totalAmount: 0, items: [], statusHistory: [] });
    expect(order.storefront.storefrontName).toBe('');
  });
});

describe('orderApi endpoints', () => {
  beforeEach(() => {
    client.apiGet.mockResolvedValue(backendOrder);
    client.apiPost.mockResolvedValue(backendOrder);
  });

  it.each([
    ['customerOrder', () => orderApi.customerOrder(7), 'get', '/orders/7', undefined],
    ['cancel', () => orderApi.cancel(7), 'post', '/orders/7/cancel', undefined],
    ['syncPayment', () => orderApi.syncPayment(7), 'post', '/orders/7/payment/sync', undefined],
    ['confirmSandbox', () => orderApi.confirmSandboxPayment(7), 'post', '/orders/7/payment/sandbox-confirm', undefined],
    ['failSandbox', () => orderApi.failSandboxPayment(7), 'post', '/orders/7/payment/sandbox-fail', undefined],
    ['vendorOrder', () => orderApi.vendorOrder(7), 'get', '/vendor/orders/7', undefined],
    ['accept', () => orderApi.accept(7), 'post', '/vendor/orders/7/accept', undefined],
    ['reject', () => orderApi.reject(7, 'Hết hàng'), 'post', '/vendor/orders/7/reject', { reason: 'Hết hàng' }],
    ['preparing', () => orderApi.preparing(7), 'post', '/vendor/orders/7/preparing', undefined],
    ['ready', () => orderApi.readyForPickup(7), 'post', '/vendor/orders/7/ready-for-pickup', undefined],
    ['scanPickup', () => orderApi.scanPickup('tok'), 'post', '/vendor/orders/pickup-scan', { token: 'tok' }],
    ['confirmByCode', () => orderApi.confirmPickupByCode('123456'), 'post', '/vendor/orders/pickup-confirm', { code: '123456' }],
    ['handoverWithoutCode', () => orderApi.handoverWithoutCode(7, 'Mất điện thoại'), 'post', '/vendor/orders/7/handover-without-code', { reason: 'Mất điện thoại' }],
  ])('%s calls the right endpoint and maps the order', async (_name, call, method, url, body) => {
    const order = await call();

    const mock = method === 'get' ? client.apiGet : client.apiPost;
    expect(mock).toHaveBeenCalledTimes(1);
    expect(mock.mock.calls[0]![0]).toBe(url);
    if (body !== undefined) expect(mock.mock.calls[0]![1]).toEqual(body);
    expect(order.storefront.storefrontName).toBe('Quán A');
    expect(order.createdAt).toBe('2026-11-01T08:30:00.000Z');
  });

  it.each([
    ['bankTransfer', () => orderApi.bankTransfer(7), '/orders/7/payment/bank-transfer'],
    ['pickupCode', () => orderApi.pickupCode(7), '/orders/7/pickup-code'],
    ['pickupRange', () => orderApi.pickupRange(3), '/marketplace/storefronts/3/pickup-range'],
  ])('%s is a plain GET', async (_name, call, url) => {
    client.apiGet.mockResolvedValue({ ok: true });

    await expect(call()).resolves.toEqual({ ok: true });
    expect(client.apiGet).toHaveBeenCalledWith(url);
  });

  it('sends list dates and sort, and defaults paging', async () => {
    client.apiGet.mockResolvedValue({ items: [backendOrder], page: 1, pageSize: 20, totalItems: 1, totalPages: 1 });

    const page = await orderApi.customerOrders({ status: 'PLACED', fromDate: '2026-11-01', toDate: '2026-11-07' });

    const url = new URL(client.apiGet.mock.calls[0]![0], 'http://x');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      status: 'PLACED', page: '1', pageSize: '20', fromDate: '2026-11-01', toDate: '2026-11-07', sort: 'createdAt_desc',
    });
    expect(page.items[0]!.storefront.storefrontId).toBe(3);
  });

  it('normalises every tracking timestamp, including the ready estimate window', async () => {
    client.apiGet.mockResolvedValue({
      orderId: 7,
      readyAt: '2026-11-01T09:00:00',
      arrivalNotifiedAt: null,
      arrivalAcknowledgedAt: '2026-11-01T09:05:00+07:00',
      readyEstimate: { earliestReadyAt: '2026-11-01T08:50:00', latestReadyAt: '2026-11-01T09:10:00' },
    });

    const tracking = await orderApi.tracking(7);

    expect(client.apiGet).toHaveBeenCalledWith('/orders/7/tracking');
    expect(tracking).toMatchObject({
      readyAt: '2026-11-01T09:00:00.000Z',
      arrivalNotifiedAt: null,
      arrivalAcknowledgedAt: '2026-11-01T02:05:00.000Z',
      readyEstimate: { earliestReadyAt: '2026-11-01T08:50:00.000Z', latestReadyAt: '2026-11-01T09:10:00.000Z' },
    });
  });

  it('keeps a missing ready estimate missing', async () => {
    client.apiGet.mockResolvedValue({ orderId: 7, readyAt: null, readyEstimate: null });

    expect((await orderApi.tracking(7)).readyEstimate).toBeNull();
  });

  it('announces an arrival with or without an ETA', async () => {
    client.apiPost.mockResolvedValue({ orderId: 7, notifiedAt: '2026-11-01T09:00:00' });

    const notice = await orderApi.announceArrival(7, 5);
    await orderApi.announceArrival(7);

    expect(client.apiPost).toHaveBeenNthCalledWith(1, '/orders/7/arriving', { etaMinutes: 5 });
    expect(client.apiPost).toHaveBeenNthCalledWith(2, '/orders/7/arriving', { etaMinutes: null });
    expect(notice.notifiedAt).toBe('2026-11-01T09:00:00.000Z');
  });

  it('lists arrivals and acknowledges one for the stall', async () => {
    client.apiGet.mockResolvedValue([{ orderId: 7, notifiedAt: '2026-11-01T09:00:00', acknowledgedAt: null }]);
    client.apiPost.mockResolvedValue({ orderId: 7, acknowledgedAt: '2026-11-01T09:01:00' });

    const arrivals = await orderApi.vendorArrivals();
    const ack = await orderApi.acknowledgeArrival(7);

    expect(client.apiGet).toHaveBeenCalledWith('/vendor/orders/arrivals');
    expect(arrivals[0]).toMatchObject({ notifiedAt: '2026-11-01T09:00:00.000Z', acknowledgedAt: null });
    expect(client.apiPost).toHaveBeenCalledWith('/vendor/orders/7/arrival-seen');
    expect(ack.acknowledgedAt).toBe('2026-11-01T09:01:00.000Z');
  });

  it('asks for the sales summary with its range and grouping', async () => {
    client.apiGet.mockResolvedValue({ groups: [] });

    await orderApi.salesSummary('2026-11-01', '2026-11-30', 'DAY' as never);

    const url = new URL(client.apiGet.mock.calls[0]![0], 'http://x');
    expect(url.pathname).toBe('/vendor/orders/sales-summary');
    expect(Object.fromEntries(url.searchParams)).toEqual({ fromDate: '2026-11-01', toDate: '2026-11-30', groupBy: 'DAY' });
  });
});
