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
});
