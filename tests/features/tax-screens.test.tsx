import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useToastStore } from '@/components/feedback';
import type {
  RevenueLedgerDto,
  TaxDeclarationsDto,
  TaxOverviewDto,
  TaxPolicyDto,
  TaxProfileDto,
  TaxReferralDto,
  WardTaxDashboardDto,
  WardTaxHouseholdsDto,
} from '@/core/api';
import { platformApi, usePlatformSession } from '@/features/platform-administration/platform-api';

const client = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiGetBlob: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
  apiUpload: vi.fn(),
}));
const saveFile = vi.hoisted(() => vi.fn());

vi.mock('@/core/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/core/api/client')>()),
  ...client,
}));
vi.mock('@/core/utils/save-file', () => ({ saveFile }));
vi.mock('@/core/config/env', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/core/config/env')>()),
  isLiveApi: true,
}));

const {
  TaxHomeScreen,
  RevenueLedgerScreen,
  TaxFilingsScreen,
  TaxEstimateScreen,
  TaxSettingsScreen,
  WardTaxScreen,
} = await import('@/features/tax/screens');
const { TaxPoliciesScreen } = await import('@/features/platform-administration/screens/TaxPoliciesScreen');

// ------------------------------------------------------------------------------ fixtures

const policy: TaxPolicyDto = {
  policyId: 2,
  taxYear: 2026,
  versionNo: 1,
  inherited: false,
  legalBasis: 'Nghị định 141/2026/NĐ-CP',
  revenueThreshold: 1_000_000_000,
  eInvoiceThreshold: 1_000_000_000,
  group2Ceiling: 3_000_000_000,
  group3Ceiling: 50_000_000_000,
  pitDeductsThreshold: true,
  pitProfitRateG2: 0.15,
  pitProfitRateG3: 0.17,
  pitProfitRateG4: 0.2,
  annualNoticeMonth: 1,
  annualNoticeDay: 31,
  warnRatio: 0.8,
  note: null,
  createdAt: '2026-01-02T00:00:00Z',
  rates: [
    { code: 'FOOD_SERVICE', name: 'Dịch vụ ăn uống', vatRate: 0.03, pitRate: 0.015, note: null },
    { code: 'OTHER', name: 'Ngành khác', vatRate: 0.02, pitRate: 0.01, note: 'Chưa phân loại' },
  ],
};

const profile: TaxProfileDto = {
  exists: true,
  taxCode: '0123456789',
  industryCode: 'FOOD_SERVICE',
  industryName: 'Dịch vụ ăn uống',
  eInvoiceRegistered: false,
  shareRevenueWithWard: false,
  consentUpdatedAt: null,
};

const overview = (extra: Partial<TaxOverviewDto> = {}): TaxOverviewDto => ({
  taxYear: 2026,
  today: '2026-10-18',
  yearEnded: false,
  policy,
  revenue: { online: 540_000_000, recorded: 100_000_000, total: 640_000_000 },
  group: 'G1',
  groupDescription: 'Doanh thu dưới ngưỡng không chịu thuế',
  level: 'NEAR',
  thresholdRatio: 0.64,
  remainingToThreshold: 360_000_000,
  projection: {
    enough: true,
    daysOfData: 200,
    dailyRate: 3_200_000,
    projectedRevenue: 1_168_000_000,
    projectedGroup: 'G2',
    projectedLevel: 'OVER',
    willCross: true,
    crossingDate: '2026-12-12',
  },
  obligations: [
    { code: 'KEEP_REVENUE_BOOK', title: 'Ghi chép doanh thu hằng ngày', detail: 'StreetBiz tự ghi đơn hàng.', kind: 'TODO', done: true },
    { code: 'ANNUAL_REVENUE_NOTICE', title: 'Thông báo doanh thu thực tế của năm', detail: 'Hạn 31/01 năm sau.', kind: 'TODO', done: false },
  ],
  obligationsOnceOver: [{ code: 'EINVOICE', title: 'Dùng hoá đơn điện tử', detail: 'Khi doanh thu trên ngưỡng.', kind: 'TODO', done: null }],
  nextDeadline: {
    periodType: 'YEAR',
    periodNo: 0,
    label: 'Thông báo doanh thu năm 2026',
    dueDate: '2027-01-31',
    daysLeft: 105,
    status: 'NOT_YET',
  },
  profile,
  months: Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    online: index < 10 ? 54_000_000 : 0,
    recorded: index < 10 ? 10_000_000 : 0,
    total: index < 10 ? 64_000_000 : 0,
  })),
  disclaimer: 'Số liệu chỉ để tham khảo.',
  ...extra,
});

