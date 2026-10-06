import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import type { ContractScheduleDto, InvoiceDto, ScheduleItemDto } from '@/core/api';
import {
  buildSchedules,
  byUrgency,
  dayDiff,
  dueBadge,
  withDueDays,
} from '@/features/fee-schedules/schedule-progress';
import { groupInvoices } from '@/features/fee-schedules/invoice-groups';
import { compactVnd, niceCeiling, niceTicks } from '@/features/ward-administration/components/chart-scale';

const client = vi.hoisted(() => ({ apiGet: vi.fn(), apiPost: vi.fn() }));
vi.mock('@/core/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/core/api/client')>()),
  apiGet: client.apiGet,
  apiPost: client.apiPost,
}));
vi.mock('@/core/config/env', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/core/config/env')>()),
  isLiveApi: true,
}));

const { InvoiceList } = await import('@/features/fee-schedules/components/InvoiceList');
const { ContractScheduleScreen } = await import('@/features/fee-schedules/screens/ContractScheduleScreen');

const item = (patch: Partial<ScheduleItemDto>): ScheduleItemDto => ({
  feeItemId: 1,
  ordinal: 1,
  ofCount: 3,
  periodLabel: 'Kỳ 1/3 · Tháng 09/2026',
  dueDate: '2026-09-02',
  amount: 1_040_000,
  itemStatus: 'PENDING',
  paidAt: null,
  invoiceId: null,
  invoiceNumber: null,
  daysOverdue: null,
  daysUntilDue: null,
  ...patch,
});

describe('fee schedule progress', () => {
  it('words urgency the way a vendor acts on it, keeping red for overdue only', () => {
    expect(dueBadge(item({ itemStatus: 'OVERDUE', daysOverdue: 5 }))).toEqual({ label: 'Quá hạn 5 ngày', tone: 'danger' });
    expect(dueBadge(item({ daysUntilDue: 0 }))).toEqual({ label: 'Đến hạn hôm nay', tone: 'pending' });
    expect(dueBadge(item({ daysUntilDue: 3 }))).toEqual({ label: 'Còn 3 ngày', tone: 'pending' });
    expect(dueBadge(item({ daysUntilDue: 20, dueDate: '2026-10-22' }))).toEqual({ label: 'Hạn 22/10/2026', tone: 'neutral' });
    expect(dueBadge(item({ itemStatus: 'PAID' }))).toEqual({ label: 'Đã thanh toán', tone: 'ok' });
  });

  it('counts calendar days, not hours, and fills them in for a flat fee list', () => {
    expect(dayDiff('2026-10-02', '2026-10-05')).toBe(3);
    expect(dayDiff('2026-10-02', '2026-09-30')).toBe(-2);
    expect(withDueDays({ itemStatus: 'PENDING', dueDate: '2026-09-30' }, '2026-10-02')).toMatchObject({
      daysOverdue: 2,
      daysUntilDue: null,
    });
  });

  it('puts the most overdue first and paid instalments last', () => {
    const rows = [
      item({ feeItemId: 1, itemStatus: 'PAID', paidAt: '2026-09-01T03:00:00Z' }),
      item({ feeItemId: 2, dueDate: '2026-10-20' }),
      item({ feeItemId: 3, dueDate: '2026-09-25', itemStatus: 'OVERDUE' }),
    ];
    expect([...rows].sort(byUrgency).map((r) => r.feeItemId)).toEqual([3, 2, 1]);
  });

  it('builds the demo schedules by the same rules as the server', () => {
    const [schedule] = buildSchedules(
      [
        { feeItemId: 1, contractId: 7, dueDate: '2026-09-02', amount: 1_000_000, itemStatus: 'PAID', paidAt: '2026-09-01', periodLabel: 'Kỳ 1/2' },
        { feeItemId: 2, contractId: 7, dueDate: '2026-09-30', amount: 1_000_000, itemStatus: 'PENDING', paidAt: null, periodLabel: 'Kỳ 2/2' },
      ],
      () => ({ slotCode: 'NVL-01', zoneName: null, wardName: null, address: null, startDate: '2026-09-01', endDate: '2026-10-30', contractStatus: 'ACTIVE' }),
      '2026-10-02',
    );
    expect(schedule!.contract).toMatchObject({ paidCount: 1, overdueCount: 1, outstandingAmount: 1_000_000 });
    // Past due but not yet swept by the server: already reads as overdue.
    expect(schedule!.items[1]).toMatchObject({ itemStatus: 'OVERDUE', daysOverdue: 2 });
    expect(schedule!.contract.nextDue?.feeItemId).toBe(2);
  });
});

const invoice = (id: number, issuedAt: string, kind: string, amount = 1_000_000): InvoiceDto => ({
  invoiceId: id,
  invoiceNumber: `HD-2026-00000${id}`,
  kind,
  amount,
  issuedAt,
  periodLabel: kind === 'FEE' ? 'Kỳ 1/3' : null,
});

