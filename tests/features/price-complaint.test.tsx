import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { MyVendorReport, PermitVerification } from '@/features/vendor-map/community-api';

const community = vi.hoisted(() => ({
  profile: vi.fn(),
  verifyPermit: vi.fn(),
  report: vi.fn(),
  uploadEvidence: vi.fn(),
  myReports: vi.fn(),
  login: vi.fn(),
}));

vi.mock('@/features/vendor-map/community-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/vendor-map/community-api')>();
  return { ...actual, communityApi: { ...actual.communityApi, ...community } };
});

const { checkOvercharge, purchaseTimeProblem, purchaseWindow, toVnLocalInput, vnLocalInputToIso } =
  await import('@/features/vendor-reports/complaint-math');
const { VendorReportFormScreen } =
  await import('@/features/vendor-reports/screens/VendorReportFormScreen');
const { MyReportsScreen } = await import('@/features/vendor-reports/screens/MyReportsScreen');
const { CommunityApiError, useCommunitySession } =
  await import('@/features/vendor-map/community-api');
const { useAuthStore } = await import('@/store/auth-store');

const TOKEN = 'SBP1.payload.signature';

const PROFILE = {
  vendorId: 8,
  displayName: 'Bánh mì Cô Lan',
  vendorType: 'ITINERANT',
  address: null,
  wardId: 1003,
  wardName: 'Phường Hải Châu',
  permitId: 12,
  permitStatus: 'VALID',
  permitEndDate: '2099-12-31',
  slotId: 5,
  slotCode: 'NVL-022',
  zoneName: 'Đường Nguyễn Văn Linh',
  latitude: 16.06,
  longitude: 108.21,
  communityRating: null,
  communityCount: 0,
  verifiedRating: null,
  verifiedCount: 0,
  comments: [],
};

const CHECK: PermitVerification = {
  isValid: true,
  status: 'VALID',
  permitId: 12,
  vendorId: 8,
  displayName: 'Bánh mì Cô Lan',
  slotId: 5,
  slotCode: 'NVL-022',
  latitude: null,
  longitude: null,
  validFrom: '2026-01-01',
  validUntil: '2026-12-31',
  priceBoard: {
    version: 3,
    updatedAt: '2026-10-20T01:00:00Z',
    printedVersionIsCurrent: null,
    items: [
      {
        menuItemId: 31,
        name: 'Bánh mì thịt',
        nameEn: 'Pork banh mi',
        priceUnit: 'ổ',
        unitPrice: 25000,
      },
      { menuItemId: 32, name: 'Cà phê sữa', nameEn: null, priceUnit: 'ly', unitPrice: 18000 },
    ],
  },
};

function Where() {
  const location = useLocation();
  return <p data-testid="where">{location.pathname + location.search}</p>;
}

