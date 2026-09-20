import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import type { RentalContract } from '@/core/api/side-api';
import { SideApiError } from '@/core/api/side-api';

const api = vi.hoisted(() => ({ getContract: vi.fn(), getSlot: vi.fn(), requestTransfer: vi.fn() }));

vi.mock('@/core/api/side-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/api/side-api')>();
  return { ...actual, sideApi: { ...actual.sideApi, ...api } };
});

const { ContractDetailScreen } = await import('@/features/rental-contracts/screens/ContractDetailScreen');
const { TransferInitiateScreen } = await import('@/features/rental-contracts/screens/TransferInitiateScreen');

const isoDay = (offsetDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const contract = (contractStatus: string, endInDays: number, extra: Partial<RentalContract> = {}) =>
  ({
    contractId: 5,
    slotId: 14,
    slotCode: 'NVL-14',
    zoneName: 'Đường Nguyễn Văn Linh',
    startDate: isoDay(endInDays - 90),
    endDate: isoDay(endInDays),
    contractStatus,
    cancellationReason: null,
    ...extra,
  }) as RentalContract;

function renderAt(path: string, routePath: string, element: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={routePath} element={element} />
          <Route path="/vendor/slots/contracts/:id/permit" element={<div>permit page</div>} />
          <Route path="/vendor/slots/contracts/:id/renewal" element={<div>renewal page</div>} />
          <Route path="/vendor/slots/contracts/:id/transfer" element={<div>transfer page</div>} />
          <Route path="/vendor/slots/contracts/:id/return" element={<div>return page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  api.getSlot.mockResolvedValue({
    slotId: 14,
    pricePerDay: 30000,
    widthMeters: 2,
    lengthMeters: 3,
    availableFrom: '05:00:00',
    availableTo: '22:00:00',
  });
});

describe('Chi tiết hợp đồng', () => {
  const open = () => renderAt('/vendor/slots/contracts/5', '/vendor/slots/contracts/:id', <ContractDetailScreen />);

  it('shows the price, term, slot details and status of an active contract', async () => {
    api.getContract.mockResolvedValue(contract('ACTIVE', 73));
    open();

    expect(await screen.findByText('30.000 đ')).toBeInTheDocument();
    expect(screen.getByText('Còn 73 ngày')).toBeInTheDocument();
    expect(screen.getByText('ĐANG HOẠT ĐỘNG')).toBeInTheDocument();
    expect(screen.getByText('2 × 3 m · 6 m²')).toBeInTheDocument();
    expect(screen.getByText('05:00 – 22:00')).toBeInTheDocument();
    expect(screen.getByText('#5')).toBeInTheDocument();
    expect(screen.queryByText(/sắp hết hạn/i)).not.toBeInTheDocument();
  });

  it('leaves out the slot rows it does not know rather than guessing', async () => {
    api.getContract.mockResolvedValue(contract('ACTIVE', 73));
    api.getSlot.mockResolvedValue({
      slotId: 14,
      pricePerDay: 30000,
      widthMeters: null,
      lengthMeters: null,
      availableFrom: null,
      availableTo: null,
    });
    open();

    await screen.findByText('30.000 đ');
    expect(screen.queryByText('Kích thước')).not.toBeInTheDocument();
    expect(screen.getByText('Cả ngày')).toBeInTheDocument();
  });

  it.each([
    ['Giấy phép QR', 'permit page'],
    ['Gia hạn', 'renewal page'],
    ['Chuyển nhượng', 'transfer page'],
    ['Trả ô', 'return page'],
  ])('opens %s from its row', async (title, page) => {
    const user = userEvent.setup();
    api.getContract.mockResolvedValue(contract('ACTIVE', 73));
    open();

    await user.click(await screen.findByRole('button', { name: new RegExp(title) }));

    expect(await screen.findByText(page)).toBeInTheDocument();
  });

  it('warns when the contract is close to its end', async () => {
    api.getContract.mockResolvedValue(contract('ACTIVE', 9));
    open();

    expect(await screen.findByText(/Hợp đồng sắp hết hạn/)).toBeInTheDocument();
  });

  it('offers no actions on a cancelled contract and shows why it was cancelled', async () => {
    api.getContract.mockResolvedValue(contract('CANCELLED', -10, { cancellationReason: 'Trả lại mặt bằng' }));
    open();

    expect(await screen.findByText(/Trả lại mặt bằng/)).toBeInTheDocument();
    expect(screen.queryByText('Thao tác')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Gia hạn/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/Còn \d+ ngày/)).not.toBeInTheDocument();
  });

  it('shows an error with a retry when the contract cannot be loaded', async () => {
    api.getContract.mockRejectedValue(new Error('boom'));
    open();

    expect(await screen.findByText('boom')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
  });
});

describe('Chuyển nhượng ô: tạo yêu cầu', () => {
  const open = () =>
    renderAt('/vendor/slots/contracts/5/transfer', '/vendor/slots/contracts/:id/transfer', <TransferInitiateScreen />);

  beforeEach(() => {
    api.getContract.mockResolvedValue(contract('ACTIVE', 60));
  });

  it('shows which slot is being transferred and how the process goes', async () => {
    open();

    expect(await screen.findByText('NVL-14')).toBeInTheDocument();
    expect(screen.getByText('Đường Nguyễn Văn Linh')).toBeInTheDocument();
    expect(screen.getByText('Còn 60 ngày')).toBeInTheDocument();
    expect(screen.getByText(/Phường duyệt thì việc chuyển nhượng mới có hiệu lực/)).toBeInTheDocument();
  });

  it('refuses a phone number that is too short without calling the API', async () => {
    const user = userEvent.setup();
    open();

    await user.type(await screen.findByLabelText('Số điện thoại người nhận'), '123');
    await user.click(screen.getByRole('button', { name: 'Gửi yêu cầu' }));

    expect(await screen.findByText('Số điện thoại chưa hợp lệ.')).toBeInTheDocument();
    expect(api.requestTransfer).not.toHaveBeenCalled();
  });

  it('sends the request for this contract and the typed number', async () => {
    const user = userEvent.setup();
    api.requestTransfer.mockResolvedValue({ message: 'Đã gửi yêu cầu.' });
    open();

    await user.type(await screen.findByLabelText('Số điện thoại người nhận'), '905999997');
    await user.click(screen.getByRole('button', { name: 'Gửi yêu cầu' }));

    await waitFor(() => expect(api.requestTransfer).toHaveBeenCalledWith({ contractId: 5, toVendorPhone: '905999997' }));
  });

  it('shows the reason the server refuses, apart from the phone field', async () => {
    const user = userEvent.setup();
    api.requestTransfer.mockRejectedValue(
      new SideApiError(409, 'Cannot transfer a slot while fees are overdue or penalties unpaid.'),
    );
    open();

    await user.type(await screen.findByLabelText('Số điện thoại người nhận'), '905999997');
    await user.click(screen.getByRole('button', { name: 'Gửi yêu cầu' }));

    expect(await screen.findByText(/fees are overdue/)).toBeInTheDocument();
    expect(screen.queryByText('Số điện thoại chưa hợp lệ.')).not.toBeInTheDocument();
  });
});
