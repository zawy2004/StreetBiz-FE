import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import type { ApiRegistration } from '@/core/api';

const api = vi.hoisted(() => ({
  list: vi.fn(),
  fees: vi.fn(),
  penalties: vi.fn(),
  listContracts: vi.fn(),
  getPermit: vi.fn(),
  listApplications: vi.fn(),
}));
const flags = vi.hoisted(() => ({ phase2: true }));

vi.mock('@/core/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/api')>();
  return {
    ...actual,
    vendorRegistrationApi: { ...actual.vendorRegistrationApi, list: api.list },
    financeApi: { ...actual.financeApi, fees: api.fees, penalties: api.penalties },
    referenceApi: {
      ...actual.referenceApi,
      listWards: () =>
        Promise.resolve([
          { unitId: 10, unitName: 'Phường Hải Châu 1', parentName: 'Thành phố Đà Nẵng' },
        ]),
    },
  };
});

vi.mock('@/core/api/side-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/api/side-api')>();
  return {
    ...actual,
    sideApi: {
      ...actual.sideApi,
      listContracts: api.listContracts,
      getPermit: api.getPermit,
      listApplications: api.listApplications,
    },
  };
});

vi.mock('@/core/config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/config/env')>();
  return {
    ...actual,
    env: {
      ...actual.env,
      get enablePhase2() {
        return flags.phase2;
      },
    },
    isLiveApi: true,
  };
});

const { VendorHomeScreen } = await import('@/features/vendor-home/screens/VendorHomeScreen');
const { useAuthStore } = await import('@/store/auth-store');

const needsInfoRegistration: ApiRegistration = {
  registrationId: 42,
  vendorType: 'FIXED_STOREFRONT',
  displayName: 'Xoi ga Ba Nam',
  declaredAddress: '12 Le Duan',
  addressLatitude: null,
  addressLongitude: null,
  wardUnitId: 10,
  registrationStatus: 'MORE_INFORMATION_REQUIRED',
  fastTrackFlag: false,
  reviewDecisionReason: 'Ảnh CCCD bị mờ',
  reviewedAt: null,
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: null,
  ownerDateOfBirth: null,
  ownerGender: null,
  ownerEthnicity: null,
  ownerNationality: null,
  idType: null,
  idIssuedDate: null,
  idIssuedPlace: null,
  permanentAddress: null,
  contactAddress: null,
  businessLine: null,
  businessLineCode: null,
  capitalAmount: null,
  laborCount: null,
  plannedStartDate: null,
  foodSafetyCommitmentAt: null,
  identityVerifiedAt: null,
  identityVerificationNote: null,
  householdMembers: [],
};