describe('invoices', () => {
  const invoices = [
    invoice(1, '2026-09-03T03:00:00Z', 'FEE'),
    invoice(2, '2026-09-20T03:00:00Z', 'PENALTY', 500_000),
    invoice(3, '2026-10-01T03:00:00Z', 'FEE'),
    invoice(4, '2025-12-01T03:00:00Z', 'FEE'),
  ];

  it('groups one year by month, newest first, with month totals', () => {
    const { months, total, count } = groupInvoices(invoices, { kind: 'ALL', year: 2026 });
    expect(months.map((m) => [m.label, m.total])).toEqual([
      ['Tháng 10/2026', 1_000_000],
      ['Tháng 9/2026', 1_500_000],
    ]);
    expect([total, count]).toEqual([2_500_000, 3]);
    expect(groupInvoices(invoices, { kind: 'PENALTY', year: 2026 }).count).toBe(1);
  });

  it('filters by kind and year on screen, and opens a receipt', async () => {
    const open = vi.fn();
    render(<InvoiceList invoices={invoices} onOpen={open} />);

    expect(screen.getByText('3 hoá đơn năm 2026')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: /Tiền phạt/ }));
    expect(screen.getByText('1 hoá đơn năm 2026')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Năm 2025' }));
    expect(screen.getByText('Không có hoá đơn phù hợp')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: /Tất cả/ }));
    await userEvent.click(screen.getByText('HD-2026-000004'));
    expect(open).toHaveBeenCalledWith(4);
  });
});

describe('collection chart scale', () => {
  it('rounds the axis up to a clean number and writes money short', () => {
    expect(niceCeiling(3_670_000)).toBe(5_000_000);
    expect(niceCeiling(2_100_000)).toBe(2_500_000);
    // Every tick a whole figure: 3.67 million over ~4 steps gives steps of 1 million.
    expect(niceTicks(3_670_000)).toEqual([0, 1_000_000, 2_000_000, 3_000_000, 4_000_000]);
    expect(niceTicks(4_670_000)).toEqual([0, 2_000_000, 4_000_000, 6_000_000]);
    expect(niceTicks(0)).toEqual([0]);
    expect(compactVnd(1_250_000)).toBe('1,3 tr');
    expect(compactVnd(800_000)).toBe('800 N');
    expect(compactVnd(2_000_000_000)).toBe('2 tỷ');
  });
});

describe('contract schedule screen', () => {
  it('shows progress, each instalment with its badge, and the right action for each', async () => {
    const schedule: ContractScheduleDto = {
      contract: {
        contractId: 1,
        slotCode: 'NVL-01',
        zoneName: 'Nguyễn Văn Linh',
        wardName: 'Hải Châu 1',
        address: '45 Nguyễn Văn Linh',
        startDate: '2026-09-02',
        endDate: '2026-12-01',
        contractStatus: 'ACTIVE',
        totalAmount: 3_620_000,
        paidAmount: 1_540_000,
        outstandingAmount: 2_080_000,
        instalmentCount: 3,
        paidCount: 1,
        overdueCount: 1,
        nextDue: item({ feeItemId: 2, ordinal: 2, itemStatus: 'OVERDUE', daysOverdue: 2, periodLabel: 'Kỳ 2/3 · Tháng 09/2026' }),
      },
      items: [
        item({ feeItemId: 1, itemStatus: 'PAID', paidAt: '2026-09-03T04:45:00Z', invoiceId: 1, invoiceNumber: 'HD-2026-000001', amount: 1_540_000 }),
        item({ feeItemId: 2, ordinal: 2, itemStatus: 'OVERDUE', daysOverdue: 2, periodLabel: 'Kỳ 2/3 · Tháng 09/2026' }),
        item({ feeItemId: 3, ordinal: 3, daysUntilDue: 29, dueDate: '2026-10-31', periodLabel: 'Kỳ 3/3 · Tháng 10/2026' }),
      ],
    };
    client.apiGet.mockResolvedValue(schedule);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/vendor/finance/contracts/1']}>
          <Routes>
            <Route path="/vendor/finance/contracts/:id" element={<ContractScheduleScreen />} />
            <Route path="/vendor/finance/invoices/:id" element={<p>INVOICE PAGE</p>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Lịch phí ô NVL-01')).toBeInTheDocument();
    expect(client.apiGet).toHaveBeenCalledWith('/vendor/finance/contracts/1/schedule');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '43');
    const rows = within(screen.getByRole('list', { name: 'Các kỳ phí' })).getAllByRole('listitem');
    expect(rows).toHaveLength(3);
    expect(within(rows[1]!).getByText(/quá hạn 2 ngày/i)).toBeInTheDocument();
    expect(within(rows[1]!).getByRole('button', { name: 'Thanh toán' })).toBeInTheDocument();
    await userEvent.click(within(rows[0]!).getByRole('button', { name: 'Hoá đơn' }));
    expect(await screen.findByText('INVOICE PAGE')).toBeInTheDocument();
  });
});
