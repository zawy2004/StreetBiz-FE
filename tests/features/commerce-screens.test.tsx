import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import { ApiError } from '@/core/api/problem';
import type { CommerceCart } from '@/core/api';
import type { Order } from '@/features/orders/types/order.types';

const legacyApi = vi.hoisted(() => ({
  cart: vi.fn(),
}));
const ordersApi = vi.hoisted(() => ({
  checkout: vi.fn(),
  customerOrders: vi.fn(),
  customerOrder: vi.fn(),
  cancel: vi.fn(),
  confirmPickup: vi.fn(),
  vendorOrders: vi.fn(),
  vendorOrder: vi.fn(),
  accept: vi.fn(),
  reject: vi.fn(),
  preparing: vi.fn(),
  readyForPickup: vi.fn(),
  confirmHandover: vi.fn(),
  salesSummary: vi.fn(),
}));
const redirect = vi.hoisted(() => vi.fn());

vi.mock('@/core/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/api')>();
  return { ...actual, commerceApi: { ...actual.commerceApi, ...legacyApi } };
});
vi.mock('@/features/orders/api/orderApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/orders/api/orderApi')>();
  return { ...actual, orderApi: ordersApi };
});
vi.mock('@/features/orders/payment-redirect', () => ({ redirectToPayment: redirect }));
vi.mock('@/core/config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/config/env')>();
  return { ...actual, isLiveApi: true };
});

const { CartScreen } = await import('@/features/cart/screens/CartScreen');
const { CheckoutScreen } = await import('@/features/cart/screens/CheckoutScreen');
const { OrderDetailScreen } = await import('@/features/orders/screens/OrderDetailScreen');
const { OrderPaymentScreen } = await import('@/features/orders/screens/OrderPaymentScreen');
const { VendorOrderDetailScreen } = await import(
  '@/features/orders/screens/VendorOrderDetailScreen'
);
const {
  OrderStatusBadge,
  OrderSummary,
  RejectOrderDialog,
  vendorActionsFor,
} = await import('@/features/orders/components');
const { orderPollingInterval } = await import('@/features/orders/hooks/useOrders');
const { useAuthStore } = await import('@/store/auth-store');

const order = (status: Order['orderStatus'] = 'PLACED'): Order => ({
  orderId: 19,
  orderCode: 'SB-000019',
  customerUserId: 7,
  customerName: 'Khách hàng',
  orderStatus: status,
  storefront: { storefrontId: 2, storefrontName: 'Bếp Việt', imageUrl: null },
  subtotalAmount: 50_000,
  totalAmount: 50_000,
  paymentProvider: 'MOMO',
  paymentStatus: status === 'PENDING_PAYMENT' ? 'PENDING' : 'SUCCESS',
  rejectionReason: null,
  refundAmount: null,
  refundReason: null,
  refundStatus: null,
  placedAt: status === 'PENDING_PAYMENT' ? null : '2026-09-18T00:30:00Z',
  completedAt: status === 'COMPLETED' ? '2026-09-18T01:30:00Z' : null,
  createdAt: '2026-09-18T00:25:00Z',
  items: [
    {
      orderItemId: 1,
      menuItemId: 11,
      itemName: 'Bánh mì',
      unitPrice: 25_000,
      quantity: 2,
      lineTotal: 50_000,
      note: 'Ít cay',
    },
  ],
  statusHistory: [],
});

const cart: CommerceCart = {
  cartId: 3,
  storefrontId: 2,
  storefrontName: 'Bếp Việt',
  storefrontAddress: '12 Nguyễn Văn Linh, Hải Châu, Đà Nẵng',
  storefrontStatus: 'OPEN',
  subtotal: 50_000,
  items: [
    {
      cartItemId: 5,
      menuItemId: 11,
      itemName: 'Bánh mì',
      imageUrl: null,
      unitPrice: 25_000,
      availabilityStatus: 'AVAILABLE',
      quantity: 2,
      note: 'Ít cay',
    },
  ],
};

