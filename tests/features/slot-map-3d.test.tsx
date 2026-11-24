import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MapRail } from '@/features/sidewalk-slots/components/MapRail';
import { offsetMeters } from '@/features/sidewalk-slots/slot-3d';
import { wardApi } from '@/features/ward-administration/ward-api';
import {
  wardConfigApi,
  type SlotMutationResult,
  type WardSlot,
  type WardZone,
} from '@/features/ward-administration/ward-config-api';
import { useAuthStore } from '@/store/auth-store';
import { makeSlot } from './slot-fixtures';

vi.mock('@/core/config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/config/env')>();
  return { ...actual, isLiveApi: true, env: { ...actual.env, enableAiCompliance: false } };
});
// The 3D preview is a WebGL map; here only the panel's switch for it is under test.
vi.mock('@/features/sidewalk-slots/components/Slot3DPreview', () => ({
  Slot3DPreview: ({ slot }: { slot: { slotCode: string } }) => <div>3D {slot.slotCode}</div>,
}));

const { SlotEditScreen } = await import('@/features/ward-administration/screens/SlotEditScreen');
const { SlotDetailPanel } = await import('@/features/sidewalk-slots/components/SlotDetailPanel');

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

const START = { latitude: 16.0607, longitude: 108.2155 };
/** Slot i stands i x 3 m due east of START: a street running east-west (bearing 90). */
const eastOf = (i: number) => {
  const [longitude, latitude] = offsetMeters(START, i * 3, 0);
  return { latitude, longitude };
};

const slot = (over: Partial<WardSlot>): WardSlot => ({
  slotId: 1,
  slotCode: 'NVL-01',
  zoneId: 1,
  zoneName: 'Đường Nguyễn Văn Linh',
  ...eastOf(0),
  widthMeters: 1.5,
  lengthMeters: 2,
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
  bearingDegrees: null,
  ...over,
});

function grid(slots: WardSlot[]) {
  vi.spyOn(wardConfigApi, 'slotGrid').mockResolvedValue({
    slots,
    features: [],
    boundaryConfigured: true,
    clearanceCheckEnabled: false,
  });
}

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
  vi.spyOn(wardConfigApi, 'checkPlacement').mockResolvedValue({
    boundaryVerified: true,
    issues: [],
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  useAuthStore.setState({ user: null, sessionExpired: false });
});