const ledger: RevenueLedgerDto = {
  year: 2026,
  month: 10,
  totals: { online: 250_000, recorded: 300_000, total: 550_000 },
  days: [
    {
      date: '2026-10-18',
      online: 150_000,
      onlineOrders: 2,
      recorded: 300_000,
      total: 450_000,
      entries: [
        { entryId: 5, date: '2026-10-18', amount: 300_000, channel: 'CASH', note: 'Bán tại chỗ', createdAt: '2026-10-18T03:00:00Z', voided: false, voidReason: null },
      ],
    },
    {
      date: '2026-10-17',
      online: 100_000,
      onlineOrders: 1,
      recorded: 0,
      total: 100_000,
      entries: [
        { entryId: 4, date: '2026-10-17', amount: 500_000, channel: 'CASH', note: null, createdAt: '2026-10-17T03:00:00Z', voided: true, voidReason: 'Nhập nhầm' },
      ],
    },
  ],
};

const declarations: TaxDeclarationsDto = {
  taxYear: 2026,
  today: '2026-10-18',
  group: 'G1',
  disclaimer: 'Số liệu chỉ để tham khảo.',
  periods: [
    {
      periodType: 'YEAR', periodNo: 0, label: 'Thông báo doanh thu năm 2026', start: '2026-01-01', end: '2026-12-31',
      dueDate: '2027-01-31', status: 'OPEN', required: true, canFile: true, systemRevenue: 850_000_000, filing: null,
    },
    {
      periodType: 'QUARTER', periodNo: 3, label: 'Quý 3/2026', start: '2026-07-01', end: '2026-09-30',
      dueDate: '2026-10-31', status: 'FILED', required: true, canFile: true, systemRevenue: 300_000_000,
      filing: {
        revenueDeclared: 300_000_000, revenueSystem: 300_000_000, filedOn: '2026-10-10', authorityReference: 'BN-77',
        receiptUrl: null, note: null, createdAt: '2026-10-10T03:00:00Z', updatedAt: null,
      },
    },
    {
      periodType: 'QUARTER', periodNo: 4, label: 'Quý 4/2026', start: '2026-10-01', end: '2026-12-31',
      dueDate: '2027-01-31', status: 'NOT_REQUIRED', required: false, canFile: false, systemRevenue: 0, filing: null,
    },
  ],
};

const dashboard: WardTaxDashboardDto = {
  taxYear: 2026, today: '2026-10-18', policy, householdCount: 12, activeCount: 9, suspendedCount: 1, endedCount: 2,
  notStartedCount: 0, withTaxCode: 7, withoutTaxCode: 5, sharingRevenue: 3, groups: { g1: 8, g2: 2, g3: 0, g4: 0, noRevenue: 2 },
  nearThresholdCount: 1, overThresholdCount: 2, noticeFiled: 4, noticeNotFiled: 8, noticeDueDate: '2027-01-31',
  pendingReferrals: 3, reportedReferrals: 1, disclaimer: 'Số liệu chỉ để tham khảo.',
};

const households: WardTaxHouseholdsDto = {
  taxYear: 2026,
  households: [
    {
      vendorId: 1, displayName: 'Bánh mì Cô Lan', ownerName: 'Phạm Thị Lan', phone: '0905000101', address: '123 NVL',
      businessLine: 'Ăn uống', vendorType: 'FIXED_STOREFRONT', status: 'ACTIVE', slotCodes: ['NVL-01'], permitStatus: 'ACTIVE',
      approvedAt: '2026-01-05T00:00:00Z', lastInspectionAt: null, lastOrderAt: null, hasTaxCode: true,
      taxCodeMasked: '••••••••1234', eInvoiceRegistered: false, noticeFiled: true, sharesRevenue: true, revenue: 850_000_000, group: 'G1',
    },
    {
      vendorId: 2, displayName: 'Xe nước ép', ownerName: 'Hoàng Văn Tám', phone: null, address: null, businessLine: null,
      vendorType: 'ITINERANT', status: 'ENDED', slotCodes: [], permitStatus: null, approvedAt: '2026-02-05T00:00:00Z',
      lastInspectionAt: null, lastOrderAt: null, hasTaxCode: false, taxCodeMasked: '', eInvoiceRegistered: false,
      noticeFiled: false, sharesRevenue: false, revenue: null, group: null,
    },
  ],
};