function renderForm(query: string) {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter
        initialEntries={['/start', `/customer/explore/vendors/8/reports/new?${query}`]}
        initialIndex={1}
      >
        <Routes>
          <Route
            path="/customer/explore/vendors/:vendorId/reports/new"
            element={<VendorReportFormScreen />}
          />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Pick the dish, the quantity and the amount charged (the money field takes digits only). */
async function fillOvercharge(
  user: ReturnType<typeof userEvent.setup>,
  charged: string,
  quantity = 2,
) {
  await user.click(await screen.findByRole('radio', { name: /Bánh mì thịt/ }));
  const qty = screen.getByLabelText('Số lượng (ổ)');
  fireEvent.change(qty, { target: { value: String(quantity) } });
  fireEvent.change(screen.getByLabelText('Số tiền bạn bị tính'), { target: { value: charged } });
}

beforeEach(() => {
  for (const fn of Object.values(community)) fn.mockReset();
  community.profile.mockResolvedValue(PROFILE);
  community.verifyPermit.mockResolvedValue(CHECK);
  sessionStorage.clear();
  useAuthStore.setState({ user: null });
  useCommunitySession.setState({
    token: 't',
    customer: { id: 1, fullName: 'An', roleCode: 'CUSTOMER' },
    generation: 0,
  });
});

afterEach(() => cleanup());

describe('overcharge math (BUY-07)', () => {
  it('multiplies the posted price by the quantity and compares it with the charge', () => {
    expect(checkOvercharge(25000, 2, 70000)).toEqual({
      state: 'above',
      posted: 50000,
      charged: 70000,
      difference: 20000,
    });
    expect(checkOvercharge(25000, 2, 50000)).toEqual({
      state: 'not-above',
      posted: 50000,
      charged: 50000,
      difference: 0,
    });
    expect(checkOvercharge(25000, 2, 40000).state).toBe('not-above');
  });

  it('waits for a dish, a whole quantity and a whole amount', () => {
    expect(checkOvercharge(undefined, 2, 70000).state).toBe('incomplete');
    expect(checkOvercharge(25000, 0, 70000).state).toBe('incomplete');
    expect(checkOvercharge(25000, 1.5, 70000).state).toBe('incomplete');
    expect(checkOvercharge(25000, 2, null).state).toBe('incomplete');
    expect(checkOvercharge(25000, 1001, 70000).state).toBe('incomplete');
  });

  it('reads purchase times as Việt Nam wall-clock time within the last 7 days', () => {
    const now = new Date('2026-10-23T03:00:00Z'); // 10:00 in Đà Nẵng
    expect(toVnLocalInput(now)).toBe('2026-10-23T10:00');
    expect(vnLocalInputToIso('2026-10-23T08:15')).toBe('2026-10-23T08:15:00+07:00');
    expect(purchaseWindow(now)).toEqual({ min: '2026-10-16T10:00', max: '2026-10-23T10:00' });
    expect(purchaseTimeProblem('2026-10-23T09:00', now)).toBeNull();
    expect(purchaseTimeProblem('2026-10-23T11:00', now)).toBe('Giờ mua không được ở tương lai.');
    expect(purchaseTimeProblem('2026-10-15T09:00', now)).toBe(
      'Chỉ nhận khiếu nại giá trong 7 ngày kể từ lúc mua.',
    );
  });
});

describe('complaint form, "Bị tính cao hơn giá niêm yết"', () => {
  it('looks the board up live, shows posted × quantity and the difference, and sends the server what it needs', async () => {
    community.report.mockResolvedValue({
      reportId: 44,
      status: 'PENDING',
      reportType: 'OVERCHARGE',
      dueAt: '2026-11-03T16:59:59.999Z',
      postedAmount: 50000,
      chargedAmount: 70000,
    });
    const user = userEvent.setup();
    renderForm(`type=OVERCHARGE&permitId=12&slotId=5&qr=${TOKEN}`);

    await fillOvercharge(user, '70000');

    expect(community.verifyPermit).toHaveBeenCalledWith(TOKEN);
    const sum = screen.getByRole('region', { name: 'Đối chiếu giá' });
    expect(within(sum).getByText('= 50.000 đ')).toBeInTheDocument();
    expect(within(sum).getByText('70.000 đ')).toBeInTheDocument();
    expect(within(sum).getByText('+20.000 đ')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Gửi phản ánh' }));

    await waitFor(() => expect(community.report).toHaveBeenCalledTimes(1));
    const [vendorId, request] = community.report.mock.calls[0]!;
    expect(vendorId).toBe('8');
    expect(request).toMatchObject({
      reportType: 'OVERCHARGE',
      menuItemId: 31,
      quantity: 2,
      chargedAmount: 70000,
      slotId: 5,
      scannedPermitId: 12,
    });
    // The posted price is the server's, never sent; the purchase time carries its offset.
    expect(request).not.toHaveProperty('postedAmount');
    expect(request.purchasedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\+07:00$/);
    await waitFor(() =>
      expect(screen.getByTestId('where')).toHaveTextContent('/customer/reports?report=44'),
    );
  });

  it('will not send a charge that is not above the posted price and offers "Phản ánh khác"', async () => {
    const user = userEvent.setup();
    renderForm(`type=OVERCHARGE&qr=${TOKEN}`);

    await fillOvercharge(user, '50000');

    expect(screen.getByText(/Số tiền bị tính không cao hơn giá niêm yết/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gửi phản ánh' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Chuyển sang Phản ánh khác' }));

    expect(screen.getByRole('radio', { name: /Phản ánh khác/ })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.getByLabelText('Mô tả vi phạm')).toBeInTheDocument();
    expect(community.report).not.toHaveBeenCalled();
  });

  it('shows the server refusal (422) and the way to switch to a general report', async () => {
    community.report.mockRejectedValue(
      new CommunityApiError(422, 'Món này không có trên bảng giá của quầy vào thời điểm bạn mua.'),
    );
    const user = userEvent.setup();
    renderForm(`type=OVERCHARGE&qr=${TOKEN}`);

    await fillOvercharge(user, '90000');
    await user.click(screen.getByRole('button', { name: 'Gửi phản ánh' }));

    expect(
      await screen.findByText('Món này không có trên bảng giá của quầy vào thời điểm bạn mua.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chuyển sang Phản ánh khác' })).toBeInTheDocument();
  });

  it('says a pending report already exists (409) and links to "Phản ánh của tôi"', async () => {
    community.report.mockRejectedValue(
      new CommunityApiError(409, 'Bạn đã có một phản ánh về người bán này đang chờ phường xử lý.'),
    );
    const user = userEvent.setup();
    renderForm(`type=PRICE_NOT_POSTED&qr=${TOKEN}`);

    await user.click(await screen.findByRole('button', { name: 'Gửi phản ánh' }));

    expect(await screen.findByText(/đang chờ phường xử lý/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Xem phản ánh của tôi' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/customer/reports');
  });

  it('needs the scanned board for an overcharge: without a code it points to the scanner', async () => {
    renderForm('type=OVERCHARGE');

    expect(await screen.findByText(/Khiếu nại giá cần bảng giá của quầy/)).toBeInTheDocument();
    expect(community.verifyPermit).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Gửi phản ánh' })).toBeDisabled();
  });

  it('is about the stall and slot on the scanned QR, not the other slot the public profile shows', async () => {
    community.verifyPermit.mockResolvedValue({
      ...CHECK,
      permitId: 40,
      displayName: 'Xôi Cô Lan',
      slotId: 9,
      slotCode: 'NVL-003',
    });
    renderForm(`type=PRICE_NOT_POSTED&permitId=40&slotId=9&qr=${TOKEN}`);

    expect(await screen.findByText('Về: Xôi Cô Lan')).toBeInTheDocument();
    expect(screen.queryByText('Về: Bánh mì Cô Lan')).not.toBeInTheDocument();
    expect(screen.getAllByText('NVL-003').length).toBeGreaterThan(0);
    expect(screen.queryByText('NVL-022')).not.toBeInTheDocument();
    // The profile's ward and street belong to its own slot, so they are not claimed for this one.
    expect(screen.getByText('Kính gửi: Phường sở tại')).toBeInTheDocument();
  });

  it('needs a buyer account: signed out, the form cannot be sent and offers sign-in on the page', async () => {
    useCommunitySession.setState({ token: '', customer: null, generation: 0 });
    renderForm(`type=PRICE_NOT_POSTED&qr=${TOKEN}`);

    expect(await screen.findByText('Đăng nhập ở trên để gửi.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gửi phản ánh' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Đăng nhập Backend' })).toBeInTheDocument();
  });

  it('signs the buyer in with the number as the +84 field shows it, like the app sign-in', async () => {
    useCommunitySession.setState({ token: '', customer: null, generation: 0 });
    community.login.mockResolvedValue(undefined);
    renderForm(`type=PRICE_NOT_POSTED&qr=${TOKEN}`);

    fireEvent.change(await screen.findByLabelText('Số điện thoại'), { target: { value: '905 000 201' } });
    fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'test-only' } });
    fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập Backend' }));

    await waitFor(() => expect(community.login).toHaveBeenCalledWith('0905000201', 'test-only'));
  });
});

