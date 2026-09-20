import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import type { RentalApplication, RentalContract, SlotTransferRequest } from '@/core/api/side-api';
import { SideApiError } from '@/core/api/side-api';

const api = vi.hoisted(() => ({
  getContract: vi.fn(),
  getSlot: vi.fn(),
  getPermit: vi.fn(),
  requestRenewal: vi.fn(),
  cancelContract: vi.fn(),
  getApplication: vi.fn(),
  withdrawApplication: vi.fn(),
  listTransfers: vi.fn(),
  acceptTransfer: vi.fn(),
  declineTransfer: vi.fn(),
  registrations: vi.fn(),
}));

vi.mock('@/core/api/side-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/api/side-api')>();
  return { ...actual, sideApi: { ...actual.sideApi, ...api } };
});
vi.mock('@/features/business-registrations/useRegistrations', () => ({
  useRegistrations: () => api.registrations(),
}));

const { RenewalRequestScreen } = await import('@/features/rental-contracts/screens/RenewalRequestScreen');
const { ReturnSlotScreen } = await import('@/features/rental-contracts/screens/ReturnSlotScreen');
const { DigitalPermitScreen } = await import('@/features/rental-contracts/screens/DigitalPermitScreen');
const { AcceptTransferScreen } = await import('@/features/rental-contracts/screens/AcceptTransferScreen');
const { RentalApplicationDetailScreen } = await import('@/features/sidewalk-slots/screens/RentalApplicationDetailScreen');

const contract = {
  contractId: 5,
  slotId: 14,
  slotCode: 'NVL-14',
  zoneName: 'Đường Nguyễn Văn Linh',
  startDate: '2026-09-01',
  endDate: '2026-12-01',
  contractStatus: 'ACTIVE',
  cancellationReason: null,
} as RentalContract;

function renderAt(path: string, routePath: string, element: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={routePath} element={element} />
          <Route path="/vendor/slots/contracts" element={<div>contracts page</div>} />
          <Route path="/back" element={<div>back page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  api.getContract.mockResolvedValue(contract);
  api.getSlot.mockResolvedValue({
    slotId: 14,
    slotCode: 'NVL-14',
    zoneName: 'Đường Nguyễn Văn Linh',
    pricePerDay: 30000,
    widthMeters: 2,
    lengthMeters: 3,
    availableFrom: '05:00:00',
    availableTo: '22:00:00',
  });
  api.registrations.mockReturnValue({ registrations: [{ registrationStatus: 'APPROVED' }], isLoading: false });
});

describe('Gia hạn hợp đồng', () => {
  const open = () => renderAt('/vendor/slots/contracts/5/renewal', '/vendor/slots/contracts/:id/renewal', <RenewalRequestScreen />);

  it('shows the contract and, for the default term, the date it would run to if approved in full', async () => {
    open();

    expect(await screen.findByText('NVL-14')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '90 ngày' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('1/3/2027')).toBeInTheDocument();
    expect(screen.getByText(/Phường sẽ xét duyệt và quyết định ngày hết hạn mới/)).toBeInTheDocument();
  });

  it('follows the quick choices and the typed number', async () => {
    const user = userEvent.setup();
    open();

    await user.click(await screen.findByRole('tab', { name: '30 ngày' }));
    expect(screen.getByLabelText('Hoặc nhập số ngày')).toHaveValue('30');
    expect(screen.getByText('31/12/2026')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Hoặc nhập số ngày'));
    await user.type(screen.getByLabelText('Hoặc nhập số ngày'), '45');
    expect(screen.getByText('15/1/2027')).toBeInTheDocument();
  });

  it('blocks a term that is not a positive whole number', async () => {
    const user = userEvent.setup();
    open();
    await user.clear(await screen.findByLabelText('Hoặc nhập số ngày'));
    await user.type(screen.getByLabelText('Hoặc nhập số ngày'), '1.5');

    expect(screen.getByText('Nhập số ngày là số nguyên dương.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gửi yêu cầu gia hạn' })).toBeDisabled();
  });

  it('sends the chosen number of days', async () => {
    const user = userEvent.setup();
    api.requestRenewal.mockResolvedValue({ message: 'Đã gửi.' });
    open();

    await user.click(await screen.findByRole('tab', { name: '60 ngày' }));
    await user.click(screen.getByRole('button', { name: 'Gửi yêu cầu gia hạn' }));

    await waitFor(() => expect(api.requestRenewal).toHaveBeenCalledWith(5, 60));
  });

  it('shows the reason the server refuses on the page', async () => {
    const user = userEvent.setup();
    api.requestRenewal.mockRejectedValue(new SideApiError(409, 'A renewal is already pending for this contract.'));
    open();

    await user.click(await screen.findByRole('button', { name: 'Gửi yêu cầu gia hạn' }));

    expect(await screen.findByText(/already pending/)).toBeInTheDocument();
  });
});

