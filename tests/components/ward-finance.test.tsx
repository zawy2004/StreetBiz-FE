import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { wardApi } from '@/features/ward-administration/ward-api';
import {
  wardFinanceApi,
  type WardFinanceContractDetail,
  type WardFinanceContractItem,
} from '@/features/ward-administration/ward-finance-api';
import { WardFinanceScreen } from '@/features/ward-administration/screens/WardFinanceScreen';
import { useAuthStore } from '@/store/auth-store';

vi.mock('@/core/config/env', () => ({
  env: { apiBaseUrl: 'https://api.example.test/api', useMockApi: false, appEnv: 'test' },
  isDev: true,
  isLiveApi: true,
}));

const listItem: WardFinanceContractItem = {
  contractId: 7,
  slotCode: 'NVL-01',
  zoneName: 'Đường Nguyễn Văn Linh',
  vendorName: 'Xe bánh mì Hai',
  vendorPhone: '0905000101',
  contractStatus: 'ACTIVE',
  startDate: '2026-09-01',
  endDate: '2026-11-29',
  outstanding: 1_800_000,
  overdueCount: 1,
  unpaidPenalties: 500_000,
  depositPaid: 500_000,
  depositRefunded: false,
};

const detail: WardFinanceContractDetail = {
  contractId: 7,
  slotId: 1,
  slotCode: 'NVL-01',
  zoneName: 'Đường Nguyễn Văn Linh',
  rentalMode: 'STANDARD',
  vendorName: 'Xe bánh mì Hai',
  vendorPhone: '0905000101',
  contractStatus: 'ACTIVE',
  startDate: '2026-09-01',
  endDate: '2026-11-29',
  scheduleTotal: 3_350_000,
  outstanding: 1_800_000,
  items: [
    {
      feeItemId: 11, ordinal: 1, dueDate: '2026-09-01', amount: 1_550_000, depositAmount: 500_000,
      status: 'PAID', paidAt: '2026-09-02T03:00:00Z', originalAmount: null, adjustedAt: null,
      adjustmentReason: null, canEdit: false,
    },
    {
      feeItemId: 12, ordinal: 2, dueDate: '2026-09-20', amount: 900_000, depositAmount: 0,
      status: 'OVERDUE', paidAt: null, originalAmount: null, adjustedAt: null,
      adjustmentReason: null, canEdit: true,
    },
  ],
  penalties: [
    {
      penaltyId: 3, violationId: 9, violationType: 'Lấn ô', amount: 500_000, status: 'UNPAID',
      decisionNumber: 'QD-1', createdAt: '2026-09-10T03:00:00Z', paidAt: null, waiverReason: null,
    },
  ],
  depositPaid: 500_000,
  depositRefund: null,
  canRefundDeposit: false,
  refundBlockedReason: 'Hợp đồng còn hiệu lực. Chỉ hoàn cọc khi hợp đồng đã hết hạn hoặc đã chấm dứt.',
  slotPriceOverride: null,
  zonePrice: 900_000,
};

function mount(path: string) {
  useAuthStore.setState({
    user: {
      id: '1', fullName: 'Ward', phone: '0983000001', password: '', role_code: 'WARD_AUTHORITY',
      wardUnitId: 1, account_status: 'ACTIVE',
    },
    sessionExpired: false,
  });
  vi.spyOn(wardApi, 'me').mockResolvedValue({ userId: '1', wardId: 1, name: 'Ward', sanctionAuthorityTitle: null });
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/ward/finance" element={<WardFinanceScreen />} />
          <Route path="/ward/finance/:contractId" element={<WardFinanceScreen />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  useAuthStore.setState({ user: null, sessionExpired: false });
});

describe('Ward finance: manual money handling', () => {
  it('lists the ward contracts with what is owed and opens one', async () => {
    vi.spyOn(wardFinanceApi, 'listContracts').mockResolvedValue([listItem]);
    vi.spyOn(wardFinanceApi, 'getContract').mockResolvedValue(detail);
    mount('/ward/finance');

    fireEvent.click(await screen.findByRole('button', { name: /NVL-01.*Xe bánh mì Hai/ }));

    expect(await screen.findByText('Các kỳ phí')).toBeInTheDocument();
    expect(wardFinanceApi.getContract).toHaveBeenCalledWith(7);
  });

  it('will not adjust an instalment without a reason, then sends amount, date and reason', async () => {
    vi.spyOn(wardFinanceApi, 'getContract').mockResolvedValue(detail);
    const adjust = vi
      .spyOn(wardFinanceApi, 'adjustFeeItem')
      .mockResolvedValue({ message: 'Đã điều chỉnh kỳ phí thành 700.000 đ.' });
    mount('/ward/finance/7');

    fireEvent.click(await screen.findByRole('button', { name: 'Sửa số tiền / hạn' }));
    const panel = await screen.findByRole('group', { name: 'Điều chỉnh kỳ phí' });
    const save = within(panel).getByRole('button', { name: 'Lưu điều chỉnh' });
    expect(save).toBeDisabled();

    fireEvent.change(within(panel).getByLabelText('Số tiền mới'), { target: { value: '700000' } });
    fireEvent.change(within(panel).getByLabelText(/Lý do điều chỉnh/), { target: { value: 'Giảm theo QĐ 12' } });
    expect(save).not.toBeDisabled();
    fireEvent.click(save);

    await waitFor(() =>
      expect(adjust).toHaveBeenCalledWith(12, {
        newAmount: 700_000,
        newDueDate: '2026-09-20',
        reason: 'Giảm theo QĐ 12',
      }),
    );
  });

  it('records a payment taken in person only with a receipt reference', async () => {
    vi.spyOn(wardFinanceApi, 'getContract').mockResolvedValue(detail);
    const record = vi
      .spyOn(wardFinanceApi, 'recordOfflinePayment')
      .mockResolvedValue({ message: 'Đã ghi nhận khoản thu.' });
    mount('/ward/finance/7');

    const buttons = await screen.findAllByRole('button', { name: 'Ghi nhận đã thu' });
    fireEvent.click(buttons[0]!); // the overdue instalment comes first
    const panel = await screen.findByRole('group', { name: 'Ghi nhận khoản đã thu ngoài hệ thống' });
    const confirm = within(panel).getByRole('button', { name: /Ghi nhận & phát hành hoá đơn/ });
    expect(confirm).toBeDisabled();

    fireEvent.change(within(panel).getByLabelText(/Số biên lai/), { target: { value: 'BL-0042' } });
    fireEvent.click(confirm);

    await waitFor(() =>
      expect(record).toHaveBeenCalledWith({
        target: 'FEE', targetId: 12, method: 'CASH', reference: 'BL-0042', note: null,
      }),
    );
  });

  it('explains why a deposit cannot be refunded yet', async () => {
    vi.spyOn(wardFinanceApi, 'getContract').mockResolvedValue(detail);
    mount('/ward/finance/7');

    expect(await screen.findByText(/Hợp đồng còn hiệu lực/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Hoàn cọc' })).not.toBeInTheDocument();
  });
});
