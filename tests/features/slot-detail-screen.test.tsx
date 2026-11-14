import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { sideApi, type SidewalkZone } from '@/core/api/side-api';
import { SlotDetailScreen } from '@/features/sidewalk-slots/screens/SlotDetailScreen';
import { useWorkspaceStore } from '@/features/sidewalk-slots/workspace-store';
import { makeSlot } from './slot-fixtures';

// SIDE-02: one slot as its own page (deep links from the assistant and notifications).
const zone: SidewalkZone = {
  zoneId: 1,
  zoneName: 'Đường Nguyễn Văn Linh',
  zoneCode: 'NVL',
  regulationRef: 'QĐ 12/2026/QĐ-UBND',
  segmentFrom: 'Hàm Nghi',
  segmentTo: 'Lê Duẩn',
  applicationDeadline: null,
  wardUnitId: 1,
  wardName: 'Phường Hải Châu',
  contactName: null,
  contactPhone: null,
  pricePerDay: 30000,
  availableFrom: null,
  availableTo: null,
  feeComponents: [],
  features: [],
  rentalMode: 'STANDARD',
  monthlyPrice: 900000,
  quarterDiscountPercent: null,
};

function mount(path: string) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/vendor/slots/:slotId" element={<SlotDetailScreen />} />
          <Route path="/vendor/slots" element={<div>slot workspace</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => useWorkspaceStore.setState({ zoneId: null, selectedSlotId: null } as never));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('SlotDetailScreen', () => {
  it('rejects a non-numeric id without calling the API and offers the map', async () => {
    const getSlot = vi.spyOn(sideApi, 'getSlot');
    const user = userEvent.setup();
    mount('/vendor/slots/abc');

    expect(screen.getByText('Mã ô không hợp lệ.')).toBeInTheDocument();
    expect(getSlot).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Mở sơ đồ ô' }));
    expect(screen.getByText('slot workspace')).toBeInTheDocument();
  });

  it('shows a loading placeholder, then the slot under its route sign', async () => {
    vi.spyOn(sideApi, 'getSlot').mockResolvedValue(makeSlot({ slotId: 10, slotCode: 'NVL-04', latitude: 16.06, longitude: 108.21 }));
    const getZone = vi.spyOn(sideApi, 'getZone').mockResolvedValue(zone);
    mount('/vendor/slots/10');

    expect(screen.getByRole('status', { name: 'Đang tải ô' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'NVL-04' })).toBeInTheDocument();
    await waitFor(() => expect(getZone).toHaveBeenCalledWith(1));
    expect(await screen.findByText('Hàm Nghi ⇄ Lê Duẩn')).toBeInTheDocument();
    expect(screen.getByText('NVL')).toBeInTheDocument();
  });

  it('shows the API error with a retry', async () => {
    const getSlot = vi.spyOn(sideApi, 'getSlot').mockRejectedValue(new Error('Không tìm thấy ô.'));
    const user = userEvent.setup();
    mount('/vendor/slots/99');

    expect(await screen.findByText('Không tìm thấy ô.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Thử lại/ }));
    await waitFor(() => expect(getSlot).toHaveBeenCalledTimes(2));
  });

  it('"Xem trên sơ đồ tuyến" focuses the slot in the workspace and opens it', async () => {
    vi.spyOn(sideApi, 'getSlot').mockResolvedValue(makeSlot({ slotId: 10, zoneId: 3, slotCode: 'NVL-04', latitude: 16.06, longitude: 108.21 }));
    vi.spyOn(sideApi, 'getZone').mockResolvedValue({ ...zone, zoneId: 3 });
    const user = userEvent.setup();
    mount('/vendor/slots/10');

    await user.click(await screen.findByRole('button', { name: 'Xem trên sơ đồ tuyến' }));

    expect(screen.getByText('slot workspace')).toBeInTheDocument();
    expect(useWorkspaceStore.getState()).toMatchObject({ zoneId: 3, selectedSlotId: 10, view: 'PLAN' });
  });
});
