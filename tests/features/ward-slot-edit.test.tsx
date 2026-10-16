import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { wardApi } from '@/features/ward-administration/ward-api';
import {
  wardConfigApi,
  type WardSlot,
  type WardZone,
} from '@/features/ward-administration/ward-config-api';
import { useAuthStore } from '@/store/auth-store';

vi.mock('@/core/config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/config/env')>();
  return { ...actual, isLiveApi: true, env: { ...actual.env, enableAiCompliance: false } };
});

const { SlotOccupancyScreen } =
  await import('@/features/ward-administration/screens/SlotOccupancyScreen');
const { SlotEditScreen } = await import('@/features/ward-administration/screens/SlotEditScreen');

const zone = {
  zoneId: 1,
  zoneName: 'Đường Nguyễn Văn Linh',
  pricePerDay: 30000,
  availableFrom: '05:00:00',
  availableTo: '22:00:00',
  isOvernight: false,
  priceDisplayUnit: 'DAY',
  pricePerMonth: null,
} as WardZone;

const slot = (over: Partial<WardSlot>): WardSlot => ({
  slotId: 1,
  slotCode: 'NVL-01',
  zoneId: 1,
  zoneName: 'Đường Nguyễn Văn Linh',
  latitude: 16.05,
  longitude: 108.22,
  widthMeters: 2,
  lengthMeters: 3,
  status: 'AVAILABLE',
  source: 'WARD_DEFINED',
  hasPower: false,
  hasWater: false,
  hasTrashBin: false,
  businessCategory: null,
  canHardDelete: false,
  canEditGeometry: true,
  versionToken: 'v1',
  imageUrls: [],
  ...over,
});

beforeEach(() => {
  useAuthStore.setState({
    user: {
      id: '1',
      fullName: 'Ward',
      phone: '0983000001',
      password: '',
      role_code: 'WARD_AUTHORITY',
      wardUnitId: 1,
      account_status: 'ACTIVE',
    },
    sessionExpired: false,
  });
  vi.spyOn(wardApi, 'me').mockResolvedValue({
    userId: '1',
    wardId: 1,
    name: 'Ward',
    sanctionAuthorityTitle: null,
  });
  vi.spyOn(wardConfigApi, 'listZones').mockResolvedValue([zone]);
  vi.spyOn(wardConfigApi, 'slotGrid').mockResolvedValue({
    slots: [slot({ slotId: 1, slotCode: 'NVL-01' }), slot({ slotId: 2, slotCode: 'NVL-02' })],
    features: [],
    boundaryConfigured: true,
    clearanceCheckEnabled: false,
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  useAuthStore.setState({ user: null, sessionExpired: false });
});

const renderAt = (path: string) =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/ward/slots" element={<SlotOccupancyScreen />} />
          <Route path="/ward/slots/:slotId" element={<SlotEditScreen />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe('Slot edit page', () => {
  it('opens only the slot that was pressed on the board, with its photos field and no map', async () => {
    const user = userEvent.setup();
    renderAt('/ward/slots');

    await user.click(await screen.findByRole('button', { name: 'Mở ô NVL-02 để sửa' }));

    expect(await screen.findByRole('heading', { name: 'Sửa ô' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Chọn ô khác' })).toHaveValue(
      'NVL-02 · Đường Nguyễn Văn Linh',
    );
    expect(screen.getByLabelText('Mã ô')).toHaveValue('NVL-02');
    expect(screen.getByRole('button', { name: 'Thêm ảnh' })).toBeInTheDocument();
    expect(screen.queryByText(/Chạm bản đồ để dời ô/)).not.toBeInTheDocument();
  });

  it('searches the slot list by code and switches to the one picked', async () => {
    const user = userEvent.setup();
    renderAt('/ward/slots/1');

    expect(await screen.findByLabelText('Mã ô')).toHaveValue('NVL-01');
    await user.click(screen.getByRole('combobox', { name: 'Chọn ô khác' }));
    expect(screen.getAllByRole('option')).toHaveLength(2);

    await user.type(screen.getByRole('combobox', { name: 'Chọn ô khác' }), '02');
    expect(screen.getAllByRole('option')).toHaveLength(1);
    await user.click(screen.getByRole('option', { name: /NVL-02/ }));

    expect(await screen.findByDisplayValue('NVL-02')).toBeInTheDocument();
  });

  it('says there is no match for a code that does not exist', async () => {
    const user = userEvent.setup();
    renderAt('/ward/slots/1');
    await screen.findByLabelText('Mã ô');

    await user.type(screen.getByRole('combobox', { name: 'Chọn ô khác' }), 'zzz');

    expect(screen.getByText('Không có ô nào khớp.')).toBeInTheDocument();
  });

  it('says so when the slot no longer exists', async () => {
    renderAt('/ward/slots/99');

    expect(await screen.findByText('Không tìm thấy ô này')).toBeInTheDocument();
  });
});
