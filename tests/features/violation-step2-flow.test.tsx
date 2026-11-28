import { cleanup, configure, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useToastStore } from '@/components/feedback';
import {
  complianceApi,
  wardApi,
  type PenaltyScheduleItem,
  type WardViolationDetail,
} from '@/features/ward-administration/ward-api';

vi.mock('@/core/config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/config/env')>();
  return { ...actual, isLiveApi: true };
});

const { RecordViolationScreen } =
  await import('@/features/ward-administration/screens/RecordViolationScreen');

configure({ asyncUtilTimeout: 5_000 });

/**
 * Step 2 of the patrol record (WARD-12) against the server: handing over the record, the
 * violator's giải trình, downloading the record, and the checks before a decision is issued.
 */
const BASIS = 'Nghị định 168/2024/NĐ-CP, Điều 12 (khung 2.000.000 - 4.000.000đ)';
const SCHEDULES: PenaltyScheduleItem[] = [
  {
    scheduleId: 1,
    violationType: 'UNAUTHORIZED_BUSINESS_USE',
    violationTypeName: 'Sử dụng trái phép vỉa hè để kinh doanh',
    penaltyAmount: 2_500_000,
    legalBasis: BASIS,
  },
];

function violation(over: Partial<WardViolationDetail> = {}): WardViolationDetail {
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
    recentViolationCount90Days: 1,
    aiSuggestion: null,
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
    explanationRequired: true,
    explanationMethod: 'DIRECT',
    explanationDeadlineAt: '2099-10-12T02:00:00Z',
    explanationReceivedAt: null,
    explanationContent: null,
    deliveredAt: null,
    deliveredToName: null,
    deliveryRefused: false,
    deliveryRefusalReason: null,
    complianceFlag: {
      violationThreshold: null,
      sanctionedViolationCount: 0,
      violationThresholdReached: false,
      unpaidPenaltyGraceDays: null,
      hasOverduePenalty: false,
      overduePenaltyDays: null,
    },
    ...over,
  } as WardViolationDetail;
}

