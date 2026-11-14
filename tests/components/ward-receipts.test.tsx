import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { wardReportApi, type WardReceiptDto } from '@/core/api';
import { wardApi } from '@/features/ward-administration/ward-api';
import { wardFinanceApi } from '@/features/ward-administration/ward-finance-api';
import { WardReceiptsScreen } from '@/features/ward-administration/screens/WardReceiptsScreen';
import { WardFinanceScreen } from '@/features/ward-administration/screens/WardFinanceScreen';
import { periodFor } from '@/features/ward-administration/components/ops/report/report-model';
import {
  filterReceipts,
  methodLabel,
  receiptState,
  receiptTotals,
  referenceLabel,
} from '@/features/ward-administration/components/finance/receipt-view';
import { useAuthStore } from '@/store/auth-store';

const saved = vi.hoisted(() => vi.fn());

vi.mock('@/core/config/env', () => ({
  env: { apiBaseUrl: 'https://api.example.test/api', useMockApi: false, appEnv: 'test' },
  isDev: true,
  isLiveApi: true,
}));
vi.mock('@/core/utils/save-file', () => ({ saveFile: saved }));

/** "Lịch sử thu": the ward's receipts one by one, with how each was paid and its PDF. */

const paidByPayOs: WardReceiptDto = {
  invoiceId: 101,
  invoiceNumber: 'HD-2026-000004',
  issuedAt: '2026-11-07T09:07:00Z',
  kind: 'FEE',
  payerName: 'Phạm Thị Lan',
  payerPhone: '0905000101',
  slotCode: 'NVL-01',
  description: 'Phí thuê ô NVL-01 — Kỳ 3/3 · Tháng 12/2026',
  amount: 10_000,
  provider: 'PAYOS',
  providerReference: 'PAYOS-14001',
  paymentStatus: 'SUCCESS',
};
const annulledFine: WardReceiptDto = {
  invoiceId: 102,
  invoiceNumber: 'HD-2026-000003',
  issuedAt: '2026-11-06T03:00:00Z',
  kind: 'PENALTY',
  payerName: 'Phạm Thị Lan',
  payerPhone: '0905000101',
  slotCode: 'NVL-08',
  description: 'Tiền phạt: Cản trở lối đi bộ (QĐ QĐXP-1)',
  amount: 1_000_000,
  provider: 'TREASURY',
  providerReference: 'KB-0003',
  paymentStatus: 'REFUNDED',
};
const takenInPerson: WardReceiptDto = {
  invoiceId: 103,
  invoiceNumber: 'HD-2026-000002',
  issuedAt: '2026-11-05T03:00:00Z',
  kind: 'FEE',
  payerName: 'Hoàng Văn Tám',
  payerPhone: null,
  slotCode: 'NVL-02',
  description: 'Phí thuê ô NVL-02 — Kỳ 1/3 · Tháng 11/2026',
  amount: 900_000,
  provider: 'CASH',
  providerReference: 'PT-001',
  paymentStatus: 'SUCCESS',
};
const all = [paidByPayOs, annulledFine, takenInPerson];

function Where() {
  return <p>AT {useLocation().pathname}</p>;
}

function mount(path = '/ward/finance/receipts') {
  useAuthStore.setState({
    user: {
      id: '1', fullName: 'Ward', phone: '0983000001', password: '', role_code: 'WARD_AUTHORITY',
      wardUnitId: 10, account_status: 'ACTIVE',
    },
    sessionExpired: false,
  });
  vi.spyOn(wardApi, 'me').mockResolvedValue({ userId: '1', wardId: 10, name: 'Ward', sanctionAuthorityTitle: null });
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/ward/finance" element={<WardFinanceScreen />} />
          <Route path="/ward/finance/receipts" element={<WardReceiptsScreen />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const answer = (items: WardReceiptDto[]) =>
  vi.spyOn(wardReportApi, 'receipts').mockImplementation(async (from, to) => ({
    from: from ?? '2026-11-01',
    to: to ?? '2026-11-07',
    items,
  }));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  saved.mockReset();
  useAuthStore.setState({ user: null, sessionExpired: false });
});

