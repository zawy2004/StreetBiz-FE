import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { ReactElement } from 'react';
import { vi } from 'vitest';

import { ApiError } from '@/core/api';
import { complianceApi, type InspectPermitResult } from '@/features/ward-administration/ward-api';
import { RenewalReviewScreen } from '@/features/ward-administration/screens/RenewalReviewScreen';
import { RentalApplicationReviewScreen } from '@/features/ward-administration/screens/RentalApplicationReviewScreen';

vi.mock('@/core/config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/config/env')>();
  return {
    ...actual,
    isLiveApi: true,
    env: {
      ...actual.env,
      apiBaseUrl: 'https://api.example.test/api',
      useMockApi: false,
      enableAiCompliance: false,
    },
  };
});

const { PermitScanScreen } =
  await import('@/features/ward-administration/screens/PermitScanScreen');

/**
 * axe-core over the outdoor and decision screens of the ward (the ones an officer uses in the
 * street or to decide a case). jsdom has no layout, so colour contrast and anything measured
 * on screen are out of scope here; the browser audit covers those.
 */
async function violations(container: HTMLElement) {
  const result = await axe.run(container, {
    rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
  });
  return result.violations.map(
    (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
  );
}

function mount(path: string, pattern: string, element: ReactElement) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={pattern} element={element} />
      </Routes>
    </MemoryRouter>,
  );
}

const permit: InspectPermitResult = {
  found: true,
  isValid: true,
  effectiveStatus: 'VALID',
  permitId: 7,
  contractId: 3,
  vendorId: 11,
  vendorName: 'Bánh mì Cô Lan',
  slotId: 8,
  slotCode: 'NVL-08',
  slotStreet: 'Đường Nguyễn Văn Linh',
  width: 2,
  length: 3,
  startDate: '2026-09-26',
  endDate: '2027-03-25',
  distanceMeters: 40,
  isLocationMatched: false,
  locationWarning:
    'Cảnh báo lệch vị trí: điểm quét thực tế cách ô cấp phép 40m (vượt dung sai 25m).',
  aiVisionResult: null,
  isOwnWard: false,
};

describe('axe-core: ward screens', () => {
  beforeEach(() => {
    vi.spyOn(complianceApi, 'patrolHeatmap').mockResolvedValue([]);
    Object.defineProperty(navigator, 'geolocation', { value: undefined, configurable: true });
  });
  afterEach(() => vi.restoreAllMocks());

  it('permit scan, before and after a lookup', async () => {
    vi.spyOn(complianceApi, 'inspectPermit').mockResolvedValue(permit);
    const { container } = mount('/ward/patrol', '/ward/patrol', <PermitScanScreen />);
    expect(await violations(container)).toEqual([]);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Mã giấy phép số / Token QR'), 'SB-HC1-2026-0815');
    await user.click(screen.getByRole('button', { name: 'Kiểm tra' }));
    await screen.findByRole('region', { name: 'Kết quả tra cứu giấy phép' });
    expect(await violations(container)).toEqual([]);
  });

  it('a review whose record failed to load', async () => {
    vi.spyOn(complianceApi, 'getRenewal').mockRejectedValue(
      new ApiError('server_error', 500, 'Máy chủ đang bận, vui lòng thử lại.'),
    );
    const { container } = mount(
      '/ward/inbox/renewals/9',
      '/ward/inbox/renewals/:id',
      <RenewalReviewScreen />,
    );
    await screen.findByText('Máy chủ đang bận, vui lòng thử lại.');
    expect(await violations(container)).toEqual([]);
  });

  it('the rental application decision desk', async () => {
    vi.spyOn(complianceApi, 'getRentalApplication').mockResolvedValue({
      id: '5',
      applicationMethod: 'MANUAL_SELECTED',
      requestedTermDays: 30,
      status: 'PENDING',
      vendorName: 'Cà phê Mộc',
      slotCode: 'HD-03',
      slotStreet: 'Hoàng Diệu',
      pricePerDay: 30000,
      createdAt: '2026-10-08T01:00:00Z',
      registrationId: 44,
      registrationStatus: 'SUBMITTED',
      vendorPhone: '0905111222',
      slotId: 300,
      slotWidth: 1.5,
      slotLength: 3,
      reviewReason: null,
      reviewedBy: null,
      reviewedAt: null,
      canApprove: false,
      blockers: ['Hồ sơ điểm kinh doanh chưa được duyệt (BR-16).'],
      totalFee: 900000,
      rentFee: 900000,
      deposit: 0,
    });
    const { container } = mount(
      '/ward/inbox/rental-applications/5',
      '/ward/inbox/rental-applications/:id',
      <RentalApplicationReviewScreen />,
    );
    expect((await screen.findAllByText('Cà phê Mộc')).length).toBeGreaterThan(0);
    expect(await violations(container)).toEqual([]);
  });
});
