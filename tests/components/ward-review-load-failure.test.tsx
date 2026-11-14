import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { ReactElement } from 'react';
import { vi } from 'vitest';

import { ApiError } from '@/core/api';
import { RegistrationReviewScreen } from '@/features/ward-administration/screens/RegistrationReviewScreen';
import { RenewalReviewScreen } from '@/features/ward-administration/screens/RenewalReviewScreen';
import { RentalApplicationReviewScreen } from '@/features/ward-administration/screens/RentalApplicationReviewScreen';
import {
  complianceApi,
  type WardRenewalDetail,
  type WardRentalApplicationDetail,
} from '@/features/ward-administration/ward-api';

vi.mock('@/core/config/env', () => ({
  env: { apiBaseUrl: 'https://api.example.test/api', useMockApi: false, appEnv: 'test' },
  isDev: true,
  isLiveApi: true,
}));

/**
 * The ward review screens used to fall back to the mock seed (and default figures such as
 * 50.000 đ/ngày, 2 × 1,5 m, "06:00 - 10:30") when the live record failed to load, with the
 * decision buttons still live. An officer could approve a real id without seeing it.
 */
function mount(path: string, pattern: string, element: ReactElement) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={pattern} element={element} />
      </Routes>
    </MemoryRouter>,
  );
}

const serverError = () => new ApiError('server_error', 500, 'Máy chủ đang bận, vui lòng thử lại.');
const notFound = () => new ApiError('not_found', 404, 'Không tìm thấy dữ liệu.');

const renewal = {
  id: '9',
  contractId: 12,
  slotCode: 'NVL-08',
  slotStreet: 'Nguyễn Văn Linh',
  vendorName: 'Bánh mì Cô Lan',
  status: 'PENDING',
  requestedTermDays: 30,
  currentEndDate: '2026-12-31',
  proposedEndDate: '2027-01-30',
  remainingDaysOnCurrentContract: 20,
  slotWidth: 1.2,
  slotLength: 2.4,
  pricePerDay: 40000,
  totalEstimatedFee: 1200000,
  reviewReason: null,
  reviewedBy: null,
  reviewedAt: null,
  canApprove: true,
  blockers: [],
  scorecard: null,
} as unknown as WardRenewalDetail;

const rental: WardRentalApplicationDetail = {
  id: '5',
  applicationMethod: 'AUTO_ADJACENT',
  requestedTermDays: 90,
  status: 'PENDING',
  vendorName: 'Cà phê Mộc',
  slotCode: 'HD-03',
  slotStreet: 'Hoàng Diệu',
  pricePerDay: 30000,
  createdAt: '2026-10-08T01:00:00Z',
  registrationId: 44,
  registrationStatus: 'APPROVED',
  vendorPhone: '0905111222',
  slotId: 300,
  slotWidth: 1.5,
  slotLength: 3,
  reviewReason: null,
  reviewedBy: null,
  reviewedAt: null,
  canApprove: true,
  blockers: [],
  totalFee: 2700000,
  rentFee: 2700000,
  deposit: 0,
};

describe('ward review screens when the live record does not load', () => {
  afterEach(() => vi.restoreAllMocks());

  it('renewal: shows the failure, no mock figures and no decision buttons, then retries', async () => {
    const load = vi
      .spyOn(complianceApi, 'getRenewal')
      .mockRejectedValueOnce(serverError())
      .mockResolvedValueOnce(renewal);
    mount('/ward/inbox/renewals/9', '/ward/inbox/renewals/:id', <RenewalReviewScreen />);

    expect(await screen.findByText('Máy chủ đang bận, vui lòng thử lại.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Duyệt gia hạn' })).not.toBeInTheDocument();
    expect(screen.queryByText(/50\.000/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect((await screen.findAllByText('Bánh mì Cô Lan')).length).toBeGreaterThan(0);
    expect(load).toHaveBeenCalledTimes(2);
    expect(screen.getAllByRole('button', { name: 'Duyệt gia hạn' }).length).toBeGreaterThan(0);
  });

  it('renewal: a record outside the ward offers no retry', async () => {
    vi.spyOn(complianceApi, 'getRenewal').mockRejectedValue(notFound());
    mount('/ward/inbox/renewals/9', '/ward/inbox/renewals/:id', <RenewalReviewScreen />);

    expect(
      await screen.findByText('Không tìm thấy yêu cầu gia hạn tại địa bàn.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Thử lại' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Quay lại' })).toBeInTheDocument();
  });

  it('rental application: failure hides every decision control', async () => {
    vi.spyOn(complianceApi, 'getRentalApplication').mockRejectedValue(serverError());
    mount(
      '/ward/inbox/applications/5',
      '/ward/inbox/applications/:id',
      <RentalApplicationReviewScreen />,
    );

    expect(await screen.findByText('Máy chủ đang bận, vui lòng thử lại.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Duyệt & Cấp phép số' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Từ chối' })).not.toBeInTheDocument();
  });

  it('registration: failure hides every decision control', async () => {
    vi.spyOn(complianceApi, 'getEnrollment').mockRejectedValue(serverError());
    mount(
      '/ward/inbox/registrations/3',
      '/ward/inbox/registrations/:id',
      <RegistrationReviewScreen />,
    );

    expect(await screen.findByText('Máy chủ đang bận, vui lòng thử lại.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Từ chối' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Yêu cầu bổ sung' })).not.toBeInTheDocument();
  });
});

describe('rental application review (live record)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('shows only what the server sent: no stand-in owner or trading hours, the real area', async () => {
    vi.spyOn(complianceApi, 'getRentalApplication').mockResolvedValue(rental);
    mount(
      '/ward/inbox/applications/5',
      '/ward/inbox/applications/:id',
      <RentalApplicationReviewScreen />,
    );

    expect((await screen.findAllByText('Cà phê Mộc')).length).toBeGreaterThan(0);
    expect(screen.queryByText('Khung giờ được phép kinh doanh')).not.toBeInTheDocument();
    expect(screen.queryByText('Chủ hộ / Đại diện')).not.toBeInTheDocument();
    expect(screen.queryByText('Đại diện hộ kinh doanh')).not.toBeInTheDocument();
    // 1,5 m × 3 m = 4,5 m², from the server's measurements, not the mock's 3 m².
    expect(screen.getByText(/4\.5 m² \(1\.5m rộng x 3m dài\)/)).toBeInTheDocument();
    expect(screen.getByText('Mã hồ sơ: 44')).toBeInTheDocument();
    expect(screen.getByText('HÈ PHỐ LIỀN KỀ CỬA HÀNG')).toBeInTheDocument();
  });
});