function setup(created = violation()) {
  vi.spyOn(complianceApi, 'listEnrollments').mockResolvedValue([
    { vendorId: 11, displayName: 'Bánh mì Cô Lan', ownerName: 'Trần Thị Lan' },
  ] as never);
  vi.spyOn(complianceApi, 'listPenaltySchedules').mockResolvedValue(SCHEDULES);
  vi.spyOn(wardApi, 'me').mockResolvedValue({
    sanctionAuthorityTitle: 'Chủ tịch UBND phường',
  } as never);
  vi.spyOn(complianceApi, 'recordViolation').mockResolvedValue(created);
  return {
    sanction: vi.spyOn(complianceApi, 'sanctionViolation').mockResolvedValue(created as never),
    explain: vi.spyOn(complianceApi, 'recordExplanation'),
    deliver: vi.spyOn(complianceApi, 'deliverViolation'),
    download: vi.spyOn(complianceApi, 'downloadViolationDocument'),
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

async function toStep2(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole('radio', { name: 'Bánh mì Cô Lan (Trần Thị Lan)', checked: true });
  const [behaviour] = await screen.findAllByRole('radio', { name: /Sử dụng trái phép vỉa hè/ });
  await user.click(behaviour!);
  await user.type(screen.getByLabelText('Mô tả chi tiết vi phạm tại hiện trường'), 'Lấn vạch');
  await user.click(screen.getByRole('button', { name: 'Lập biên bản vi phạm (Bước 1)' }));
  await screen.findByText('Đã lập biên bản vi phạm #77');
}

const toast = () => useToastStore.getState().message;

describe('RecordViolationScreen step 2 (live)', { timeout: 20_000 }, () => {
  beforeEach(() => {
    useToastStore.setState({ message: null });
    URL.createObjectURL = vi.fn(() => 'blob:doc');
    URL.revokeObjectURL = vi.fn();
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('records who received the record, or why they refused', async () => {
    const api = setup();
    api.deliver
      .mockRejectedValueOnce(new Error('Mất mạng'))
      .mockResolvedValueOnce(
        violation({ deliveryRefused: true, deliveryRefusalReason: 'Không ký' }),
      );
    const user = userEvent.setup();
    renderScreen();
    await toStep2(user);

    expect(screen.getByRole('button', { name: 'Đã giao biên bản' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Người vi phạm từ chối nhận' })).toBeDisabled();

    await user.type(screen.getByLabelText('Người nhận biên bản'), 'Bà Lan');
    await user.click(screen.getByRole('button', { name: 'Đã giao biên bản' }));
    await waitFor(() => expect(toast()).toBe('Mất mạng'));

    await user.type(screen.getByLabelText('Hoặc lý do từ chối nhận (nếu có)'), 'Không ký');
    await user.click(screen.getByRole('button', { name: 'Người vi phạm từ chối nhận' }));
    await waitFor(() => expect(toast()).toBe('Đã ghi nhận việc từ chối nhận biên bản'));
    expect(api.deliver).toHaveBeenCalledTimes(2);
  });

  it('records the violator’s giải trình, and says when that fails', async () => {
    const api = setup();
    api.explain
      .mockRejectedValueOnce(new Error('Không lưu được'))
      .mockResolvedValueOnce(
        violation({
          explanationReceivedAt: '2026-10-11T02:00:00Z',
          explanationContent: 'Tôi dọn ngay',
        }),
      );
    const user = userEvent.setup();
    renderScreen();
    await toStep2(user);

    await user.type(screen.getByLabelText('Nội dung giải trình của người vi phạm'), 'Tôi dọn ngay');
    await user.click(screen.getByRole('button', { name: 'Ghi nhận giải trình' }));
    await waitFor(() => expect(toast()).toBe('Không lưu được'));
    await user.click(screen.getByRole('button', { name: 'Ghi nhận giải trình' }));
    await waitFor(() => expect(toast()).toBe('Đã ghi nhận giải trình của người vi phạm'));
    expect(screen.getByText(/Đã nhận giải trình lúc/)).toBeInTheDocument();
  });

  it('downloads the record, and says when the download fails', async () => {
    const api = setup();
    api.download
      .mockResolvedValueOnce(new Blob(['x']))
      .mockRejectedValueOnce(new Error('Lỗi máy chủ'));
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const user = userEvent.setup();
    renderScreen();
    await toStep2(user);

    await user.click(screen.getByRole('button', { name: 'Tải biên bản (.docx)' }));
    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:doc'));
    expect(click).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Tải biên bản (.docx)' }));
    await waitFor(() => expect(toast()).toBe('Lỗi máy chủ'));
  });

  it('keeps a changed fine inside the legal bracket and asks why, then issues with it', async () => {
    const api = setup(violation({ explanationRequired: false }));
    const user = userEvent.setup();
    renderScreen();
    await toStep2(user);

    await user.type(screen.getByLabelText('Số Quyết định xử phạt hành chính *'), '12/QĐ-XPHC');
    const fine = screen.getByLabelText('Mức phạt quyết định (không bắt buộc)');
    await user.type(fine, '9000000');
    await user.click(screen.getByRole('button', { name: 'Ban hành Quyết định (Bước 2)' }));
    expect(toast()).toMatch(/Mức phạt phải nằm trong khung 2\.000\.000 - 4\.000\.000 đ/);

    await user.clear(fine);
    await user.type(fine, '3000000');
    await user.click(screen.getByRole('button', { name: 'Ban hành Quyết định (Bước 2)' }));
    expect(toast()).toBe('Nhập lý do khi quyết định mức phạt khác mức đã cấu hình.');

    await user.type(screen.getByLabelText('Lý do tăng/giảm mức phạt *'), 'Tái phạm');
    await user.click(screen.getByRole('button', { name: 'Ban hành Quyết định (Bước 2)' }));
    expect(await screen.findByText('patrol home')).toBeInTheDocument();
    expect(api.sanction).toHaveBeenCalledWith(77, 1, '12/QĐ-XPHC', undefined, false, {
      amount: 3_000_000,
      reason: 'Tái phạm',
    });
  });

  it('shows a failed decision as a message', async () => {
    const api = setup(violation({ explanationRequired: false }));
    api.sanction.mockRejectedValueOnce(new Error('Số quyết định đã tồn tại'));
    const user = userEvent.setup();
    renderScreen();
    await toStep2(user);

    await user.type(screen.getByLabelText('Số Quyết định xử phạt hành chính *'), '12/QĐ-XPHC');
    await user.click(screen.getByRole('button', { name: 'Ban hành Quyết định (Bước 2)' }));
    await waitFor(() => expect(toast()).toBe('Số quyết định đã tồn tại'));
  });
});
