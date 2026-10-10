import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';

import { wardApi } from '@/features/ward-administration/ward-api';
import { wardConfigApi, type WardZone } from '@/features/ward-administration/ward-config-api';
import { SlotGridEditorScreen } from '@/features/ward-administration/screens/SlotGridEditorScreen';
import { PlacementVerdict } from '@/features/ward-administration/components/ops/grid/PlacementVerdict';
import {
  accuracyColor,
  rulerText,
  zoneMeta,
} from '@/features/ward-administration/components/ops/grid/placement';
import { useAuthStore } from '@/store/auth-store';

vi.mock('@/core/config/env', () => ({
  env: { apiBaseUrl: 'https://api.example.test/api', useMockApi: false, appEnv: 'test' },
  isDev: true,
  isLiveApi: true,
}));

vi.mock('@/features/ward-administration/components/SlotGridMap', () => ({
  SlotGridMap: () => <div>map</div>,
}));

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

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  useAuthStore.setState({ user: null, sessionExpired: false });
});

describe('W13 slot grid: map tape label and GPS ring', () => {
  it('labels the batch segment with its length and how many slots it fits', () => {
    expect(rulerText({ meters: 33.4, slots: 11, tooShort: false })).toBe('33 m · khoảng 11 ô');
    expect(rulerText({ meters: 1.7, slots: 0, tooShort: true })).toBe('1.7 m · ngắn hơn 1 ô');
    expect(rulerText({ meters: 12, slots: null, tooShort: false })).toBe('12 m');
  });

  it('turns the GPS error circle red once the fix is looser than 15 m', () => {
    expect(accuracyColor(8)).toBe('#1A73E8');
    expect(accuracyColor(15)).toBe('#1A73E8');
    expect(accuracyColor(22)).toBe('#B42318');
  });

  it('describes a zone by its day price and hours', () => {
    expect(zoneMeta(zone)).toMatch(/30\.000 đ\/ngày · 05:00–22:00/);
  });
});

describe('W13 slot grid: placement verdict', () => {
  it('keeps the server sentences and the valid line, with drawn signs instead of emoji', () => {
    const { container, rerender } = render(
      <PlacementVerdict
        check={{
          boundaryVerified: false,
          issues: [
            {
              severity: 'BLOCK',
              code: 'b',
              message: 'Ô đè lên Trạm biến áp',
              featureId: 1,
              slotId: null,
              distanceMeters: 0,
            },
            {
              severity: 'WARN',
              code: 'w',
              message: 'Có thể chồng lấn ô A-01',
              featureId: null,
              slotId: 5,
              distanceMeters: 0.5,
            },
          ],
        }}
      />,
    );
    expect(screen.getByText('Ô đè lên Trạm biến áp')).toBeInTheDocument();
    expect(screen.getByText('Có thể chồng lấn ô A-01')).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/⛔|⚠️/);
    rerender(<PlacementVerdict check={{ boundaryVerified: false, issues: [] }} />);
    expect(container.textContent).toBe('✓ Vị trí hợp lệ.');
  });
});

describe('W13 slot grid: ward without zones', () => {
  it('offers the way to Giá & khung giờ', async () => {
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
    vi.spyOn(wardConfigApi, 'listZones').mockResolvedValue([]);
    vi.spyOn(wardConfigApi, 'slotGrid').mockResolvedValue({
      slots: [],
      features: [],
      boundaryConfigured: true,
      clearanceCheckEnabled: false,
    });
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <MemoryRouter initialEntries={['/ward/slots/editor']}>
          <Routes>
            <Route path="/ward/slots/editor" element={<SlotGridEditorScreen />} />
            <Route path="/ward/settings/pricing" element={<p>pricing screen</p>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(
      await screen.findByText(/Phường chưa có khu vực nào\. Hãy tạo khu vực ở mục Giá & khung giờ/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mở Giá & khung giờ' }));
    expect(await screen.findByText('pricing screen')).toBeInTheDocument();
  });
});
