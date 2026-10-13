import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useToastStore } from '@/components/feedback';
import {
  complianceApi,
  wardApi,
  type AiLegalSuggestion,
  type PenaltyScheduleItem,
  type WardViolationDetail,
} from '@/features/ward-administration/ward-api';

vi.mock('@/core/config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/config/env')>();
  return { ...actual, isLiveApi: true };
});

const { RecordViolationScreen } =
  await import('@/features/ward-administration/screens/RecordViolationScreen');

const SCHEDULES: PenaltyScheduleItem[] = [
  {
    scheduleId: 1,
    violationType: 'UNAUTHORIZED_BUSINESS_USE',
    violationTypeName: 'Sử dụng trái phép vỉa hè để kinh doanh',
    penaltyAmount: 2500000,
    legalBasis: 'Nghị định 168/2024/NĐ-CP, Điều 12',
  },
  {
    scheduleId: 3,
    violationType: 'UNAUTHORIZED_BUSINESS_USE',
    violationTypeName: 'Sử dụng trái phép vỉa hè để kinh doanh',
    penaltyAmount: 3000000,
    legalBasis: 'Nghị định 168/2024/NĐ-CP, Điều 12 khoản 2',
  },
  {
    scheduleId: 2,
    violationType: 'OUTSIDE_HOURS',
    violationTypeName: 'Kinh doanh ngoài khung giờ',
    penaltyAmount: 1000000,
    legalBasis: null,
  },
];

function violation(ai: Partial<AiLegalSuggestion> = {}): WardViolationDetail {
  return {
    violationId: 77,
    contractId: null,
    slotId: null,
    slotCode: 'NVL-08',
    vendorId: 11,
    vendorName: 'Bánh mì Cô Lan',
    violationType: 'UNAUTHORIZED_BUSINESS_USE',
    violationTypeName: 'Sử dụng trái phép vỉa hè để kinh doanh',
    status: 'PENDING_SANCTION',
    penaltyAmount: null,
    recordedAt: '2026-10-10T02:00:00Z',
    recordedByName: 'Cán bộ A',
    description: 'Kê bàn ghế lấn vạch',
    evidenceUrl: null,
    sanctionDecisionNumber: null,
    signerName: null,
    signerTitle: null,
    sanctionedAt: null,
    recentViolationCount90Days: 3,
    aiSuggestion: {
      violationType: 'UNAUTHORIZED_BUSINESS_USE',
      penaltyScheduleId: 3,
      legalBasis: 'Nghị định 168/2024/NĐ-CP, Điều 12 khoản 2',
      suggestedPenaltyAmount: 3000000,
      hanhViViPham: 'Hành vi: lấn chiếm vỉa hè.',
      bienPhapKhacPhuc: 'Buộc thu dọn vật dụng.',
      isAiGenerated: true,
      ...ai,
    },
    bienBanSo: '0815/BB-VPHC-2026',
    preparedLocation: 'NVL-08 - Khu A',
    witnessName: null,
    witnessRole: null,
    witnessOccupation: null,
    witnessAddress: null,
    containmentMeasures: null,
    violatorFullName: null,
    violatorDateOfBirth: null,
    violatorGender: null,
    violatorNationality: null,
    violatorIdNumber: null,
    violatorIdIssuedDate: null,
    violatorIdIssuedPlace: null,
    violatorAddress: null,
    explanationRequired: false,
    explanationMethod: null,
    explanationDeadlineAt: null,
    explanationReceivedAt: null,
    explanationContent: null,
    deliveredAt: null,
    deliveredToName: null,
    deliveryRefused: false,
    deliveryRefusalReason: null,
    complianceFlag: {
      violationThreshold: 3,
      sanctionedViolationCount: 2,
      violationThresholdReached: false,
      unpaidPenaltyGraceDays: null,
      hasOverduePenalty: false,
      overduePenaltyDays: null,
    },
  };
}

