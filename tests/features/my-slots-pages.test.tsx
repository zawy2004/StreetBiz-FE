import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import type { RentalApplication, RentalContract, SlotTransferRequest } from '@/core/api/side-api';

const api = vi.hoisted(() => ({
  listApplications: vi.fn(),
  listContracts: vi.fn(),
  listTransfers: vi.fn(),
  getSlot: vi.fn(),
  getContract: vi.fn(),
  declineTransfer: vi.fn(),
}));

vi.mock('@/core/api/side-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/api/side-api')>();
  return { ...actual, sideApi: { ...actual.sideApi, ...api } };
});

const { RentalApplicationsScreen } = await import('@/features/sidewalk-slots/screens/RentalApplicationsScreen');
const { ContractsListScreen } = await import('@/features/rental-contracts/screens/ContractsListScreen');
const { TransfersListScreen } = await import('@/features/rental-contracts/screens/TransfersListScreen');

const application = (applicationId: number, applicationStatus: string, extra: Partial<RentalApplication> = {}) =>
  ({
    applicationId,
    registrationId: 1,
    slotId: 100 + applicationId,
    applicationMethod: 'MANUAL_SELECTED',
    requestedTermDays: 90,
    applicationStatus,
    reviewDecisionReason: null,
    reviewedAt: null,
    createdAt: '2026-09-19T03:00:00Z',
    ...extra,
  }) as RentalApplication;

