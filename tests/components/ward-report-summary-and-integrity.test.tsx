import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { wardReportApi, type CollectionReportDto, type ReportSummaryDto } from '@/core/api';
import {
  wardIntegrityApi,
  type RegistrationIntegrity,
} from '@/features/ward-administration/ward-integrity-api';

vi.mock('@/core/config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/config/env')>();
  return { ...actual, isLiveApi: true, env: { ...actual.env, enableAiCompliance: false } };
});

const { CollectionReportScreen } =
  await import('@/features/ward-administration/screens/CollectionReportScreen');
const { RegistrationIntegrityPanel } =
  await import('@/features/ward-administration/components/review/RegistrationIntegrityPanel');

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

const report: CollectionReportDto = {
  from: '2026-10-01',
  to: '2026-10-12',
  feeCollected: 2_630_000,
  feePending: 5_000_000,
  feeOverdue: 1_040_000,
  penaltyCollected: 0,
  penaltyPending: 1_000_000,
  invoiceCount: 3,
  recentViolations: [],
};

const summary: ReportSummaryDto = {
  from: '2026-10-01',
  to: '2026-10-12',
  headline: '01/10/2026 – 12/10/2026: thu 2.630.000 đ, nợ quá hạn 1.040.000 đ, 2 vi phạm.',
  points: [
    { tone: 'POSITIVE', topic: 'COLLECTION', text: 'Kỳ này thu 2.630.000 đ, tăng 426% so với kỳ trước.' },
    { tone: 'ATTENTION', topic: 'DEBT', text: 'Hiện có 1 kỳ phí quá hạn của 1 hộ.' },
    { tone: 'NEUTRAL', topic: 'WORKLOAD', text: 'Đang chờ xử lý: 3 hồ sơ đăng ký, 1 đơn thuê ô.' },
  ],
  basis: 'Tổng hợp tự động từ số liệu của phường trong kỳ đã chọn; chỉ để tham khảo.',
};

