import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import { ApiError } from '@/core/api/problem';
import type { Order, OrderStatus } from '@/features/orders/types/order.types';

const orderApi = vi.hoisted(() => ({
  pickupCode: vi.fn(),
  scanPickup: vi.fn(),
  confirmPickupByCode: vi.fn(),
  vendorOrder: vi.fn(),
  handoverWithoutCode: vi.fn(),
}));

vi.mock('@/features/orders/api/orderApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/orders/api/orderApi')>();
  return { ...actual, orderApi: { ...actual.orderApi, ...orderApi } };
});
// jsdom has no camera, so the scanner is stubbed down to the one thing the
// screen cares about: it reports a decoded code.
vi.mock('@/features/orders/components/QrScanner', () => ({
  QrScanner: ({ onDetected, paused }: { onDetected: (v: string) => void; paused?: boolean }) => (
    <button
      type="button"
      disabled={paused}
      onClick={() => onDetected('SBO1.DwAAAAAAAAAHAAAAAAAAAA.abcdef0123456789')}
    >
      stub-detect
    </button>
  ),
}));
vi.mock('@/features/orders/components/qr-scan-support', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/orders/components/qr-scan-support')>();
  return { ...actual, isCameraScanSupported: () => true };
});
vi.mock('@/core/config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/config/env')>();
  return { ...actual, isLiveApi: true };
});

const { OrderPickupQr } = await import('@/features/orders/components/OrderPickupQr');
const { VendorPickupScanScreen } = await import(
  '@/features/orders/screens/VendorPickupScanScreen'
);
const { VendorOrderDetailScreen } = await import(
  '@/features/orders/screens/VendorOrderDetailScreen'
);

const order = (orderStatus: OrderStatus = 'READY_FOR_PICKUP'): Order => ({
  orderId: 15,
  orderCode: 'SB-000015',
  customerUserId: 7,
  customerName: 'Nguyễn Khách Hàng',
  orderStatus,
  storefront: { storefrontId: 9, storefrontName: 'Bánh mì & Xôi Cô Lan', imageUrl: null },
  subtotalAmount: 50_000,
  totalAmount: 50_000,
  paymentProvider: 'MOMO',
  paymentStatus: 'SUCCESS',
  rejectionReason: null,
  refundAmount: null,
  refundReason: null,
  refundStatus: null,
  placedAt: '2026-09-29T03:00:00Z',
  completedAt: null,
  createdAt: '2026-09-29T02:55:00Z',
  items: [],
  statusHistory: [],
});

const pickupCode = {
  orderId: 15,
  orderCode: 'SB-000015',
  orderStatus: 'READY_FOR_PICKUP' as OrderStatus,
  storefrontName: 'Bánh mì & Xôi Cô Lan',
  token: 'SBO1.DwAAAAAAAAAHAAAAAAAAAA.abcdef0123456789',
  shortCode: '7K2M9QXP',
};

