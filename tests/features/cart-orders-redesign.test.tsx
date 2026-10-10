import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import { ApiError } from '@/core/api/problem';
import type { CommerceCart, CommerceOrder } from '@/core/api';
import type { Order } from '@/features/orders/types/order.types';

/**
 * Phase 5 (group 04): the states the rebuilt cart, checkout and order screens
 * add on top of the baseline contracts in commerce-screens / order-pickup.
 */

const legacyApi = vi.hoisted(() => ({
  cart: vi.fn(),
  paymentOptions: vi.fn(),
  customerOrder: vi.fn(),
  review: vi.fn(),
  saveReview: vi.fn(),
  complaints: vi.fn(),
  complain: vi.fn(),
}));
const ordersApi = vi.hoisted(() => ({
  checkout: vi.fn(),
  customerOrders: vi.fn(),
  customerOrder: vi.fn(),
  pickupCode: vi.fn(),
  syncPayment: vi.fn(),
  vendorOrder: vi.fn(),
  vendorOrders: vi.fn(),
  confirmPickupByCode: vi.fn(),
  scanPickup: vi.fn(),
}));

vi.mock('@/core/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/api')>();
  return { ...actual, commerceApi: { ...actual.commerceApi, ...legacyApi } };
});
vi.mock('@/features/orders/api/orderApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/orders/api/orderApi')>();
  return { ...actual, orderApi: ordersApi };
});
vi.mock('@/features/orders/components/QrScanner', () => ({
  QrScanner: () => <div>stub-camera</div>,
}));
vi.mock('@/features/orders/components/qr-scan-support', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/features/orders/components/qr-scan-support')>();
  return { ...actual, isCameraScanSupported: () => true };
});
vi.mock('@/core/config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/config/env')>();
  return {
    ...actual,
    isLiveApi: true,
    isDev: true,
    env: { ...actual.env, enablePaymentSandbox: true },
  };
});

const { CartScreen } = await import('@/features/cart/screens/CartScreen');
const { CheckoutScreen } = await import('@/features/cart/screens/CheckoutScreen');
const { CustomerOrdersScreen } = await import('@/features/orders/screens/CustomerOrdersScreen');
const { OrderDetailScreen } = await import('@/features/orders/screens/OrderDetailScreen');
const { OrderPaymentScreen } = await import('@/features/orders/screens/OrderPaymentScreen');
const { OrderReviewScreen } = await import('@/features/orders/screens/OrderReviewScreen');
const { OrderComplaintScreen } = await import('@/features/orders/screens/OrderComplaintScreen');
const { VendorOrderDetailScreen } =
  await import('@/features/orders/screens/VendorOrderDetailScreen');
const { VendorPickupScanScreen } = await import('@/features/orders/screens/VendorPickupScanScreen');
const { useAuthStore } = await import('@/store/auth-store');

const order = (status: Order['orderStatus'] = 'PLACED', patch: Partial<Order> = {}): Order => ({
  orderId: 19,
  orderCode: 'SB-000019',
  customerUserId: 7,
  customerName: 'Nguyễn Khách Hàng',
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
  placedAt: '2026-09-18T00:30:00Z',
  completedAt: null,
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
  ...patch,
});

