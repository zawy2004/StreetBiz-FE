import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { vendorRegistrationApi } from '@/core/api';
import { wardApi } from '@/features/ward-administration/ward-api';
import {
  wardFinanceApi,
  type WardFinanceContractDetail,
  type WardFinanceContractItem,
  type WardPenaltyReceipt,
} from '@/features/ward-administration/ward-finance-api';
import { WardFinanceScreen } from '@/features/ward-administration/screens/WardFinanceScreen';
import { useAuthStore } from '@/store/auth-store';

vi.mock('@/core/config/env', () => ({
  env: { apiBaseUrl: 'https://api.example.test/api', useMockApi: false, appEnv: 'test' },
  isDev: true,
  isLiveApi: true,
}));

/**
 * Fines are paid to the State Treasury, not through StreetBiz: the ward checks the receipt a
 * household sends, records the fine as paid, and records a decision annulled after payment.
 */

const listItem: WardFinanceContractItem = {
  contractId: 7,
  slotCode: 'NVL-01',
  zoneName: 'Đường Nguyễn Văn Linh',
  vendorName: 'Xe bánh mì Hai',
  vendorPhone: '0905000101',
  contractStatus: 'ACTIVE',
  startDate: '2026-09-01',
  endDate: '2026-11-29',
  outstanding: 0,
  overdueCount: 0,
  unpaidPenalties: 500_000,
  depositPaid: 0,
  depositRefunded: false,
};

const waiting: WardPenaltyReceipt = {
  receipt: {
    receiptId: 21,
    penaltyId: 3,
    status: 'SUBMITTED',
    receiptUrl: '/api/uploads/evidence/7/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.jpg',
    reference: 'KB-2026-77',
    paidOn: '2026-10-20',
    note: 'Nộp tại Kho bạc Hải Châu',
    submittedAt: '2026-10-20T03:00:00Z',
    reviewedAt: null,
    reviewNote: null,
  },
  vendorName: 'Xe bánh mì Hai',
  amount: 500_000,
  decisionNumber: 'QĐXP-1',
  violationLabel: 'Lấn ô',
  slotCode: 'NVL-01',
  penaltyStatus: 'UNPAID',
  reviewedByName: null,
};

const decided: WardPenaltyReceipt = {
  ...waiting,
  receipt: {
    ...waiting.receipt,
    receiptId: 20,
    status: 'REJECTED',
    reviewNote: 'Ảnh mờ',
    reviewedAt: '2026-10-19T03:00:00Z',
  },
  reviewedByName: 'Cán bộ An',
};

const detail = (penaltyStatus: 'PAID' | 'CANCELLED' | 'UNPAID'): WardFinanceContractDetail => ({
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
  scheduleTotal: 0,
  outstanding: 0,
  items: [],
  penalties: [
    {
      penaltyId: 3,
      violationId: 9,
      violationType: 'Lấn ô',
      amount: 500_000,
      status: penaltyStatus,
      decisionNumber: 'QĐXP-1',
      createdAt: '2026-09-10T03:00:00Z',
      paidAt: penaltyStatus === 'PAID' ? '2026-09-12T03:00:00Z' : null,
      waiverReason: null,
    },
  ],
  depositPaid: 0,
  depositRefund: null,
  canRefundDeposit: false,
  refundBlockedReason: null,
  slotPriceOverride: null,
  zonePrice: 900_000,
});

function Where() {
  return <p>AT {useLocation().pathname}</p>;
}

