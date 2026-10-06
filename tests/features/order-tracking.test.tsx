import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import type { CommerceCart } from '@/core/api';
import type { OrderTracking, PickupRangeInfo } from '@/features/orders/types/order.types';

const legacyApi = vi.hoisted(() => ({ cart: vi.fn() }));
const ordersApi = vi.hoisted(() => ({ checkout: vi.fn(), pickupRange: vi.fn(), announceArrival: vi.fn() }));

vi.mock('@/core/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/api')>();
  return { ...actual, commerceApi: { ...actual.commerceApi, ...legacyApi } };
});
vi.mock('@/features/orders/api/orderApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/orders/api/orderApi')>();
  return { ...actual, orderApi: { ...actual.orderApi, ...ordersApi } };
});
vi.mock('@/features/orders/payment-redirect', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/orders/payment-redirect')>()),
  redirectToPayment: vi.fn(),
}));
vi.mock('@/core/config/env', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/core/config/env')>()),
  isLiveApi: true,
}));

const { CheckoutScreen } = await import('@/features/cart/screens/CheckoutScreen');
const { OrderProgressCard } = await import('@/features/orders/tracking/OrderProgressCard');
const { OrderProgressStrip } = await import('@/features/orders/tracking/OrderProgressStrip');
const { PickupPointCard } = await import('@/features/orders/tracking/PickupPointCard');
const { VendorOrderTicket } = await import('@/features/orders/components/VendorOrderTicket');
const { useAuthStore } = await import('@/store/auth-store');

// ---------------------------------------------------------------------------------------------
// ORD-02: the progress card

const tracking = (patch: Partial<OrderTracking> = {}): OrderTracking => ({
  orderId: 6,
  orderStatus: 'PREPARING',
  pickupPoint: { storefrontId: 7, storefrontName: 'Bún chả', address: null, latitude: 16.06, longitude: 108.214 },
  readyEstimate: {
    lowMinutes: 10,
    typicalMinutes: 12,
    highMinutes: 14,
    basis: 'HISTORY',
    sampleSize: 12,
    // 10:12 and 10:16 in Đà Nẵng (UTC+7).
    earliestReadyAt: '2026-10-02T03:12:00.000Z',
    latestReadyAt: '2026-10-02T03:16:00.000Z',
    isLate: false,
  },
  ordersAhead: 2,
  readyAt: null,
  ...patch,
});

const history = [
  { toStatus: 'PLACED' as const, changedAt: '2026-10-02T03:00:00Z' },
  { toStatus: 'ACCEPTED' as const, changedAt: '2026-10-02T03:02:00Z' },
  { toStatus: 'PREPARING' as const, changedAt: '2026-10-02T03:03:00Z' },
];