const commerceOrder = (status: string, patch: Partial<CommerceOrder> = {}): CommerceOrder => ({
  orderId: 19,
  orderCode: 'SB-000019',
  customerUserId: 7,
  customerName: 'Nguyễn Khách Hàng',
  storefrontId: 2,
  storefrontName: 'Bếp Việt',
  orderStatus: status,
  subtotalAmount: 50_000,
  totalAmount: 50_000,
  rejectionReason: null,
  paymentProvider: 'MOMO',
  paymentStatus: 'SUCCESS',
  refundAmount: null,
  refundReason: null,
  refundStatus: null,
  refundRequestedAt: null,
  refundCompletedAt: null,
  placedAt: '2026-09-18T00:30:00Z',
  completedAt: status === 'COMPLETED' ? '2026-09-18T01:30:00Z' : null,
  createdAt: '2026-09-18T00:25:00Z',
  items: [
    {
      orderItemId: 1,
      menuItemId: 11,
      itemName: 'Bánh mì',
      unitPrice: 25_000,
      quantity: 2,
      note: null,
    },
  ],
  history: [],
  ...patch,
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
          <Route path="/customer/explore/cart" element={<div>cart destination</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Pretend to be a ≥ 1024px screen for `useIsDesktop`. */
function asDesktop() {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: query.includes('min-width: 1024px'),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    })),
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.unstubAllGlobals();
  legacyApi.paymentOptions.mockResolvedValue({ mode: 'SANDBOX', providers: ['MOMO'], message: '' });
  ordersApi.syncPayment.mockImplementation(async () => order('PENDING_PAYMENT'));
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

describe('C10 cart', () => {
  it('says why checkout is off while the stall is closed', async () => {
    legacyApi.cart.mockResolvedValue({ ...cart, storefrontStatus: 'CLOSED' });
    renderAt('/customer/explore/cart', '/customer/explore/cart', <CartScreen />);
    expect(await screen.findByText(/Quán đang đóng cửa nên chưa đặt được/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Thanh toán · 50.000 đ/ })).toBeDisabled();
  });

  it('labels a stock photo as illustrative', async () => {
    legacyApi.cart.mockResolvedValue(cart);
    renderAt('/customer/explore/cart', '/customer/explore/cart', <CartScreen />);
    expect(await screen.findByText('Ảnh minh họa')).toBeInTheDocument();
  });

  it('renders the checkout button once on a desktop', async () => {
    asDesktop();
    legacyApi.cart.mockResolvedValue(cart);
    renderAt('/customer/explore/cart', '/customer/explore/cart', <CartScreen />);
    await screen.findByText('Bánh mì');
    expect(screen.getAllByRole('button', { name: /Thanh toán ·/ })).toHaveLength(1);
  });
});

describe('C11 checkout', () => {
  it('says what it is waiting for while the order is being created', async () => {
    legacyApi.cart.mockResolvedValue(cart);
    ordersApi.checkout.mockImplementation(() => new Promise(() => undefined));
    vi.stubGlobal('crypto', { randomUUID: vi.fn(() => 'uuid-1') });
    const user = userEvent.setup();
    renderAt('/customer/checkout', '/customer/checkout', <CheckoutScreen />);
    await user.click(await screen.findByRole('button', { name: 'Thanh toán và đặt món' }));
    expect(await screen.findByText('Đang khởi tạo thanh toán…')).toBeInTheDocument();
    expect(screen.queryByText(/thành công/i)).not.toBeInTheDocument();
  });

  it('retries a failed checkout with the same idempotency key', async () => {
    legacyApi.cart.mockResolvedValue(cart);
    ordersApi.checkout.mockRejectedValueOnce(new ApiError('server_error', 503, 'Mạng chập chờn.'));
    ordersApi.checkout.mockImplementation(() => new Promise(() => undefined));
    const uuid = vi.fn().mockReturnValueOnce('uuid-a').mockReturnValueOnce('uuid-b');
    vi.stubGlobal('crypto', { randomUUID: uuid });
    const user = userEvent.setup();
    renderAt('/customer/checkout', '/customer/checkout', <CheckoutScreen />);
    await user.click(await screen.findByRole('button', { name: 'Thanh toán và đặt món' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Mạng chập chờn.');
    await user.click(screen.getByRole('button', { name: 'Thanh toán và đặt món' }));
    expect(ordersApi.checkout).toHaveBeenCalledTimes(2);
    expect(ordersApi.checkout.mock.calls[1]?.[1]).toBe('uuid-a');
  });

  it('keeps the wallet choice a real, named radio', async () => {
    legacyApi.cart.mockResolvedValue(cart);
    renderAt('/customer/checkout', '/customer/checkout', <CheckoutScreen />);
    const zalo = await screen.findByRole('radio', { name: /ZaloPay/ });
    expect(zalo.tagName).toBe('INPUT');
    expect(screen.getByRole('radio', { name: /MoMo/ })).toBeChecked();
  });
});

describe('C12 orders list', () => {
  const page = (items: Order[]) => ({
    items,
    page: 1,
    pageSize: 10,
    totalItems: items.length,
    totalPages: 1,
  });

  it('lays out the order still on its way with its current stage', async () => {
    ordersApi.customerOrders.mockResolvedValue(
      page([order('PREPARING'), order('COMPLETED', { orderId: 18 })]),
    );
    renderAt('/customer/orders', '/customer/orders', <CustomerOrdersScreen />);
    expect(await screen.findByText('Đơn đang diễn ra')).toBeInTheDocument();
    const rail = screen.getByRole('list', { name: 'Tiến trình' });
    expect(within(rail).getByText('Đang chuẩn bị').closest('li')).toHaveAttribute(
      'aria-current',
      'step',
    );
  });

  it('shows no live ticket when the newest order has ended', async () => {
    ordersApi.customerOrders.mockResolvedValue(page([order('COMPLETED')]));
    renderAt('/customer/orders', '/customer/orders', <CustomerOrdersScreen />);
    await screen.findByText('Bếp Việt');
    expect(screen.queryByText('Đơn đang diễn ra')).not.toBeInTheDocument();
  });

  it('asks the server for both processing statuses on the "Đang xử lý" tab', async () => {
    ordersApi.customerOrders.mockResolvedValue(page([]));
    const user = userEvent.setup();
    renderAt('/customer/orders', '/customer/orders', <CustomerOrdersScreen />);
    await user.click(await screen.findByRole('tab', { name: 'Đang xử lý' }));
    await waitFor(() =>
      expect(ordersApi.customerOrders).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: ['ACCEPTED', 'PREPARING'], page: 1 }),
      ),
    );
  });
});

