import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  sellerStoreApi,
  type SellerMenuItem,
  type SellerPriceBoard,
} from '@/core/api/seller-store-api';
import { sideApi } from '@/core/api/side-api';
import { PriceHistoryPanel } from '@/features/storefronts/components/menu/PriceBoardParts';
import { LiveMenuScreen } from '@/features/storefronts/screens/LiveMenuScreen';
import {
  notificationTarget,
  notificationVisual,
} from '@/features/notifications/notification-routing';
import type { NotificationItem } from '@/features/notifications/notifications-api';

vi.mock('@/core/config/env', () => ({
  env: { apiBaseUrl: 'https://api.example.test/api', useMockApi: false, appEnv: 'test' },
  isDev: true,
  isLiveApi: true,
}));

// The QR's text is what matters here, not its drawing.
vi.mock('@/components/common/QrCode', () => ({
  QrCode: ({ value }: { value: string }) => <div data-testid="qr-code" data-value={value} />,
}));

const { DigitalPermitScreen } =
  await import('@/features/rental-contracts/screens/DigitalPermitScreen');

const dish = (menuItemId: number, extra: Partial<SellerMenuItem> = {}): SellerMenuItem => ({
  menuItemId,
  storefrontId: 1,
  categoryId: 4,
  name: `Món ${menuItemId}`,
  description: null,
  unitPrice: 25000,
  availabilityStatus: 'AVAILABLE',
  imageUrl: '/api/uploads/menu-images/5/0123456789abcdef0123456789abcdef.jpg',
  categoryName: 'Đồ uống',
  requiresFoodSafety: false,
  foodSafetyStatus: 'NOT_REQUIRED',
  foodSafetyExpiresOn: null,
  nameEn: null,
  priceUnit: 'ly',
  ...extra,
});

const board = (extra: Partial<SellerPriceBoard> = {}): SellerPriceBoard => ({
  storefrontId: 1,
  storefrontName: 'Quán Cô Lan',
  slotCode: 'NVL-022',
  version: 3,
  updatedAt: '2026-10-22T01:15:00Z',
  qrUrl: 'http://192.168.1.5:5173/q/SBP1.a.b?v=3',
  printUrl: 'http://192.168.1.5:5173/q/SBP1.a.b/print',
  items: [],
  boards: [],
  history: [
    {
      priceHistoryId: 3,
      menuItemId: 7,
      name: 'Cà phê sữa',
      nameEn: 'Iced milk coffee',
      priceUnit: 'ly',
      unitPrice: 20000,
      previousUnitPrice: 18000,
      isListed: true,
      changeKind: 'UPDATED',
      changedAt: '2026-10-22T01:15:00Z',
      changedByName: 'Trần Thị Lan',
    },
    {
      priceHistoryId: 1,
      menuItemId: 7,
      name: 'Cà phê sữa',
      nameEn: null,
      priceUnit: 'ly',
      unitPrice: 18000,
      previousUnitPrice: null,
      isListed: true,
      changeKind: 'CREATED',
      changedAt: '2026-10-01T00:00:00Z',
      changedByName: 'Trần Thị Lan',
    },
  ],
  ...extra,
});