const isoDay = (offsetDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const contract = (contractId: number, contractStatus: string, endInDays: number, extra: Partial<RentalContract> = {}) =>
  ({
    contractId,
    slotId: 200 + contractId,
    slotCode: `NVL-${contractId}`,
    zoneName: 'Đường Nguyễn Văn Linh',
    startDate: isoDay(endInDays - 90),
    endDate: isoDay(endInDays),
    contractStatus,
    cancellationReason: null,
    ...extra,
  }) as RentalContract;

const transfer = (transferId: number, transferStatus: string, extra: Partial<SlotTransferRequest> = {}) =>
  ({
    transferId,
    contractId: 300 + transferId,
    transferStatus,
    slotCode: `C-${300 + transferId}`,
    zoneName: 'Đường Lê Duẩn',
    contractStartDate: '2026-09-01',
    contractEndDate: '2026-12-01',
    initiatedAt: '2026-09-20T03:00:00Z',
    reviewDecisionReason: null,
    ...extra,
  }) as SlotTransferRequest;

function renderAt(path: string, element: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={path} element={element} />
          <Route path="/vendor/slots" element={<div>slot map</div>} />
          <Route path="/vendor/slots/rental-applications/:id" element={<div>application page</div>} />
          <Route path="/vendor/slots/contracts/:id" element={<div>contract page</div>} />
          <Route path="/vendor/slots/contracts/:id/renewal" element={<div>renewal page</div>} />
          <Route path="/vendor/slots/contracts/:id/transfer" element={<div>transfer page</div>} />
          <Route path="/vendor/slots/transfers/:id/accept" element={<div>accept page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  api.getSlot.mockImplementation(async (slotId: number) => ({
    slotId,
    slotCode: `S-${slotId}`,
    zoneName: 'Đường Nguyễn Văn Linh',
    pricePerDay: 30000,
  }));
  api.getContract.mockImplementation(async (contractId: number) => ({
    contractId,
    slotCode: `C-${contractId}`,
    zoneName: 'Đường Lê Duẩn',
  }));
});

describe('Đơn thuê ô', () => {
  beforeEach(() => {
    api.listApplications.mockResolvedValue([
      application(1, 'PENDING'),
      application(2, 'APPROVED', { reviewedAt: '2026-09-20T03:00:00Z' }),
      application(3, 'REJECTED', { reviewDecisionReason: 'Vị trí trùng điểm dừng xe buýt' }),
      application(4, 'MORE_INFORMATION_REQUIRED', { reviewDecisionReason: 'Bổ sung ảnh mặt tiền' }),
    ]);
  });

  it('shows the four sections tabs and every application with its details, newest first', async () => {
    renderAt('/vendor/slots/rental-applications', <RentalApplicationsScreen />);

    expect(await screen.findByText('S-104')).toBeInTheDocument();
    const tabs = screen.getByRole('navigation', { name: 'Thuê ô của tôi' });
    expect(within(tabs).getAllByRole('link').map((l) => l.textContent)).toEqual([
      'Đơn thuê ô',
      'Hợp đồng thuê ô',
      'Chuyển nhượng ô',
      'Đề xuất ô mới',
    ]);
    const codes = screen.getAllByText(/^S-10\d$/).map((n) => n.textContent);
    expect(codes).toEqual(['S-104', 'S-103', 'S-102', 'S-101']);
    expect(screen.getAllByText('90 ngày')).toHaveLength(4);
    await waitFor(() => expect(screen.getAllByText('Đường Nguyễn Văn Linh')).toHaveLength(4));
  });

  it('shows the ward\'s reason on applications that need more information or were rejected', async () => {
    renderAt('/vendor/slots/rental-applications', <RentalApplicationsScreen />);

    expect(await screen.findByText(/Bổ sung ảnh mặt tiền/)).toBeInTheDocument();
    expect(screen.getByText(/Vị trí trùng điểm dừng xe buýt/)).toBeInTheDocument();
    expect(screen.getByText(/Phường đã duyệt đơn ngày/)).toBeInTheDocument();
  });

  it('filters by the chips and keeps the counts', async () => {
    const user = userEvent.setup();
    renderAt('/vendor/slots/rental-applications', <RentalApplicationsScreen />);
    await screen.findByText('S-104');

    expect(screen.getByRole('tab', { name: 'Tất cả (4)' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Đang chờ (2)' })).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Đang chờ (2)' }));
    expect(screen.getAllByText(/^S-10\d$/).map((n) => n.textContent)).toEqual(['S-104', 'S-101']);

    await user.click(screen.getByRole('tab', { name: 'Từ chối/Rút (1)' }));
    expect(screen.getAllByText(/^S-10\d$/).map((n) => n.textContent)).toEqual(['S-103']);
  });

  it('opens the application from its button', async () => {
    const user = userEvent.setup();
    renderAt('/vendor/slots/rental-applications', <RentalApplicationsScreen />);

    await user.click((await screen.findAllByRole('button', { name: 'Xem chi tiết' }))[0]!);

    expect(await screen.findByText('application page')).toBeInTheDocument();
  });

  it('offers to pick a slot when there are no applications', async () => {
    const user = userEvent.setup();
    api.listApplications.mockResolvedValue([]);
    renderAt('/vendor/slots/rental-applications', <RentalApplicationsScreen />);

    expect(await screen.findByText('Chưa có đơn thuê nào')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Chọn ô để thuê' }));
    expect(await screen.findByText('slot map')).toBeInTheDocument();
  });

  it('shows an error with a retry', async () => {
    api.listApplications.mockRejectedValue(new Error('boom'));
    renderAt('/vendor/slots/rental-applications', <RentalApplicationsScreen />);

    expect(await screen.findByText('boom')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
  });
});

describe('Hợp đồng thuê ô', () => {
  beforeEach(() => {
    api.listContracts.mockResolvedValue([
      contract(1, 'ACTIVE', 73),
      contract(2, 'ACTIVE', 12),
      contract(3, 'EXPIRED', -30),
      contract(4, 'CANCELLED', -10, { cancellationReason: 'Trả lại mặt bằng' }),
    ]);
  });

  it('shows live contracts with days left and price, and hides ended ones until expanded', async () => {
    const user = userEvent.setup();
    renderAt('/vendor/slots/contracts', <ContractsListScreen />);

    expect(await screen.findByText('NVL-1')).toBeInTheDocument();
    expect(screen.getByText('Còn 73 ngày')).toBeInTheDocument();
    expect(screen.getByText('Còn 12 ngày')).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText('30.000 đ')).toHaveLength(2));
    expect(screen.queryByText('NVL-3')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Đã kết thúc/ }));

    expect(screen.getByText('NVL-3')).toBeInTheDocument();
    expect(screen.getByText(/Trả lại mặt bằng/)).toBeInTheDocument();
  });

  it('flags only the contract close to its end and renews it from the card', async () => {
    const user = userEvent.setup();
    renderAt('/vendor/slots/contracts', <ContractsListScreen />);
    await screen.findByText('NVL-2');

    expect(screen.getAllByText('Sắp hết hạn')).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Gia hạn' }));

    expect(await screen.findByText('renewal page')).toBeInTheDocument();
  });

  it('says so when there are no contracts', async () => {
    api.listContracts.mockResolvedValue([]);
    renderAt('/vendor/slots/contracts', <ContractsListScreen />);

    expect(await screen.findByText('Chưa có hợp đồng nào')).toBeInTheDocument();
  });
});

