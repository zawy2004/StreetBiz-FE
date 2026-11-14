import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  configure,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/core/api/problem';
import {
  wardVendorReportsApi,
  type VendorReportAssist,
  type WardVendorReport,
} from '@/core/api/ai-api';
import { vendorRegistrationApi } from '@/core/api/vendor-registration-api';
import { complianceApi, wardApi } from '@/features/ward-administration/ward-api';
import { wardConfigApi } from '@/features/ward-administration/ward-config-api';

vi.mock('@/core/config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/config/env')>();
  return { ...actual, isLiveApi: true };
});

const { VendorReportResolvePanel } =
  await import('@/features/ward-administration/components/review/VendorReportDecision');
const { LiveVendorReportReviewScreen } =
  await import('@/features/ward-administration/screens/LiveVendorReportReviewScreen');
const { WardVendorReportsScreen } =
  await import('@/features/ward-administration/screens/WardVendorReportsScreen');
const { RecordViolationScreen } =
  await import('@/features/ward-administration/screens/RecordViolationScreen');

configure({ asyncUtilTimeout: 5_000 });

const assist = (): VendorReportAssist => ({
  aiAvailable: false,
  signageText: null,
  locationText: null,
  permitVisible: null,
  description: null,
  flags: [],
  permitCheck: null,
  generatedAt: null,
  aiLogId: null,
  disclaimer: 'Cán bộ quyết định xử lý phản ánh.',
});

const report = (extra: Partial<WardVendorReport> = {}): WardVendorReport => ({
  reportId: 10,
  reason: 'Bị tính cao hơn giá niêm yết: 2 ổ Bánh mì thịt.',
  evidenceUrl: null,
  status: 'PENDING',
  createdAt: '2026-10-21T01:10:00Z',
  vendorName: 'Bánh mì Cô Lan',
  slotCode: 'NVL-022',
  aiExtractedLocation: null,
  assist: assist(),
  reportType: 'OVERCHARGE',
  dueAt: '2026-10-30T16:59:59.999Z',
  isOverdue: false,
  vendorId: 8,
  slotId: 5,
  scannedPermitId: 12,
  priceEvidence: {
    menuItemId: 31,
    itemName: 'Bánh mì thịt',
    priceUnit: 'ổ',
    postedUnitPrice: 25000,
    priceVersion: 3,
    priceVersionAt: '2026-10-20T01:00:00Z',
    quantity: 2,
    postedAmount: 50000,
    chargedAmount: 70000,
    difference: 20000,
    purchasedAt: '2026-10-21T00:45:00Z',
  },
  outcome: null,
  reportsAgainstVendor90Days: 3,
  suggestedViolationType: 'PRICE_ABOVE_POSTED',
  violationId: null,
  ...extra,
});

function Where() {
  const location = useLocation();
  return <p data-testid="where">{location.pathname + location.search}</p>;
}

