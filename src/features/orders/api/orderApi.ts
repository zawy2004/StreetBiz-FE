import { apiGet, apiPost } from '@/core/api/client';
import type {
  CheckoutRequest,
  CheckoutResponse,
  Order,
  OrderItem,
  OrderListFilters,
  OrderStatusHistory,
  PagedResult,
  SalesGroup,
  SalesSummary,
} from '../types/order.types';

type BackendOrder = Partial<Order> & {
  storefrontId?: number;
  storefrontName?: string;
  storefrontImageUrl?: string | null;
  storefrontAddress?: string | null;
  history?: OrderStatusHistory[];
};

function normalizeUtc(value?: string | null): string | null {
  if (!value) return null;
  if (/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)) {
    return new Date(value).toISOString();
  }
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,7}))?$/.exec(value);
  if (!match) return value;
  const [, year, month, day, hour, minute, second, fraction = '0'] = match;
  return new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
      Number(fraction.padEnd(3, '0').slice(0, 3)),
    ),
  ).toISOString();
}

export function mapOrder(input: BackendOrder): Order {
  const storefront = input.storefront ?? {
    storefrontId: input.storefrontId ?? 0,
    storefrontName: input.storefrontName ?? '',
    imageUrl: input.storefrontImageUrl ?? null,
    address: input.storefrontAddress ?? null,
  };
  const items = (input.items ?? []).map(
    (item): OrderItem => ({
      ...item,
      lineTotal: item.lineTotal ?? item.unitPrice * item.quantity,
    }),
  );
  const statusHistory = (input.statusHistory ?? input.history ?? []).map(
    (history): OrderStatusHistory => ({
      ...history,
      changedAt: normalizeUtc(history.changedAt) ?? history.changedAt,
    }),
  );
  return {
    orderId: input.orderId!,
    orderCode: input.orderCode!,
    customerUserId: input.customerUserId,
    customerName: input.customerName,
    orderStatus: input.orderStatus!,
    storefront,
    items,
    subtotalAmount: input.subtotalAmount ?? 0,
    totalAmount: input.totalAmount ?? 0,
    rejectionReason: input.rejectionReason,
    paymentProvider: input.paymentProvider,
    paymentStatus: input.paymentStatus,
    refundAmount: input.refundAmount,
    refundReason: input.refundReason,
    refundStatus: input.refundStatus,
    refundRequestedAt: normalizeUtc(input.refundRequestedAt),
    refundCompletedAt: normalizeUtc(input.refundCompletedAt),
    placedAt: normalizeUtc(input.placedAt),
    completedAt: normalizeUtc(input.completedAt),
    createdAt: normalizeUtc(input.createdAt) ?? input.createdAt!,
    statusHistory,
  };
}

function query(filters: OrderListFilters): string {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  params.set('page', String(filters.page ?? 1));
  params.set('pageSize', String(filters.pageSize ?? 20));
  if (filters.fromDate) params.set('fromDate', filters.fromDate);
  if (filters.toDate) params.set('toDate', filters.toDate);
  params.set('sort', filters.sort ?? 'createdAt_desc');
  return params.toString();
}

function mapPage(page: PagedResult<BackendOrder>): PagedResult<Order> {
  return { ...page, items: page.items.map(mapOrder) };
}

export const orderApi = {
  checkout: (request: CheckoutRequest, idempotencyKey: string) =>
    apiPost<CheckoutResponse>('/orders/checkout', request, {
      headers: { 'Idempotency-Key': idempotencyKey },
    }),
  customerOrders: async (filters: OrderListFilters = {}) =>
    mapPage(await apiGet<PagedResult<BackendOrder>>(`/orders/me?${query(filters)}`)),
  customerOrder: async (orderId: string | number) =>
    mapOrder(await apiGet<BackendOrder>(`/orders/${orderId}`)),
  cancel: async (orderId: number) =>
    mapOrder(await apiPost<BackendOrder>(`/orders/${orderId}/cancel`)),
  confirmPickup: async (orderId: number) =>
    mapOrder(await apiPost<BackendOrder>(`/orders/${orderId}/confirm-pickup`)),

  vendorOrders: async (filters: OrderListFilters = {}) =>
    mapPage(await apiGet<PagedResult<BackendOrder>>(`/vendor/orders?${query(filters)}`)),
  vendorOrder: async (orderId: string | number) =>
    mapOrder(await apiGet<BackendOrder>(`/vendor/orders/${orderId}`)),
  accept: async (orderId: number) =>
    mapOrder(await apiPost<BackendOrder>(`/vendor/orders/${orderId}/accept`)),
  reject: async (orderId: number, reason: string) =>
    mapOrder(await apiPost<BackendOrder>(`/vendor/orders/${orderId}/reject`, { reason })),
  preparing: async (orderId: number) =>
    mapOrder(await apiPost<BackendOrder>(`/vendor/orders/${orderId}/preparing`)),
  readyForPickup: async (orderId: number) =>
    mapOrder(await apiPost<BackendOrder>(`/vendor/orders/${orderId}/ready-for-pickup`)),
  confirmHandover: async (orderId: number) =>
    mapOrder(await apiPost<BackendOrder>(`/vendor/orders/${orderId}/confirm-handover`)),
  salesSummary: (fromDate: string, toDate: string, groupBy: SalesGroup) => {
    const params = new URLSearchParams({ fromDate, toDate, groupBy });
    return apiGet<SalesSummary>(`/vendor/orders/sales-summary?${params.toString()}`);
  },
};
