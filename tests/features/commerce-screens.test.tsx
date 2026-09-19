import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import type { CommerceCart, CommerceOrder } from '@/core/api';

const api = vi.hoisted(() => ({
  menuItem: vi.fn(),
  cart: vi.fn(),
  paymentOptions: vi.fn(),
  failSandboxPayment: vi.fn(),
  confirmSandboxRefund: vi.fn(),
  addCartItem: vi.fn(),
  clearCart: vi.fn(),
  placeOrder: vi.fn(),
  confirmSandboxPayment: vi.fn(),
  customerOrder: vi.fn(),
  cancelOrder: vi.fn(),
  confirmPickup: vi.fn(),
  sellerOrders: vi.fn(),
  decideSellerOrder: vi.fn(),
  updateSellerOrderStatus: vi.fn(),
  confirmHandover: vi.fn(),
  salesSummary: vi.fn(),
}));

vi.mock('@/core/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/api')>();
  return { ...actual, commerceApi: { ...actual.commerceApi, ...api } };
});

vi.mock('@/core/config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/config/env')>();
  return {
    ...actual,
    isLiveApi: true,
    isDev: false,
    env: { ...actual.env, enablePaymentSandbox: false },
  };
});

const { ItemDetailScreen } = await import('@/features/buyer-discovery/screens/ItemDetailScreen');
const { CartScreen } = await import('@/features/cart/screens/CartScreen');
const { CheckoutScreen } = await import('@/features/cart/screens/CheckoutScreen');
const { OrderPaymentScreen } = await import('@/features/orders/screens/OrderPaymentScreen');
const { OrderDetailScreen } = await import('@/features/orders/screens/OrderDetailScreen');
const { VendorOrdersScreen } = await import('@/features/storefronts/screens/VendorOrdersScreen');
const { SalesSummaryScreen } = await import('@/features/storefronts/screens/SalesSummaryScreen');
const { useAuthStore } = await import('@/store/auth-store');

const order: CommerceOrder = {
  orderId: 19,
  orderCode: 'SB-000019',
  customerUserId: 7,
  customerName: 'Khách hàng',
  storefrontId: 2,
  storefrontName: 'Bếp Việt',
  orderStatus: 'CANCELLED',
  subtotalAmount: 50_000,
  totalAmount: 50_000,
  rejectionReason: null,
  paymentProvider: 'MOMO',
  paymentStatus: 'SUCCESS',
  refundAmount: 50_000,
  refundReason: 'ORDER_CANCELLED',
  refundStatus: 'SUCCESS',
  refundRequestedAt: '2026-09-18T01:00:00Z',
  refundCompletedAt: '2026-09-18T01:05:00Z',
  placedAt: '2026-09-18T00:30:00Z',
  completedAt: '2026-09-18T01:00:00Z',
  createdAt: '2026-09-18T00:25:00Z',
  items: [
    {
      orderItemId: 1,
      menuItemId: 11,
      itemName: 'Bánh mì',
      unitPrice: 25_000,
      quantity: 2,
      note: 'Ít cay',
    },
  ],
  history: [],
};

