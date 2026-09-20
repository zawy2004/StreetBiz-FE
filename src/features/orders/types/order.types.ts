export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PLACED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'PREPARING'
  | 'READY_FOR_PICKUP'
  | 'COMPLETED'
  | 'CANCELLED';

export type PaymentProvider = 'MOMO' | 'ZALOPAY';
export type RefundStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

export interface OrderItem {
  orderItemId: number;
  menuItemId: number;
  itemName: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  note?: string | null;
}

export interface OrderStatusHistory {
  historyId?: number;
  fromStatus?: OrderStatus | null;
  toStatus: OrderStatus;
  changedAt: string;
  note?: string | null;
}

export interface OrderStorefront {
  storefrontId: number;
  storefrontName: string;
  imageUrl?: string | null;
  address?: string | null;
}

export interface Order {
  orderId: number;
  orderCode: string;
  customerUserId?: number;
  customerName?: string;
  orderStatus: OrderStatus;
  storefront: OrderStorefront;
  items: OrderItem[];
  subtotalAmount: number;
  totalAmount: number;
  rejectionReason?: string | null;
  paymentProvider?: PaymentProvider | null;
  paymentStatus?: 'PENDING' | 'SUCCESS' | 'FAILED' | null;
  refundAmount?: number | null;
  refundReason?: string | null;
  refundStatus?: RefundStatus | null;
  refundRequestedAt?: string | null;
  refundCompletedAt?: string | null;
  placedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  statusHistory: OrderStatusHistory[];
}

export interface CheckoutRequest {
  cartId: number;
  provider: PaymentProvider;
}

export interface CheckoutResponse {
  orderId: number;
  orderCode: string;
  orderStatus: 'PENDING_PAYMENT';
  paymentTransactionId: number;
  provider: PaymentProvider;
  amount: number;
  paymentUrl: string;
}

export interface OrderListFilters {
  status?: OrderStatus;
  page?: number;
  pageSize?: number;
  fromDate?: string;
  toDate?: string;
  sort?: 'createdAt_asc' | 'createdAt_desc' | 'orderCode_asc' | 'orderCode_desc';
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export type SalesGroup = 'day' | 'week' | 'month';

export interface SalesBucket {
  key: string;
  completedOrderCount: number;
  grossSales: number;
  refundedAmount: number;
  netSales: number;
}

export interface SalesSummary {
  fromDate: string;
  toDate: string;
  groupBy: SalesGroup;
  completedOrderCount: number;
  grossSales: number;
  refundedAmount: number;
  netSales: number;
  buckets: SalesBucket[];
}

export const TERMINAL_ORDER_STATUSES: ReadonlySet<OrderStatus> = new Set([
  'COMPLETED',
  'REJECTED',
  'CANCELLED',
]);
