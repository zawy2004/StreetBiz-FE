import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useToastStore } from '@/components/feedback';
import { wardReportApi, type CollectionReportDto } from '@/core/api';
import {
  countByStatus,
  groupByPlace,
} from '@/features/ward-administration/components/ops/occupancy/occupancy-model';
import {
  daysInMonth,
  periodDays,
  topLabels,
} from '@/features/ward-administration/components/ops/report/report-model';
import { complianceApi } from '@/features/ward-administration/ward-api';
import { wardConfigApi, type WardSlot } from '@/features/ward-administration/ward-config-api';

vi.mock('@/core/config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/config/env')>();
  return { ...actual, isLiveApi: true, env: { ...actual.env, enableAiCompliance: false } };
});

const { SlotOccupancyScreen } =
  await import('@/features/ward-administration/screens/SlotOccupancyScreen');
const { PermitActionScreen } =
  await import('@/features/ward-administration/screens/PermitActionScreen');
const { CollectionReportScreen } =
  await import('@/features/ward-administration/screens/CollectionReportScreen');

function renderAt(entries: string[], routes: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={entries} initialIndex={entries.length - 1}>
        <Routes>{routes}</Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const slot = (over: Partial<WardSlot>): WardSlot => ({
  slotId: 1,
  slotCode: 'NVL-01',
  zoneId: 1,
  zoneName: 'Đường Nguyễn Văn Linh',
  latitude: 16.05,
  longitude: 108.22,
  widthMeters: 2,
  lengthMeters: 3,
  status: 'AVAILABLE',
  source: 'WARD_DEFINED',
  hasPower: false,
  hasWater: false,
  hasTrashBin: false,
  businessCategory: null,
  canHardDelete: false,
  canEditGeometry: true,
  versionToken: 'v1',
  ...over,
});

describe('W12 occupancy helpers', () => {
  const rows = [
    { place: 'A', status: 'ACTIVE' },
    { place: 'B', status: 'AVAILABLE' },
    { place: 'A', status: 'RENTED' },
    { place: 'A', status: 'SUSPENDED' },
    { place: 'B', status: 'PENDING_APPLICATION' },
  ];

  it('counts ACTIVE and RENTED as let, and keeps every other state apart', () => {
    expect(countByStatus(rows)).toEqual({
      rented: 2,
      free: 1,
      pending: 1,
      suspended: 1,
      other: 0,
      total: 5,
    });
  });

  it('groups by street in first-seen order with per-street counts', () => {
    const groups = groupByPlace(rows);
    expect(groups.map((g) => g.place)).toEqual(['A', 'B']);
    expect(groups[0]!.counts.rented).toBe(2);
    expect(groups[0]!.counts.total).toBe(3);
    expect(groups[1]!.rows).toHaveLength(2);
  });
});

describe('W12 SlotOccupancyScreen (live)', () => {
  beforeEach(() => {
    vi.spyOn(wardConfigApi, 'slotGrid').mockResolvedValue({
      slots: [
        slot({ slotId: 1, slotCode: 'NVL-01', status: 'ACTIVE' }),
        slot({ slotId: 2, slotCode: 'NVL-02', status: 'AVAILABLE' }),
        slot({ slotId: 3, slotCode: 'NVL-03', status: 'SUSPENDED' }),
        slot({ slotId: 4, slotCode: 'HD-01', zoneName: 'Đường Hoàng Diệu', status: 'AVAILABLE' }),
      ],
      features: [],
      boundaryConfigured: false,
      clearanceCheckEnabled: true,
    });
  });

  const renderScreen = () =>
    renderAt(
      ['/ward/slots'],
      <>
        <Route path="/ward/slots" element={<SlotOccupancyScreen />} />
        <Route path="/ward/slots/editor" element={<div>editor</div>} />
      </>,
    );

  it('reads the unfiltered grid once and shows the let count, streets and status chips', async () => {
    renderScreen();
    expect(
      await screen.findByRole('heading', { name: 'Đường Nguyễn Văn Linh' }),
    ).toBeInTheDocument();
    expect(wardConfigApi.slotGrid).toHaveBeenCalledTimes(1);
    expect(wardConfigApi.slotGrid).toHaveBeenCalledWith();
    expect(screen.getByRole('heading', { name: 'Đường Hoàng Diệu' })).toBeInTheDocument();
    const summary = screen.getByRole('region', { name: 'Tình trạng lấp đầy' });
    expect(within(summary).getByText('1/4')).toBeInTheDocument();
    expect(screen.getByText('TẠM NGƯNG')).toBeInTheDocument();
    expect(screen.getByText(/Chưa cấu hình ranh giới phường chính thức/)).toBeInTheDocument();
  });

  it('filters to suspended slots on the client', async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByRole('heading', { name: 'Đường Nguyễn Văn Linh' });

    await user.click(screen.getByRole('button', { name: /Tạm ngưng/ }));

    expect(screen.getByText('Ô NVL-03, tạm ngưng, 2 × 3 mét')).toBeInTheDocument();
    expect(screen.queryByText(/^Ô NVL-02,/)).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Đường Hoàng Diệu' })).not.toBeInTheDocument();
    expect(wardConfigApi.slotGrid).toHaveBeenCalledTimes(1);
  });

  it('opens the editor from "Cấu hình"', async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.click(screen.getByRole('button', { name: 'Cấu hình' }));
    expect(await screen.findByText('editor')).toBeInTheDocument();
  });
});