function renderWithClient(element: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/vendor/orders/scan']}>
        <Routes>
          <Route path="/vendor/orders/scan" element={element} />
          <Route path="/vendor/orders/:orderId" element={<div>order detail</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function renderVendorOrder() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/vendor/orders/15']}>
        <Routes>
          <Route path="/vendor/orders/:orderId" element={<VendorOrderDetailScreen />} />
          <Route path="/vendor/orders/scan" element={<div>scanner</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('order pickup code', () => {
  beforeEach(() => vi.resetAllMocks());

  it('shows the buyer a code once the order is paid', async () => {
    orderApi.pickupCode.mockResolvedValue(pickupCode);
    renderWithClient(<OrderPickupQr order={order('PLACED')} />);
    expect(await screen.findByText('Mã nhận hàng')).toBeInTheDocument();
    // The order code renders across sibling expressions, so match on the line,
    // and wait: it only appears once the code request resolves.
    expect(
      await screen.findByText((_, element) => element?.textContent?.trim() === 'Đơn SB-000015'),
    ).toBeTruthy();
  });

  it.each<OrderStatus>(['PENDING_PAYMENT', 'COMPLETED', 'CANCELLED', 'REJECTED'])(
    'shows no code for a %s order',
    async (status) => {
      renderWithClient(<OrderPickupQr order={order(status)} />);
      // Nothing to collect, so the code is never even requested.
      expect(screen.queryByText('Mã nhận hàng')).not.toBeInTheDocument();
      await waitFor(() => expect(orderApi.pickupCode).not.toHaveBeenCalled());
    },
  );
});

describe('seller scanning a pickup code', () => {
  beforeEach(() => vi.resetAllMocks());

  it('hands the order over and reports what was handed over', async () => {
    orderApi.confirmPickupByCode.mockResolvedValue(order('COMPLETED'));
    const user = userEvent.setup();
    renderWithClient(<VendorPickupScanScreen />);

    await user.type(screen.getByLabelText('Mã nhận hàng'), pickupCode.shortCode);
    await user.click(screen.getByRole('button', { name: 'Xác nhận giao đơn' }));

    expect(await screen.findByText('Đã giao đơn cho khách')).toBeInTheDocument();
    expect(screen.getByText('Nguyễn Khách Hàng')).toBeInTheDocument();
    // The typed path goes to the short-code endpoint, not the QR one.
    expect(orderApi.confirmPickupByCode).toHaveBeenCalledWith(pickupCode.shortCode);
    expect(orderApi.scanPickup).not.toHaveBeenCalled();
  });

  it('surfaces the reason a code was refused', async () => {
    orderApi.confirmPickupByCode.mockRejectedValue(
      new ApiError('domain_rule', 422, 'Đơn này thuộc gian hàng khác.'),
    );
    const user = userEvent.setup();
    renderWithClient(<VendorPickupScanScreen />);

    await user.type(screen.getByLabelText('Mã nhận hàng'), 'ZZZZZZZZ');
    await user.click(screen.getByRole('button', { name: 'Xác nhận giao đơn' }));

    expect(await screen.findByText('Đơn này thuộc gian hàng khác.')).toBeInTheDocument();
    expect(screen.queryByText('Đã giao đơn cho khách')).not.toBeInTheDocument();
  });

  // A seller holding a phone up to the camera is looking at the camera. At the
  // foot of the page the refusal was off-screen, and nothing seemed to happen.
  it('shows a scan refusal right under the camera, with a way to scan again', async () => {
    orderApi.scanPickup.mockRejectedValue(
      new ApiError('domain_rule', 422, 'Đơn đang chuẩn bị. Hãy bấm "Sẵn sàng lấy món" trước khi giao cho khách.'),
    );
    const user = userEvent.setup();
    renderWithClient(<VendorPickupScanScreen />);

    await user.click(await screen.findByRole('button', { name: 'stub-detect' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Sẵn sàng lấy món');
    const typedSection = screen.getByText('Cách 2 · Camera hỏng thì nhập mã');
    expect(alert.compareDocumentPosition(typedSection) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
  });

  it('shows a typed-code refusal under the code field it is about', async () => {
    orderApi.confirmPickupByCode.mockRejectedValue(
      new ApiError('domain_rule', 422, 'Mã nhận hàng gồm 8 ký tự. Kiểm tra lại mã vừa nhập.'),
    );
    const user = userEvent.setup();
    renderWithClient(<VendorPickupScanScreen />);

    await user.type(screen.getByLabelText('Mã nhận hàng'), 'ABC');
    await user.click(screen.getByRole('button', { name: 'Xác nhận giao đơn' }));

    const alert = await screen.findByRole('alert');
    const confirm = screen.getByRole('button', { name: 'Xác nhận giao đơn' });
    expect(confirm.compareDocumentPosition(alert) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(alert.compareDocumentPosition(screen.getByText(/Khách không có mã \(hết pin/))
      & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // Nothing to rescan: the seller corrects the field and presses again.
    expect(screen.queryByRole('button', { name: 'Thử lại' })).not.toBeInTheDocument();
  });

  it('will not submit an empty code', async () => {
    renderWithClient(<VendorPickupScanScreen />);
    expect(screen.getByRole('button', { name: 'Xác nhận giao đơn' })).toBeDisabled();
    expect(orderApi.confirmPickupByCode).not.toHaveBeenCalled();
  });

  it('sends a scanned QR down the scan path, not the typed one', async () => {
    orderApi.scanPickup.mockResolvedValue(order('COMPLETED'));
    const user = userEvent.setup();
    renderWithClient(<VendorPickupScanScreen />);

    // The stubbed scanner exposes a button that reports a code, standing in for
    // the camera finding one.
    await user.click(await screen.findByRole('button', { name: 'stub-detect' }));

    expect(await screen.findByText('Đã giao đơn cho khách')).toBeInTheDocument();
    expect(orderApi.scanPickup).toHaveBeenCalledWith(pickupCode.token);
    expect(orderApi.confirmPickupByCode).not.toHaveBeenCalled();
  });

  it('lets the seller scan the next order', async () => {
    orderApi.confirmPickupByCode.mockResolvedValue(order('COMPLETED'));
    const user = userEvent.setup();
    renderWithClient(<VendorPickupScanScreen />);

    await user.type(screen.getByLabelText('Mã nhận hàng'), pickupCode.shortCode);
    await user.click(screen.getByRole('button', { name: 'Xác nhận giao đơn' }));
    await user.click(await screen.findByRole('button', { name: 'Quét đơn tiếp theo' }));

    expect(screen.queryByText('Đã giao đơn cho khách')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Mã nhận hàng')).toHaveValue('');
  });
});

describe('handing an order over with no code', () => {
  beforeEach(() => vi.resetAllMocks());

  const openDialog = async () => {
    orderApi.vendorOrder.mockResolvedValue(order('READY_FOR_PICKUP'));
    const user = userEvent.setup();
    renderVendorOrder();
    await user.click(await screen.findByRole('button', { name: 'Khách không có mã' }));
    return user;
  };

  it('will not hand over until a reason is written', async () => {
    const user = await openDialog();

    expect(
      await screen.findByRole('button', { name: 'Xác nhận đã giao đơn' }),
    ).toBeDisabled();
    // A scribble is not a reason - the buyer reads whatever is written here.
    await user.type(screen.getByLabelText('Lý do giao đơn không có mã'), 'x');
    expect(screen.getByRole('button', { name: 'Xác nhận đã giao đơn' })).toBeDisabled();
    expect(orderApi.handoverWithoutCode).not.toHaveBeenCalled();
  });

  it('sends the written reason with the handover', async () => {
    const user = await openDialog();
    orderApi.handoverWithoutCode.mockResolvedValue(order('COMPLETED'));

    await user.type(
      await screen.findByLabelText('Lý do giao đơn không có mã'),
      'Khách hết pin điện thoại',
    );
    await user.click(screen.getByRole('button', { name: 'Xác nhận đã giao đơn' }));

    await waitFor(() =>
      expect(orderApi.handoverWithoutCode).toHaveBeenCalledWith(15, 'Khách hết pin điện thoại'),
    );
  });

  it('tells the seller the reason will be on the order', async () => {
    await openDialog();

    expect(await screen.findByText(/lưu vào lịch sử đơn/)).toBeInTheDocument();
  });

  it('offers no way around the code before the order is ready', async () => {
    orderApi.vendorOrder.mockResolvedValue(order('PREPARING'));
    renderVendorOrder();

    // Skipping the code is for a buyer standing at the stall, not for closing
    // an order that was never prepared.
    expect(await screen.findByRole('button', { name: 'Sẵn sàng lấy món' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Khách không có mã' })).not.toBeInTheDocument();
  });

  it('surfaces a refusal instead of claiming the order was handed over', async () => {
    const user = await openDialog();
    orderApi.handoverWithoutCode.mockRejectedValue(
      new ApiError('domain_rule', 422, 'Đơn này đã giao cho khách rồi.'),
    );

    await user.type(
      await screen.findByLabelText('Lý do giao đơn không có mã'),
      'Khách hết pin điện thoại',
    );
    await user.click(screen.getByRole('button', { name: 'Xác nhận đã giao đơn' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Đơn này đã giao cho khách rồi.');
  });
});