describe('Chuyển nhượng ô', () => {
  beforeEach(() => {
    api.listTransfers.mockImplementation(async (direction: string) =>
      direction === 'incoming'
        ? [transfer(1, 'PENDING'), transfer(2, 'APPROVED')]
        : [
            transfer(3, 'PENDING'),
            transfer(4, 'ACCEPTED_BY_RECEIVER'),
            transfer(5, 'APPROVED'),
            transfer(6, 'REJECTED', { reviewDecisionReason: 'Hộ nhận chưa xác thực CCCD' }),
          ],
    );
    api.listContracts.mockResolvedValue([contract(1, 'ACTIVE', 60)]);
  });

  it('lists only the incoming requests waiting on the vendor, with a count', async () => {
    renderAt('/vendor/slots/transfers', <TransfersListScreen />);

    expect(await screen.findByText('1 cần xử lý')).toBeInTheDocument();
    expect(screen.getByText('CHỜ BẠN XÁC NHẬN')).toBeInTheDocument();
    expect(await screen.findByText('Mã ô: C-301')).toBeInTheDocument();
    expect(screen.queryByText('Mã ô: C-302')).not.toBeInTheDocument();
  });

  it('shows the slot and term of a request from the request itself, since the receiver cannot read the contract', async () => {
    renderAt('/vendor/slots/transfers', <TransfersListScreen />);

    expect(await screen.findByText('Mã ô: C-301')).toBeInTheDocument();
    expect(screen.getAllByText('Đường Lê Duẩn').length).toBeGreaterThan(0);
    expect(screen.getByText(/Thời hạn thuê: 1\/9\/2026 – 1\/12\/2026/)).toBeInTheDocument();
    expect(api.getContract).not.toHaveBeenCalled();
  });

  it('shows how far each sent request got, and why a rejected one was refused', async () => {
    renderAt('/vendor/slots/transfers', <TransfersListScreen />);

    expect(await screen.findByText('Mã ô: C-303')).toBeInTheDocument();
    expect(screen.getAllByRole('list').filter((l) => l.tagName === 'OL')).toHaveLength(3);
    expect(screen.getAllByText('Bên nhận đồng ý')).toHaveLength(3);
    expect(screen.getByText(/Hộ nhận chưa xác thực CCCD/)).toBeInTheDocument();
  });

  it('accepts from the card by opening the accept page', async () => {
    const user = userEvent.setup();
    renderAt('/vendor/slots/transfers', <TransfersListScreen />);

    await user.click(await screen.findByRole('button', { name: 'Xem & chấp nhận' }));

    expect(await screen.findByText('accept page')).toBeInTheDocument();
  });

  it('declines only after the vendor confirms', async () => {
    const user = userEvent.setup();
    api.declineTransfer.mockResolvedValue({ message: 'Đã từ chối yêu cầu.' });
    renderAt('/vendor/slots/transfers', <TransfersListScreen />);

    await user.click(await screen.findByRole('button', { name: 'Từ chối' }));
    expect(api.declineTransfer).not.toHaveBeenCalled();
    expect(screen.getByText('Từ chối yêu cầu chuyển nhượng?')).toBeInTheDocument();

    const dialog = screen.getByText('Từ chối yêu cầu chuyển nhượng?').closest('div')!.parentElement!;
    await user.click(within(dialog).getByRole('button', { name: 'Từ chối' }));

    await waitFor(() => expect(api.declineTransfer).toHaveBeenCalledWith(1));
  });

  it('cancelling the confirmation declines nothing', async () => {
    const user = userEvent.setup();
    renderAt('/vendor/slots/transfers', <TransfersListScreen />);

    await user.click(await screen.findByRole('button', { name: 'Từ chối' }));
    await user.click(screen.getByRole('button', { name: 'Huỷ' }));

    expect(api.declineTransfer).not.toHaveBeenCalled();
    expect(screen.queryByText('Từ chối yêu cầu chuyển nhượng?')).not.toBeInTheDocument();
  });

  it('starts a transfer straight away when the vendor has one active contract', async () => {
    const user = userEvent.setup();
    renderAt('/vendor/slots/transfers', <TransfersListScreen />);

    await user.click(await screen.findByRole('button', { name: 'Tạo yêu cầu' }));

    expect(await screen.findByText('transfer page')).toBeInTheDocument();
  });

  it('asks which contract when there are several', async () => {
    const user = userEvent.setup();
    api.listContracts.mockResolvedValue([contract(1, 'ACTIVE', 60), contract(2, 'ACTIVE', 30), contract(3, 'EXPIRED', -5)]);
    renderAt('/vendor/slots/transfers', <TransfersListScreen />);

    await user.click(await screen.findByRole('button', { name: 'Tạo yêu cầu' }));

    expect(screen.getByText('Chọn ô muốn chuyển nhượng')).toBeInTheDocument();
    expect(screen.getByText('NVL-2')).toBeInTheDocument();
    expect(screen.queryByText('NVL-3')).not.toBeInTheDocument();
    await user.click(screen.getByText('NVL-2'));
    expect(await screen.findByText('transfer page')).toBeInTheDocument();
  });
});
