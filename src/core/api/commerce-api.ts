import { apiDelete, apiGet, apiPost, apiPut } from './client';

export type MarketplaceMenuItem = {
  menuItemId: number;
  storefrontId: number;
  storefrontName: string;
  itemName: string;
  description: string | null;
  imageUrl: string | null;
  unitPrice: number;
  availabilityStatus: string;
  categoryId: number;
  categoryName: string;
};

export type CommerceCartItem = {
  cartItemId: number;
  menuItemId: number;
  itemName: string;
  imageUrl: string | null;
  unitPrice: number;
  availabilityStatus: string;
  quantity: number;
  note: string | null;
};

export type CommerceCart = {
  cartId: number;
  storefrontId: number;
  storefrontName: string;
  storefrontAddress: string | null;
  storefrontStatus: string;
  items: CommerceCartItem[];
  subtotal: number;
};

export type CommerceOrderItem = {
  orderItemId: number;
  menuItemId: number;
  itemName: string;
  unitPrice: number;
  quantity: number;
  note: string | null;
};

export type CommerceOrderHistory = {
  historyId: number;
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  changedAt: string;
};

export type CommerceOrder = {
  orderId: number;
  orderCode: string;
  customerUserId: number;
  customerName: string;
  storefrontId: number;
  storefrontName: string;
  storefrontAddress?: string | null;
  orderStatus: string;
  subtotalAmount: number;
  totalAmount: number;
  rejectionReason: string | null;
  paymentProvider: string | null;
  paymentStatus: string | null;
  refundAmount: number | null;
  refundReason: string | null;
  refundStatus: string | null;
  refundRequestedAt: string | null;
  refundCompletedAt: string | null;
  placedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  items: CommerceOrderItem[];
  history: CommerceOrderHistory[];
};

export type SalesSummary = {
  period: 'DAY' | 'WEEK' | 'MONTH';
  fromUtc: string;
  toUtc: string;
  completedOrderCount: number;
  grossSales: number;
  refundedAmount: number;
  netSales: number;
  orders: CommerceOrder[];
};

export type PaymentOptions = {
  mode: 'SANDBOX' | 'UNAVAILABLE';
  providers: ('MOMO' | 'ZALOPAY')[];
  message: string;
};
export type CustomerComplaint = {
  complaintId: number;
  orderId: number;
  complaintType: string;
  description: string;
  requestedRefundAmount: number | null;
  status: string;
  resolutionNotes: string | null;
  createdAt: string;
};

export const commerceApi = {
  review: (orderId: string | number) =>
    apiGet<{ reviewId: number; rating: number; text: string | null } | null>(
      `/orders/${orderId}/review`,
    ),
  saveReview: (orderId: number, rating: number, text: string) =>
    apiPut<{ reviewId: number }>(`/orders/${orderId}/review`, { rating, text }),
  paymentOptions: () => apiGet<PaymentOptions>('/orders/payment-options'),
  failSandboxPayment: (orderId: number) =>
    apiPost<CommerceOrder>(`/orders/${orderId}/payment/sandbox-fail`),
  confirmSandboxRefund: (orderId: number) =>
    apiPost<CommerceOrder>(`/orders/${orderId}/refund/sandbox-confirm`),
  complaints: (orderId: string | number) =>
    apiGet<CustomerComplaint[]>(`/orders/${orderId}/complaints`),
  complain: (
    orderId: number,
    input: { complaintType: string; description: string; requestedRefundAmount: number | null },
  ) => apiPost<CustomerComplaint>(`/orders/${orderId}/complaints`, input),
  menuItems: (query?: string) =>
    apiGet<MarketplaceMenuItem[]>(
      `/marketplace/menu-items${query ? `?query=${encodeURIComponent(query)}` : ''}`,
    ),
  menuItem: (menuItemId: string | number) =>
    apiGet<MarketplaceMenuItem>(`/marketplace/menu-items/${menuItemId}`),

  cart: () => apiGet<CommerceCart | null>('/cart'),
  addCartItem: (menuItemId: number, quantity: number, note?: string) =>
    apiPost<CommerceCart>('/cart/items', { menuItemId, quantity, note: note || null }),
  updateCartItem: (menuItemId: number, quantity: number, note?: string | null) =>
    apiPut<CommerceCart>(`/cart/items/${menuItemId}`, { quantity, note: note || null }),
  removeCartItem: (menuItemId: number) =>
    apiDelete<CommerceCart | null>(`/cart/items/${menuItemId}`),
  clearCart: () => apiDelete<void>('/cart'),

  placeOrder: (provider: 'MOMO' | 'ZALOPAY', idempotencyKey: string) =>
    apiPost<CommerceOrder>('/orders', { provider, idempotencyKey }),
  confirmSandboxPayment: (orderId: number) =>
    apiPost<CommerceOrder>(`/orders/${orderId}/payment/sandbox-confirm`),
  customerOrders: () => apiGet<CommerceOrder[]>('/orders'),
  customerOrder: (orderId: string | number) => apiGet<CommerceOrder>(`/orders/${orderId}`),
  cancelOrder: (orderId: number, expectedStatus: string) =>
    apiPost<CommerceOrder>(`/orders/${orderId}/cancel`, { expectedStatus }),
  confirmPickup: (orderId: number, expectedStatus: string) =>
    apiPost<CommerceOrder>(`/orders/${orderId}/confirm-pickup`, { expectedStatus }),

  sellerOrders: (status?: string) =>
    apiGet<CommerceOrder[]>(
      `/seller/orders${status ? `?status=${encodeURIComponent(status)}` : ''}`,
    ),
  sellerOrder: (orderId: string | number) => apiGet<CommerceOrder>(`/seller/orders/${orderId}`),
  decideSellerOrder: (
    orderId: number,
    decision: 'ACCEPT' | 'REJECT',
    reason: string | null,
    expectedStatus: string,
  ) =>
    apiPost<CommerceOrder>(`/seller/orders/${orderId}/decision`, {
      decision,
      reason,
      expectedStatus,
    }),
  updateSellerOrderStatus: (
    orderId: number,
    targetStatus: 'PREPARING' | 'READY_FOR_PICKUP',
    expectedStatus: string,
  ) =>
    apiPost<CommerceOrder>(`/seller/orders/${orderId}/status`, {
      targetStatus,
      expectedStatus,
    }),
  confirmHandover: (orderId: number, expectedStatus: string) =>
    apiPost<CommerceOrder>(`/seller/orders/${orderId}/handover`, { expectedStatus }),
  salesSummary: (period: 'DAY' | 'WEEK' | 'MONTH') =>
    apiGet<SalesSummary>(`/seller/orders/sales-summary?period=${period}`),
};