const referral = (extra: Partial<TaxReferralDto> = {}): TaxReferralDto => ({
  referralId: 7,
  reasonCode: 'ADDRESS_CHANGED',
  reasonLabel: 'Đổi địa điểm kinh doanh',
  summary: 'Hộ Bánh mì Cô Lan được duyệt đổi địa điểm sang 200 Hoàng Diệu.',
  vendorId: 1,
  vendorName: 'Bánh mì Cô Lan',
  detectedAt: '2026-10-14T03:00:00Z',
  status: 'PENDING',
  handledAt: null,
  handledByName: null,
  authorityReference: null,
  handlingNote: null,
  ...extra,
});

/** Answers each GET by the longest matching path prefix. */
function serve(routes: Record<string, unknown>) {
  client.apiGet.mockImplementation(async (url: string) => {
    const path = Object.keys(routes)
      .filter((prefix) => url.startsWith(prefix))
      .sort((a, b) => b.length - a.length)[0];
    if (path === undefined) throw new Error(`unexpected GET ${url}`);
    return routes[path];
  });
}

function mount(path: string, route: string, element: ReactNode) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={route} element={element} />
          <Route path="*" element={<p>OTHER PAGE</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useToastStore.getState().hide();
});
afterEach(cleanup);

// ------------------------------------------------------------------------- household screens

