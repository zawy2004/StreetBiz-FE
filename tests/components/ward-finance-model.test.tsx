import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  awaitsRefund,
  breakdownOf,
  countByFilter,
  filterContracts,
  fold,
  summariseContracts,
} from '@/features/ward-administration/components/finance/finance-model';
import { wardApi } from '@/features/ward-administration/ward-api';
import {
  wardFinanceApi,
  type WardFeeItem,
  type WardFinanceContractItem,
  type WardPenaltyItem,
} from '@/features/ward-administration/ward-finance-api';
import { WardFinanceScreen } from '@/features/ward-administration/screens/WardFinanceScreen';
import { useAuthStore } from '@/store/auth-store';

vi.mock('@/core/config/env', () => ({
  env: { apiBaseUrl: 'https://api.example.test/api', useMockApi: false, appEnv: 'test' },
  isDev: true,
  isLiveApi: true,
}));

const contract = (over: Partial<WardFinanceContractItem>): WardFinanceContractItem => ({
  contractId: 1,
  slotCode: 'NVL-01',
  zoneName: 'Đường Nguyễn Văn Linh',
  vendorName: 'Xe bánh mì Hai',
  vendorPhone: '0905000101',
  contractStatus: 'ACTIVE',
  startDate: '2026-09-01',
  endDate: '2026-11-29',
  outstanding: 0,
  overdueCount: 0,
  unpaidPenalties: 0,
  depositPaid: 500_000,
  depositRefunded: false,
  ...over,
});

const LIST: WardFinanceContractItem[] = [
  contract({ contractId: 1, slotCode: 'NVL-01', vendorName: 'Xe bánh mì Hai', outstanding: 1_800_000, overdueCount: 1 }),
  contract({ contractId: 2, slotCode: 'NVL-08', vendorName: 'Bún chả Hải Châu', outstanding: 5_400_000 }),
  contract({
    contractId: 3, slotCode: 'NVL-05', vendorName: 'Lê Văn Đức', outstanding: 500_000,
    unpaidPenalties: 500_000, contractStatus: 'EXPIRED',
  }),
  contract({ contractId: 4, slotCode: 'NVL-09', vendorName: 'Đã hoàn', contractStatus: 'EXPIRED', depositRefunded: true }),
];

describe('finance model', () => {
  it('totals what is owed and what needs someone to act', () => {
    expect(summariseContracts(LIST)).toEqual({
      contracts: 4,
      outstanding: 7_700_000,
      overdueContracts: 1,
      unpaidPenalties: 500_000,
      awaitingRefund: 1,
    });
  });

  it('waits to refund a deposit only once the contract is over and it has not been given back', () => {
    expect(awaitsRefund(LIST[0]!)).toBe(false); // still ACTIVE
    expect(awaitsRefund(LIST[2]!)).toBe(true);
    expect(awaitsRefund(LIST[3]!)).toBe(false); // already refunded
    expect(awaitsRefund(contract({ contractStatus: 'EXPIRED', depositPaid: 0 }))).toBe(false);
  });

  it('puts overdue first, then the largest amount', () => {
    expect(filterContracts(LIST, 'ALL', '').map((c) => c.contractId)).toEqual([1, 2, 3, 4]);
  });

  it('filters by what is wrong and counts each filter', () => {
    expect(filterContracts(LIST, 'OVERDUE', '').map((c) => c.contractId)).toEqual([1]);
    expect(filterContracts(LIST, 'PENALTY', '').map((c) => c.contractId)).toEqual([3]);
    expect(filterContracts(LIST, 'REFUND', '').map((c) => c.contractId)).toEqual([3]);
    expect(countByFilter(LIST)).toEqual({ ALL: 4, OVERDUE: 1, PENALTY: 1, REFUND: 1 });
  });

  it('finds a household without caring about accents, case or punctuation', () => {
    expect(fold('Lê Văn Đức')).toBe('le van duc');
    expect(filterContracts(LIST, 'ALL', 'le van duc').map((c) => c.contractId)).toEqual([3]);
    expect(filterContracts(LIST, 'ALL', 'nvl-08').map((c) => c.contractId)).toEqual([2]);
    expect(filterContracts(LIST, 'ALL', '0905000101')).toHaveLength(4);
    expect(filterContracts(LIST, 'ALL', 'không có ai')).toEqual([]);
  });

  it('splits a contract into collected, coming, overdue and unpaid fines', () => {
    const item = (amount: number, status: WardFeeItem['status']): WardFeeItem => ({
      feeItemId: amount, ordinal: 1, dueDate: '2026-09-01', amount, depositAmount: 0, status,
      paidAt: null, originalAmount: null, adjustedAt: null, adjustmentReason: null, canEdit: false,
    });
    const fine = (amount: number, status: WardPenaltyItem['status']): WardPenaltyItem => ({
      penaltyId: amount, violationId: 1, violationType: 'x', amount, status, decisionNumber: null,
      createdAt: '2026-09-10T00:00:00Z', paidAt: null, waiverReason: null,
    });

    expect(
      breakdownOf(
        [item(1_550_000, 'PAID'), item(900_000, 'OVERDUE'), item(900_000, 'PENDING'), item(300_000, 'CANCELLED')],
        [fine(500_000, 'UNPAID'), fine(200_000, 'PAID'), fine(100_000, 'WAIVED')],
      ),
    ).toEqual({ paid: 1_550_000, pending: 900_000, overdue: 900_000, fines: 500_000 });
  });
});