describe('order progress card (ORD-02)', () => {
  afterEach(() => vi.useRealTimers());

  it('says where the order is, when it should be ready and how many are ahead', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-02T03:05:00Z'));

    render(<OrderProgressCard status="PREPARING" history={history} tracking={tracking()} />);

    expect(screen.getByText('Quán đang chuẩn bị món của bạn')).toBeInTheDocument();
    expect(screen.getByText('Dự kiến sẵn sàng 10:12 – 10:16')).toBeInTheDocument();
    expect(screen.getByText('2 đơn đang làm trước bạn · Theo 12 đơn gần đây của quán')).toBeInTheDocument();
    const steps = within(screen.getByRole('list', { name: 'Tiến trình đơn hàng' })).getAllByRole('listitem');
    expect(steps).toHaveLength(5);
    expect(steps[2]).toHaveAttribute('aria-current', 'step');
    expect(steps[1]).toHaveTextContent('10:02');
  });

  it('turns a passed window into "almost done" instead of a negative wait', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-02T03:30:00Z'));

    render(<OrderProgressCard status="PREPARING" history={history} tracking={tracking()} />);

    expect(screen.getByText('Đã qua giờ dự kiến một chút, quán đang hoàn tất món')).toBeInTheDocument();
  });

  it('before acceptance gives the usual duration and says when it is only a general estimate', () => {
    const placed = tracking({
      orderStatus: 'PLACED',
      ordersAhead: 0,
      readyEstimate: {
        lowMinutes: 10,
        typicalMinutes: 15,
        highMinutes: 20,
        basis: 'DEFAULT',
        sampleSize: 1,
        earliestReadyAt: null,
        latestReadyAt: null,
        isLate: false,
      },
    });

    render(<OrderProgressCard status="PLACED" history={history.slice(0, 1)} tracking={placed} />);

    expect(screen.getByText('Quán thường làm xong trong 10–20 phút sau khi nhận đơn')).toBeInTheDocument();
    expect(screen.getByText('Ước tính chung, quán chưa đủ dữ liệu riêng')).toBeInTheDocument();
  });

  it('tells a ready customer what to do, not when', () => {
    render(
      <OrderProgressCard
        status="READY_FOR_PICKUP"
        history={history}
        tracking={tracking({ orderStatus: 'READY_FOR_PICKUP', readyEstimate: null, readyAt: '2026-10-02T03:14:00Z' })}
      />,
    );

    expect(screen.getByText('Món đã sẵn sàng, mời bạn đến quầy lấy')).toBeInTheDocument();
    expect(screen.getByText('Sẵn sàng từ 10:14 · Đưa mã nhận món cho quán')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------------------------
// ORD-01: the checkout's live pickup-range check

const STALL = { latitude: 16.06, longitude: 108.214 };
const range: PickupRangeInfo = {
  pickupPoint: { storefrontId: 7, storefrontName: 'Bún chả', address: '12 Bạch Đằng', ...STALL },
  enforced: true,
  radiusMeters: 2000,
  accuracyAllowanceMeters: 150,
  maxAccuracyMeters: 1000,
};
const cart: CommerceCart = {
  cartId: 3,
  storefrontId: 7,
  storefrontName: 'Bún chả',
  storefrontAddress: '12 Bạch Đằng',
  storefrontStatus: 'OPEN',
  subtotal: 45_000,
  items: [
    {
      cartItemId: 5,
      menuItemId: 11,
      itemName: 'Bún chả',
      imageUrl: null,
      unitPrice: 45_000,
      availabilityStatus: 'AVAILABLE',
      quantity: 1,
      note: null,
    },
  ],
};

/** Puts the phone `meters` north of the stall, or makes the browser refuse permission. */
function stubGeolocation(position: { meters: number; accuracy?: number } | 'denied') {
  vi.stubGlobal('navigator', {
    ...navigator,
    geolocation: {
      watchPosition: (
        onFix: (p: { coords: { latitude: number; longitude: number; accuracy: number } }) => void,
        onError: (e: { code: number }) => void,
      ) => {
        if (position === 'denied') onError({ code: 1 });
        else
          onFix({
            coords: {
              latitude: STALL.latitude + position.meters / 111_195,
              longitude: STALL.longitude,
              accuracy: position.accuracy ?? 12,
            },
          });
        return 1;
      },
      clearWatch: vi.fn(),
    },
  });
}

function renderCheckout() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrap = (node: ReactNode) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/customer/checkout']}>
        <Routes>
          <Route path="/customer/checkout" element={node} />
          <Route path="/customer/orders/:id/payment" element={<p>payment screen</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
  return render(wrap(<CheckoutScreen />));
}

const payButton = () => screen.findByRole('button', { name: 'Thanh toán và đặt món' });

describe('checkout pickup range (ORD-01)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    legacyApi.cart.mockResolvedValue(cart);
    ordersApi.pickupRange.mockResolvedValue(range);
    vi.stubGlobal('crypto', { randomUUID: () => 'uuid-1' });
    useAuthStore.setState({
      user: {
        id: '9',
        fullName: 'Khách',
        phone: '0905000201',
        password: '',
        role_code: 'CUSTOMER',
        account_status: 'ACTIVE',
      },
      sessionExpired: false,
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('lets a nearby customer order and sends the position it judged', async () => {
    stubGeolocation({ meters: 800 });
    ordersApi.checkout.mockResolvedValue({
      orderId: 6,
      orderCode: 'SB-6',
      orderStatus: 'PENDING_PAYMENT',
      paymentTransactionId: 9,
      provider: 'MOMO',
      amount: 45_000,
      paymentUrl: 'streetbiz://payment/sandbox/momo?referenceId=6&transactionId=9',
    });
    renderCheckout();

    expect(await screen.findByText(/Bạn cách quán 8\d\d m/)).toBeInTheDocument();
    const button = await payButton();
    await waitFor(() => expect(button).toBeEnabled());
    await userEvent.click(button);

    expect(ordersApi.checkout).toHaveBeenCalledWith(
      expect.objectContaining({
        cartId: 3,
        location: expect.objectContaining({ accuracyMeters: 12 }),
      }),
      'uuid-1',
    );
    expect(await screen.findByText('payment screen')).toBeInTheDocument();
  });

  it('blocks a customer too far away, says how far, and offers directions', async () => {
    stubGeolocation({ meters: 3400 });
    renderCheckout();

    expect(await screen.findByText('Bạn đang cách quán 3,4 km')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Chỉ đường đến quán/ })).toHaveAttribute(
      'href',
      expect.stringContaining('destination=16.06,108.214'),
    );
    expect(await payButton()).toBeDisabled();
  });

  it('explains why location is needed when the browser refuses it', async () => {
    stubGeolocation('denied');
    renderCheckout();

    expect(await screen.findByText('Cần quyền vị trí để đặt món')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
    expect(await payButton()).toBeDisabled();
    expect(ordersApi.checkout).not.toHaveBeenCalled();
  });

  it('does not decide on a position that is kilometres vague', async () => {
    stubGeolocation({ meters: 100, accuracy: 3000 });
    renderCheckout();

    expect(await screen.findByText('Vị trí chưa đủ chính xác (sai số 3 km)')).toBeInTheDocument();
    expect(await payButton()).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------------------------
// ORD-02: "Tôi đang đến", and progress on the order list

describe('arrival notice and list progress (ORD-02)', () => {
  beforeEach(() => vi.resetAllMocks());
  afterEach(() => vi.unstubAllGlobals());

  const storefront = { storefrontId: 7, storefrontName: 'Bún chả', imageUrl: null, address: '12 Bạch Đằng' };
  const point = { storefrontId: 7, storefrontName: 'Bún chả', address: '12 Bạch Đằng', ...STALL };

  function renderCard(arrivalNotifiedAt: string | null = null) {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <QueryClientProvider client={queryClient}>
        <PickupPointCard storefront={storefront} point={point} active orderId={6} arrivalNotifiedAt={arrivalNotifiedAt} />
      </QueryClientProvider>,
    );
  }

  it('tells the stall the customer is on the way, with the walking time when distance is known', async () => {
    // Location was allowed before, so the card follows the customer without asking.
    vi.stubGlobal('navigator', {
      ...navigator,
      permissions: { query: () => Promise.resolve({ state: 'granted', addEventListener: vi.fn(), removeEventListener: vi.fn() }) },
      geolocation: {
        watchPosition: (onFix: (p: { coords: { latitude: number; longitude: number; accuracy: number } }) => void) => {
          onFix({ coords: { latitude: STALL.latitude + 600 / 111_195, longitude: STALL.longitude, accuracy: 10 } });
          return 1;
        },
        clearWatch: vi.fn(),
      },
    });
    ordersApi.announceArrival.mockResolvedValue({
      orderId: 6,
      orderStatus: 'PREPARING',
      notifiedAt: '2026-10-02T04:00:00.000Z',
      alreadySent: false,
    });
    renderCard();

    expect(await screen.findByText(/Cách bạn 600\sm · khoảng 8 phút đi bộ/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Tôi đang đến' }));

    expect(ordersApi.announceArrival).toHaveBeenCalledWith(6, 8);
    expect(await screen.findByText('Đã báo quán bạn đang đến lúc 11:00')).toBeInTheDocument();
  });

  it('shows when the stall was already told instead of offering to tell it again', () => {
    vi.stubGlobal('navigator', { ...navigator, permissions: undefined });
    renderCard(new Date(Date.now() - 30_000).toISOString());

    expect(screen.getByText(/Đã báo quán bạn đang đến lúc/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tôi đang đến' })).not.toBeInTheDocument();
    // Within the server's 2-minute window there is nothing to resend.
    expect(screen.queryByRole('button', { name: 'Báo lại' })).not.toBeInTheDocument();
  });

  it('the seller sees who is on the way on the ticket', () => {
    render(
      <VendorOrderTicket
        order={{
          orderId: 6,
          orderCode: 'SB-6',
          customerName: 'Khách',
          orderStatus: 'PREPARING',
          storefront,
          items: [],
          subtotalAmount: 45_000,
          totalAmount: 45_000,
          createdAt: '2026-10-02T03:50:00Z',
          placedAt: '2026-10-02T03:50:00Z',
          statusHistory: [],
        }}
        tone="turmeric"
        live
        now={Date.parse('2026-10-02T04:01:00Z')}
        arrival={{ orderId: 6, orderCode: 'SB-6', notifiedAt: '2026-10-02T04:00:00Z', message: 'Khoảng 8 phút nữa khách tới quầy.' }}
      />,
    );

    expect(screen.getByText('Khách đang đến')).toBeInTheDocument();
    expect(screen.getByText(/báo lúc 11:00\. Khoảng 8 phút nữa khách tới quầy\./)).toBeInTheDocument();
  });

  it('an order in progress shows how far along it is on the list; a finished one does not', () => {
    const { rerender } = render(<OrderProgressStrip status="PREPARING" history={[]} />);
    expect(screen.getByRole('img', { name: 'Quán đang chuẩn bị món của bạn (bước 3/5)' })).toBeInTheDocument();

    rerender(<OrderProgressStrip status="COMPLETED" history={[]} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