describe('TaxHomeScreen', () => {
  it('shows revenue against the threshold, the forecast and the next deadline', async () => {
    serve({ '/vendor/tax/overview': overview() });
    mount('/vendor/tax', '/vendor/tax', <TaxHomeScreen />);

    expect(await screen.findByText('Doanh thu năm 2026 đến nay')).toBeInTheDocument();
    expect(screen.getByText('640.000.000 đ')).toBeInTheDocument();
    expect(screen.getByText(/Còn 360\.000\.000 đ nữa là chạm ngưỡng 1\.000\.000\.000 đ\/năm\./)).toBeInTheDocument();
    expect(screen.getByText('GẦN NGƯỠNG')).toBeInTheDocument();
    expect(screen.getByText(/Dự kiến vượt ngưỡng vào 12\/12\/2026\./)).toBeInTheDocument();
    expect(screen.getByText('Thông báo doanh thu năm 2026')).toBeInTheDocument();
    expect(screen.getByText(/Hạn 31\/01\/2027 · còn 105 ngày/)).toBeInTheDocument();
    expect(screen.getByText('Số liệu chỉ để tham khảo.')).toBeInTheDocument();
  });

  it('says how far over the threshold the household is', async () => {
    serve({
      '/vendor/tax/overview': overview({
        level: 'OVER',
        group: 'G2',
        revenue: { online: 1_050_000_000, recorded: 0, total: 1_050_000_000 },
        remainingToThreshold: -50_000_000,
      }),
    });
    mount('/vendor/tax', '/vendor/tax', <TaxHomeScreen />);

    expect(await screen.findByText(/Đã vượt ngưỡng 1\.000\.000\.000 đ khoảng 50\.000\.000 đ\./)).toBeInTheDocument();
    expect(screen.getByText('ĐÃ VƯỢT NGƯỠNG')).toBeInTheDocument();
  });

  it('explains that a forecast needs two weeks of sales', async () => {
    serve({
      '/vendor/tax/overview': overview({
        projection: {
          enough: false, daysOfData: 5, dailyRate: 0, projectedRevenue: 0, projectedGroup: 'G1',
          projectedLevel: 'SAFE', willCross: false, crossingDate: null,
        },
      }),
    });
    mount('/vendor/tax', '/vendor/tax', <TaxHomeScreen />);

    expect(await screen.findByText(/Chưa đủ dữ liệu để dự báo: cần ít nhất 14 ngày/)).toBeInTheDocument();
  });

  it('downloads the revenue book as a workbook', async () => {
    serve({ '/vendor/tax/overview': overview() });
    const blob = new Blob(['x']);
    client.apiGetBlob.mockResolvedValue(blob);
    mount('/vendor/tax', '/vendor/tax', <TaxHomeScreen />);

    await userEvent.click(await screen.findByRole('button', { name: /Tải sổ doanh thu \(Excel\)/ }));

    await waitFor(() => expect(saveFile).toHaveBeenCalledWith(blob, 'so-doanh-thu-2026.xlsx'));
    expect(client.apiGetBlob).toHaveBeenCalledWith('/vendor/tax/revenue-book/export?year=2026');
  });

  it('shows an error with a retry when the overview cannot be loaded', async () => {
    client.apiGet.mockRejectedValue(new Error('boom'));
    mount('/vendor/tax', '/vendor/tax', <TaxHomeScreen />);

    expect(await screen.findByText('Không tải được dữ liệu')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
  });
});

describe('RevenueLedgerScreen', () => {
  it('lists the month by day, marks voided entries and totals the month', async () => {
    serve({ '/vendor/tax/ledger': ledger });
    mount('/vendor/tax/ledger', '/vendor/tax/ledger', <RevenueLedgerScreen />);

    expect(await screen.findByText('18/10/2026')).toBeInTheDocument();
    expect(screen.getByText('550.000 đ')).toBeInTheDocument();
    expect(screen.getByText(/2 đơn StreetBiz đã hoàn tất · 150\.000 đ/)).toBeInTheDocument();
    expect(screen.getByText(/Đã huỷ: Nhập nhầm · không tính vào doanh thu/)).toBeInTheDocument();
    // A voided entry cannot be voided again.
    expect(screen.queryByRole('button', { name: 'Huỷ khoản 500.000 đ' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Huỷ khoản 300.000 đ' })).toBeInTheDocument();
  });

  it('records a direct sale with the date, amount and channel chosen', async () => {
    serve({ '/vendor/tax/ledger': ledger });
    client.apiPost.mockResolvedValue({});
    mount('/vendor/tax/ledger', '/vendor/tax/ledger', <RevenueLedgerScreen />);

    await userEvent.click(await screen.findByRole('button', { name: /Ghi doanh thu/ }));
    const dialog = await screen.findByRole('dialog');
    const submit = within(dialog).getByRole('button', { name: 'Ghi vào sổ' });
    expect(submit).toBeDisabled();

    await userEvent.type(within(dialog).getByLabelText('Số tiền (đồng)'), '2500000');
    expect(within(dialog).getByLabelText('Số tiền (đồng)')).toHaveValue('2.500.000');
    await userEvent.click(within(dialog).getByRole('radio', { name: 'Chuyển khoản' }));
    await userEvent.type(within(dialog).getByLabelText('Ghi chú (không bắt buộc)'), 'Khách quen');
    expect(submit).toBeEnabled();
    await userEvent.click(submit);

    await waitFor(() => expect(client.apiPost).toHaveBeenCalledTimes(1));
    expect(client.apiPost).toHaveBeenCalledWith('/vendor/tax/revenue-entries', {
      date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      amount: 2_500_000,
      channel: 'BANK_TRANSFER',
      note: 'Khách quen',
    });
  });

  it('refuses an amount above the per-entry limit', async () => {
    serve({ '/vendor/tax/ledger': ledger });
    mount('/vendor/tax/ledger', '/vendor/tax/ledger', <RevenueLedgerScreen />);

    await userEvent.click(await screen.findByRole('button', { name: /Ghi doanh thu/ }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Số tiền (đồng)'), '10000000001');

    expect(within(dialog).getByText('Một lần ghi tối đa 10 tỷ đồng.')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Ghi vào sổ' })).toBeDisabled();
  });

  it('voids an entry with the reason given', async () => {
    serve({ '/vendor/tax/ledger': ledger });
    client.apiPost.mockResolvedValue({});
    mount('/vendor/tax/ledger', '/vendor/tax/ledger', <RevenueLedgerScreen />);

    await userEvent.click(await screen.findByRole('button', { name: 'Huỷ khoản 300.000 đ' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Lý do (không bắt buộc)'), 'Ghi trùng');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Huỷ khoản này' }));

    await waitFor(() =>
      expect(client.apiPost).toHaveBeenCalledWith('/vendor/tax/revenue-entries/5/void', { reason: 'Ghi trùng' }),
    );
  });
});

describe('TaxFilingsScreen', () => {
  it('lists the yearly notice and quarters with their status', async () => {
    serve({ '/vendor/tax/declarations': declarations });
    mount('/vendor/tax/filings', '/vendor/tax/filings', <TaxFilingsScreen />);

    expect(await screen.findByText('Thông báo doanh thu năm 2026')).toBeInTheDocument();
    expect(screen.getByText('ĐẾN KỲ KHAI')).toBeInTheDocument();
    expect(screen.getByText('ĐÃ NỘP')).toBeInTheDocument();
    expect(screen.getByText('CHƯA PHẢI KHAI')).toBeInTheDocument();
    expect(screen.getByText(/Biên nhận: BN-77/)).toBeInTheDocument();
    // Only a period that can be filed offers the button; a not-required quarter does not.
    expect(screen.getAllByRole('button', { name: 'Xác nhận đã nộp' })).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Gỡ xác nhận' })).toBeInTheDocument();
  });

  it('confirms a filing prefilled with the revenue StreetBiz recorded', async () => {
    serve({ '/vendor/tax/declarations': declarations });
    client.apiPut.mockResolvedValue({});
    mount('/vendor/tax/filings', '/vendor/tax/filings', <TaxFilingsScreen />);

    await userEvent.click(await screen.findByRole('button', { name: 'Xác nhận đã nộp' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByLabelText('Doanh thu bạn đã khai (đồng)')).toHaveValue('850.000.000');
    await userEvent.type(within(dialog).getByLabelText('Mã biên nhận / số tham chiếu (không bắt buộc)'), 'BN-2027-1');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận đã nộp' }));

    await waitFor(() => expect(client.apiPut).toHaveBeenCalledTimes(1));
    expect(client.apiPut).toHaveBeenCalledWith('/vendor/tax/declarations/2026/year/0', {
      revenueDeclared: 850_000_000,
      filedOn: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      authorityReference: 'BN-2027-1',
      receiptUrl: null,
      note: null,
    });
  });

  it('takes back a confirmation only after asking', async () => {
    serve({ '/vendor/tax/declarations': declarations });
    client.apiDelete.mockResolvedValue(undefined);
    mount('/vendor/tax/filings', '/vendor/tax/filings', <TaxFilingsScreen />);

    await userEvent.click(await screen.findByRole('button', { name: 'Gỡ xác nhận' }));
    expect(client.apiDelete).not.toHaveBeenCalled();
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Gỡ xác nhận' }));

    await waitFor(() => expect(client.apiDelete).toHaveBeenCalledWith('/vendor/tax/declarations/2026/quarter/3'));
  });
});

describe('TaxEstimateScreen', () => {
  const estimate = {
    taxYear: 2026, basis: 'ACTUAL', revenue: 1_200_000_000, industryCode: 'FOOD_SERVICE', industryName: 'Dịch vụ ăn uống',
    group: 'G2', groupDescription: 'Doanh thu từ 1 tỷ đến 3 tỷ', taxable: true, vatRate: 0.03, pitRate: 0.015,
    vat: 36_000_000, pitBase: 200_000_000, pitOnRevenue: 3_000_000, totalOnRevenue: 39_000_000, effectiveRate: 0.0325,
    costRatio: null, profit: null, pitProfitRate: null, pitOnProfit: null, totalOnProfit: null, cheaper: null,
    pitDeductsThreshold: true, revenueThreshold: 1_000_000_000, legalBasis: 'Nghị định 141/2026/NĐ-CP',
    disclaimer: 'Số liệu chỉ để tham khảo.',
  };

  it('shows the revenue-based tax with its working', async () => {
    serve({ '/vendor/tax/estimate': estimate });
    mount('/vendor/tax/estimate', '/vendor/tax/estimate', <TaxEstimateScreen />);

    expect(await screen.findByText('Tính theo tỷ lệ trên doanh thu')).toBeInTheDocument();
    expect(screen.getByText('Thuế GTGT (3%)')).toBeInTheDocument();
    expect(screen.getByText('36.000.000 đ')).toBeInTheDocument();
    expect(screen.getByText(/Tính trên phần doanh thu vượt 1\.000\.000\.000 đ: 200\.000\.000 đ/)).toBeInTheDocument();
    expect(screen.getByText('39.000.000 đ')).toBeInTheDocument();
  });

  it('says there is nothing to pay below the threshold', async () => {
    serve({ '/vendor/tax/estimate': { ...estimate, taxable: false, group: 'G1', revenue: 500_000_000 } });
    mount('/vendor/tax/estimate', '/vendor/tax/estimate', <TaxEstimateScreen />);

    expect(await screen.findByText('CHƯA PHẢI NỘP THUẾ')).toBeInTheDocument();
    expect(screen.queryByText('Tính theo tỷ lệ trên doanh thu')).not.toBeInTheDocument();
  });

  it('tells the household when the forecast fell back to actual revenue', async () => {
    serve({ '/vendor/tax/estimate': estimate });
    mount('/vendor/tax/estimate', '/vendor/tax/estimate', <TaxEstimateScreen />);

    await userEvent.click(await screen.findByRole('tab', { name: 'Dự báo cả năm' }));

    expect(await screen.findByText(/Chưa đủ dữ liệu để dự báo cả năm/)).toBeInTheDocument();
  });

  it('asks for a figure before trying one of its own', async () => {
    serve({ '/vendor/tax/estimate': estimate });
    mount('/vendor/tax/estimate', '/vendor/tax/estimate', <TaxEstimateScreen />);

    await userEvent.click(await screen.findByRole('tab', { name: 'Thử số khác' }));

    expect(screen.getByText(/Nhập doanh thu cả năm muốn thử/)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Doanh thu cả năm muốn thử (đồng)'), '1200000000');
    await waitFor(() =>
      expect(client.apiGet).toHaveBeenCalledWith(expect.stringContaining('revenue=1200000000')),
    );
  });
});

describe('TaxSettingsScreen', () => {
  it('keeps the ward blind to revenue until the household opts in, then saves the choice', async () => {
    serve({ '/vendor/tax/profile': profile, '/vendor/tax/overview': overview() });
    client.apiPut.mockResolvedValue({});
    mount('/vendor/tax/settings', '/vendor/tax/settings', <TaxSettingsScreen />);

    const toggle = await screen.findByRole('switch', { name: /Cho phép phường xem doanh thu/ });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    const save = screen.getByRole('button', { name: 'Lưu' });
    expect(save).toBeDisabled();

    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(save);

    await waitFor(() =>
      expect(client.apiPut).toHaveBeenCalledWith('/vendor/tax/profile', {
        taxCode: '0123456789',
        industryCode: 'FOOD_SERVICE',
        eInvoiceRegistered: false,
        shareRevenueWithWard: true,
      }),
    );
  });

  it('rejects a malformed tax code and clears it when emptied', async () => {
    serve({ '/vendor/tax/profile': profile, '/vendor/tax/overview': overview() });
    client.apiPut.mockResolvedValue({});
    mount('/vendor/tax/settings', '/vendor/tax/settings', <TaxSettingsScreen />);

    const code = await screen.findByLabelText('Mã số thuế');
    await userEvent.clear(code);
    await userEvent.type(code, '12345');
    expect(screen.getByText(/Mã số thuế gồm 10 số/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lưu' })).toBeDisabled();

    await userEvent.clear(code);
    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    await waitFor(() =>
      expect(client.apiPut).toHaveBeenCalledWith('/vendor/tax/profile', expect.objectContaining({ taxCode: null })),
    );
  });

  it('offers the industries of the policy in force with their rates', async () => {
    serve({ '/vendor/tax/profile': profile, '/vendor/tax/overview': overview() });
    mount('/vendor/tax/settings', '/vendor/tax/settings', <TaxSettingsScreen />);

    expect(await screen.findByRole('radio', { name: /Dịch vụ ăn uống/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText(/GTGT 3% · TNCN 1,5%/)).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Ngành khác/ })).toHaveAttribute('aria-checked', 'false');
  });
});

// ------------------------------------------------------------------------------ ward screen

describe('WardTaxScreen', () => {
  const wardRoutes = () =>
    serve({
      '/ward/tax/dashboard': dashboard,
      '/ward/tax/households': households,
      '/ward/tax/referrals': [referral()],
      '/ward/tax/announcements': [],
    });

  it('shows counts only on the overview, never a household', async () => {
    wardRoutes();
    mount('/ward/tax', '/ward/tax', <WardTaxScreen />);

    expect(await screen.findByText('7/12')).toBeInTheDocument(); // tax codes
    expect(screen.getByText('4/12')).toBeInTheDocument(); // notice filed
    expect(screen.getByText('3/12')).toBeInTheDocument(); // sharing revenue
    expect(screen.getByText(/Hạn 31\/01\/2027/)).toBeInTheDocument();
    expect(screen.getByText(/Chỉ là số tổng hợp, không nêu tên hộ/)).toBeInTheDocument();
    expect(screen.queryByText('Bánh mì Cô Lan')).not.toBeInTheDocument();
  });

  it('shows revenue only for the household that shares it, with the tax code masked', async () => {
    wardRoutes();
    mount('/ward/tax', '/ward/tax', <WardTaxScreen />);
    await userEvent.click(await screen.findByRole('tab', { name: 'Hộ kinh doanh' }));

    expect(await screen.findByText('Bánh mì Cô Lan')).toBeInTheDocument();
    expect(screen.getByText('850.000.000 đ')).toBeInTheDocument();
    expect(screen.getByText('••••••••1234')).toBeInTheDocument();
    expect(screen.getByText('Không chia sẻ')).toBeInTheDocument();
    expect(screen.getByText('Chưa khai')).toBeInTheDocument();
  });

  it('narrows the household list by filter and by an accent-free search', async () => {
    wardRoutes();
    mount('/ward/tax', '/ward/tax', <WardTaxScreen />);
    await userEvent.click(await screen.findByRole('tab', { name: 'Hộ kinh doanh' }));
    await screen.findByText('Bánh mì Cô Lan');

    await userEvent.click(screen.getByRole('tab', { name: /Chưa có mã số thuế/ }));
    expect(screen.queryByText('Bánh mì Cô Lan')).not.toBeInTheDocument();
    expect(screen.getByText('Xe nước ép')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: /Tất cả/ }));
    await userEvent.type(screen.getByLabelText('Tìm theo tên hộ, chủ hộ hoặc ô'), 'banh mi');
    expect(screen.getByText('Bánh mì Cô Lan')).toBeInTheDocument();
    expect(screen.queryByText('Xe nước ép')).not.toBeInTheDocument();
  });

  it('records that a case was passed to the tax office', async () => {
    wardRoutes();
    client.apiPost.mockResolvedValue({});
    mount('/ward/tax', '/ward/tax', <WardTaxScreen />);
    await userEvent.click(await screen.findByRole('tab', { name: 'Đề nghị cơ quan thuế' }));

    expect(await screen.findByText('Đổi địa điểm kinh doanh')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Đã báo cơ quan thuế' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Số công văn / tham chiếu (không bắt buộc)'), 'CV-12/PHƯỜNG');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Ghi nhận đã báo' }));

    await waitFor(() =>
      expect(client.apiPost).toHaveBeenCalledWith('/ward/tax/referrals/7/report', {
        reference: 'CV-12/PHƯỜNG',
        note: null,
      }),
    );
  });

  it('needs a reason before a case is dismissed', async () => {
    wardRoutes();
    client.apiPost.mockResolvedValue({});
    mount('/ward/tax', '/ward/tax', <WardTaxScreen />);
    await userEvent.click(await screen.findByRole('tab', { name: 'Đề nghị cơ quan thuế' }));

    await userEvent.click(await screen.findByRole('button', { name: 'Không cần báo' }));
    const dialog = await screen.findByRole('dialog');
    const confirm = within(dialog).getByRole('button', { name: 'Ghi nhận không cần báo' });
    expect(confirm).toBeDisabled();
    await userEvent.type(within(dialog).getByLabelText('Lý do không cần báo'), 'Đã báo trực tiếp');
    await userEvent.click(confirm);

    await waitFor(() =>
      expect(client.apiPost).toHaveBeenCalledWith('/ward/tax/referrals/7/dismiss', { reason: 'Đã báo trực tiếp' }),
    );
  });

  it('looks for new cases on request and reports how many it found', async () => {
    wardRoutes();
    client.apiPost.mockResolvedValue({ created: 2, autoClosed: 0, pending: 5 });
    mount('/ward/tax', '/ward/tax', <WardTaxScreen />);
    await userEvent.click(await screen.findByRole('tab', { name: 'Đề nghị cơ quan thuế' }));

    await userEvent.click(await screen.findByRole('button', { name: /Tìm trường hợp mới/ }));

    await waitFor(() => expect(client.apiPost).toHaveBeenCalledWith('/ward/tax/referrals/refresh'));
    await waitFor(() => expect(useToastStore.getState().message).toBe('Tìm thấy 2 trường hợp mới'));
  });

  it('asks before sending an announcement and then sends it to the chosen group', async () => {
    wardRoutes();
    client.apiPost.mockResolvedValue({ recipientCount: 8 });
    mount('/ward/tax', '/ward/tax', <WardTaxScreen />);
    await userEvent.click(await screen.findByRole('tab', { name: 'Thông báo' }));

    await userEvent.click(await screen.findByRole('button', { name: /Mẫu: Nhắc thông báo doanh thu năm/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Gửi thông báo' }));
    expect(client.apiPost).not.toHaveBeenCalled();
    expect(screen.getByText(/Không thể thu hồi sau khi gửi/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Gửi' }));

    await waitFor(() =>
      expect(client.apiPost).toHaveBeenCalledWith('/ward/tax/announcements', {
        segment: 'NOT_FILED',
        taxYear: expect.any(Number),
        title: 'Nhắc thông báo doanh thu năm',
        body: expect.stringContaining('thông báo doanh thu thực tế của năm'),
      }),
    );
  });

  it('exports the workbook for the tax office', async () => {
    wardRoutes();
    const blob = new Blob(['x']);
    client.apiGetBlob.mockResolvedValue(blob);
    mount('/ward/tax', '/ward/tax', <WardTaxScreen />);

    await userEvent.click(await screen.findByRole('button', { name: /Xuất danh sách cho cơ quan thuế/ }));

    await waitFor(() => expect(saveFile).toHaveBeenCalledWith(blob, expect.stringMatching(/^ho-kinh-doanh-thue-\d{4}\.xlsx$/)));
  });
});

// -------------------------------------------------------------------------- platform screen

describe('TaxPoliciesScreen', () => {
  beforeEach(() => {
    usePlatformSession.setState({ token: 'platform-token', admin: { userId: 9, name: 'Quản trị' }, generation: 1 });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    usePlatformSession.setState({ token: '', admin: null, generation: 0 });
  });

  it('lists the versions with the one in force marked', async () => {
    vi.spyOn(platformApi, 'me').mockResolvedValue({ userId: 9, name: 'Quản trị' });
    vi.spyOn(platformApi, 'taxPolicies').mockResolvedValue([
      { policy: { ...policy, versionNo: 2, policyId: 3 }, inForce: true },
      { policy, inForce: false },
    ]);
    mount('/platform/tax-policies', '/platform/tax-policies', <TaxPoliciesScreen />);

    expect(await screen.findByText('Năm 2026 · phiên bản 2')).toBeInTheDocument();
    expect(screen.getByText('Năm 2026 · phiên bản 1')).toBeInTheDocument();
    expect(screen.getByText('ĐANG ÁP DỤNG')).toBeInTheDocument();
    expect(screen.getByText('ĐÃ THAY THẾ')).toBeInTheDocument();
  });

  it('publishes a new version prefilled from the one in force, rates as ratios', async () => {
    vi.spyOn(platformApi, 'me').mockResolvedValue({ userId: 9, name: 'Quản trị' });
    vi.spyOn(platformApi, 'taxPolicies').mockResolvedValue([{ policy, inForce: true }]);
    const create = vi.spyOn(platformApi, 'createTaxPolicy').mockResolvedValue({ policy: { ...policy, versionNo: 2 }, inForce: true });
    mount('/platform/tax-policies', '/platform/tax-policies', <TaxPoliciesScreen />);

    await userEvent.click(await screen.findByRole('button', { name: 'Ban hành phiên bản mới' }));
    const basis = screen.getByLabelText('Căn cứ pháp lý');
    expect(basis).toHaveValue('Nghị định 141/2026/NĐ-CP');
    expect(screen.getByLabelText('Ngưỡng doanh thu không chịu thuế (đồng/năm)')).toHaveValue('1.000.000.000');

    await userEvent.clear(basis);
    await userEvent.type(basis, 'Thông tư mới');
    await userEvent.click(screen.getByRole('button', { name: 'Ban hành phiên bản mới' }));

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create.mock.calls[0]![0]).toMatchObject({
      taxYear: 2026,
      legalBasis: 'Thông tư mới',
      revenueThreshold: 1_000_000_000,
      pitProfitRateG2: 0.15,
      warnRatio: 0.8,
      annualNoticeMonth: 1,
      annualNoticeDay: 31,
      rates: [
        { code: 'FOOD_SERVICE', vatRate: 0.03, pitRate: 0.015 },
        { code: 'OTHER', vatRate: 0.02, pitRate: 0.01, note: 'Chưa phân loại' },
      ],
    });
  });

  it('will not publish thresholds that do not rise', async () => {
    vi.spyOn(platformApi, 'me').mockResolvedValue({ userId: 9, name: 'Quản trị' });
    vi.spyOn(platformApi, 'taxPolicies').mockResolvedValue([{ policy, inForce: true }]);
    const create = vi.spyOn(platformApi, 'createTaxPolicy');
    mount('/platform/tax-policies', '/platform/tax-policies', <TaxPoliciesScreen />);

    await userEvent.click(await screen.findByRole('button', { name: 'Ban hành phiên bản mới' }));
    const ceiling = screen.getByLabelText('Trần nhóm 2 (đồng/năm)');
    await userEvent.clear(ceiling);
    await userEvent.type(ceiling, '500000000');

    expect(screen.getByText(/Các mốc phải tăng dần/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ban hành phiên bản mới' })).toBeDisabled();
    expect(create).not.toHaveBeenCalled();
  });
});