function renderVendorHome() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/vendor/home']}>
        <Routes>
          <Route path="/vendor/home" element={<VendorHomeScreen />} />
          <Route path="/vendor/registrations/:id" element={<div>registration detail</div>} />
          <Route path="/vendor/finance/fees/:id/payment" element={<div>fee payment</div>} />
          <Route path="/vendor/slots/contracts/:id/permit" element={<div>permit screen</div>} />
          <Route path="/vendor/slots/contracts/:id" element={<div>contract detail</div>} />
          <Route path="/vendor/slots" element={<div>slot map</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('VendorHomeScreen (live API)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    flags.phase2 = true;
    api.fees.mockResolvedValue([]);
    api.penalties.mockResolvedValue([]);
    api.listContracts.mockResolvedValue([]);
    api.listApplications.mockResolvedValue([]);
    useAuthStore.setState({
      user: {
        id: '1',
        fullName: 'Nguyen Van A',
        phone: '0905000001',
        password: '',
        role_code: 'VENDOR',
        account_status: 'ACTIVE',
      },
      sessionExpired: false,
    });
  });

  it('surfaces a real registration needing more information as a todo, not the mock-data empty state', async () => {
    api.list.mockResolvedValue([needsInfoRegistration]);

    renderVendorHome();

    expect(await screen.findByText('Bổ sung hồ sơ: Xoi ga Ba Nam')).toBeInTheDocument();
    // The vendor does have a registration, so the "no registration yet" empty
    // state — which used to always show, since this screen only read the mock
    // store — must not appear.
    expect(screen.queryByText('Chưa có hồ sơ đăng ký')).not.toBeInTheDocument();
  });

  it('navigates to the registration detail screen from the todo item', async () => {
    api.list.mockResolvedValue([needsInfoRegistration]);
    const user = userEvent.setup();

    renderVendorHome();

    await user.click(await screen.findByText('Bổ sung hồ sơ: Xoi ga Ba Nam'));

    expect(await screen.findByText('registration detail')).toBeInTheDocument();
  });

  it('invites a vendor with no registration to start, instead of saying there is nothing to do', async () => {
    api.list.mockResolvedValue([]);

    renderVendorHome();

    expect(
      await screen.findByRole('heading', { name: 'Đăng ký kinh doanh để bắt đầu bán' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Đăng ký ngay' })).toBeInTheDocument();
    expect(screen.queryByText('Không có việc cần xử lý')).not.toBeInTheDocument();
  });

  it('never shows the all-clear while a source is still loading', async () => {
    api.list.mockResolvedValue([]);
    api.fees.mockReturnValue(new Promise(() => {}));

    renderVendorHome();

    expect(await screen.findByText('Đang tải việc cần làm')).toBeInTheDocument();
    expect(screen.queryByText('Không có việc cần xử lý')).not.toBeInTheDocument();
  });

  it('keeps the loaded todos and flags the source that failed, with a retry', async () => {
    api.list.mockResolvedValue([needsInfoRegistration]);
    api.penalties.mockRejectedValueOnce(new Error('500')).mockResolvedValue([]);
    const user = userEvent.setup();

    renderVendorHome();

    expect(await screen.findByText('Bổ sung hồ sơ: Xoi ga Ba Nam')).toBeInTheDocument();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Chưa tải được biên bản phạt');
    expect(screen.queryByText('Không có việc cần xử lý')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Thử lại' }));

    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(api.penalties).toHaveBeenCalledTimes(2);
  });

  it('shows an error instead of the all-clear when nothing could be loaded', async () => {
    api.list.mockResolvedValue([]);
    api.fees.mockRejectedValue(new Error('offline'));

    renderVendorHome();

    expect(await screen.findByText('Không tải được dữ liệu')).toBeInTheDocument();
    expect(screen.queryByText('Không có việc cần xử lý')).not.toBeInTheDocument();
  });

  it('hides the marketplace shortcuts when Phase 2 is off', async () => {
    api.list.mockResolvedValue([]);
    flags.phase2 = false;

    renderVendorHome();

    expect(await screen.findByText('Đăng ký kinh doanh')).toBeInTheDocument();
    expect(screen.queryByText('Quét mã nhận hàng')).not.toBeInTheDocument();
    expect(screen.queryByText('Cửa hàng & thực đơn')).not.toBeInTheDocument();
  });

  it('leads with what is overdue and names the one item its button pays', async () => {
    api.list.mockResolvedValue([]);
    api.fees.mockResolvedValue([
      {
        feeItemId: 5,
        contractId: 3,
        slotCode: 'NVL-08',
        periodLabel: 'Kỳ 2/3 · Tháng 09/2026',
        dueDate: '2026-09-01',
        amount: 450_000,
        itemStatus: 'OVERDUE',
        paidAt: null,
      },
    ]);
    const user = userEvent.setup();

    renderVendorHome();

    expect(await screen.findByRole('heading', { name: /Cần trả/ })).toHaveTextContent(/450\.000/);
    expect(screen.getByText('1 kỳ phí quá hạn')).toBeInTheDocument();
    // Hero and row both carry the deadline.
    expect(screen.getByText(/^Phí tháng 09\/2026 · quá hạn \d+ ngày$/)).toBeInTheDocument();
    expect(screen.getByText(/^Quá hạn \d+ ngày$/)).toBeInTheDocument();
    expect(screen.queryByText(/khoản nữa/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^Trả 450\.000 đ$/ }));

    expect(await screen.findByText('fee payment')).toBeInTheDocument();
  });

  it('pays the most urgent item first and says how many are left, never a fake combined payment', async () => {
    api.list.mockResolvedValue([]);
    api.fees.mockResolvedValue([
      {
        feeItemId: 5,
        contractId: 3,
        slotCode: 'NVL-08',
        periodLabel: 'Kỳ 2/3 · Tháng 09/2026',
        dueDate: '2026-09-01',
        amount: 450_000,
        itemStatus: 'OVERDUE',
        paidAt: null,
      },
    ]);
    api.penalties.mockResolvedValue([
      {
        penaltyId: 7,
        violationId: 3,
        violationType: 'ENCROACHMENT',
        violationLabel: 'Lấn chiếm lòng đường',
        slotCode: 'NVL-08',
        amount: 300_000,
        penaltyStatus: 'UNPAID',
        issuedAt: '2026-09-15T08:00:00Z',
        paidAt: null,
      },
    ]);

    renderVendorHome();

    expect(await screen.findByRole('heading', { name: /Cần trả/ })).toHaveTextContent(/750\.000/);
    // The fee (due 01/09) is older than the penalty (15/09), so it goes first.
    expect(screen.getByRole('button', { name: /^Trả 450\.000 đ$/ })).toBeInTheDocument();
    expect(screen.getByText('Còn 1 khoản nữa trong danh sách bên dưới.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Thanh toán \d+ khoản/ })).not.toBeInTheDocument();
  });

  it('makes the valid permit the hero when nothing is owed', async () => {
    api.list.mockResolvedValue([]);
    api.listContracts.mockResolvedValue([
      {
        contractId: 3,
        applicationId: 1,
        slotId: 9,
        slotCode: 'NVL-08',
        zoneName: 'Bạch Đằng',
        startDate: '2026-07-01',
        endDate: '2026-12-31',
        contractStatus: 'ACTIVE',
        cancellationReason: null,
        cancelledAt: null,
        createdAt: '2026-07-01',
        updatedAt: null,
      },
    ]);
    api.getPermit.mockResolvedValue({
      permitId: 1,
      contractId: 3,
      qrPayload: 'SB:PERMIT:1',
      startDate: '2026-07-01',
      endDate: '2026-12-31',
      permitStatus: 'ACTIVE',
      contractStatus: 'ACTIVE',
      effectiveStatus: 'VALID',
    });
    const user = userEvent.setup();

    renderVendorHome();

    expect(
      await screen.findByRole('heading', { name: 'Giấy phép còn hiệu lực' }),
    ).toBeInTheDocument();
    expect(screen.getByText('đến 31/12/2026')).toBeInTheDocument();
    expect(screen.queryByText('Giấy phép của bạn')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Xuất trình giấy phép' }));

    expect(await screen.findByText('permit screen')).toBeInTheDocument();
  });

  it('stops the vendor at a suspended permit, even with money owed, and says who to contact', async () => {
    api.list.mockResolvedValue([{ ...needsInfoRegistration, registrationStatus: 'APPROVED' }]);
    api.fees.mockResolvedValue([
      {
        feeItemId: 5,
        contractId: 3,
        slotCode: 'NVL-08',
        periodLabel: 'Kỳ 2/3 · Tháng 09/2026',
        dueDate: '2026-09-01',
        amount: 450_000,
        itemStatus: 'OVERDUE',
        paidAt: null,
      },
    ]);
    api.listContracts.mockResolvedValue([
      {
        contractId: 3,
        applicationId: 1,
        slotId: 9,
        slotCode: 'NVL-08',
        zoneName: 'Bạch Đằng',
        startDate: '2026-07-01',
        endDate: '2026-12-31',
        contractStatus: 'SUSPENDED',
        cancellationReason: null,
        cancelledAt: null,
        createdAt: '2026-07-01',
        updatedAt: null,
      },
    ]);
    api.getPermit.mockResolvedValue({
      permitId: 1,
      contractId: 3,
      qrPayload: 'SB:PERMIT:1',
      startDate: '2026-07-01',
      endDate: '2026-12-31',
      permitStatus: 'SUSPENDED',
      contractStatus: 'SUSPENDED',
      effectiveStatus: 'SUSPENDED',
    });
    const user = userEvent.setup();

    renderVendorHome();

    expect(
      await screen.findByRole('heading', { name: 'Giấy phép đang bị tạm ngưng' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Không được bán tại ô này')).toBeInTheDocument();
    expect(screen.getByText('Cần giải trình? Liên hệ UBND Phường Hải Châu 1.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Cần trả/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Xem hợp đồng' }));

    expect(await screen.findByText('contract detail')).toBeInTheDocument();
  });

  it('points an approved vendor without a slot to renting one', async () => {
    api.list.mockResolvedValue([{ ...needsInfoRegistration, registrationStatus: 'APPROVED' }]);
    const user = userEvent.setup();

    renderVendorHome();

    expect(
      await screen.findByRole('heading', { name: 'Chọn ô để bắt đầu bán' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Thuê ô vỉa hè' }));

    expect(await screen.findByText('slot map')).toBeInTheDocument();
  });

  it('says so when the permit cannot be loaded, instead of silently dropping it', async () => {
    api.list.mockResolvedValue([{ ...needsInfoRegistration, registrationStatus: 'APPROVED' }]);
    api.listContracts.mockRejectedValueOnce(new Error('offline')).mockResolvedValue([]);
    const user = userEvent.setup();

    renderVendorHome();

    expect(
      await screen.findByRole('heading', { name: 'Chưa xem được tình trạng giấy phép' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Thử lại' }));

    expect(
      await screen.findByRole('heading', { name: 'Chọn ô để bắt đầu bán' }),
    ).toBeInTheDocument();
    expect(api.listContracts).toHaveBeenCalledTimes(2);
  });
});