describe('Trả ô vỉa hè', () => {
  const open = () => renderAt('/vendor/slots/contracts/5/return', '/vendor/slots/contracts/:id/return', <ReturnSlotScreen />);

  it('lists what returning the slot means before anything happens', async () => {
    open();

    expect(await screen.findByText('NVL-14')).toBeInTheDocument();
    expect(screen.getByText('Giấy phép số của ô này sẽ hết hiệu lực.')).toBeInTheDocument();
    expect(screen.getByText('Ô được mở lại cho các hộ kinh doanh khác.')).toBeInTheDocument();
    expect(api.cancelContract).not.toHaveBeenCalled();
  });

  it('returns the slot only after the confirmation, with the trimmed reason', async () => {
    const user = userEvent.setup();
    api.cancelContract.mockResolvedValue({ message: 'Đã trả ô.' });
    open();

    await user.type(await screen.findByLabelText(/Lý do trả ô/), '  Chuyển địa điểm  ');
    await user.click(screen.getByRole('button', { name: 'Trả ô này' }));
    expect(api.cancelContract).not.toHaveBeenCalled();

    const dialog = screen.getByText('Xác nhận trả ô?').closest('div')!.parentElement!;
    await user.click(within(dialog).getByRole('button', { name: 'Trả ô' }));

    await waitFor(() => expect(api.cancelContract).toHaveBeenCalledWith(5, 'Chuyển địa điểm'));
    expect(await screen.findByText('contracts page')).toBeInTheDocument();
  });

  it('sends no reason when none is given, and shows the server refusal on the page', async () => {
    const user = userEvent.setup();
    api.cancelContract.mockRejectedValue(new SideApiError(409, 'Cannot return a slot while fees are overdue.'));
    open();

    await user.click(await screen.findByRole('button', { name: 'Trả ô này' }));
    const dialog = screen.getByText('Xác nhận trả ô?').closest('div')!.parentElement!;
    await user.click(within(dialog).getByRole('button', { name: 'Trả ô' }));

    await waitFor(() => expect(api.cancelContract).toHaveBeenCalledWith(5, null));
    expect(await screen.findByText(/fees are overdue/)).toBeInTheDocument();
    expect(screen.queryByText('Xác nhận trả ô?')).not.toBeInTheDocument();
  });

  it('cancelling the confirmation returns nothing', async () => {
    const user = userEvent.setup();
    open();

    await user.click(await screen.findByRole('button', { name: 'Trả ô này' }));
    await user.click(screen.getByRole('button', { name: 'Huỷ' }));

    expect(api.cancelContract).not.toHaveBeenCalled();
  });
});