describe('ward finance list', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    useAuthStore.setState({ user: null, sessionExpired: false });
  });

  function mount() {
    useAuthStore.setState({
      user: {
        id: '1', fullName: 'Ward', phone: '0983000001', password: '', role_code: 'WARD_AUTHORITY',
        wardUnitId: 1, account_status: 'ACTIVE',
      },
      sessionExpired: false,
    });
    vi.spyOn(wardApi, 'me').mockResolvedValue({ userId: '1', wardId: 1, name: 'Ward', sanctionAuthorityTitle: null });
    vi.spyOn(wardFinanceApi, 'listContracts').mockResolvedValue(LIST);
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={['/ward/finance']}>
          <Routes>
            <Route path="/ward/finance" element={<WardFinanceScreen />} />
            <Route path="/ward/finance/:contractId" element={<p>detail</p>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  it('leads with what the whole ward is owed and the three things to act on', async () => {
    mount();

    const hero = await screen.findByRole('region', { name: 'Còn phải thu toàn phường' });
    expect(within(hero).getByText('7.700.000 đ', { selector: '.sr-only' })).toBeInTheDocument();
    expect(within(hero).getByText('4 hợp đồng thuê ô', { exact: false })).toBeInTheDocument();
    expect(within(hero).getByText('Hợp đồng có kỳ quá hạn')).toBeInTheDocument();
    expect(within(hero).getByText('Chờ hoàn cọc')).toBeInTheDocument();
  });

  it('narrows the list by filter and by search, with the counts on the tabs', async () => {
    mount();
    await screen.findByRole('region', { name: 'Còn phải thu toàn phường' });

    expect(screen.getByRole('tab', { name: 'Quá hạn (1)' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /NVL-/ })).toHaveLength(4);

    await userEvent.click(screen.getByRole('tab', { name: 'Chờ hoàn cọc (1)' }));
    const rows = screen.getAllByRole('button', { name: /NVL-/ });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent('Lê Văn Đức');

    await userEvent.click(screen.getByRole('tab', { name: 'Tất cả (4)' }));
    await userEvent.type(screen.getByPlaceholderText(/Tìm theo mã ô/), 'bun cha');
    expect(screen.getAllByRole('button', { name: /NVL-/ })).toHaveLength(1);

    await userEvent.clear(screen.getByPlaceholderText(/Tìm theo mã ô/));
    await userEvent.type(screen.getByPlaceholderText(/Tìm theo mã ô/), 'zzz');
    expect(await screen.findByText('Không có hợp đồng phù hợp')).toBeInTheDocument();
  });
});
