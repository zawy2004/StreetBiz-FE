import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useToastStore } from '@/components/feedback';
import { complianceApi, type InspectPermitResult } from '@/features/ward-administration/ward-api';

vi.mock('@/core/config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/config/env')>();
  return { ...actual, isLiveApi: true, env: { ...actual.env, enableAiCompliance: false } };
});

const { PermitScanScreen } = await import('@/features/ward-administration/screens/PermitScanScreen');

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
        <Route path="/ward/patrol/violations/new" element={<div>violation form</div>} />
        <Route path="/ward/patrol/permits/:permitId/action" element={<div>permit action</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PermitScanScreen (live, BR-39)', () => {
  beforeEach(() => {
    vi.spyOn(complianceApi, 'patrolHeatmap').mockResolvedValue([]);
    useToastStore.setState({ message: null });
    // No geolocation in jsdom: the screen must still look the permit up.
    Object.defineProperty(navigator, 'geolocation', { value: undefined, configurable: true });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('asks for a code instead of calling the server when the field is empty', async () => {
    const inspect = vi.spyOn(complianceApi, 'inspectPermit');
    const user = userEvent.setup();
    renderScreen();

    await user.click(screen.getByRole('button', { name: 'Kiểm tra' }));

    expect(inspect).not.toHaveBeenCalled();
    expect(useToastStore.getState().message).toBe('Vui lòng nhập mã hoặc quét mã QR');
  });

  it('looks the trimmed code up live and shows the verdict, slot and time of the lookup', async () => {
    const inspect = vi.spyOn(complianceApi, 'inspectPermit').mockResolvedValue(valid);
    const user = userEvent.setup();
    renderScreen();

    await user.type(screen.getByLabelText('Mã giấy phép số / Token QR'), '  SB-HC1-2026-0815  ');
    await user.click(screen.getByRole('button', { name: 'Kiểm tra' }));

    expect(inspect).toHaveBeenCalledWith('SB-HC1-2026-0815', undefined, undefined, undefined);
    const board = await screen.findByRole('region', { name: 'Kết quả tra cứu giấy phép' });
    expect(within(board).getByText('Hợp lệ')).toBeInTheDocument();
    expect(within(board).getByText('NVL-08')).toBeInTheDocument();
    expect(within(board).getByText('Bánh mì Cô Lan')).toBeInTheDocument();
    expect(within(board).getByText('NVL-08 · Đường Nguyễn Văn Linh')).toBeInTheDocument();
    expect(within(board).getByText('2m x 3m')).toBeInTheDocument();
    expect(within(board).getByText(/Tra cứu trực tiếp với máy chủ lúc/)).toBeInTheDocument();
  });

  it('calls the server again on every check and keeps the last result when a later check fails', async () => {
    const inspect = vi
      .spyOn(complianceApi, 'inspectPermit')
      .mockResolvedValueOnce(valid)
      .mockRejectedValueOnce(new Error('Mất kết nối'));
    const user = userEvent.setup();
    renderScreen();

    await user.type(screen.getByLabelText('Mã giấy phép số / Token QR'), 'SB-HC1-2026-0815');
    await user.click(screen.getByRole('button', { name: 'Kiểm tra' }));
    await screen.findByText('Bánh mì Cô Lan');
    await user.click(screen.getByRole('button', { name: 'Kiểm tra' }));

    await waitFor(() => expect(inspect).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(useToastStore.getState().message).not.toBeNull());
    expect(screen.getByText('Bánh mì Cô Lan')).toBeInTheDocument();
  });

  it('shows "not found" when the server finds no permit', async () => {
    vi.spyOn(complianceApi, 'inspectPermit').mockResolvedValue({ ...valid, found: false });
    const user = userEvent.setup();
    renderScreen();

    await user.type(screen.getByLabelText('Mã giấy phép số / Token QR'), 'KHONG-CO');
    await user.click(screen.getByRole('button', { name: 'Kiểm tra' }));

    expect(await screen.findByText('Không tìm thấy giấy phép')).toBeInTheDocument();
  });

  it('opens the violation form and the permit action screen with the ids from the result', async () => {
    vi.spyOn(complianceApi, 'inspectPermit').mockResolvedValue(valid);
    const user = userEvent.setup();
    const view = renderScreen();

    await user.type(screen.getByLabelText('Mã giấy phép số / Token QR'), 'SB-HC1-2026-0815');
    await user.click(screen.getByRole('button', { name: 'Kiểm tra' }));
    await user.click(await screen.findByRole('button', { name: 'Lập biên bản vi phạm' }));
    expect(await screen.findByText('violation form')).toBeInTheDocument();

    view.unmount();
    renderScreen();
    await user.type(screen.getByLabelText('Mã giấy phép số / Token QR'), 'SB-HC1-2026-0815');
    await user.click(screen.getByRole('button', { name: 'Kiểm tra' }));
    await user.click(await screen.findByRole('button', { name: 'Đình chỉ / thu hồi' }));
    expect(await screen.findByText('permit action')).toBeInTheDocument();
  });
});