const withClient = (node: ReactNode, path: string) =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[path]}>{node}</MemoryRouter>
    </QueryClientProvider>,
  );

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('resolve panel (WARD-19)', () => {
  const panel = (props: Partial<Parameters<typeof VendorReportResolvePanel>[0]> = {}) => {
    const onResolve = vi.fn();
    const onReload = vi.fn();
    const onRecordViolation = vi.fn();
    render(
      <VendorReportResolvePanel
        chargedAmount={70000}
        suggestedViolation="Bán cao hơn giá niêm yết"
        submitting={false}
        error={null}
        onResolve={onResolve}
        onRecordViolation={onRecordViolation}
        onReload={onReload}
        {...props}
      />,
    );
    return { onResolve, onReload, onRecordViolation };
  };

  it('will not dismiss without the reason the reporter will read', async () => {
    const user = userEvent.setup();
    const { onResolve } = panel();

    await user.click(screen.getByRole('radio', { name: /Bác phản ánh/ }));
    await user.click(screen.getByRole('button', { name: 'Bác phản ánh' }));

    expect(onResolve).not.toHaveBeenCalled();
    expect(
      screen.getByText('Nhập lý do bác: người phản ánh sẽ đọc lý do này.'),
    ).toBeInTheDocument();

    await user.type(
      screen.getByLabelText('Lý do bác (người phản ánh sẽ đọc)'),
      '  Giá bán đúng bảng giá  ',
    );
    await user.click(screen.getByRole('button', { name: 'Bác phản ánh' }));
    expect(onResolve).toHaveBeenCalledWith('DISMISSED', 'Giá bán đúng bảng giá', null);
  });

  it('needs a note to record a mediation and keeps the refund within the amount charged', async () => {
    const user = userEvent.setup();
    const { onResolve } = panel();

    await user.click(screen.getByRole('button', { name: 'Xác nhận đã hòa giải' }));
    expect(screen.getByText('Nhập ghi chú hòa giải.')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Ghi chú hòa giải'), 'Đã hoàn tiền tại quầy');
    fireEvent.change(screen.getByLabelText('Số tiền người bán hoàn (không bắt buộc)'), {
      target: { value: '80000' },
    });
    expect(
      screen.getByText('Số tiền hoàn không được vượt số tiền khách bị tính (70.000 đ).'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Xác nhận đã hòa giải' }));
    expect(onResolve).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Số tiền người bán hoàn (không bắt buộc)'), {
      target: { value: '20000' },
    });
    await user.click(screen.getByRole('button', { name: 'Xác nhận đã hòa giải' }));
    expect(onResolve).toHaveBeenCalledWith('MEDIATED', 'Đã hoàn tiền tại quầy', 20000);
  });

  it('offers no refund field for a report without a charged amount', () => {
    panel({ chargedAmount: null });
    expect(
      screen.queryByLabelText('Số tiền người bán hoàn (không bắt buộc)'),
    ).not.toBeInTheDocument();
  });

  it('says another officer closed it first (409) and offers to reload', async () => {
    const user = userEvent.setup();
    const { onReload } = panel({
      error: {
        message: 'Phản ánh đã được xử lý. Tải lại để xem kết quả mới nhất.',
        conflict: true,
      },
    });

    expect(
      screen.getByText('Phản ánh đã được xử lý. Tải lại để xem kết quả mới nhất.'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tải lại' }));
    expect(onReload).toHaveBeenCalledTimes(1);
  });

  it('records a violation only through the record form, with the suggested type named', async () => {
    const user = userEvent.setup();
    const { onRecordViolation, onResolve } = panel();

    await user.click(screen.getByRole('radio', { name: /Lập biên bản/ }));
    expect(screen.getByText('Bán cao hơn giá niêm yết')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Mở biểu mẫu biên bản' }));

    expect(onRecordViolation).toHaveBeenCalledTimes(1);
    expect(onResolve).not.toHaveBeenCalled();
  });
});

describe('ward report detail (live)', () => {
  const mountDetail = () =>
    withClient(
      <Routes>
        <Route path="/ward/inbox/vendor-reports/:id" element={<LiveVendorReportReviewScreen />} />
        <Route path="*" element={<Where />} />
      </Routes>,
      '/ward/inbox/vendor-reports/10',
    );

  beforeEach(() => {
    vi.spyOn(vendorRegistrationApi, 'downloadEvidenceFile').mockResolvedValue(new Blob(['x']));
  });

  it('shows the price evidence, the due date and the 90-day count as context only', async () => {
    vi.spyOn(wardVendorReportsApi, 'get').mockResolvedValue(report());
    mountDetail();

    const evidence = await screen.findByRole('region', { name: 'Bằng chứng giá' });
    expect(within(evidence).getByText('+20.000 đ')).toBeInTheDocument();
    expect(within(evidence).getByText(/bản số 3/)).toBeInTheDocument();
    expect(screen.getByText('Hết ngày 30/10/2026')).toBeInTheDocument();
    expect(screen.getByText('Phản ánh về người bán này trong 90 ngày')).toBeInTheDocument();
    expect(screen.getByText(/không phải điểm số, không dùng để tự xử lý/)).toBeInTheDocument();
    expect(screen.queryByText(/chưa có trên máy chủ/)).not.toBeInTheDocument();
  });

  it('closes the report with the status it was read in, and shows 409 when it moved', async () => {
    vi.spyOn(wardVendorReportsApi, 'get').mockResolvedValue(report());
    const resolve = vi
      .spyOn(wardVendorReportsApi, 'resolve')
      .mockRejectedValue(
        new ApiError('conflict', 409, 'Phản ánh đã được xử lý. Tải lại để xem kết quả mới nhất.'),
      );
    const user = userEvent.setup();
    mountDetail();

    await user.type(await screen.findByLabelText('Ghi chú hòa giải'), 'Đã hoàn tiền');
    fireEvent.change(screen.getByLabelText('Số tiền người bán hoàn (không bắt buộc)'), {
      target: { value: '20000' },
    });
    await user.click(screen.getByRole('button', { name: 'Xác nhận đã hòa giải' }));

    await waitFor(() =>
      expect(resolve).toHaveBeenCalledWith(10, {
        expectedStatus: 'PENDING',
        outcome: 'MEDIATED',
        note: 'Đã hoàn tiền',
        refundAmount: 20000,
      }),
    );
    expect(
      await screen.findByText('Phản ánh đã được xử lý. Tải lại để xem kết quả mới nhất.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tải lại' })).toBeInTheDocument();
  });

  it('shows the outcome instead of the panel once closed', async () => {
    vi.spyOn(wardVendorReportsApi, 'get').mockResolvedValue(
      report({
        status: 'DISMISSED',
        outcome: {
          resolution: 'DISMISSED',
          note: 'Giá bán đúng bảng giá.',
          refundAmount: null,
          reviewedAt: '2026-10-22T02:00:00Z',
          reviewedByName: 'Phạm Văn Sơn',
        },
      }),
    );
    mountDetail();

    expect(await screen.findByText('Không chấp nhận')).toBeInTheDocument();
    expect(screen.getByText('Giá bán đúng bảng giá.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Đóng phản ánh' })).not.toBeInTheDocument();
  });

  it('opens the record form with the vendor, the slot and the report it closes', async () => {
    vi.spyOn(wardVendorReportsApi, 'get').mockResolvedValue(report());
    const user = userEvent.setup();
    mountDetail();

    await user.click(await screen.findByRole('radio', { name: /Lập biên bản/ }));
    await user.click(screen.getByRole('button', { name: 'Mở biểu mẫu biên bản' }));

    expect(screen.getByTestId('where')).toHaveTextContent(
      '/ward/patrol/violations/new?sourceReportId=10&vendorId=8&slotId=5',
    );
  });
});

describe('ward report list filters', () => {
  it('filters by type and to the overdue ones, and marks overdue rows', async () => {
    const list = vi.spyOn(wardVendorReportsApi, 'list').mockResolvedValue([
      {
        reportId: 10,
        reason: 'Bị tính cao hơn giá niêm yết',
        status: 'PENDING',
        createdAt: '2026-10-08T01:00:00Z',
        vendorName: 'Bánh mì Cô Lan',
        slotCode: 'NVL-022',
        hasPhoto: false,
        reportType: 'OVERCHARGE',
        dueAt: '2026-10-17T16:59:59.999Z',
        isOverdue: true,
        resolution: null,
      },
    ]);
    const user = userEvent.setup();
    withClient(<WardVendorReportsScreen />, '/ward/inbox/vendor-reports');

    const row = await screen.findByRole('button', { name: /Bánh mì Cô Lan/ });
    expect(within(row).getByText('Quá hạn')).toBeInTheDocument();
    expect(within(row).getByText('Hạn xử lý 17/10/2026')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Bán cao hơn giá' }));
    await waitFor(() =>
      expect(list).toHaveBeenLastCalledWith('PENDING', 1, { type: 'OVERCHARGE' }),
    );
    await user.click(screen.getByRole('button', { name: 'Chỉ quá hạn' }));
    await waitFor(() =>
      expect(list).toHaveBeenLastCalledWith('PENDING', 1, { type: 'OVERCHARGE', overdue: true }),
    );
  });
});

describe('record form raised from a report', () => {
  it('fills the description, the evidence and the suggested type, and sends sourceReportId', async () => {
    vi.spyOn(wardVendorReportsApi, 'get').mockResolvedValue(
      report({ evidenceUrl: '/api/uploads/evidence/8/0123456789abcdef0123456789abcdef.jpg' }),
    );
    URL.createObjectURL = vi.fn(() => 'blob:evidence');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(vendorRegistrationApi, 'downloadEvidenceFile').mockResolvedValue(new Blob(['x']));
    vi.spyOn(complianceApi, 'listPenaltySchedules').mockResolvedValue([
      {
        scheduleId: 1,
        violationType: 'UNAUTHORIZED_BUSINESS_USE',
        violationTypeName: 'Sử dụng trái phép vỉa hè để kinh doanh',
        penaltyAmount: 2500000,
        legalBasis: 'Nghị định 168/2024/NĐ-CP, Điều 12',
      },
      {
        scheduleId: 9,
        violationType: 'PRICE_ABOVE_POSTED',
        violationTypeName: 'Bán cao hơn giá niêm yết',
        penaltyAmount: 7500000,
        legalBasis: 'Nghị định 87/2024/NĐ-CP, Điều 13',
      },
    ]);
    vi.spyOn(wardApi, 'me').mockResolvedValue({ sanctionAuthorityTitle: null } as never);
    vi.spyOn(wardConfigApi, 'slotGrid').mockResolvedValue({ slots: [] } as never);
    vi.spyOn(wardConfigApi, 'listZones').mockResolvedValue([]);
    const record = vi.spyOn(complianceApi, 'recordViolation').mockRejectedValue(new Error('stop'));
    const user = userEvent.setup();
    render(
      <MemoryRouter
        initialEntries={['/ward/patrol/violations/new?sourceReportId=10&vendorId=8&slotId=5']}
      >
        <Routes>
          <Route path="/ward/patrol/violations/new" element={<RecordViolationScreen />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Lập từ phản ánh #10 của người dân/)).toBeInTheDocument();
    const description = screen.getByLabelText('Mô tả chi tiết vi phạm tại hiện trường');
    await waitFor(() =>
      expect((description as HTMLTextAreaElement).value).toContain('Từ phản ánh #10'),
    );
    expect((description as HTMLTextAreaElement).value).toContain('khách bị tính 70.000 đ');
    await waitFor(() =>
      expect(screen.getByRole('radio', { name: /Bán cao hơn giá niêm yết/ })).toHaveAttribute(
        'aria-checked',
        'true',
      ),
    );

    await user.click(screen.getByRole('button', { name: 'Lập biên bản vi phạm (Bước 1)' }));
    await waitFor(() => expect(record).toHaveBeenCalledTimes(1));
    expect(record.mock.calls[0]![0]).toMatchObject({
      vendorId: 8,
      slotId: 5,
      violationType: 'PRICE_ABOVE_POSTED',
      evidenceUrl: '/api/uploads/evidence/8/0123456789abcdef0123456789abcdef.jpg',
      sourceReportId: 10,
    });
  });
});
