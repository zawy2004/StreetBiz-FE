import { beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}));

vi.mock('@/core/api/client', () => client);

const { orderApi } = await import('@/features/orders/api/orderApi');

describe('order API contract', () => {
  beforeEach(() => vi.resetAllMocks());

  it('sends checkout idempotency in the required header', async () => {
    client.apiPost.mockResolvedValue({});
    await orderApi.checkout({ cartId: 3, provider: 'MOMO' }, 'checkout-uuid');
    expect(client.apiPost).toHaveBeenCalledWith(
      '/orders/checkout',
      { cartId: 3, provider: 'MOMO' },
      { headers: { 'Idempotency-Key': 'checkout-uuid' } },
    );
  });

  it('uses canonical customer and vendor endpoints', async () => {
    client.apiGet
      .mockResolvedValueOnce({ items: [], page: 1, pageSize: 20, totalItems: 0, totalPages: 0 })
      .mockResolvedValueOnce({ items: [], page: 1, pageSize: 20, totalItems: 0, totalPages: 0 });
    await orderApi.customerOrders();
    await orderApi.vendorOrders();
    expect(client.apiGet).toHaveBeenNthCalledWith(1, expect.stringContaining('/orders/me?'));
    expect(client.apiGet).toHaveBeenNthCalledWith(2, expect.stringContaining('/vendor/orders?'));
  });

  // A grouped tab is filtered by the server; filtering one page of every
  // order on the client left the page count about every order.
  it('sends a grouped tab as one comma-separated status', async () => {
    client.apiGet.mockResolvedValue({ items: [], page: 2, pageSize: 10, totalItems: 0, totalPages: 0 });
    await orderApi.vendorOrders({ status: ['REJECTED', 'CANCELLED'], page: 2, pageSize: 10 });
    const url = new URL(client.apiGet.mock.calls[0]![0], 'http://x');
    expect(url.searchParams.get('status')).toBe('REJECTED,CANCELLED');
    expect(url.searchParams.get('page')).toBe('2');
  });

  it('sends no status at all for the "all" tab', async () => {
    client.apiGet.mockResolvedValue({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
    await orderApi.customerOrders({ status: undefined });
    expect(new URL(client.apiGet.mock.calls[0]![0], 'http://x').searchParams.has('status')).toBe(false);
  });
});
