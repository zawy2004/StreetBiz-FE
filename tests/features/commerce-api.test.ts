import { vi } from 'vitest';

const client = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
}));

vi.mock('@/core/api/client', () => client);

import { commerceApi } from '@/core/api/commerce-api';

describe('commerce API contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('encodes the marketplace query and fetches a menu item by numeric id', async () => {
    client.apiGet.mockResolvedValue([]);

    await commerceApi.menuItems('bánh mì & trà');
    await commerceApi.menuItem(12);

    expect(client.apiGet).toHaveBeenNthCalledWith(
      1,
      '/marketplace/menu-items?query=b%C3%A1nh%20m%C3%AC%20%26%20tr%C3%A0',
    );
    expect(client.apiGet).toHaveBeenNthCalledWith(2, '/marketplace/menu-items/12');
  });

  it('sends the cart item quantity and customer note', async () => {
    client.apiPost.mockResolvedValue({});
    client.apiPut.mockResolvedValue({});

    await commerceApi.addCartItem(12, 2, 'Ít cay');
    await commerceApi.updateCartItem(12, 3, null);

    expect(client.apiPost).toHaveBeenCalledWith('/cart/items', {
      menuItemId: 12,
      quantity: 2,
      note: 'Ít cay',
    });
    expect(client.apiPut).toHaveBeenCalledWith('/cart/items/12', {
      quantity: 3,
      note: null,
    });
  });

  it('places an idempotent prepaid order and confirms only the development sandbox payment', async () => {
    client.apiPost.mockResolvedValue({});

    await commerceApi.placeOrder('MOMO', 'WEB-ORDER-1');
    await commerceApi.confirmSandboxPayment(19);

    expect(client.apiPost).toHaveBeenNthCalledWith(1, '/orders', {
      provider: 'MOMO',
      idempotencyKey: 'WEB-ORDER-1',
    });
    expect(client.apiPost).toHaveBeenNthCalledWith(2, '/orders/19/payment/sandbox-confirm');
  });

  it('sends optimistic order status on every seller transition', async () => {
    client.apiPost.mockResolvedValue({});

    await commerceApi.decideSellerOrder(19, 'REJECT', 'Món đã hết', 'PLACED');
    await commerceApi.updateSellerOrderStatus(20, 'PREPARING', 'ACCEPTED');
    await commerceApi.confirmHandover(20, 'READY_FOR_PICKUP');

    expect(client.apiPost).toHaveBeenNthCalledWith(1, '/seller/orders/19/decision', {
      decision: 'REJECT',
      reason: 'Món đã hết',
      expectedStatus: 'PLACED',
    });
    expect(client.apiPost).toHaveBeenNthCalledWith(2, '/seller/orders/20/status', {
      targetStatus: 'PREPARING',
      expectedStatus: 'ACCEPTED',
    });
    expect(client.apiPost).toHaveBeenNthCalledWith(3, '/seller/orders/20/handover', {
      expectedStatus: 'READY_FOR_PICKUP',
    });
  });

  it('requests the selected sales period', async () => {
    client.apiGet.mockResolvedValue({});

    await commerceApi.salesSummary('MONTH');

    expect(client.apiGet).toHaveBeenCalledWith('/seller/orders/sales-summary?period=MONTH');
  });
});