function renderAt(path: string, route: string, element: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={route} element={element} />
          <Route path="/customer/orders/:orderId" element={<div>order detail destination</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('order UI contracts', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('crypto', { randomUUID: vi.fn(() => 'uuid-checkout-1') });
    useAuthStore.setState({
      user: {
        id: '7',
        fullName: 'Khách hàng',
        phone: '0905000001',
        password: '',
        role_code: 'CUSTOMER',
        account_status: 'ACTIVE',
      },
      sessionExpired: false,
    });
  });

  it('renders the backend order status as text, not color alone', () => {
    render(<OrderStatusBadge status="READY_FOR_PICKUP" />);
    expect(screen.getByText(/SẴN SÀNG/)).toBeInTheDocument();
  });

  it('does not show vendor actions on the customer detail screen', async () => {
    ordersApi.customerOrder.mockResolvedValue(order('PLACED'));
    renderAt('/customer/orders/19', '/customer/orders/:orderId', <OrderDetailScreen />);
    expect(await screen.findByRole('button', { name: 'Huỷ đơn' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nhận đơn' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Bắt đầu chuẩn bị' })).not.toBeInTheDocument();
  });

  it('exposes vendor actions only for the current state', () => {
    expect(vendorActionsFor('PLACED')).toEqual(['accept', 'reject']);
    expect(vendorActionsFor('ACCEPTED')).toEqual(['preparing']);
    expect(vendorActionsFor('PREPARING')).toEqual(['ready']);
    expect(vendorActionsFor('READY_FOR_PICKUP')).toEqual(['handover']);
    expect(vendorActionsFor('COMPLETED')).toEqual([]);
  });

  it('requires a rejection reason before submission', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(
      <RejectOrderDialog
        visible
        reason=""
        pending={false}
        onReasonChange={() => undefined}
        onConfirm={onConfirm}
        onClose={() => undefined}
      />,
    );
    const submit = screen.getByRole('button', { name: 'Xác nhận từ chối' });
    expect(submit).toBeDisabled();
    await user.click(submit);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('shows the empty state when the customer has no cart', async () => {
    legacyApi.cart.mockResolvedValue(null);
    renderAt('/customer/explore/cart', '/customer/explore/cart', <CartScreen />);
    expect(await screen.findByText('Giỏ hàng trống')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Thanh toán/ })).not.toBeInTheDocument();
  });

  it('lists cart lines and offers checkout when the storefront is open', async () => {
    legacyApi.cart.mockResolvedValue(cart);
    renderAt('/customer/explore/cart', '/customer/explore/cart', <CartScreen />);
    expect(await screen.findByText('Bánh mì')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Thanh toán · 50.000 đ/ })).toBeEnabled();
  });

  it('blocks checkout while the storefront is closed', async () => {
    legacyApi.cart.mockResolvedValue({ ...cart, storefrontStatus: 'CLOSED' });
    renderAt('/customer/explore/cart', '/customer/explore/cart', <CartScreen />);
    expect(await screen.findByRole('button', { name: /Thanh toán · 50.000 đ/ })).toBeDisabled();
  });

  it('blocks checkout when a line is no longer available', async () => {
    legacyApi.cart.mockResolvedValue({
      ...cart,
      items: [{ ...cart.items[0]!, availabilityStatus: 'UNAVAILABLE' }],
    });
    renderAt('/customer/explore/cart', '/customer/explore/cart', <CartScreen />);
    expect(await screen.findByText('Món hiện không còn bán.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Thanh toán · 50.000 đ/ })).toBeDisabled();
  });

  it('prevents a double-click checkout from sending a second request', async () => {
    legacyApi.cart.mockResolvedValue(cart);
    ordersApi.checkout.mockImplementation(() => new Promise(() => undefined));
    const user = userEvent.setup();
    renderAt('/customer/checkout', '/customer/checkout', <CheckoutScreen />);
    const button = await screen.findByRole('button', { name: 'Thanh toán và đặt món' });
    await user.dblClick(button);
    expect(ordersApi.checkout).toHaveBeenCalledOnce();
    expect(ordersApi.checkout).toHaveBeenCalledWith(
      { cartId: 3, provider: 'MOMO' },
      'uuid-checkout-1',
    );
  });

  it('does not treat a successful payment return query as proof of payment', async () => {
    ordersApi.customerOrder.mockResolvedValue(order('PENDING_PAYMENT'));
    renderAt(
      '/customer/orders/19/payment?status=success',
      '/customer/orders/:orderId/payment',
      <OrderPaymentScreen />,
    );
    expect(await screen.findByText('Đang chờ cổng thanh toán xác nhận')).toBeInTheDocument();
    expect(screen.queryByText('Đặt món thành công')).not.toBeInTheDocument();
  });

  it('refetches vendor detail after a 409 conflict', async () => {
    useAuthStore.setState((state) => ({
      ...state,
      user: state.user ? { ...state.user, role_code: 'VENDOR' } : null,
    }));
    ordersApi.vendorOrder.mockResolvedValue(order('PLACED'));
    ordersApi.accept.mockRejectedValue(
      new ApiError('conflict', 409, 'Trạng thái đơn đã thay đổi.'),
    );
    const user = userEvent.setup();
    renderAt('/vendor/orders/19', '/vendor/orders/:orderId', <VendorOrderDetailScreen />);
    await user.click(await screen.findByRole('button', { name: 'Nhận đơn' }));
    await waitFor(() => expect(ordersApi.vendorOrder.mock.calls.length).toBeGreaterThan(1));
  });

  it('formats order money in Vietnamese đồng', () => {
    render(<OrderSummary subtotal={50_000} total={50_000} />);
    expect(screen.getAllByText('50.000 đ')).toHaveLength(2);
  });

  it('stops polling terminal order states', () => {
    expect(orderPollingInterval(order('COMPLETED'))).toBe(false);
    expect(orderPollingInterval(order('REJECTED'))).toBe(false);
    expect(orderPollingInterval(order('CANCELLED'))).toBe(false);
    expect(orderPollingInterval(order('PREPARING'))).toBe(7_000);
  });

  it('redirects only to the payment URL returned by checkout', async () => {
    legacyApi.cart.mockResolvedValue(cart);
    ordersApi.checkout.mockResolvedValue({
      orderId: 19,
      orderCode: 'SB-000019',
      orderStatus: 'PENDING_PAYMENT',
      paymentTransactionId: 22,
      provider: 'MOMO',
      amount: 50_000,
      paymentUrl: 'https://gateway.example/pay/22',
    });
    const user = userEvent.setup();
    renderAt('/customer/checkout', '/customer/checkout', <CheckoutScreen />);
    await user.click(await screen.findByRole('button', { name: 'Thanh toán và đặt món' }));
    await waitFor(() =>
      expect(redirect).toHaveBeenCalledWith('https://gateway.example/pay/22'),
    );
  });
});
