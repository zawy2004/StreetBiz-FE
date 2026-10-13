import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useToastStore } from '@/components/feedback';
import { permitValidity } from '@/features/ward-administration/components/patrol/permit-validity';
import { complianceApi, type InspectPermitResult } from '@/features/ward-administration/ward-api';

vi.mock('@/core/config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/config/env')>();
  return { ...actual, isLiveApi: true, env: { ...actual.env, enableAiCompliance: false } };
});

const { PermitScanScreen } =
  await import('@/features/ward-administration/screens/PermitScanScreen');

const valid: InspectPermitResult = {
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
  endDate: '25/3/2027',
  distanceMeters: null,
  isLocationMatched: false,
  locationWarning: null,
  aiVisionResult: null,
};

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={['/ward/patrol']}>
      <Routes>
        <Route path="/ward/patrol" element={<PermitScanScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PermitScanScreen display-only bands (W14 tier B)', () => {
  beforeEach(() => {
    vi.spyOn(complianceApi, 'patrolHeatmap').mockResolvedValue([]);
    useToastStore.setState({ message: null });
    Object.defineProperty(navigator, 'geolocation', { value: undefined, configurable: true });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('keeps the last result after a failed re-check and says that it is from the earlier lookup', async () => {
    vi.spyOn(complianceApi, 'inspectPermit')
      .mockResolvedValueOnce(valid)
      .mockRejectedValueOnce(new Error('Mất kết nối'));
    const user = userEvent.setup();
    renderScreen();

    await user.type(screen.getByLabelText('Mã giấy phép số / Token QR'), 'SB-HC1-2026-0815');
    await user.click(screen.getByRole('button', { name: 'Kiểm tra' }));
    await screen.findByText('Bánh mì Cô Lan');
    expect(screen.queryByText(/không thành công/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Kiểm tra' }));

    const board = await screen.findByRole('region', { name: 'Kết quả tra cứu giấy phép' });
    expect(
      await within(board).findByText(/không thành công\. Kết quả dưới đây là của lần tra trước\./),
    ).toBeInTheDocument();
    expect(within(board).getByText('Bánh mì Cô Lan')).toBeInTheDocument();
  });

  it('still shows "not found" after a failed first lookup, with a band saying the lookup failed', async () => {
    vi.spyOn(complianceApi, 'inspectPermit').mockRejectedValueOnce(new Error('Mất kết nối'));
    const user = userEvent.setup();
    renderScreen();

    await user.type(screen.getByLabelText('Mã giấy phép số / Token QR'), 'SB-HC1-2026-0815');
    await user.click(screen.getByRole('button', { name: 'Kiểm tra' }));

    expect(await screen.findByText('Không tìm thấy giấy phép')).toBeInTheDocument();
    expect(
      await screen.findByText(/không thành công \(mạng hoặc máy chủ\)\. Hãy bấm Kiểm tra lại/),
    ).toBeInTheDocument();
  });

  it('flags a code edited after the lookup until it is checked again', async () => {
    // Each server answer is a fresh object, as axios gives; the screen tells a finished lookup
    // from a failed one by whether the result changed.
    const inspect = vi
      .spyOn(complianceApi, 'inspectPermit')
      .mockResolvedValueOnce(valid)
      .mockResolvedValueOnce({ ...valid });
    const user = userEvent.setup();
    renderScreen();

    const field = screen.getByLabelText('Mã giấy phép số / Token QR');
    await user.type(field, 'SB-HC1-2026-0815');
    await user.click(screen.getByRole('button', { name: 'Kiểm tra' }));
    await screen.findByText('Bánh mì Cô Lan');
    expect(screen.queryByText(/Mã trong ô đã sửa sau lần tra/)).not.toBeInTheDocument();

    await user.type(field, '9');
    expect(screen.getByText(/Mã trong ô đã sửa sau lần tra/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Kiểm tra' }));
    await waitFor(() => expect(inspect).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(screen.queryByText(/Mã trong ô đã sửa sau lần tra/)).not.toBeInTheDocument(),
    );
  });

  it('formats an ISO end day with the days left, and shows any other string as sent', async () => {
    vi.spyOn(complianceApi, 'inspectPermit').mockResolvedValue({
      ...valid,
      endDate: '2099-03-25',
    });
    const user = userEvent.setup();
    renderScreen();

    await user.type(screen.getByLabelText('Mã giấy phép số / Token QR'), 'SB-HC1-2026-0815');
    await user.click(screen.getByRole('button', { name: 'Kiểm tra' }));

    const board = await screen.findByRole('region', { name: 'Kết quả tra cứu giấy phép' });
    expect(within(board).getByText('25/03/2099')).toBeInTheDocument();
    expect(within(board).getByText(/^còn \d+ ngày$/)).toBeInTheDocument();
  });
});

describe('permitValidity', () => {
  const now = new Date('2026-10-10T03:00:00Z'); // 10:00 in Ho Chi Minh City

  it('counts days left in Ho Chi Minh time and the share of the period used', () => {
    expect(permitValidity('2026-10-01', '2026-10-20', now)).toEqual({
      label: '20/10/2026',
      daysLeft: 10,
      used: 9 / 19,
    });
  });

  it('keeps a non-ISO end string verbatim', () => {
    expect(permitValidity('2026-09-26', '25/3/2027', now)).toEqual({
      label: '25/3/2027',
      daysLeft: null,
      used: null,
    });
  });

  it('has no ring share without an ISO start', () => {
    expect(permitValidity(null, '2026-10-08', now)).toEqual({
      label: '08/10/2026',
      daysLeft: -2,
      used: null,
    });
  });
});