describe('AIC-08 report summary on the collection report', () => {
  it('shows the server-written summary for the selected period instead of canned text', async () => {
    vi.spyOn(wardReportApi, 'collectionReport').mockResolvedValue(report);
    const load = vi.spyOn(wardReportApi, 'summary').mockResolvedValue(summary);
    renderAt(['/ward/reports'], <Route path="/ward/reports" element={<CollectionReportScreen />} />);

    const card = await screen.findByRole('region', { name: 'Tóm tắt kỳ báo cáo' });
    expect(within(card).getByText(summary.headline)).toBeInTheDocument();
    expect(within(card).getByText(/tăng 426%/)).toBeInTheDocument();
    expect(within(card).getByText(/Cần chú ý:/)).toBeInTheDocument();
    expect(within(card).getByText(summary.basis)).toBeInTheDocument();
    // The same period the report asked for.
    const [from, to] = load.mock.calls[0]!;
    expect(from).toMatch(/^\d{4}-\d{2}-01$/);
    expect(to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('opens on what needs attention and keeps the rest one tap away', async () => {
    vi.spyOn(wardReportApi, 'collectionReport').mockResolvedValue(report);
    vi.spyOn(wardReportApi, 'summary').mockResolvedValue({
      ...summary,
      points: [
        { tone: 'POSITIVE', topic: 'COLLECTION', text: 'Kỳ này thu 2.630.000 đ.' },
        { tone: 'NEUTRAL', topic: 'WORKLOAD', text: 'Đang chờ xử lý: 3 hồ sơ.' },
        { tone: 'ATTENTION', topic: 'DEBT', text: 'Hiện có 1 kỳ phí quá hạn.' },
        { tone: 'ATTENTION', topic: 'VIOLATIONS', text: 'Ghi nhận 2 vi phạm.' },
        { tone: 'POSITIVE', topic: 'OCCUPANCY', text: '17/20 ô đang cho thuê.' },
      ],
    });
    renderAt(['/ward/reports'], <Route path="/ward/reports" element={<CollectionReportScreen />} />);

    const card = await screen.findByRole('region', { name: 'Tóm tắt kỳ báo cáo' });
    expect(within(card).getByText('2 điểm cần chú ý')).toBeInTheDocument();
    // Attention first, then the next one by the server's order; the other two stay hidden.
    const items = within(card).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('Hiện có 1 kỳ phí quá hạn.');
    expect(items[1]).toHaveTextContent('Ghi nhận 2 vi phạm.');
    expect(within(card).queryByText('17/20 ô đang cho thuê.')).not.toBeInTheDocument();

    const more = within(card).getByRole('button', { name: 'Xem thêm 2 mục' });
    expect(more).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(more);

    expect(within(card).getAllByRole('listitem')).toHaveLength(5);
    expect(within(card).getByText('17/20 ô đang cho thuê.')).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'Thu gọn' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('says nothing needs attention when every point is fine', async () => {
    vi.spyOn(wardReportApi, 'collectionReport').mockResolvedValue(report);
    vi.spyOn(wardReportApi, 'summary').mockResolvedValue({
      ...summary,
      points: [{ tone: 'POSITIVE', topic: 'DEBT', text: 'Không có kỳ phí nào đang quá hạn.' }],
    });
    renderAt(['/ward/reports'], <Route path="/ward/reports" element={<CollectionReportScreen />} />);

    const card = await screen.findByRole('region', { name: 'Tóm tắt kỳ báo cáo' });
    expect(within(card).getByText('Không có điểm cần chú ý')).toBeInTheDocument();
    expect(within(card).queryByRole('button')).not.toBeInTheDocument();
  });

  it('still shows the report when the summary cannot be loaded', async () => {
    vi.spyOn(wardReportApi, 'collectionReport').mockResolvedValue(report);
    vi.spyOn(wardReportApi, 'summary').mockRejectedValue(new Error('boom'));
    renderAt(['/ward/reports'], <Route path="/ward/reports" element={<CollectionReportScreen />} />);

    expect(await screen.findByText('Phí đã thu')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole('region', { name: 'Tóm tắt kỳ báo cáo' })).not.toBeInTheDocument(),
    );
  });

  it('no longer prints the old hard-coded paragraph', async () => {
    vi.spyOn(wardReportApi, 'collectionReport').mockResolvedValue(report);
    vi.spyOn(wardReportApi, 'summary').mockResolvedValue(summary);
    renderAt(['/ward/reports'], <Route path="/ward/reports" element={<CollectionReportScreen />} />);

    await screen.findByRole('region', { name: 'Tóm tắt kỳ báo cáo' });
    expect(screen.queryByText(/nhắc thanh toán sớm hơn 3 ngày/)).not.toBeInTheDocument();
  });
});

describe('AIC-03 duplicate-registration panel', () => {
  const flagged: RegistrationIntegrity = {
    registrationId: 2,
    level: 'HIGH',
    hasIdNumber: true,
    basis: 'Đối chiếu tự động; chỉ là cảnh báo.',
    flags: [
      {
        code: 'ID_SHARED_ACROSS_VENDORS',
        severity: 'HIGH',
        title: 'Số CCCD đã dùng ở tài khoản khác',
        detail: 'Số CCCD của hồ sơ này cũng xuất hiện ở 2 hồ sơ thuộc tài khoản khác.',
        related: [
          {
            registrationId: 4,
            businessName: 'Gánh bún Minh Khôi',
            wardName: 'Phường Hải Châu',
            status: 'UNDER_REVIEW',
            note: null,
          },
          {
            registrationId: null,
            businessName: null,
            wardName: 'Phường Thanh Khê',
            status: 'SUBMITTED',
            note: null,
          },
        ],
      },
      {
        code: 'REGISTRATION_BURST',
        severity: 'LOW',
        title: 'Tài khoản nộp nhiều hồ sơ trong thời gian ngắn',
        detail: 'Tài khoản này đã tạo 5 hồ sơ trong khoảng 30 ngày.',
        related: [],
      },
    ],
  };

  function mountPanel() {
    renderAt(
      ['/ward/inbox/registrations/2'],
      <Route path="/ward/inbox/registrations/:id" element={<RegistrationIntegrityPanel registrationId="2" />} />,
    );
  }

  it('lists each warning with its severity and links in-ward households only', async () => {
    const load = vi.spyOn(wardIntegrityApi, 'registration').mockResolvedValue(flagged);
    mountPanel();

    const panel = await screen.findByRole('region', { name: 'Đối chiếu hồ sơ trùng lặp' });
    expect(within(panel).getByText(/2 cảnh báo/)).toBeInTheDocument();
    expect(within(panel).getByText('Số CCCD đã dùng ở tài khoản khác')).toBeInTheDocument();
    expect(within(panel).getByText('Mức cao')).toBeInTheDocument();
    expect(within(panel).getByText('Mức thấp')).toBeInTheDocument();

    const link = within(panel).getByRole('link', { name: 'Gánh bún Minh Khôi' });
    expect(link).toHaveAttribute('href', '/ward/inbox/registrations/4');
    // The other ward's household has no name and no link, only where to ask.
    expect(within(panel).getByText(/Hồ sơ ở Phường Thanh Khê · Đã nộp/)).toBeInTheDocument();
    expect(within(panel).getAllByRole('link')).toHaveLength(1);
    expect(load).toHaveBeenCalledWith('2');
  });

  it('says plainly when nothing was found', async () => {
    vi.spyOn(wardIntegrityApi, 'registration').mockResolvedValue({
      ...flagged, level: 'NONE', flags: [],
    });
    mountPanel();

    expect(await screen.findByText('Không phát hiện hồ sơ trùng lặp')).toBeInTheDocument();
  });

  it('does not claim a clean check when there is no id number to compare', async () => {
    vi.spyOn(wardIntegrityApi, 'registration').mockResolvedValue({
      ...flagged, level: 'NONE', flags: [], hasIdNumber: false,
    });
    mountPanel();

    expect(await screen.findByText('Chưa đối chiếu được hồ sơ trùng lặp')).toBeInTheDocument();
    expect(screen.queryByText('Không phát hiện hồ sơ trùng lặp')).not.toBeInTheDocument();
  });

  it('leaves the review undisturbed when the check fails', async () => {
    const load = vi.spyOn(wardIntegrityApi, 'registration').mockRejectedValue(new Error('boom'));
    mountPanel();

    await waitFor(() => expect(load).toHaveBeenCalled());
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
    expect(screen.queryByText(/hồ sơ trùng lặp/)).not.toBeInTheDocument();
  });
});