describe('C13 order detail', () => {
  it('draws the stages still to come', async () => {
    ordersApi.customerOrder.mockResolvedValue(
      order('PREPARING', {
        statusHistory: [
          { toStatus: 'PLACED', changedAt: '2026-09-18T00:30:00Z' },
          { toStatus: 'ACCEPTED', changedAt: '2026-09-18T00:31:00Z' },
          { toStatus: 'PREPARING', changedAt: '2026-09-18T00:33:00Z', note: 'Đang nướng bánh.' },
        ],
      }),
    );
    ordersApi.pickupCode.mockResolvedValue({
      orderId: 19,
      orderCode: 'SB-000019',
      orderStatus: 'PREPARING',
      storefrontName: 'Bếp Việt',
      token: 'SBO1.x',
      shortCode: '7K2M9QXP',
    });
    renderAt('/customer/orders/19', '/customer/orders/:orderId', <OrderDetailScreen />);
    const journey = await screen.findByRole('list', { name: 'Tiến trình đơn hàng' });
    expect(within(journey).getByText('Đang chuẩn bị').closest('li')).toHaveAttribute(
      'aria-current',
      'step',
    );
    expect(within(journey).getAllByText('Sắp tới')).toHaveLength(2);
    expect(within(journey).getByText('Đang nướng bánh.')).toBeInTheDocument();
  });

  it('says "ĐÃ HOÀN TIỀN" exactly once for a refunded order', async () => {
    ordersApi.customerOrder.mockResolvedValue(
      order('CANCELLED', { refundStatus: 'SUCCESS', refundAmount: 50_000 }),
    );
    renderAt('/customer/orders/19', '/customer/orders/:orderId', <OrderDetailScreen />);
    expect(await screen.findAllByText('ĐÃ HOÀN TIỀN')).toHaveLength(1);
  });
});

