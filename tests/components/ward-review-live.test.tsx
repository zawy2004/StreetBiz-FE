import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { vi } from 'vitest';

import { InboxScreen } from '@/features/ward-administration/screens/InboxScreen';
import { RenewalReviewScreen } from '@/features/ward-administration/screens/RenewalReviewScreen';
import { WardCaseScreen } from '@/features/ward-administration/screens/WardCaseScreen';
import {
  complianceApi,
  wardApi,
  type WardCase,
  type WardRenewalDetail,
  type WardRenewalItem,
} from '@/features/ward-administration/ward-api';
import { useAuthStore } from '@/store/auth-store';

vi.mock('@/core/config/env', () => ({
  env: { apiBaseUrl: 'https://api.example.test/api', useMockApi: false, appEnv: 'test' },
  isDev: true,
  isLiveApi: true,
}));

const base: WardCase = {
  id: '7',
  kind: 'conflicts',
  title: 'Xung đột',
  status: 'UNDER_REVIEW',
  slotCode: 'BĐ-012',
  applicant: 'Lê Thị Mai',
  summary: 'Xin kinh doanh tại 12 Bạch Đằng',
  location: null,
  evidenceUrl: null,
  createdAt: '2026-10-08T01:00:00',
  reason: null,
  blockers: [],
  actions: ['QUEUE', 'REJECT'],
  queuePosition: 3,
  contractTerm: null,
  outstanding: null,
  documents: null,
  fastTrack: false,
};