describe('W16 PermitActionScreen (live)', () => {
  beforeEach(() => useToastStore.setState({ message: null }));

  const renderScreen = () =>
    renderAt(
      ['/ward/patrol', '/ward/patrol/permits/128/action'],
      <>
        <Route path="/ward/patrol" element={<div>patrol</div>} />
        <Route path="/ward/patrol/permits/:permitId/action" element={<PermitActionScreen />} />
      </>,
    );

  it('keeps the confirm button off until the trimmed reason has 5 characters', async () => {
    const user = userEvent.setup();
    renderScreen();
    const confirm = screen.getByRole('button', { name: 'Xác nhận xử lý' });
    expect(confirm).toBeDisabled();
    await user.type(screen.getByLabelText(/Lý do xử lý bắt buộc/), '   abcd  ');
    expect(confirm).toBeDisabled();
    await user.type(screen.getByLabelText(/Lý do xử lý bắt buộc/), 'e');
    expect(confirm).toBeEnabled();
  });

  it('refuses a 501-character reason with the BR-35 toast and no request', async () => {
    const action = vi.spyOn(complianceApi, 'permitAction');
    const user = userEvent.setup();
    renderScreen();
    const field = screen.getByLabelText(/Lý do xử lý bắt buộc/);
    await user.click(field);
    await user.paste('x'.repeat(501));
    await user.click(screen.getByRole('button', { name: 'Xác nhận xử lý' }));
    expect(action).not.toHaveBeenCalled();
    expect(useToastStore.getState().message).toBe(
      'Vui lòng nhập lý do xử lý cụ thể (từ 5 đến 500 ký tự — BR-35)',
    );
  });

  it('revokes with the threshold flag, stamps the choice, and goes back', async () => {
    const action = vi.spyOn(complianceApi, 'permitAction').mockResolvedValue(undefined as never);
    const user = userEvent.setup();
    renderScreen();

    expect(screen.getByText('TẠM ĐÌNH CHỈ')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: /Thu hồi vĩnh viễn giấy phép/ }));
    expect(screen.getByText('THU HỒI VĨNH VIỄN')).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox'));
    await user.type(screen.getByLabelText(/Lý do xử lý bắt buộc/), '  Tái phạm lần 3  ');
    await user.click(screen.getByRole('button', { name: 'Xác nhận xử lý' }));

    expect(action).toHaveBeenCalledWith(128, 'REVOKE', 'Tái phạm lần 3', true);
    expect(await screen.findByText('patrol')).toBeInTheDocument();
    expect(useToastStore.getState().message).toBe('Đã thu hồi giấy phép sử dụng hè phố');
  });

  it('drops a sentence starter at the end of the reason', async () => {
    const user = userEvent.setup();
    renderScreen();
    const field = screen.getByLabelText(/Lý do xử lý bắt buộc/);
    await user.type(field, 'Bày quá vạch.');
    await user.click(screen.getByRole('button', { name: /Chậm nộp phí quá hạn/ }));
    expect(field).toHaveValue('Bày quá vạch. Chậm nộp phí quá hạn');
  });
});

describe('W19 report helpers', () => {
  it('counts period days with both ends', () => {
    expect(periodDays('2026-10-01', '2026-10-05')).toBe(5);
    expect(periodDays('2026-09-01', '2026-09-30')).toBe(30);
    expect(periodDays('2026-07-08', '2026-10-05')).toBe(90);
    expect(daysInMonth('2026-02-10')).toBe(28);
  });

  it('ranks the most frequent violation labels', () => {
    const items = ['A', 'B', 'A', 'C', 'B', 'A'].map((violationLabel) => ({ violationLabel }));
    expect(topLabels(items, 2)).toEqual([
      { label: 'A', count: 3 },
      { label: 'B', count: 2 },
    ]);
  });
});

describe('W19 CollectionReportScreen (live)', () => {
  const report: CollectionReportDto = {
    from: '2026-10-01',
    to: '2026-10-10',
    feeCollected: 9_040_000,
    feePending: 5_000_000,
    feeOverdue: 1_040_000,
    penaltyCollected: 3_500_000,
    penaltyPending: 1_000_000,
    invoiceCount: 14,
    recentViolations: [
      {
        violationId: 1,
        violationType: 'OBSTRUCT',
        violationLabel: 'Cản trở lối đi bộ',
        vendorName: 'Phạm Thị Lan',
        slotCode: 'NVL-08',
        penaltyAmount: 1_000_000,
        penaltyStatus: 'UNPAID',
        recordedAt: '2026-10-01T08:00:00Z',
      },
    ],
  };

  it('shows the period total, overdue fees and the fine status, from one request', async () => {
    const load = vi.spyOn(wardReportApi, 'collectionReport').mockResolvedValue(report);
    renderAt(
      ['/ward/reports'],
      <Route path="/ward/reports" element={<CollectionReportScreen />} />,
    );

    const hero = await screen.findByRole('region', { name: 'Đã thu trong kỳ' });
    expect(within(hero).getByText('12.540.000 đ')).toBeInTheDocument();
    expect(within(hero).getByText('Phí đã thu')).toBeInTheDocument();
    expect(screen.getByText('Quá hạn: 1.040.000 đ')).toBeInTheDocument();
    expect(screen.getByText('CHƯA THANH TOÁN')).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('leaves out the overdue line when nothing is overdue', async () => {
    vi.spyOn(wardReportApi, 'collectionReport').mockResolvedValue({ ...report, feeOverdue: 0 });
    renderAt(
      ['/ward/reports'],
      <Route path="/ward/reports" element={<CollectionReportScreen />} />,
    );
    await screen.findByText('Phí đã thu');
    await waitFor(() => expect(screen.queryByText(/^Quá hạn:/)).not.toBeInTheDocument());
  });
});
