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

  it('sends the menu filters that are set and leaves the rest out', async () => {
    client.apiGet.mockResolvedValue([]);

    await commerceApi.menuItems({ query: 'xôi', wardId: 3, maxPrice: 30000, openNow: true, sort: 'price_asc' });
    await commerceApi.menuItems({});

    expect(client.apiGet).toHaveBeenNthCalledWith(
      1,
      '/marketplace/menu-items?query=x%C3%B4i&wardId=3&maxPrice=30000&openNow=true&sort=price_asc',
    );
    expect(client.apiGet).toHaveBeenNthCalledWith(2, '/marketplace/menu-items');
  });

  it('reads service areas, categories and storefronts, sending the position only when known', async () => {
    client.apiGet.mockResolvedValue([]);
    const here = { latitude: 16.0605, longitude: 108.2145 };

    await commerceApi.serviceAreas();
    await commerceApi.serviceAreas(here);
    await commerceApi.marketplaceCategories();
    await commerceApi.storefronts({ query: 'bún', wardId: 1003, categoryId: 1, openNow: true, position: here, radiusMeters: 2000, sort: 'distance' });
    await commerceApi.storefronts();
    await commerceApi.storefront(7, here);
    await commerceApi.storefront('7');

    expect(client.apiGet.mock.calls.map(([path]) => path)).toEqual([
      '/marketplace/service-areas',
      '/marketplace/service-areas?latitude=16.0605&longitude=108.2145',
      '/marketplace/categories',
      '/marketplace/storefronts?query=b%C3%BAn&wardId=1003&categoryId=1&openNow=true&radiusMeters=2000&sort=distance&latitude=16.0605&longitude=108.2145',
      '/marketplace/storefronts',
      '/marketplace/storefronts/7?latitude=16.0605&longitude=108.2145',
      '/marketplace/storefronts/7',
    ]);
  });

  it('reads and saves an order review, and reads payment options', async () => {
    client.apiGet.mockResolvedValue(null);
    client.apiPut.mockResolvedValue({ reviewId: 1 });

    await commerceApi.review(19);
    await commerceApi.saveReview(19, 5, 'Ngon');
    await commerceApi.paymentOptions();

    expect(client.apiGet).toHaveBeenNthCalledWith(1, '/orders/19/review');
    expect(client.apiPut).toHaveBeenCalledWith('/orders/19/review', { rating: 5, text: 'Ngon' });
    expect(client.apiGet).toHaveBeenNthCalledWith(2, '/orders/payment-options');
  });

  it('lists and files order complaints', async () => {
    client.apiGet.mockResolvedValue([]);
    client.apiPost.mockResolvedValue({});
    const input = { complaintType: 'REFUND_REQUEST', description: 'Thiếu món', requestedRefundAmount: 25000 };

    await commerceApi.complaints(19);
    await commerceApi.complain(19, input);

    expect(client.apiGet).toHaveBeenCalledWith('/orders/19/complaints');
    expect(client.apiPost).toHaveBeenCalledWith('/orders/19/complaints', input);
  });

  it('drives the sandbox payment and refund confirmations', async () => {
    client.apiPost.mockResolvedValue({});

    await commerceApi.failSandboxPayment(19);
    await commerceApi.confirmSandboxRefund(19);

    expect(client.apiPost).toHaveBeenNthCalledWith(1, '/orders/19/payment/sandbox-fail');
    expect(client.apiPost).toHaveBeenNthCalledWith(2, '/orders/19/refund/sandbox-confirm');
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