describe('Ward receipt history', () => {
  it("asks for this month's receipts and lists each with how it was paid and the reference to check", async () => {
    const receipts = answer(all);
    mount();

    const row = (await screen.findByText('Phí thuê ô NVL-01 — Kỳ 3/3 · Tháng 12/2026')).closest('li') as HTMLElement;
    const thisMonth = periodFor('THIS_MONTH', new Date());
    expect(receipts).toHaveBeenCalledWith(thisMonth.from, thisMonth.to);
    expect(within(row).getByText('Phạm Thị Lan')).toBeInTheDocument();
    expect(within(row).getByText(/Chuyển khoản VietQR \(payOS\) · Mã đơn payOS 14001/)).toBeInTheDocument();
    expect(within(row).getByText(/Hoá đơn HD-2026-000004 · 0905000101/)).toBeInTheDocument();
    expect(within(row).getByText('ĐÃ THU')).toBeInTheDocument();

    const fine = screen.getByText('Tiền phạt: Cản trở lối đi bộ (QĐ QĐXP-1)').closest('li') as HTMLElement;
    expect(within(fine).getByText(/Nộp Kho bạc · Biên lai Kho bạc KB-0003/)).toBeInTheDocument();
    expect(within(fine).getByText('ĐÃ HOÀN TIỀN')).toBeInTheDocument();
  });

  it('totals what was taken in, leaving out money owed back or returned', async () => {
    answer(all);
    mount();

    const total = await screen.findByRole('region', { name: 'Tổng thu' });
    expect(within(total).getByText('910.000 đ')).toBeInTheDocument();
    expect(within(total).getByText('3 khoản')).toBeInTheDocument();
    expect(within(total).getByText(/Không tính 1.000.000 đ của 1 khoản/)).toBeInTheDocument();
  });

  it('narrows the list by kind, by method and by a search that ignores accents', async () => {
    answer(all);
    mount();
    await screen.findByText('Phí thuê ô NVL-01 — Kỳ 3/3 · Tháng 12/2026');

    fireEvent.click(screen.getByRole('tab', { name: 'Tiền phạt' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText('Tiền phạt: Cản trở lối đi bộ (QĐ QĐXP-1)')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Tất cả' }));
    fireEvent.click(screen.getByRole('tab', { name: /Tiền mặt/ }));
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText('Hoàng Văn Tám')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Tổng thu' })).getByText('Đã thu (theo bộ lọc)')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /Mọi hình thức/ }));
    fireEvent.change(screen.getByPlaceholderText(/Tìm theo hộ/), { target: { value: 'pham thi 14001' } });
    expect(screen.queryByText('Hoàng Văn Tám')).not.toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText(/Tìm theo hộ/), { target: { value: 'không có ai' } });
    expect(screen.getByText('Không có khoản thu nào khớp bộ lọc')).toBeInTheDocument();
  });

  it('downloads the receipt as the household’s PDF', async () => {
    answer([paidByPayOs]);
    const blob = new Blob(['%PDF'], { type: 'application/pdf' });
    const pdf = vi.spyOn(wardReportApi, 'receiptPdf').mockResolvedValue(blob);
    mount();

    fireEvent.click(await screen.findByRole('button', { name: 'Tải hoá đơn PDF' }));

    await waitFor(() => expect(saved).toHaveBeenCalledWith(blob, 'HD-2026-000004.pdf'));
    expect(pdf).toHaveBeenCalledWith(101);
  });

  it("asks again for last month's receipts and says when there are none", async () => {
    const receipts = answer([]);
    mount();

    expect(await screen.findByText('Chưa có khoản thu nào trong kỳ này')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Tháng trước' }));

    const lastMonth = periodFor('LAST_MONTH', new Date());
    await waitFor(() => expect(receipts).toHaveBeenCalledWith(lastMonth.from, lastMonth.to));
  });

  it('shows a failed read with a way to try again', async () => {
    const receipts = vi
      .spyOn(wardReportApi, 'receipts')
      .mockRejectedValueOnce(new Error('Mất kết nối'))
      .mockResolvedValue({ from: '2026-11-01', to: '2026-11-07', items: [paidByPayOs] });
    mount();

    fireEvent.click(await screen.findByRole('button', { name: /Thử lại/ }));

    expect(await screen.findByText('Phạm Thị Lan')).toBeInTheDocument();
    expect(receipts).toHaveBeenCalledTimes(2);
  });

  it('opens from the ward finance screen', async () => {
    vi.spyOn(wardFinanceApi, 'listContracts').mockResolvedValue([]);
    vi.spyOn(wardFinanceApi, 'penaltyReceipts').mockResolvedValue([]);
    answer([]);
    mount('/ward/finance');

    fireEvent.click(await screen.findByRole('button', { name: 'Lịch sử thu' }));

    expect(await screen.findByRole('heading', { name: 'Lịch sử thu' })).toBeInTheDocument();
  });
});

describe('receipt wording', () => {
  it('words each reference for where it is checked', () => {
    expect(referenceLabel('PAYOS', 'PAYOS-14001')).toBe('Mã đơn payOS 14001');
    expect(referenceLabel('TREASURY', 'KB-0003')).toBe('Biên lai Kho bạc KB-0003');
    expect(referenceLabel('CASH', 'PT-001')).toBe('Mã giao dịch PT-001');
    expect(referenceLabel('PAYOS', null)).toBeNull();
    expect(methodLabel(null)).toBe('Không rõ hình thức');
    expect(methodLabel('PAYOS')).toBe('Chuyển khoản VietQR (payOS)');
  });

  it('tells money owed back from money returned and keeps both out of the total', () => {
    expect(receiptState({ paymentStatus: 'REFUND_REQUIRED' }).label).toBe('Chờ hoàn tiền');
    expect(receiptState({ paymentStatus: 'REFUNDED' }).label).toBe('Đã hoàn tiền');
    expect(receiptState({ paymentStatus: null }).label).toBe('Đã thu');
    expect(receiptTotals(all)).toEqual({ count: 3, collected: 910_000, returned: 1_000_000, returnedCount: 1 });
    expect(filterReceipts(all, { kind: 'ALL', method: 'ALL', query: 'nvl-02' })).toEqual([takenInPerson]);
  });
});