describe('C14 payment status', () => {
  it('keeps the lamp waiting whatever the return URL says', async () => {
    ordersApi.customerOrder.mockResolvedValue(order('PENDING_PAYMENT'));
    const view = renderAt(
      '/customer/orders/19/payment?status=success&resultCode=0',
      '/customer/orders/:orderId/payment',
      <OrderPaymentScreen />,
    );
    await screen.findByText('Đang chờ cổng thanh toán xác nhận');
    expect(view.container.querySelector('[data-state]')).toHaveAttribute('data-state', 'pending');
    expect(screen.queryByText(/Đặt món thành công/)).not.toBeInTheDocument();
  });

  it('shows a failed check as an alert and leaves the lamp where the server put it', async () => {
    ordersApi.customerOrder.mockResolvedValue(order('PENDING_PAYMENT'));
    ordersApi.syncPayment.mockRejectedValue(
      new ApiError('server_error', 503, 'Không liên lạc được MoMo.'),
    );
    const view = renderAt(
      '/customer/orders/19/payment',
      '/customer/orders/:orderId/payment',
      <OrderPaymentScreen />,
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('Không liên lạc được MoMo.');
    expect(view.container.querySelector('[data-state]')).toHaveAttribute('data-state', 'pending');
    expect(ordersApi.syncPayment).toHaveBeenCalledTimes(1);
  });
});

describe('C15 review', () => {
  it('marks only the chosen star as pressed and saves it', async () => {
    legacyApi.customerOrder.mockResolvedValue(commerceOrder('COMPLETED'));
    legacyApi.review.mockResolvedValue(null);
    legacyApi.saveReview.mockResolvedValue({ reviewId: 1, rating: 4, text: '' });
    const user = userEvent.setup();
    renderAt(
      '/customer/orders/19/review',
      '/customer/orders/:orderId/review',
      <OrderReviewScreen />,
    );
    await user.click(await screen.findByRole('button', { name: '4 sao' }));
    expect(screen.getByRole('button', { name: '4 sao' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '5 sao' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('Ngon')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Lưu đánh giá' }));
    expect(await screen.findByText('order detail destination')).toBeInTheDocument();
    expect(legacyApi.saveReview).toHaveBeenCalledWith(19, 4, '');
  });

  it('offers no form before the order is completed', async () => {
    legacyApi.customerOrder.mockResolvedValue(commerceOrder('PREPARING'));
    legacyApi.review.mockResolvedValue(null);
    renderAt(
      '/customer/orders/19/review',
      '/customer/orders/:orderId/review',
      <OrderReviewScreen />,
    );
    expect(await screen.findByText('Chỉ đánh giá đơn đã hoàn tất.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Lưu đánh giá' })).not.toBeInTheDocument();
  });
});

describe('C16 complaint', () => {
  it('replaces the slip with one "in progress" line while a case is open', async () => {
    legacyApi.customerOrder.mockResolvedValue(commerceOrder('COMPLETED'));
    legacyApi.complaints.mockResolvedValue([
      {
        complaintId: 1,
        orderId: 19,
        complaintType: 'REFUND_REQUEST',
        description: 'Thiếu một ổ bánh mì.',
        requestedRefundAmount: 5_000,
        status: 'UNDER_REVIEW',
        resolutionNotes: null,
        createdAt: '2026-09-18T02:00:00Z',
      },
    ]);
    renderAt(
      '/customer/orders/19/complaint',
      '/customer/orders/:orderId/complaint',
      <OrderComplaintScreen />,
    );
    expect(
      await screen.findAllByText('Khiếu nại đang được xử lý. Kết quả sẽ hiển thị tại đây.'),
    ).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Gửi khiếu nại' })).not.toBeInTheDocument();
  });

  it('keeps the refund amount within the order total', async () => {
    legacyApi.customerOrder.mockResolvedValue(commerceOrder('COMPLETED'));
    legacyApi.complaints.mockResolvedValue([]);
    const user = userEvent.setup();
    renderAt(
      '/customer/orders/19/complaint',
      '/customer/orders/:orderId/complaint',
      <OrderComplaintScreen />,
    );
    await user.click(await screen.findByRole('radio', { name: 'Yêu cầu hoàn tiền' }));
    await user.type(screen.getByLabelText('Mô tả chi tiết'), 'Thiếu món');
    await user.type(screen.getByLabelText('Số tiền yêu cầu hoàn (đ)'), '60000');
    expect(screen.getByText('Tối đa 50.000 đ')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gửi khiếu nại' })).toBeDisabled();
  });
});

describe('V40 vendor order detail', () => {
  it('shows a late wait for a new order and each action once', async () => {
    useAuthStore.setState((state) => ({
      ...state,
      user: state.user ? { ...state.user, role_code: 'VENDOR' } : null,
    }));
    const twelveMinutesAgo = new Date(Date.now() - 12 * 60_000).toISOString();
    ordersApi.vendorOrder.mockResolvedValue(order('PLACED', { placedAt: twelveMinutesAgo }));
    const view = renderAt(
      '/vendor/orders/19',
      '/vendor/orders/:orderId',
      <VendorOrderDetailScreen />,
    );
    expect(await screen.findAllByRole('button', { name: 'Nhận đơn' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Từ chối' })).toHaveLength(1);
    expect(view.container.querySelector('[data-tone]')).toHaveAttribute('data-tone', 'late');
    expect(ordersApi.vendorOrders).not.toHaveBeenCalled();
  });
});

describe('V41 pickup scan', () => {
  it('counts the orders handed over in this visit and lists the dishes', async () => {
    ordersApi.confirmPickupByCode.mockResolvedValue(order('COMPLETED'));
    const user = userEvent.setup();
    renderAt('/vendor/orders/scan', '/vendor/orders/scan', <VendorPickupScanScreen />);
    for (let round = 0; round < 2; round += 1) {
      await user.type(screen.getByLabelText('Mã nhận hàng'), '7K2M9QXP');
      await user.click(screen.getByRole('button', { name: 'Xác nhận giao đơn' }));
      await screen.findByText('Đã giao đơn cho khách');
      expect(screen.getByText('Bánh mì')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Quét đơn tiếp theo' }));
    }
    expect(screen.getByText(/Lượt này đã giao/)).toHaveTextContent('Lượt này đã giao 2 đơn');
  });
});
