import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import type { WardEnrollmentDetail } from '@/features/ward-administration/ward-api';

vi.mock('@/core/config/env', () => ({
  env: { apiBaseUrl: 'https://api.example.test/api', useMockApi: false, appEnv: 'test', enableAiCompliance: false },
  isDev: true,
  isLiveApi: true,
}));

const api = vi.hoisted(() => ({
  getEnrollment: vi.fn(),
  getFastTrackCheck: vi.fn(),
  claimEnrollment: vi.fn(),
  decideEnrollment: vi.fn(),
  confirmIdentity: vi.fn(),
  aiDocumentExtract: vi.fn(),
}));

vi.mock('@/features/ward-administration/ward-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/ward-administration/ward-api')>();
  return { ...actual, complianceApi: { ...actual.complianceApi, ...api } };
});

const { RegistrationReviewScreen } = await import(
  '@/features/ward-administration/screens/RegistrationReviewScreen'
);

const detail = (over: Partial<WardEnrollmentDetail> = {}): WardEnrollmentDetail => ({
  id: '7',
  displayName: 'Xôi gà Bà Năm',
  ownerName: 'Nguyễn Thị Năm',
  idNumber: '048099000111',
  vendorType: 'FIXED_STOREFRONT',
  status: 'SUBMITTED',
  address: '12 Lê Duẩn',
  createdAt: '2026-10-01T00:00:00Z',
  fastTrack: false,
  latitude: null,
  longitude: null,
  reviewReason: null,
  reviewedBy: null,
  reviewedAt: null,
  evidence: [],
  aiCheck: null,
  ownerProfile: {
    dateOfBirth: null, gender: null, ethnicity: null, nationality: null, idType: null,
    idIssuedDate: null, idIssuedPlace: null, permanentAddress: null, contactAddress: null,
  },
  businessProfile: { businessLine: null, businessLineCode: null, capitalAmount: null, laborCount: null, plannedStartDate: null },
  foodSafetyCommitmentAt: null,
  householdMembers: [],
  identityVerified: true,
  identityVerifiedAt: '2026-10-02T00:00:00Z',
  identityVerifiedByName: 'Cán bộ',
  identityVerificationNote: 'Đã đối chiếu',
  kycChecks: [],
  ...over,
});