function mount(path: string, route: string, element: ReactNode) {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={route} element={element} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function stubMenu(items: SellerMenuItem[], priceBoard: SellerPriceBoard = board()) {
  vi.spyOn(sellerStoreApi, 'stores').mockResolvedValue([
    {
      storefrontId: 1,
      registrationId: 1,
      contractId: 5,
      name: 'Quán Cô Lan',
      description: null,
      availabilityStatus: 'OPEN',
    },
  ]);
  vi.spyOn(sellerStoreApi, 'categories').mockResolvedValue([
    { categoryId: 4, name: 'Đồ uống', requiresFoodSafety: false },
  ]);
  vi.spyOn(sellerStoreApi, 'menu').mockResolvedValue({ items, maxItems: 5 });
  vi.spyOn(sellerStoreApi, 'priceBoard').mockResolvedValue(priceBoard);
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('price history panel (BUY-06)', () => {
  it('lists each change with the old → new price, its unit, when and who', () => {
    render(<PriceHistoryPanel history={board().history} />);

    const list = screen.getByRole('list', { name: 'Các lần đổi giá' });
    const rows = within(list).getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(within(rows[0]!).getByText('18.000 đ')).toHaveClass('line-through');
    expect(within(rows[0]!).getByText('20.000 đ')).toBeInTheDocument();
    expect(
      within(rows[0]!).getByText(/Sửa món · 08:15 22\/10\/2026 · Trần Thị Lan/),
    ).toBeInTheDocument();
    expect(within(rows[0]!).getByText(/Iced milk coffee/)).toBeInTheDocument();
    expect(within(rows[1]!).getByText(/Thêm món/)).toBeInTheDocument();
  });

  it('shows the first eight changes and the rest on request', async () => {
    const many = Array.from({ length: 11 }, (_, i) => ({
      ...board().history[1]!,
      priceHistoryId: i + 1,
      name: `Món ${i + 1}`,
    }));
    const user = userEvent.setup();
    render(<PriceHistoryPanel history={many} />);

    expect(screen.getAllByRole('listitem')).toHaveLength(8);
    await user.click(screen.getByRole('button', { name: /Xem tất cả 11 thay đổi/ }));
    expect(screen.getAllByRole('listitem')).toHaveLength(11);
  });

  it('says so when nothing has changed yet', () => {
    render(<PriceHistoryPanel history={[]} />);
    expect(screen.getByText('Chưa có thay đổi nào.')).toBeInTheDocument();
  });
});

describe('vendor menu with units, English names and the price board', () => {
  it('needs a unit, sends it with the English name, and shows prices per unit', async () => {
    stubMenu([dish(1, { nameEn: 'Iced coffee' })]);
    const save = vi.spyOn(sellerStoreApi, 'saveItem').mockResolvedValue(dish(1));
    const user = userEvent.setup();
    mount('/vendor/store/menu', '/vendor/store/menu', <LiveMenuScreen />);

    expect(await screen.findByText('25.000 đ / ly')).toBeInTheDocument();
    expect(screen.getByText('Iced coffee')).toBeInTheDocument();
    expect(await screen.findByText(/Bảng giá bản số 3/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sửa món' }));
    expect(screen.getByLabelText('Đơn vị tính *')).toHaveValue('ly');
    fireEvent.change(screen.getByLabelText('Đơn vị tính *'), { target: { value: '' } });
    expect(screen.getByRole('button', { name: 'Lưu thay đổi' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'tô' }));
    fireEvent.change(screen.getByLabelText('Tên tiếng Anh (không bắt buộc)'), {
      target: { value: '  Beef noodle soup ' },
    });
    await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));

    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save.mock.calls[0]![2]).toMatchObject({ priceUnit: 'tô', nameEn: 'Beef noodle soup' });
  });

  it('keeps the unit and English name when a dish is marked sold out', async () => {
    stubMenu([dish(1, { nameEn: 'Iced coffee' })]);
    const save = vi.spyOn(sellerStoreApi, 'saveItem').mockResolvedValue(dish(1));
    const user = userEvent.setup();
    mount('/vendor/store/menu', '/vendor/store/menu', <LiveMenuScreen />);

    await user.click(await screen.findByRole('button', { name: /Đánh dấu hết món/ }));

    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save.mock.calls[0]![2]).toMatchObject({
      availabilityStatus: 'SOLD_OUT',
      priceUnit: 'ly',
      nameEn: 'Iced coffee',
    });
  });

  it('opens the server print link in a new tab', async () => {
    stubMenu([dish(1)]);
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const user = userEvent.setup();
    mount('/vendor/store/menu', '/vendor/store/menu', <LiveMenuScreen />);

    await user.click(await screen.findByRole('button', { name: 'In bảng giá' }));

    expect(open).toHaveBeenCalledWith(
      'http://192.168.1.5:5173/q/SBP1.a.b/print',
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('a business with two slots prints one board per slot, each with its own QR page', async () => {
    stubMenu(
      [dish(1)],
      board({
        boards: [
          { permitId: 1, contractId: 5, slotCode: 'NVL-022', qrUrl: 'http://h/q/SBP1.a.b?v=3', printUrl: 'http://h/q/SBP1.a.b/print' },
          { permitId: 4, contractId: 9, slotCode: 'NVL-003', qrUrl: 'http://h/q/SBP1.c.d?v=3', printUrl: 'http://h/q/SBP1.c.d/print' },
        ],
      }),
    );
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const user = userEvent.setup();
    mount('/vendor/store/menu', '/vendor/store/menu', <LiveMenuScreen />);

    await user.click(await screen.findByRole('button', { name: 'In bảng ô NVL-003' }));

    expect(screen.getByRole('button', { name: 'In bảng ô NVL-022' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'In bảng giá' })).not.toBeInTheDocument();
    expect(open).toHaveBeenCalledWith('http://h/q/SBP1.c.d/print', '_blank', 'noopener,noreferrer');
  });

  it("without a server print link, prints this site's page from the permit's own token", async () => {
    stubMenu([dish(1)], board({ qrUrl: null, printUrl: null }));
    vi.spyOn(sideApi, 'getPermit').mockResolvedValue({
      permitId: 9,
      contractId: 5,
      qrPayload: 'SBP1.token.sig',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      permitStatus: 'ACTIVE',
      contractStatus: 'ACTIVE',
      effectiveStatus: 'VALID',
      qrUrl: null,
    });
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const user = userEvent.setup();
    mount('/vendor/store/menu', '/vendor/store/menu', <LiveMenuScreen />);

    const print = await screen.findByRole('button', { name: 'In bảng giá' });
    await waitFor(() => expect(print).toBeEnabled());
    await user.click(print);

    expect(sideApi.getPermit).toHaveBeenCalledWith(5);
    expect(open).toHaveBeenCalledWith('/q/SBP1.token.sig/print', '_blank', 'noopener,noreferrer');
  });
});

describe('digital permit QR', () => {
  const permit = (qrUrl: string | null) => ({
    permitId: 9,
    contractId: 5,
    qrPayload: 'SBP1.token.sig',
    startDate: '2026-09-01',
    endDate: '2099-12-01',
    permitStatus: 'ACTIVE',
    contractStatus: 'ACTIVE',
    effectiveStatus: 'VALID',
    qrUrl,
  });

  it('draws the /q/ link when the server sends one, and the bare token otherwise', async () => {
    vi.spyOn(sideApi, 'getContract').mockResolvedValue({
      slotCode: 'NVL-14',
      zoneName: 'Khu A',
    } as never);
    vi.spyOn(sideApi, 'getPermit').mockResolvedValue(
      permit('http://192.168.1.5:5173/q/SBP1.token.sig'),
    );
    mount(
      '/vendor/slots/contracts/5/permit',
      '/vendor/slots/contracts/:id/permit',
      <DigitalPermitScreen />,
    );

    expect(await screen.findByTestId('qr-code')).toHaveAttribute(
      'data-value',
      'http://192.168.1.5:5173/q/SBP1.token.sig',
    );
    // The token stays printed under the QR for typing in by hand.
    expect(screen.getByText('SBP1.token.sig')).toBeInTheDocument();
    cleanup();

    vi.spyOn(sideApi, 'getPermit').mockResolvedValue(permit(null));
    mount(
      '/vendor/slots/contracts/5/permit',
      '/vendor/slots/contracts/:id/permit',
      <DigitalPermitScreen />,
    );
    expect(await screen.findByTestId('qr-code')).toHaveAttribute('data-value', 'SBP1.token.sig');
  });
});

describe('vendor report notifications', () => {
  const note = (
    type: string,
    entityType: string | null,
    entityId: number | null,
  ): NotificationItem => ({
    id: 1,
    type,
    title: 't',
    body: 'b',
    entityType,
    entityId,
    read: false,
    sentAt: '2026-10-22T00:00:00Z',
  });

  it('opens the report for the ward, "Phản ánh của tôi" for the reporter and the menu for the vendor', () => {
    expect(
      notificationTarget(note('VENDOR_REPORT_NEW', 'VendorReport', 10), 'WARD_AUTHORITY'),
    ).toBe('/ward/inbox/vendor-reports/10');
    expect(notificationTarget(note('VENDOR_REPORT_NEW', null, null), 'WARD_AUTHORITY')).toBe(
      '/ward/inbox/vendor-reports',
    );
    expect(notificationTarget(note('VENDOR_REPORT_RESOLVED', 'VendorReport', 10), 'CUSTOMER')).toBe(
      '/customer/reports?report=10',
    );
    expect(
      notificationTarget(note('VENDOR_REPORT_AGAINST_YOU', 'VendorReport', 10), 'VENDOR'),
    ).toBe('/vendor/store/menu');
    expect(notificationTarget(note('VENDOR_REPORT_RESOLVED', 'VendorReport', 10), 'VENDOR')).toBe(
      '/vendor/store/menu',
    );
    // Never into a screen the role cannot open.
    expect(
      notificationTarget(note('VENDOR_REPORT_NEW', 'VendorReport', 10), 'PLATFORM_ADMIN'),
    ).toBeNull();
  });

  it('marks a new report as needing attention and a closed one as done', () => {
    expect(notificationVisual(note('VENDOR_REPORT_NEW', null, null)).tone).toBe('warning');
    expect(notificationVisual(note('VENDOR_REPORT_AGAINST_YOU', null, null)).tone).toBe('warning');
    expect(notificationVisual(note('VENDOR_REPORT_RESOLVED', null, null)).tone).toBe('success');
  });
});