function setup({ authority = 'Chủ tịch UBND phường' as string | null } = {}) {
  vi.spyOn(complianceApi, 'listEnrollments').mockResolvedValue([
    { vendorId: 11, displayName: 'Bánh mì Cô Lan', ownerName: 'Trần Thị Lan' },
  ] as never);
  vi.spyOn(complianceApi, 'listPenaltySchedules').mockResolvedValue(SCHEDULES);
  vi.spyOn(wardApi, 'me').mockResolvedValue({ sanctionAuthorityTitle: authority } as never);
  return {
    record: vi.spyOn(complianceApi, 'recordViolation').mockResolvedValue(violation()),
    sanction: vi.spyOn(complianceApi, 'sanctionViolation'),
    explain: vi.spyOn(complianceApi, 'recordExplanation'),
    deliver: vi.spyOn(complianceApi, 'deliverViolation'),
    upload: vi.spyOn(complianceApi, 'uploadEvidence'),
  };
}

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={['/ward/patrol', '/ward/patrol/violations/new']} initialIndex={1}>
      <Routes>
        <Route path="/ward/patrol" element={<div>patrol home</div>} />
        <Route path="/ward/patrol/violations/new" element={<RecordViolationScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

const STEP1 = 'Lập biên bản vi phạm (Bước 1)';
const ISSUE = 'Ban hành Quyết định (Bước 2)';

async function fillAndRecord(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole('radio', { name: 'Bánh mì Cô Lan (Trần Thị Lan)', checked: true });
  await user.type(
    screen.getByLabelText('Mô tả chi tiết vi phạm tại hiện trường'),
    '  Kê bàn ghế lấn vạch  ',
  );
  await user.click(screen.getByRole('button', { name: STEP1 }));
  await screen.findByText('Đã lập biên bản vi phạm #77');
}

describe('RecordViolationScreen (live, WARD-12)', () => {
  beforeEach(() => {
    useToastStore.setState({ message: null });
    URL.createObjectURL = vi.fn(() => 'blob:preview');
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('keeps step 1 disabled without a description, and refuses while the photo has no server URL', async () => {
    const api = setup();
    api.upload.mockRejectedValue(new Error('Mạng chập chờn'));
    const user = userEvent.setup();
    renderScreen();

    await screen.findByRole('radio', { name: 'Bánh mì Cô Lan (Trần Thị Lan)', checked: true });
    expect(screen.getByRole('button', { name: STEP1 })).toBeDisabled();

    await user.type(screen.getByLabelText('Mô tả chi tiết vi phạm tại hiện trường'), 'Lấn vạch');
    await user.upload(
      screen.getByLabelText('Ảnh chụp hiện trường / Tang vật vi phạm'),
      new File(['x'], 'hien-truong.jpg', { type: 'image/jpeg' }),
    );
    await waitFor(() => expect(useToastStore.getState().message).toBe('Mạng chập chờn'));
    expect(screen.getAllByText('Tải lên thất bại. Xoá ảnh rồi chọn lại.').length).toBeGreaterThan(
      0,
    );

    await user.click(screen.getByRole('button', { name: STEP1 }));
    expect(useToastStore.getState().message).toBe(
      'Ảnh hiện trường đang tải lên, vui lòng đợi rồi thử lại.',
    );
    expect(api.record).not.toHaveBeenCalled();
  });

  it('sends the baseline payload without a witness or giải trình', async () => {
    const api = setup();
    const user = userEvent.setup();
    renderScreen();

    await fillAndRecord(user);

    expect(api.record).toHaveBeenCalledTimes(1);
    expect(api.record.mock.calls[0]![0]).toEqual({
      contractId: undefined,
      slotId: undefined,
      vendorId: 11,
      violationType: 'UNAUTHORIZED_BUSINESS_USE',
      description: 'Kê bàn ghế lấn vạch',
      evidenceUrl: undefined,
      witnessName: undefined,
      witnessRole: undefined,
      witnessOccupation: undefined,
      witnessAddress: undefined,
      containmentMeasures: undefined,
      explanationRequired: false,
      explanationMethod: undefined,
    });
    // The rule (not AI) preselects this type's first rate with a legal basis.
    expect(complianceApi.listPenaltySchedules).toHaveBeenLastCalledWith('2026-10-10');
    expect(screen.getByText('Đã lập biên bản số 0815/BB-VPHC-2026')).toBeInTheDocument();
  });

  it('sends the witness and the giải trình method only when given', async () => {
    const api = setup();
    const user = userEvent.setup();
    renderScreen();

    await screen.findByRole('radio', { name: 'Bánh mì Cô Lan (Trần Thị Lan)', checked: true });
    await user.type(screen.getByLabelText('Họ và tên'), 'Nguyễn Văn B');
    await user.click(screen.getByRole('radio', { name: /Đại diện chính quyền địa phương/ }));
    await user.click(
      screen.getByRole('checkbox', {
        name: /có quyền giải trình trước khi ra quyết định xử phạt/,
      }),
    );
    await user.click(screen.getByRole('tab', { name: 'Trực tiếp (2 ngày làm việc)' }));
    await fillAndRecord(user);

    expect(api.record.mock.calls[0]![0]).toMatchObject({
      witnessName: 'Nguyễn Văn B',
      witnessRole: 'WARD_REPRESENTATIVE',
      explanationRequired: true,
      explanationMethod: 'DIRECT',
    });
  });

  it('"Áp dụng khung này" only changes the chosen frame and sends nothing', async () => {
    const api = setup();
    const user = userEvent.setup();
    renderScreen();
    await fillAndRecord(user);

    expect(screen.getByText('Trợ lý Pháp lý [AI]')).toBeInTheDocument();
    const frames = screen.getByRole('radiogroup', { name: 'Khung xử phạt áp dụng' });
    const [first, second] = within(frames).getAllByRole('radio');
    expect(first).toHaveAttribute('aria-checked', 'true');
    expect(second).toHaveAttribute('aria-checked', 'false');

    await user.click(screen.getByRole('button', { name: 'Áp dụng khung này' }));

    expect(second).toHaveAttribute('aria-checked', 'true');
    expect(useToastStore.getState().message).toBe('Đã áp dụng khung xử phạt vào quyết định');
    expect(api.record).toHaveBeenCalledTimes(1);
    expect(api.sanction).not.toHaveBeenCalled();
    expect(api.explain).not.toHaveBeenCalled();
    expect(api.deliver).not.toHaveBeenCalled();
  });

  it('shows the acknowledgement after a giải trình refusal and sends it on the next issue', async () => {
    const api = setup();
    api.sanction
      .mockRejectedValueOnce(new Error('Người vi phạm vẫn còn quyền giải trình đến 15/10/2026.'))
      .mockResolvedValueOnce(undefined as never);
    const user = userEvent.setup();
    renderScreen();
    await fillAndRecord(user);

    await screen.findByText('Chủ tịch UBND phường');
    await user.type(screen.getByLabelText('Số Quyết định xử phạt hành chính *'), ' 12/QĐ-XPHC ');
    await user.click(screen.getByRole('button', { name: ISSUE }));

    const box = await screen.findByRole('checkbox', {
      name: 'Tôi xác nhận vẫn ra quyết định xử phạt ngay dù còn thời hạn giải trình.',
    });
    expect(screen.getByRole('alert')).toHaveTextContent('quyền giải trình');
    expect(api.sanction).toHaveBeenLastCalledWith(77, 1, '12/QĐ-XPHC', undefined, false);

    await user.click(box);
    await user.click(screen.getByRole('button', { name: ISSUE }));

    await waitFor(() =>
      expect(api.sanction).toHaveBeenLastCalledWith(77, 1, '12/QĐ-XPHC', undefined, true),
    );
    expect(await screen.findByText('patrol home')).toBeInTheDocument();
  });

  it('keeps "Ban hành" disabled for an account without sanction authority', async () => {
    setup({ authority: null });
    const user = userEvent.setup();
    renderScreen();
    await fillAndRecord(user);

    await user.type(screen.getByLabelText('Số Quyết định xử phạt hành chính *'), '12/QĐ-XPHC');
    expect(screen.getByRole('button', { name: ISSUE })).toBeDisabled();
    expect(
      screen.getByText(/Tài khoản của bạn chưa được giao thẩm quyền ký quyết định xử phạt/),
    ).toBeInTheDocument();
  });

  it('labels the legal assistant [AI] only when the server says it is AI-generated', async () => {
    const api = setup();
    api.record.mockResolvedValue(violation({ isAiGenerated: false }));
    const user = userEvent.setup();
    renderScreen();
    await fillAndRecord(user);

    expect(
      screen.getByText('Trợ lý Pháp lý [Hệ thống — chưa xác minh bằng AI]'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Trợ lý Pháp lý [AI]')).not.toBeInTheDocument();
  });
});