const openSlot = (id: number) =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[`/ward/slots/${id}`]}>
        <Routes>
          <Route path="/ward/slots/:slotId" element={<SlotEditScreen />} />
          <Route path="/ward/slots" element={<div>board</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

const street = [
  slot({ slotId: 1, slotCode: 'NVL-01', ...eastOf(0) }),
  slot({ slotId: 2, slotCode: 'NVL-02', ...eastOf(1) }),
  slot({ slotId: 3, slotCode: 'NVL-03', ...eastOf(2) }),
];

describe('Slot bearing ("Hướng ô")', () => {
  it('shows a slot without its own bearing lying along its street', async () => {
    grid(street);
    openSlot(1);

    expect(await screen.findByText('90° · Đông – Tây')).toBeInTheDocument();
    expect(
      screen.getByText('Ô đang tự nằm dọc theo phố (chưa đặt hướng riêng).'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Theo hướng phố' })).toBeDisabled();
    expect(screen.getByRole('slider', { name: 'Hướng ô' })).toHaveValue('90');
  });

  it('turns the slot 15 degrees and saves the new bearing', async () => {
    grid(street);
    const update = vi.spyOn(wardConfigApi, 'updateSlot').mockResolvedValue({
      slot: street[0]!,
      check: { boundaryVerified: true, issues: [] },
    } as SlotMutationResult);
    const user = userEvent.setup();
    openSlot(1);

    await user.click(await screen.findByRole('button', { name: /\+15°/ }));
    expect(screen.getByText('105° · Đông – Tây')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Theo hướng phố' })).toBeEnabled();

    const save = screen.getByRole('button', { name: 'Lưu ô' });
    await waitFor(() => expect(save).toBeEnabled());
    await user.click(save);

    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(update.mock.calls[0]![1]).toMatchObject({ bearingDegrees: 105 });
  });

  it('snaps a turned slot back onto the street', async () => {
    grid([slot({ ...street[0]!, bearingDegrees: 30 }), street[1]!, street[2]!]);
    const user = userEvent.setup();
    openSlot(1);

    expect(await screen.findByText('30° · Đông Bắc – Tây Nam')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Theo hướng phố' }));
    expect(screen.getByText('90° · Đông – Tây')).toBeInTheDocument();
    expect(screen.getByText('Ô đang nằm dọc theo phố.')).toBeInTheDocument();
  });

  it('turns by the slider, and a quarter turn with one press', async () => {
    grid(street);
    const user = userEvent.setup();
    openSlot(1);

    const slider = await screen.findByRole('slider', { name: 'Hướng ô' });
    expect(slider).toHaveValue('90');
    await user.click(screen.getByRole('button', { name: 'Xoay 90°' }));
    expect(slider).toHaveValue('0');
    expect(screen.getByText('0° · Bắc – Nam')).toBeInTheDocument();
  });

  it('keeps the bearing out of a save that did not turn the slot', async () => {
    grid([slot({ ...street[0]!, bearingDegrees: 30 }), street[1]!, street[2]!]);
    const update = vi.spyOn(wardConfigApi, 'updateSlot').mockResolvedValue({
      slot: street[0]!,
      check: { boundaryVerified: true, issues: [] },
    } as SlotMutationResult);
    const user = userEvent.setup();
    openSlot(1);

    await user.click(await screen.findByRole('checkbox', { name: /điện/ }));
    await user.click(screen.getByRole('button', { name: 'Lưu ô' }));

    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(update.mock.calls[0]![1].bearingDegrees).toBeUndefined();
  });

  it('says when there is no street to follow yet', async () => {
    grid([slot({ slotId: 1 })]);
    openSlot(1);

    expect(
      await screen.findByText(/Chưa đủ ô thẳng hàng để tự nhận hướng phố/),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Theo hướng phố' })).toBeDisabled();
  });

  it('offers no turning on a slot that is rented', async () => {
    grid([slot({ slotId: 1, status: 'ACTIVE', canEditGeometry: false }), street[1]!]);
    openSlot(1);

    expect(await screen.findByText(/chỉ sửa được tiện ích/)).toBeInTheDocument();
    expect(screen.queryByRole('slider', { name: 'Hướng ô' })).not.toBeInTheDocument();
  });
});

describe('Map tool rail', () => {
  it('names every icon button, marks toggles and runs their actions', async () => {
    const user = userEvent.setup();
    const toggle3d = vi.fn();
    const zoomIn = vi.fn();
    render(
      <MapRail
        groups={[
          [
            { label: 'Xem 3D', icon: 'cube-outline', text: '3D', pressed: true, onPress: toggle3d },
            { label: 'Bay dọc phố', icon: 'video-outline', disabled: true, onPress: vi.fn() },
          ],
          [{ label: 'Phóng to', icon: 'plus', onPress: zoomIn }],
          [],
        ]}
      />,
    );

    expect(screen.getByRole('toolbar', { name: 'Công cụ bản đồ' })).toBeInTheDocument();
    const threeD = screen.getByRole('button', { name: 'Xem 3D' });
    expect(threeD).toHaveAttribute('aria-pressed', 'true');
    expect(threeD).toHaveTextContent('3D');
    expect(screen.getByRole('button', { name: 'Bay dọc phố' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Phóng to' })).not.toHaveAttribute('aria-pressed');

    await user.click(threeD);
    await user.click(screen.getByRole('button', { name: 'Phóng to' }));
    expect(toggle3d).toHaveBeenCalledTimes(1);
    expect(zoomIn).toHaveBeenCalledTimes(1);
  });
});

describe('Vendor slot 3D preview', () => {
  it('opens the 3D look of the slot on request and closes it again', async () => {
    const user = userEvent.setup();
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <MemoryRouter>
          <SlotDetailPanel
            slot={makeSlot({ slotId: 10, slotCode: 'NVL-04', latitude: 16.05, longitude: 108.22 })}
            zone={undefined}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const open = screen.getByRole('button', { name: 'Xem ô và dãy phố dạng 3D' });
    expect(open).toHaveAttribute('aria-expanded', 'false');
    await user.click(open);
    expect(await screen.findByText('3D NVL-04')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Ẩn mô hình 3D' }));
    expect(screen.queryByText('3D NVL-04')).not.toBeInTheDocument();
  });
});