function mount(path: string, pattern: string, element: ReactElement) {
  vi.spyOn(wardApi, 'me').mockResolvedValue({
    userId: '1',
    wardId: 10,
    name: 'Ward',
    sanctionAuthorityTitle: null,
  });
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={pattern} element={element} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ward review screens (live)', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: {
        id: '1',
        fullName: 'Ward',
        phone: '0983000001',
        password: '',
        role_code: 'WARD_AUTHORITY',
        wardUnitId: 10,
        account_status: 'ACTIVE',
      },
      sessionExpired: false,
    });
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    useAuthStore.setState({ user: null, sessionExpired: false });
  });

  it('conflict: queue ticket, the fixed rule, and QUEUE only after confirmation', async () => {
    vi.spyOn(wardApi, 'get').mockResolvedValue(base);
    const decide = vi
      .spyOn(wardApi, 'decide')
      .mockResolvedValue({ ...base, status: 'APPROVED', actions: [] });
    mount(
      '/ward/inbox/address-conflicts/7',
      '/ward/inbox/address-conflicts/:id',
      <WardCaseScreen kind="conflicts" />,
    );
    expect(await screen.findByText('Vị trí hàng chờ thứ 3')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Xếp hàng chỉ ghi nhận thứ tự chờ. Hợp đồng người đang thuê và ô cũ được giữ nguyên.',
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByText('ĐANG XẾP HÀNG').length).toBeGreaterThan(0);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Ghi nhận thứ tự' } });
    fireEvent.click(screen.getByRole('button', { name: 'Đưa vào hàng chờ' }));
    expect(decide).not.toHaveBeenCalled();
    expect(screen.queryByText('Quyết định đã được lưu vào Backend.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận' }));
    await waitFor(() => expect(decide).toHaveBeenCalledWith(base, 'QUEUE', 'Ghi nhận thứ tự'));
    expect(await screen.findByText('Quyết định đã được lưu vào Backend.')).toBeInTheDocument();
  });

  it('transfer without debt: says nothing is owed; no actions means no textbox', async () => {
    vi.spyOn(wardApi, 'get').mockResolvedValue({
      ...base,
      kind: 'transfers',
      status: 'APPROVED',
      actions: [],
      queuePosition: null,
      outstanding: 0,
      contractTerm: '01/09 – 30/09',
    });
    mount(
      '/ward/inbox/slot-transfers/7',
      '/ward/inbox/slot-transfers/:id',
      <WardCaseScreen kind="transfers" />,
    );
    expect(await screen.findByText('Không còn phí và phạt chưa thanh toán')).toBeInTheDocument();
    expect(screen.getByText('Chuyển nhượng ô')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Danh sách hồ sơ/ })).toHaveAttribute(
      'href',
      '/ward/inbox/reviews?kind=transfers',
    );
  });

  it('invalid id is refused before any lookup', () => {
    const get = vi.spyOn(wardApi, 'get');
    mount(
      '/ward/inbox/slot-proposals/abc',
      '/ward/inbox/slot-proposals/:id',
      <WardCaseScreen kind="proposals" />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Mã hồ sơ không hợp lệ');
    expect(get).not.toHaveBeenCalled();
  });

  it('inbox: renewal risk is computed on the client and the batch slip needs a choice and a reason', async () => {
    const renewal: WardRenewalItem = {
      id: '9',
      contractId: 12,
      slotCode: 'NVL-08',
      slotStreet: 'Nguyễn Văn Linh',
      vendorName: 'Bánh mì Cô Lan',
      status: 'PENDING',
      requestedTermDays: 30,
      currentEndDate: '2026-10-15',
      proposedEndDate: '2026-11-14',
      pricePerDay: 50000,
      totalFee: 1500000,
      isFastTrackEligible: true,
      violationCount: 2,
      createdAt: '2026-10-05T02:00:00',
      slaDueAt: '2026-10-08T10:00:00',
      isOverdue: true,
    } as WardRenewalItem;
    vi.spyOn(complianceApi, 'listEnrollments').mockResolvedValue([]);
    vi.spyOn(complianceApi, 'listRentalApplications').mockResolvedValue([]);
    vi.spyOn(complianceApi, 'listRenewals').mockImplementation((status?: string) =>
      Promise.resolve(status === 'PENDING' ? [renewal] : []),
    );
    vi.spyOn(complianceApi, 'riskQueue').mockResolvedValue([]);
    const batch = vi.spyOn(complianceApi, 'batchDecideRenewals').mockResolvedValue({
      totalRequested: 1,
      successCount: 1,
      failureCount: 0,
      results: [],
    });
    mount('/ward/inbox', '/ward/inbox', <InboxScreen />);
    expect(await screen.findByText('Cần xem kỹ (+140đ)')).toBeInTheDocument();
    expect(
      screen.getByText(
        /2 vi phạm trong hợp đồng \(\+40đ\), Quá hạn xử lý theo NĐ 241\/2026 \(≤3 ngày làm việc\) \(\+100đ\)/,
      ),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /\[AI\] Xét nhanh/ }));
    const approve = screen.getByRole('button', { name: /^Duyệt\s+hồ sơ$/ });
    expect(approve).toBeDisabled();
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Chọn gia hạn Bánh mì Cô Lan - ô NVL-08' }),
    );
    fireEvent.change(screen.getByRole('textbox', { name: 'Lý do phê duyệt chung (bắt buộc)' }), {
      target: { value: '  Đủ điều kiện  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Duyệt 1 hồ sơ' }));
    await waitFor(() =>
      expect(batch).toHaveBeenCalledWith(
        [{ renewalId: 9, expectedStatus: 'PENDING' }],
        'APPROVE',
        'Đủ điều kiện',
      ),
    );
  });

  it('renewal already decided: shows the recorded decision and no decision controls', async () => {
    vi.spyOn(complianceApi, 'getRenewal').mockResolvedValue({
      id: '9',
      contractId: 12,
      slotCode: 'NVL-08',
      slotStreet: 'Nguyễn Văn Linh',
      vendorName: 'Bánh mì Cô Lan',
      status: 'APPROVED',
      requestedTermDays: 30,
      currentEndDate: '2026-12-31',
      proposedEndDate: '2027-01-30',
      remainingDaysOnCurrentContract: 20,
      pricePerDay: 50000,
      totalEstimatedFee: 1500000,
      reviewReason: 'Đủ điều kiện',
      reviewedBy: 'Cán bộ A',
      reviewedAt: '2026-10-09T03:00:00Z',
      canApprove: true,
      blockers: [],
      scorecard: null,
    } as unknown as WardRenewalDetail);
    mount('/ward/inbox/renewals/9', '/ward/inbox/renewals/:id', <RenewalReviewScreen />);
    expect(await screen.findByText('Quyết định của cán bộ')).toBeInTheDocument();
    expect(screen.getByText('Đủ điều kiện')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Duyệt gia hạn' })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
});
