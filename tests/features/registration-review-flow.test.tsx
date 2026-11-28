import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mode = vi.hoisted(() => ({ live: false }));
vi.mock('@/core/config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/config/env')>();
  return {
    ...actual,
    get isLiveApi() {
      return mode.live;
    },
  };
});
vi.mock('@/features/ward-administration/ward-integrity-api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useRegistrationIntegrity: () => ({ data: undefined, isLoading: false, isError: false }),
}));

const { useToastStore } = await import('@/components/feedback');
const { RegistrationReviewScreen } =
  await import('@/features/ward-administration/screens/RegistrationReviewScreen');
const { complianceApi } = await import('@/features/ward-administration/ward-api');
const { useMockDb } = await import('@/mocks/db');

const toast = () => useToastStore.getState().message;

function mount(id: string) {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter
        initialEntries={['/ward/inbox', `/ward/inbox/registrations/${id}`]}
        initialIndex={1}
      >
        <Routes>
          <Route path="/ward/inbox/registrations/:id" element={<RegistrationReviewScreen />} />
          <Route path="/ward/inbox" element={<p>hộp thư</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const detail = (over: Record<string, unknown> = {}) => ({
  id: '42',
  displayName: 'Bánh mì Cô Lan',
  ownerName: 'Nguyễn Thị Lan',
  idNumber: '048099000111',
  vendorType: 'FIXED_STOREFRONT',
  status: 'UNDER_REVIEW',
  address: '12 Bạch Đằng',
  createdAt: '2026-11-01T08:00:00Z',
  fastTrack: true,
  vendorId: 5,
  latitude: null,
  longitude: null,
  reviewReason: 'Đã xem',
  reviewedBy: 'Cán bộ A',
  reviewedAt: '2026-11-02T08:00:00Z',
  evidence: [
    { evidenceId: 1, type: 'ID_CARD_FRONT', label: 'CCCD mặt trước', fileUrl: 'https://x/a.jpg' },
  ],
  aiCheck: null,
  ownerProfile: {
    dateOfBirth: '1980-01-01',
    gender: 'Nữ',
    ethnicity: 'Kinh',
    nationality: 'Việt Nam',
    idType: 'CCCD',
    idIssuedDate: '2021-01-01',
    idIssuedPlace: 'Cục CS',
    permanentAddress: 'Đà Nẵng',
    contactAddress: 'Đà Nẵng',
  },
  businessProfile: {
    businessLine: 'Ăn uống',
    capitalAmount: 50_000_000,
    laborCount: 2,
    plannedStartDate: '2026-12-01',
  },
  foodSafetyCommitmentAt: '2026-11-01T08:00:00Z',
  householdMembers: [{ fullName: 'Trần Văn B', idNumber: '048099000333', relationship: 'Chồng' }],
  identityVerified: false,
  identityVerifiedAt: null,
  identityVerifiedByName: null,
  identityVerificationNote: null,
  kycChecks: [
    { checkType: 'FACE_MATCH', passed: true, score: 0.93, checkedAt: '2026-11-01T08:00:00Z' },
  ],
  assistedByAi: true,
  ...over,
});

const initialDb = useMockDb.getState();
beforeEach(() => {
  mode.live = false;
  useMockDb.setState(initialDb, true);
  useToastStore.setState({ message: undefined } as never);
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('registration review in the demo', () => {
  it('flags a low-confidence ID read and reruns the simulated scan', async () => {
    vi.useFakeTimers();
    mount('REG-002');
    expect(screen.getByText('[AI] Cần cán bộ kiểm tra kỹ đối chiếu CCCD gốc')).toBeInTheDocument();
    expect(screen.getByText('Ảnh chụp CCCD hơi mờ ở cụm số định danh')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Quét lại CCCD [AI]' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1300);
    });
    expect(toast()).toBe('Đã quét và đối chiếu CCCD (chế độ mô phỏng, không gọi AI thật)');
    expect(screen.getByText(/Khớp 94% thông tin khai báo/)).toBeInTheDocument();
  });

  it('asks for a note before confirming identity, then records it', () => {
    mount('REG-001');
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận đã đối chiếu CCCD' }));
    expect(toast()).toBe('Vui lòng ghi chú ngắn gọn cách đối chiếu CCCD trước khi xác nhận.');

    fireEvent.change(screen.getByLabelText('Ghi chú đối chiếu CCCD'), {
      target: { value: 'Đã xem CCCD gốc' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận đã đối chiếu CCCD' }));
    return waitFor(() =>
      expect(toast()).toBe('Đã ghi nhận xác nhận (chế độ demo, máy chủ không kiểm tra).'),
    );
  });

  it.each([
    ['Duyệt điểm bán', 'APPROVED'],
    ['Từ chối', 'REJECTED'],
    ['Yêu cầu bổ sung', 'MORE_INFORMATION_REQUIRED'],
  ])('%s updates the demo record and goes back', async (label, status) => {
    mount('REG-002');
    fireEvent.change(screen.getByLabelText(/Ghi chú phản hồi/), { target: { value: 'Lý do' } });
    fireEvent.click(screen.getByRole('button', { name: label }));
    expect(await screen.findByText('hộp thư')).toBeInTheDocument();
    expect(toast()).toBe('Đã cập nhật hồ sơ (chế độ demo)');
    expect(
      useMockDb.getState().registrations.find((r) => r.id === 'REG-002')!.registration_status,
    ).toBe(status);
  });

  it('says so for an unknown registration and goes back', async () => {
    mount('REG-404');
    expect(
      screen.getByText('Không tìm thấy hồ sơ đăng ký điểm kinh doanh vỉa hè.'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Quay lại' }));
    expect(await screen.findByText('hộp thư')).toBeInTheDocument();
  });
});

describe('registration review against the server', () => {
  beforeEach(() => {
    mode.live = true;
  });

  it('shows the full dossier and keeps approval locked until identity is confirmed', async () => {
    vi.spyOn(complianceApi, 'getEnrollment').mockResolvedValue(detail() as never);
    mount('42');

    expect(await screen.findByRole('heading', { name: 'Bánh mì Cô Lan' })).toBeInTheDocument();
    expect(document.body.textContent).toMatch(/xét nhanh/i);
    expect(screen.getByText(/soạn từ lời kể/)).toBeInTheDocument();
    expect(screen.getByText('Trần Văn B')).toBeInTheDocument();
    expect(screen.getByText(/Kết quả eKYC/)).toBeInTheDocument();
    expect(screen.getByText(/50\.000\.000 đ · 2 lao động/)).toBeInTheDocument();

    const approve = screen.getByRole('button', { name: 'Duyệt (cần xác nhận CCCD trước)' });
    expect(approve).toBeDisabled();
  });

  it('confirms identity on the server, which unlocks approval, then approves', async () => {
    vi.spyOn(complianceApi, 'getEnrollment').mockResolvedValue(detail() as never);
    const confirm = vi.spyOn(complianceApi, 'confirmIdentity').mockResolvedValue(
      detail({
        identityVerified: true,
        identityVerifiedAt: '2026-11-03T08:00:00Z',
        identityVerifiedByName: 'Cán bộ B',
        identityVerificationNote: 'khớp',
      }) as never,
    );
    const decide = vi
      .spyOn(complianceApi, 'decideEnrollment')
      .mockResolvedValue(undefined as never);
    mount('42');

    fireEvent.change(await screen.findByLabelText('Ghi chú đối chiếu CCCD'), {
      target: { value: ' khớp ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận đã đối chiếu CCCD' }));
    await waitFor(() => expect(toast()).toBe('Đã ghi nhận xác nhận đối chiếu CCCD thủ công.'));
    expect(confirm).toHaveBeenCalledWith('42', 'khớp');
    expect(screen.getByText('bởi Cán bộ B')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Duyệt điểm bán' }));
    expect(await screen.findByText('hộp thư')).toBeInTheDocument();
    expect(decide).toHaveBeenCalledWith(
      '42',
      'APPROVE',
      'Hồ sơ đủ điều kiện về trật tự đô thị',
      'UNDER_REVIEW',
    );
    expect(toast()).toBe('Đã xác nhận đủ điều kiện điểm bán vỉa hè');
  });

  it('sends a rejection or a request for more papers with the note', async () => {
    vi.spyOn(complianceApi, 'getEnrollment').mockResolvedValue(detail() as never);
    const decide = vi
      .spyOn(complianceApi, 'decideEnrollment')
      .mockRejectedValueOnce(new Error('Máy chủ từ chối'))
      .mockResolvedValue(undefined as never);
    mount('42');

    fireEvent.change(await screen.findByLabelText(/Ghi chú phản hồi/), {
      target: { value: 'Thiếu ảnh' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Từ chối' }));
    await waitFor(() => expect(toast()).toBe('Máy chủ từ chối'));

    fireEvent.click(screen.getByRole('button', { name: 'Yêu cầu bổ sung' }));
    expect(await screen.findByText('hộp thư')).toBeInTheDocument();
    expect(decide).toHaveBeenLastCalledWith('42', 'MORE_INFO', 'Thiếu ảnh', 'UNDER_REVIEW');
    expect(toast()).toBe('Đã yêu cầu bổ sung giấy tờ');
  });

  it('reads the ID card with AI, and reports a failed read or confirmation', async () => {
    vi.spyOn(complianceApi, 'getEnrollment').mockResolvedValue(detail() as never);
    const extract = vi
      .spyOn(complianceApi, 'aiDocumentExtract')
      .mockResolvedValueOnce({
        matchPercentage: 97,
        isMatch: true,
        needsManualVerification: false,
        summary: 'Khớp',
        discrepancies: [],
        isAiGenerated: true,
        aiLogId: 3,
      } as never)
      .mockResolvedValueOnce({
        matchPercentage: 0,
        isMatch: false,
        needsManualVerification: true,
        summary: 'Không có ảnh CCCD',
        discrepancies: [],
        isAiGenerated: false,
        aiLogId: null,
      } as never)
      .mockRejectedValueOnce(new Error('AI bận'));
    vi.spyOn(complianceApi, 'confirmIdentity').mockRejectedValue(new Error('Không xác nhận được'));
    mount('42');

    const scan = await screen.findByRole('button', { name: 'Quét lại CCCD [AI]' });
    fireEvent.click(scan);
    await waitFor(() => expect(toast()).toBe('Đã đối chiếu CCCD thành công [AI]'));
    fireEvent.click(screen.getByRole('button', { name: 'Quét lại CCCD [AI]' }));
    await waitFor(() => expect(toast()).toBe('Không có ảnh CCCD'));
    fireEvent.click(screen.getByRole('button', { name: 'Quét lại CCCD [AI]' }));
    await waitFor(() => expect(toast()).toBe('AI bận'));
    expect(extract).toHaveBeenCalledTimes(3);

    fireEvent.change(screen.getByLabelText('Ghi chú đối chiếu CCCD'), { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận đã đối chiếu CCCD' }));
    await waitFor(() => expect(toast()).toBe('Không xác nhận được'));
  });

  it('downloads the dossier as a file, and reports a failed download', async () => {
    vi.spyOn(complianceApi, 'getEnrollment').mockResolvedValue(detail() as never);
    vi.spyOn(complianceApi, 'downloadEnrollmentDocument')
      .mockResolvedValueOnce(new Blob(['x']))
      .mockRejectedValueOnce(new Error('Lỗi tải'));
    const createUrl = vi.fn(() => 'blob:1');
    const revoke = vi.fn();
    Object.assign(URL, { createObjectURL: createUrl, revokeObjectURL: revoke });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    mount('42');
    fireEvent.click(await screen.findByRole('button', { name: 'Tải .docx' }));
    await waitFor(() => expect(revoke).toHaveBeenCalledWith('blob:1'));
    expect(click).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Tải .pdf' }));
    await waitFor(() => expect(toast()).toBe('Lỗi tải'));
  });
});