function mount(path: string) {
  useAuthStore.setState({
    user: {
      id: '1', fullName: 'Ward', phone: '0983000001', password: '', role_code: 'WARD_AUTHORITY',
      wardUnitId: 1, account_status: 'ACTIVE',
    },
    sessionExpired: false,
  });
  vi.spyOn(wardApi, 'me').mockResolvedValue({ userId: '1', wardId: 1, name: 'Ward', sanctionAuthorityTitle: null });
  // The receipt file is opened with the bearer token; nothing here needs its bytes.
  vi.spyOn(vendorRegistrationApi, 'downloadEvidenceFile').mockRejectedValue(new Error('no file in test'));
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/ward/finance" element={<WardFinanceScreen />} />
          <Route path="/ward/finance/payout-account" element={<Where />} />
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

describe('Ward finance: Treasury receipts of fines', () => {
  beforeEach(() => {
    vi.spyOn(wardFinanceApi, 'listContracts').mockResolvedValue([listItem]);
  });

  it('lists the receipts waiting for a check, with what the household wrote', async () => {
    vi.spyOn(wardFinanceApi, 'penaltyReceipts').mockResolvedValue([waiting, decided]);
    mount('/ward/finance');

    expect(await screen.findByRole('heading', { name: 'Biên lai nộp phạt' })).toBeInTheDocument();
    const row = (await screen.findByText(/Xe bánh mì Hai · Lấn ô/)).closest('li') as HTMLElement;
    expect(within(row).getByText('CHỜ KIỂM TRA')).toBeInTheDocument();
    expect(within(row).getByText('Số chứng từ: KB-2026-77')).toBeInTheDocument();
    expect(within(row).getByText('QĐ số QĐXP-1')).toBeInTheDocument();
    expect(within(row).getByText('Hộ ghi: Nộp tại Kho bạc Hải Châu')).toBeInTheDocument();
    // The decided receipt is on the other tab.
    expect(screen.getAllByText(/Xe bánh mì Hai · Lấn ô/)).toHaveLength(1);
  });

  it('records the fine as paid only after the officer says the receipt was checked', async () => {
    vi.spyOn(wardFinanceApi, 'penaltyReceipts').mockResolvedValue([waiting]);
    const accept = vi
      .spyOn(wardFinanceApi, 'acceptPenaltyReceipt')
      .mockResolvedValue({ message: 'Đã ghi nhận khoản phạt đã nộp vào Kho bạc và phát hành hoá đơn.' });
    mount('/ward/finance');

    fireEvent.click(await screen.findByRole('button', { name: 'Đã đối chiếu, ghi nhận đã nộp' }));
    const panel = await screen.findByRole('group', { name: 'Ghi nhận đã nộp Kho bạc' });
    expect(within(panel).getByText(/Chỉ ghi nhận sau khi đã đối chiếu với Kho bạc/)).toBeInTheDocument();
    expect(accept).not.toHaveBeenCalled();
    fireEvent.change(within(panel).getByLabelText('Ghi chú (nếu có)'), {
      target: { value: 'Khớp số tiền và ngày' },
    });
    fireEvent.click(within(panel).getByRole('button', { name: 'Ghi nhận đã nộp' }));

    await waitFor(() => expect(accept).toHaveBeenCalledWith(21, 'Khớp số tiền và ngày'));
  });

  it('will not turn a receipt down without a reason, then sends it back with the reason', async () => {
    vi.spyOn(wardFinanceApi, 'penaltyReceipts').mockResolvedValue([waiting]);
    const reject = vi
      .spyOn(wardFinanceApi, 'rejectPenaltyReceipt')
      .mockResolvedValue({ message: 'Đã gửi lại biên lai cho hộ.' });
    mount('/ward/finance');

    fireEvent.click(await screen.findByRole('button', { name: 'Chưa chấp nhận' }));
    const panel = await screen.findByRole('group', { name: 'Từ chối biên lai' });
    const send = within(panel).getByRole('button', { name: 'Gửi lại cho hộ' });
    expect(send).toBeDisabled();

    fireEvent.change(within(panel).getByLabelText('Lý do *'), { target: { value: 'Ảnh mờ' } });
    expect(send).not.toBeDisabled();
    fireEvent.click(send);

    await waitFor(() => expect(reject).toHaveBeenCalledWith(21, 'Ảnh mờ'));
  });

  it('shows the receipts already handled, with who handled them, on their own tab', async () => {
    vi.spyOn(wardFinanceApi, 'penaltyReceipts').mockResolvedValue([waiting, decided]);
    mount('/ward/finance');

    fireEvent.click(await screen.findByRole('tab', { name: /Đã xử lý \(1\)/ }));

    expect(await screen.findByText('CHƯA CHẤP NHẬN')).toBeInTheDocument();
    expect(screen.getByText('Phường ghi: Ảnh mờ')).toBeInTheDocument();
    expect(screen.getByText('Xử lý bởi Cán bộ An')).toBeInTheDocument();
    // A decided receipt has nothing left to press.
    expect(screen.queryByRole('button', { name: 'Chưa chấp nhận' })).not.toBeInTheDocument();
  });

  it('stays out of the way when no household has ever sent a receipt', async () => {
    vi.spyOn(wardFinanceApi, 'penaltyReceipts').mockResolvedValue([]);
    mount('/ward/finance');

    expect(await screen.findByRole('button', { name: /NVL-01.*Xe bánh mì Hai/ })).toBeInTheDocument();
    await waitFor(() => expect(wardFinanceApi.penaltyReceipts).toHaveBeenCalled());
    expect(screen.queryByRole('heading', { name: 'Biên lai nộp phạt' })).not.toBeInTheDocument();
  });

  it('opens the ward\'s receiving account from the header', async () => {
    vi.spyOn(wardFinanceApi, 'penaltyReceipts').mockResolvedValue([]);
    mount('/ward/finance');

    fireEvent.click(await screen.findByRole('button', { name: 'Tài khoản nhận phí' }));

    expect(await screen.findByText('AT /ward/finance/payout-account')).toBeInTheDocument();
  });
});

describe('Ward finance: a decision annulled after the fine was paid', () => {
  beforeEach(() => {
    vi.spyOn(wardFinanceApi, 'penaltyReceipts').mockResolvedValue([]);
  });

  it('offers the annulment only on a paid fine, and asks for the reason', async () => {
    vi.spyOn(wardFinanceApi, 'getContract').mockResolvedValue(detail('PAID'));
    const annul = vi
      .spyOn(wardFinanceApi, 'annulPaidPenalty')
      .mockResolvedValue({ message: 'Đã ghi nhận huỷ quyết định xử phạt 500.000 đ.' });
    mount('/ward/finance/7');

    fireEvent.click(await screen.findByRole('button', { name: 'Quyết định đã bị huỷ' }));
    const panel = await screen.findByRole('group', { name: 'Ghi nhận quyết định xử phạt đã bị huỷ' });
    expect(within(panel).getByText(/do Kho bạc hoàn trả, StreetBiz không giữ/)).toBeInTheDocument();
    const confirm = within(panel).getByRole('button', { name: 'Xác nhận huỷ quyết định' });
    expect(confirm).toBeDisabled();

    fireEvent.change(within(panel).getByLabelText(/Lý do huỷ quyết định/), {
      target: { value: 'Huỷ theo kết luận khiếu nại' },
    });
    fireEvent.click(confirm);

    await waitFor(() => expect(annul).toHaveBeenCalledWith(3, 'Huỷ theo kết luận khiếu nại'));
  });

  it('offers no annulment on a fine that is not paid, and calls an annulled one by its name', async () => {
    vi.spyOn(wardFinanceApi, 'getContract').mockResolvedValue(detail('UNPAID'));
    mount('/ward/finance/7');
    expect(await screen.findByRole('button', { name: 'Ghi nhận đã thu' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Quyết định đã bị huỷ' })).not.toBeInTheDocument();
    cleanup();

    vi.spyOn(wardFinanceApi, 'getContract').mockResolvedValue(detail('CANCELLED'));
    mount('/ward/finance/7');
    expect(await screen.findByText('QUYẾT ĐỊNH ĐÃ HUỶ')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Quyết định đã bị huỷ' })).not.toBeInTheDocument();
  });
});