describe('"Phản ánh của tôi"', () => {
  const report = (extra: Partial<MyVendorReport> = {}): MyVendorReport => ({
    reportId: 44,
    vendorId: 8,
    vendorName: 'Bánh mì Cô Lan',
    slotCode: 'NVL-022',
    reportType: 'OVERCHARGE',
    reason: 'Bị tính cao hơn giá niêm yết: 2 ổ Bánh mì thịt.',
    status: 'REVIEWED',
    createdAt: '2026-10-21T01:10:00Z',
    dueAt: '2026-10-30T16:59:59.999Z',
    isOverdue: false,
    resolution: 'MEDIATED',
    resolutionNote: 'Người bán đã xin lỗi và hoàn tiền tại quầy.',
    refundAmount: 20000,
    reviewedAt: '2026-10-22T02:00:00Z',
    hasPhoto: false,
    priceEvidence: {
      menuItemId: 31,
      itemName: 'Bánh mì thịt',
      priceUnit: 'ổ',
      postedUnitPrice: 25000,
      priceVersion: 3,
      priceVersionAt: '2026-10-20T01:00:00Z',
      quantity: 2,
      postedAmount: 50000,
      chargedAmount: 70000,
      difference: 20000,
      purchasedAt: '2026-10-21T00:45:00Z',
    },
    ...extra,
  });

  it('lists each report with its outcome, the note, the refund and the price evidence', async () => {
    community.myReports.mockResolvedValue([
      report(),
      report({
        reportId: 45,
        reportType: 'PRICE_NOT_POSTED',
        status: 'PENDING',
        resolution: null,
        resolutionNote: null,
        refundAmount: null,
        reviewedAt: null,
        isOverdue: true,
        priceEvidence: null,
      }),
    ]);
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/customer/reports?report=44']}>
          <MyReportsScreen />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const closed = await screen.findByRole('article', { name: 'Phản ánh #44' });
    expect(within(closed).getByText(/Kết quả: Đã hòa giải/)).toBeInTheDocument();
    expect(within(closed).getByText(/Người bán đã xin lỗi/)).toBeInTheDocument();
    expect(within(closed).getByText('Người bán hoàn lại: 20.000 đ')).toBeInTheDocument();
    expect(within(closed).getByText('+20.000 đ')).toBeInTheDocument();
    const open = screen.getByRole('article', { name: 'Phản ánh #45' });
    expect(within(open).getByText('Hạn xử lý: hết ngày 30/10/2026')).toBeInTheDocument();
    expect(within(open).getByText('Quá hạn')).toBeInTheDocument();
    expect(community.myReports).toHaveBeenCalledWith(1);
  });
});