function renderReview() {
  return render(
    <MemoryRouter initialEntries={['/ward/inbox/registrations/7']}>
      <Routes>
        <Route path="/ward/inbox/registrations/:id" element={<RegistrationReviewScreen />} />
        <Route path="*" element={<div>elsewhere</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  api.getEnrollment.mockResolvedValue(detail());
  api.getFastTrackCheck.mockResolvedValue({ eligible: false, criteria: [] });
  api.decideEnrollment.mockResolvedValue(detail({ status: 'APPROVED' }));
});

describe('RegistrationReviewScreen (live)', () => {
  it('shows a loading state, not demo data, while the file loads', () => {
    api.getEnrollment.mockReturnValue(new Promise(() => undefined));
    renderReview();

    expect(screen.queryByText('Duyệt điểm bán')).not.toBeInTheDocument();
  });

  it('reports a load failure instead of falling back to demo data', async () => {
    api.getEnrollment.mockRejectedValue(new Error('Máy chủ không phản hồi'));
    renderReview();

    expect(await screen.findByText('Máy chủ không phản hồi')).toBeInTheDocument();
    expect(screen.queryByText('Duyệt điểm bán')).not.toBeInTheDocument();
  });

  it('will not send a decision without a written reason', async () => {
    const user = userEvent.setup();
    renderReview();

    await user.click(await screen.findByRole('button', { name: 'Từ chối' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(api.decideEnrollment).not.toHaveBeenCalled();
  });

  it('asks for confirmation, then sends the officer’s own reason (never an invented one)', async () => {
    const user = userEvent.setup();
    renderReview();

    await user.type(await screen.findByLabelText(/Lý do gửi kèm/), 'Hồ sơ đủ điều kiện');
    await user.click(screen.getByRole('button', { name: 'Duyệt điểm bán' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Duyệt điểm bán này?');
    expect(api.decideEnrollment).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole('button', { name: 'Duyệt điểm bán' }));

    await waitFor(() =>
      expect(api.decideEnrollment).toHaveBeenCalledWith('7', 'APPROVE', 'Hồ sơ đủ điều kiện', 'SUBMITTED'),
    );
  });

  it('keeps the file untouched when the officer cancels the confirmation', async () => {
    const user = userEvent.setup();
    renderReview();

    await user.type(await screen.findByLabelText(/Lý do gửi kèm/), 'Thiếu giấy tờ');
    await user.click(screen.getByRole('button', { name: 'Từ chối' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Huỷ' }));

    expect(api.decideEnrollment).not.toHaveBeenCalled();
  });

  it('fills the reason from a template', async () => {
    const user = userEvent.setup();
    renderReview();

    await user.click(await screen.findByRole('button', { name: 'Ảnh giấy tờ chưa rõ nét, vui lòng chụp lại.' }));

    expect(screen.getByLabelText(/Lý do gửi kèm/)).toHaveValue('Ảnh giấy tờ chưa rõ nét, vui lòng chụp lại.');
  });

  it('blocks approval until the identity has been confirmed', async () => {
    api.getEnrollment.mockResolvedValue(detail({ identityVerified: false, identityVerifiedAt: null }));
    renderReview();

    expect(await screen.findByRole('button', { name: /Duyệt \(cần xác nhận CCCD trước\)/ })).toBeDisabled();
  });

  it('cannot decide a file that is no longer open for review', async () => {
    api.getEnrollment.mockResolvedValue(detail({ status: 'APPROVED' }));
    renderReview();

    expect(await screen.findByRole('button', { name: 'Từ chối' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Yêu cầu bổ sung' })).toBeDisabled();
  });

  it('offers to claim a submitted file and shows the new status', async () => {
    const user = userEvent.setup();
    api.claimEnrollment.mockResolvedValue(detail({ status: 'UNDER_REVIEW' }));
    renderReview();

    await user.click(await screen.findByRole('button', { name: 'Nhận xử lý' }));

    await waitFor(() => expect(api.claimEnrollment).toHaveBeenCalledWith('7'));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Nhận xử lý' })).not.toBeInTheDocument());
  });

  it('lists each fast-track condition as met or not, as advice only', async () => {
    api.getFastTrackCheck.mockResolvedValue({
      eligible: false,
      criteria: [
        { code: 'FIXED_STOREFRONT', label: 'Cửa hàng cố định', passed: true },
        { code: 'BUSINESS_LICENSE', label: 'Có giấy phép kinh doanh đính kèm', passed: false },
      ],
    });
    renderReview();

    expect(await screen.findByText('Hồ sơ chưa đủ điều kiện xét nhanh.')).toBeInTheDocument();
    expect(screen.getByText('Đạt')).toBeInTheDocument();
    expect(screen.getByText('Chưa đạt')).toBeInTheDocument();
    expect(screen.getByText(/không thay cho quyết định của cán bộ/)).toBeInTheDocument();
  });

  it('still reviews the file when the fast-track hint cannot be loaded', async () => {
    api.getFastTrackCheck.mockRejectedValue(new Error('boom'));
    renderReview();

    expect(await screen.findByRole('button', { name: 'Duyệt điểm bán' })).toBeInTheDocument();
    expect(screen.queryByText('Điều kiện xét nhanh')).not.toBeInTheDocument();
  });

  it('shows no internal use-case codes or AI tags to the officer', async () => {
    renderReview();
    await screen.findByRole('button', { name: 'Duyệt điểm bán' });

    expect(document.body.textContent).not.toMatch(/WARD-0\d|\[AI\]/);
  });
});