const cart: CommerceCart = {
  cartId: 3,
  storefrontId: 2,
  storefrontName: 'Bếp Việt',
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
          <Route path="/customer/explore/cart" element={<div>cart destination</div>} />
          <Route
            path="/customer/orders/:orderId/payment"
            element={<div>payment destination</div>}
          />
          <Route path="/customer/orders/:orderId" element={<div>order destination</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('commerce live screens', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.paymentOptions.mockResolvedValue({
      mode: 'UNAVAILABLE',
      providers: [],
      message: 'Thanh toán trực tuyến chưa sẵn sàng. Vui lòng thử lại sau.',
    });
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

  it('shows a completed refund instead of a permanently pending message', async () => {
    api.customerOrder.mockResolvedValue(order);

    renderAt('/customer/orders/19', '/customer/orders/:orderId', <OrderDetailScreen />);

    expect(await screen.findByText('ĐÃ HOÀN TIỀN')).toBeInTheDocument();
    expect(screen.getByText('Hệ thống đã ghi nhận hoàn tiền thành công.')).toBeInTheDocument();
    expect(screen.queryByText(/đang chờ cổng thanh toán/i)).not.toBeInTheDocument();
  });

  it('asks before replacing a cart from another storefront', async () => {
    api.menuItem.mockResolvedValue({
      menuItemId: 12,
      storefrontId: 9,
      storefrontName: 'Quán Mới',
      itemName: 'Cơm gà',
      description: null,
      imageUrl: null,
      unitPrice: 40_000,
      availabilityStatus: 'AVAILABLE',
      categoryId: 1,
      categoryName: 'Món chính',
    });
    api.cart.mockResolvedValue(cart);
    api.addCartItem.mockResolvedValue({ ...cart, storefrontId: 9, storefrontName: 'Quán Mới' });
    const user = userEvent.setup();

    renderAt('/customer/explore/items/12', '/customer/explore/items/:itemId', <ItemDetailScreen />);
    await user.click(await screen.findByRole('button', { name: /thêm vào giỏ/i }));

    expect(screen.getByText('Thay giỏ hàng hiện tại?')).toBeInTheDocument();
    expect(api.addCartItem).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Thay giỏ hàng' }));
    await waitFor(() => expect(api.addCartItem).toHaveBeenCalledWith(12, 1, ''));
  });

  it('asks before clearing every cart item', async () => {
    api.cart.mockResolvedValue(cart);
    api.clearCart.mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderAt('/customer/explore/cart', '/customer/explore/cart', <CartScreen />);
    await user.click(await screen.findByRole('button', { name: 'Xoá toàn bộ giỏ hàng' }));

    expect(screen.getByText('Xoá toàn bộ giỏ hàng?')).toBeInTheDocument();
    expect(api.clearCart).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Xoá giỏ hàng' }));
    await waitFor(() => expect(api.clearCart).toHaveBeenCalledOnce());
  });

  it('does not create an unpayable order when the payment sandbox is disabled', async () => {
    api.cart.mockResolvedValue(cart);

    renderAt('/customer/checkout', '/customer/checkout', <CheckoutScreen />);

    const button = await screen.findByRole('button', { name: 'Thanh toán chưa sẵn sàng' });
    expect(button).toBeDisabled();
    expect(screen.getByText(/Thanh toán trực tuyến chưa sẵn sàng/i)).toBeInTheDocument();
    expect(api.placeOrder).not.toHaveBeenCalled();
  });

  it('asks before the seller completes an irreversible handover', async () => {
    useAuthStore.setState((state) => ({
      ...state,
      user: state.user ? { ...state.user, role_code: 'VENDOR' } : null,
    }));
    const ready = { ...order, orderStatus: 'READY_FOR_PICKUP', refundStatus: null };
    api.sellerOrders.mockResolvedValue([ready]);
    api.confirmHandover.mockResolvedValue({ ...ready, orderStatus: 'COMPLETED' });
    const user = userEvent.setup();

    renderAt('/vendor/store/orders', '/vendor/store/orders', <VendorOrdersScreen />);
    await user.click(await screen.findByRole('button', { name: 'Xác nhận đã giao khách' }));

    expect(screen.getByText('Xác nhận đã bàn giao?')).toBeInTheDocument();
    expect(api.confirmHandover).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Đã giao khách' }));
    await waitFor(() => expect(api.confirmHandover).toHaveBeenCalledWith(19, 'READY_FOR_PICKUP'));
  });

  it('creates a recoverable pending order without automatically marking it paid', async () => {
    api.cart.mockResolvedValue(cart);
    api.paymentOptions.mockResolvedValue({
      mode: 'SANDBOX',
      providers: ['MOMO', 'ZALOPAY'],
      message: 'Không trừ tiền thật.',
    });
    api.placeOrder.mockResolvedValue({
      ...order,
      orderStatus: 'PENDING_PAYMENT',
      paymentStatus: 'PENDING',
    });
    const user = userEvent.setup();
    renderAt('/customer/checkout', '/customer/checkout', <CheckoutScreen />);
    await user.click(await screen.findByRole('button', { name: 'Tiếp tục thanh toán qua MOMO' }));
    expect(await screen.findByText('payment destination')).toBeInTheDocument();
    expect(api.placeOrder).toHaveBeenCalledWith('MOMO', 'WEB-CART-7-3');
    expect(api.confirmSandboxPayment).not.toHaveBeenCalled();
  });

  it('retries a failed payment on the same order, without creating another order', async () => {
    api.customerOrder.mockResolvedValue({
      ...order,
      orderStatus: 'PENDING_PAYMENT',
      paymentStatus: 'FAILED',
    });
    api.paymentOptions.mockResolvedValue({
      mode: 'SANDBOX',
      providers: ['MOMO'],
      message: 'Không trừ tiền thật.',
    });
    api.confirmSandboxPayment.mockResolvedValue({
      ...order,
      orderStatus: 'PLACED',
      paymentStatus: 'SUCCESS',
    });
    const user = userEvent.setup();
    renderAt(
      '/customer/orders/19/payment',
      '/customer/orders/:orderId/payment',
      <OrderPaymentScreen />,
    );
    await user.click(await screen.findByRole('button', { name: 'Thử lại thanh toán sandbox' }));
    expect(await screen.findByText('order destination')).toBeInTheDocument();
    expect(api.confirmSandboxPayment).toHaveBeenCalledWith(19);
    expect(api.placeOrder).not.toHaveBeenCalled();
  });

  it('does not expose payment simulation when the server disables sandbox', async () => {
    api.customerOrder.mockResolvedValue({
      ...order,
      orderStatus: 'PENDING_PAYMENT',
      paymentStatus: 'PENDING',
    });
    renderAt(
      '/customer/orders/19/payment',
      '/customer/orders/:orderId/payment',
      <OrderPaymentScreen />,
    );
    expect(await screen.findByText(/Thanh toán trực tuyến chưa sẵn sàng/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /sandbox/ })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Mô phỏng thanh toán thất bại' }),
    ).not.toBeInTheDocument();
  });

  it('shows net sales after successful refunds', async () => {
    useAuthStore.setState((state) => ({
      ...state,
      user: state.user ? { ...state.user, role_code: 'VENDOR' } : null,
    }));
    api.salesSummary.mockResolvedValue({
      period: 'DAY',
      fromUtc: '2026-09-17T17:00:00Z',
      toUtc: '2026-09-18T01:00:00Z',
      completedOrderCount: 2,
      grossSales: 100_000,
      refundedAmount: 20_000,
      netSales: 80_000,
      orders: [],
    });

    renderAt('/vendor/store/sales', '/vendor/store/sales', <SalesSummaryScreen />);

    expect(await screen.findByText('80.000 đ')).toBeInTheDocument();
    expect(screen.getByText('100.000 đ')).toBeInTheDocument();
    expect(screen.getByText('20.000 đ')).toBeInTheDocument();
  });
});