describe('Giấy phép số', () => {
  const open = () => renderAt('/vendor/slots/contracts/5/permit', '/vendor/slots/contracts/:id/permit', <DigitalPermitScreen />);
  const permit = (effectiveStatus: string) => ({
    permitId: 9,
    contractId: 5,
    qrPayload: 'STREETBIZ-PERMIT-9-abc123',
    startDate: '2026-09-01',
    endDate: '2026-12-01',
    permitStatus: 'ACTIVE',
    contractStatus: 'ACTIVE',
    effectiveStatus,
  });

  it('shows the slot, the QR code and how to use it while the permit is valid', async () => {
    api.getPermit.mockResolvedValue(permit('VALID'));
    const { container } = open();

    expect(await screen.findByText('NVL-14')).toBeInTheDocument();
    expect(container.querySelector('svg')).not.toBeNull();
    expect(screen.getByText('HỢP LỆ')).toBeInTheDocument();
    expect(screen.getByText('Quét mã QR để kiểm tra giấy phép.')).toBeInTheDocument();
    expect(screen.getByText('STREETBIZ-PERMIT-9-abc123')).toBeInTheDocument();
    expect(screen.getByText(/Còn \d+ ngày/)).toBeInTheDocument();
  });

  it('says a permit that is no longer valid has no effect, and drops the days left', async () => {
    api.getPermit.mockResolvedValue(permit('EXPIRED'));
    open();

    expect(await screen.findByText('Giấy phép này hiện không có hiệu lực.')).toBeInTheDocument();
    expect(screen.queryByText(/Còn \d+ ngày/)).not.toBeInTheDocument();
  });

  it('shows an error with a retry when the permit cannot be loaded', async () => {
    api.getPermit.mockRejectedValue(new Error('no permit'));
    open();

    expect(await screen.findByText('no permit')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
  });
});

describe('Chi tiết đơn thuê', () => {
  const application = (applicationStatus: string, extra: Partial<RentalApplication> = {}) =>
    ({
      applicationId: 3,
      slotId: 14,
      applicationMethod: 'MANUAL_SELECTED',
      requestedTermDays: 90,
      applicationStatus,
      reviewDecisionReason: null,
      reviewedAt: null,
      createdAt: '2026-09-19T03:00:00Z',
      ...extra,
    }) as RentalApplication;
  const open = () =>
    renderAt('/vendor/slots/rental-applications/3', '/vendor/slots/rental-applications/:id', <RentalApplicationDetailScreen />);

  it('shows the application and the slot it is for', async () => {
    api.getApplication.mockResolvedValue(application('PENDING'));
    open();

    expect(await screen.findByText('Ô mở')).toBeInTheDocument();
    expect(screen.getByText('#3')).toBeInTheDocument();
    expect(screen.getByText('90 ngày')).toBeInTheDocument();
    expect(await screen.findByText('30.000 đ')).toBeInTheDocument();
    expect(screen.getByText('2 × 3 m · 6 m²')).toBeInTheDocument();
    expect(screen.getByText('05:00 – 22:00')).toBeInTheDocument();
  });

  it('shows the ward\'s reason for a rejection and offers no withdraw', async () => {
    api.getApplication.mockResolvedValue(
      application('REJECTED', { reviewDecisionReason: 'Vị trí trùng điểm dừng xe buýt', reviewedAt: '2026-09-20T03:00:00Z' }),
    );
    open();

    expect(await screen.findByText(/Vị trí trùng điểm dừng xe buýt/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rút đơn' })).not.toBeInTheDocument();
  });

  it('withdraws only after the vendor confirms', async () => {
    const user = userEvent.setup();
    api.getApplication.mockResolvedValue(application('PENDING'));
    api.withdrawApplication.mockResolvedValue({ message: 'Đã rút đơn.' });
    open();

    await user.click(await screen.findByRole('button', { name: 'Rút đơn' }));
    expect(api.withdrawApplication).not.toHaveBeenCalled();
    const dialog = screen.getByText('Rút đơn thuê này?').closest('div')!.parentElement!;
    await user.click(within(dialog).getByRole('button', { name: 'Rút đơn' }));

    await waitFor(() => expect(api.withdrawApplication).toHaveBeenCalledWith(3));
  });

  it('cancelling the confirmation keeps the application', async () => {
    const user = userEvent.setup();
    api.getApplication.mockResolvedValue(application('MORE_INFORMATION_REQUIRED', { reviewDecisionReason: 'Bổ sung ảnh' }));
    open();

    await user.click(await screen.findByRole('button', { name: 'Rút đơn' }));
    await user.click(screen.getByRole('button', { name: 'Huỷ' }));

    expect(api.withdrawApplication).not.toHaveBeenCalled();
    expect(screen.getByText(/Bổ sung ảnh/)).toBeInTheDocument();
  });
});

describe('Chấp nhận chuyển nhượng', () => {
  const transfer = (transferStatus: string) =>
    ({
      transferId: 8,
      contractId: 301,
      transferStatus,
      slotCode: 'NVL-22',
      zoneName: 'Đường Lê Duẩn',
      contractStartDate: '2026-09-01',
      contractEndDate: '2026-12-01',
      initiatedAt: '2026-09-20T03:00:00Z',
    }) as SlotTransferRequest;
  const open = () => renderAt('/vendor/slots/transfers/8/accept', '/vendor/slots/transfers/:id/accept', <AcceptTransferScreen />);

  it('shows the pending request and both ways to answer it', async () => {
    api.listTransfers.mockResolvedValue([transfer('PENDING')]);
    open();

    expect(await screen.findByText('Yêu cầu #8')).toBeInTheDocument();
    expect(screen.getByText('20/9/2026')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chấp nhận chuyển nhượng' })).toBeEnabled();
  });

  it('tells the receiver which slot and term they are accepting, without reading the sender contract', async () => {
    api.listTransfers.mockResolvedValue([transfer('PENDING')]);
    open();

    expect(await screen.findByText('NVL-22')).toBeInTheDocument();
    expect(screen.getByText('Đường Lê Duẩn')).toBeInTheDocument();
    expect(screen.getByText('1/9/2026 – 1/12/2026')).toBeInTheDocument();
    expect(api.getContract).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Từ chối' })).toBeInTheDocument();
  });

  it('accepts and goes back', async () => {
    const user = userEvent.setup();
    api.listTransfers.mockResolvedValue([transfer('PENDING')]);
    api.acceptTransfer.mockResolvedValue({ message: 'Đã chấp nhận.' });
    renderAt('/vendor/slots/transfers/8/accept', '/vendor/slots/transfers/:id/accept', <AcceptTransferScreen />);

    await user.click(await screen.findByRole('button', { name: 'Chấp nhận chuyển nhượng' }));

    await waitFor(() => expect(api.acceptTransfer).toHaveBeenCalledWith(8));
  });

  it('declines only after the vendor confirms', async () => {
    const user = userEvent.setup();
    api.listTransfers.mockResolvedValue([transfer('PENDING')]);
    api.declineTransfer.mockResolvedValue({ message: 'Đã từ chối.' });
    open();

    await user.click(await screen.findByRole('button', { name: 'Từ chối' }));
    expect(api.declineTransfer).not.toHaveBeenCalled();
    const dialog = screen.getByText('Từ chối yêu cầu chuyển nhượng?').closest('div')!.parentElement!;
    await user.click(within(dialog).getByRole('button', { name: 'Từ chối' }));

    await waitFor(() => expect(api.declineTransfer).toHaveBeenCalledWith(8));
  });

  it('cannot be accepted without an approved registration, and says why', async () => {
    api.listTransfers.mockResolvedValue([transfer('PENDING')]);
    api.registrations.mockReturnValue({ registrations: [{ registrationStatus: 'SUBMITTED' }], isLoading: false });
    open();

    expect(await screen.findByRole('button', { name: 'Chấp nhận chuyển nhượng' })).toBeDisabled();
    expect(screen.getByText(/hồ sơ đăng ký kinh doanh đã được duyệt/)).toBeInTheDocument();
  });

  it('offers no answer to a request that has already been answered', async () => {
    api.listTransfers.mockResolvedValue([transfer('ACCEPTED_BY_RECEIVER')]);
    open();

    expect(await screen.findByText('Yêu cầu #8')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Chấp nhận chuyển nhượng' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Từ chối' })).not.toBeInTheDocument();
  });

  it('says so when the request is not among the incoming ones', async () => {
    api.listTransfers.mockResolvedValue([]);
    open();

    expect(await screen.findByText('Không tìm thấy yêu cầu.')).toBeInTheDocument();
  });
});
