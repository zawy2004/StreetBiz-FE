import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import type { ReactElement } from 'react';
import { ApiError } from '@/core/api';
import { useToastStore } from '@/components/feedback';
import { wardApi } from '@/features/ward-administration/ward-api';
import {
  wardConfigApi,
  type PlacementCheck,
  type WardPenaltyType,
  type WardSlotGrid,
  type WardZone,
} from '@/features/ward-administration/ward-config-api';
import { PenaltyScheduleScreen } from '@/features/ward-administration/screens/PenaltyScheduleScreen';
import { PricingScheduleScreen } from '@/features/ward-administration/screens/PricingScheduleScreen';
import { SlotGridEditorScreen } from '@/features/ward-administration/screens/SlotGridEditorScreen';
import { useAuthStore } from '@/store/auth-store';

vi.mock('@/core/config/env', () => ({
  env: { apiBaseUrl: 'https://api.example.test/api', useMockApi: false, appEnv: 'test' },
  isDev: true,
  isLiveApi: true,
}));

// Leaflet does not render in jsdom; the stand-in exposes the one interaction the screen needs.
vi.mock('@/features/ward-administration/components/SlotGridMap', () => ({
  SlotGridMap: ({ onMapClick }: { onMapClick: (p: { latitude: number; longitude: number }) => void }) => (
    <button type="button" onClick={() => onMapClick({ latitude: 16.05, longitude: 108.22 })}>
      map-click
    </button>
  ),
}));

const zone: WardZone = {
  zoneId: 1,
  zoneName: 'Đường Nguyễn Văn Linh',
  zoneCode: 'HC1-NVL',
  pricePerDay: 30000,
  availableFrom: '05:00:00',
  availableTo: '22:00:00',
  isOvernight: false,
  regulationRef: 'QĐ 1247/QĐ-UBND',
  segmentFrom: null,
  segmentTo: null,
  applicationDeadline: null,
  slotCount: 3,
  activeSlotCount: 1,
  featureCount: 0,
  feeComponents: [],
  versionToken: 'zone-v1',
};

function mount(ui: ReactElement) {
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
  vi.spyOn(wardApi, 'me').mockResolvedValue({ userId: '1', wardId: 1, name: 'Ward' });
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  useAuthStore.setState({ user: null, sessionExpired: false });
});

describe('WARD-03 penalty schedule', () => {
  const types: WardPenaltyType[] = [
    {
      violationType: 'UNAUTHORIZED_BUSINESS_USE',
      description: 'Sử dụng trái phép vỉa hè',
      isActive: true,
      hasLegalBasis: true,
      current: {
        scheduleId: 7,
        amount: 2_500_000,
        bracketMin: 2_000_000,
        bracketMax: 3_000_000,
        legalBasis: 'Nghị định 168/2024/NĐ-CP (khung 2.000.000 - 3.000.000đ)',
        effectiveFrom: '2026-01-01',
        effectiveTo: null,
        createdAt: '2026-01-01T00:00:00Z',
        isInUse: false,
      },
      scheduled: null,
    },
    {
      violationType: 'OUTSIDE_HOURS',
      description: 'Kinh doanh ngoài khung giờ',
      isActive: true,
      hasLegalBasis: false,
      current: null,
      scheduled: null,
    },
  ];

  it('flags types without a legal basis', async () => {
    vi.spyOn(wardConfigApi, 'penaltyOverview').mockResolvedValue(types);
    mount(<PenaltyScheduleScreen />);
    expect(await screen.findByText('THIẾU CĂN CỨ')).toBeInTheDocument();
    expect(screen.getByText(/1 hành vi chưa có căn cứ pháp lý/)).toBeInTheDocument();
  });

  it('computes the bracket midpoint and sends the rate it replaces', async () => {
    vi.spyOn(wardConfigApi, 'penaltyOverview').mockResolvedValue(types);
    const save = vi.spyOn(wardConfigApi, 'setPenaltyRate').mockResolvedValue(types[0]!);
    mount(<PenaltyScheduleScreen />);

    fireEvent.click((await screen.findAllByRole('button', { name: 'Đặt mức mới' }))[0]!);
    fireEvent.change(screen.getByLabelText('Văn bản (số hiệu)'), { target: { value: 'Nghị định 168/2024/NĐ-CP' } });
    fireEvent.change(screen.getByLabelText('Điều'), { target: { value: '12' } });
    fireEvent.change(screen.getByLabelText('Khoản'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('Hành vi theo văn bản'), { target: { value: 'kinh doanh trái phép' } });
    fireEvent.change(screen.getByLabelText('Khung tối đa (cá nhân)'), { target: { value: '4000000' } });

    expect(screen.getByText('3.000.000đ')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Lưu mức phạt' }));
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith(
        expect.objectContaining({ bracketMin: 2_000_000, bracketMax: 4_000_000, expectedCurrentScheduleId: 7, article: '12' }),
      ),
    );
  });

  it('explains a concurrent edit instead of a generic error', async () => {
    vi.spyOn(wardConfigApi, 'penaltyOverview').mockResolvedValue(types);
    vi.spyOn(wardConfigApi, 'setPenaltyRate').mockRejectedValue(new ApiError('conflict', 409, 'stale'));
    mount(<PenaltyScheduleScreen />);

    fireEvent.click((await screen.findAllByRole('button', { name: 'Đặt mức mới' }))[0]!);
    fireEvent.change(screen.getByLabelText('Văn bản (số hiệu)'), { target: { value: 'NĐ 168/2024' } });
    fireEvent.change(screen.getByLabelText('Điều'), { target: { value: '12' } });
    fireEvent.change(screen.getByLabelText('Khoản'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('Hành vi theo văn bản'), { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu mức phạt' }));

    await waitFor(() =>
      expect(JSON.stringify(useToastStore.getState())).toContain('cán bộ khác cập nhật'),
    );
  });
});

describe('WARD-02 pricing & hours', () => {
  it('requires an impact preview and a reason before saving a zone change', async () => {
    vi.spyOn(wardConfigApi, 'listZones').mockResolvedValue([zone]);
    const preview = vi.spyOn(wardConfigApi, 'previewZoneImpact').mockResolvedValue({
      priceChanged: true,
      hoursChanged: false,
      pendingApplications: [
        { kind: 'RENTAL_APPLICATION', id: 1, slotCode: 'A-01', vendorName: 'Hộ A', termDays: 30, currentTotal: 900000, newTotal: 1200000 },
      ],
      openRenewals: [],
      activeContractsAffectedByHours: 0,
      totalDelta: 300000,
      vendorsToNotify: 1,
    });
    const update = vi.spyOn(wardConfigApi, 'updateZone').mockResolvedValue(zone);
    mount(<PricingScheduleScreen />);

    fireEvent.click(await screen.findByRole('button', { name: /Đường Nguyễn Văn Linh/ }));
    fireEvent.change(screen.getByLabelText('Giá thuê mỗi ngày'), { target: { value: '40000' } });
    const save = screen.getByRole('button', { name: 'Lưu thay đổi' });
    expect(save).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Xem tác động trước khi lưu' }));
    expect(await screen.findByText(/Tổng chênh lệch/)).toBeInTheDocument();
    expect(preview).toHaveBeenCalledWith(1, 40000, '05:00:00', '22:00:00');
    expect(save).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Lý do thay đổi'), { target: { value: 'Theo quyết định mới' } });
    fireEvent.click(save);
    await waitFor(() =>
      expect(update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ pricePerDay: 40000, versionToken: 'zone-v1', changeReason: 'Theo quyết định mới', regulationNumber: null }),
      ),
    );
  });

  it('marks an overnight window', async () => {
    vi.spyOn(wardConfigApi, 'listZones').mockResolvedValue([zone]);
    mount(<PricingScheduleScreen />);
    fireEvent.click(await screen.findByRole('button', { name: /Đường Nguyễn Văn Linh/ }));
    fireEvent.change(screen.getByLabelText('Giờ bắt đầu'), { target: { value: '18:00' } });
    fireEvent.change(screen.getByLabelText('Giờ kết thúc'), { target: { value: '02:00' } });
    expect(screen.getByText(/CA QUA ĐÊM/)).toBeInTheDocument();
  });
});

describe('WARD-01 slot grid', () => {
  const grid: WardSlotGrid = { slots: [], features: [], boundaryConfigured: false, clearanceCheckEnabled: false };

  it('says when the ward boundary is not configured', async () => {
    vi.spyOn(wardConfigApi, 'listZones').mockResolvedValue([zone]);
    vi.spyOn(wardConfigApi, 'slotGrid').mockResolvedValue(grid);
    mount(<SlotGridEditorScreen />);
    expect(await screen.findByText(/Chưa cấu hình ranh giới phường chính thức/)).toBeInTheDocument();
  });

  it('blocks a slot the server says sits on a no-business feature', async () => {
    vi.spyOn(wardConfigApi, 'listZones').mockResolvedValue([zone]);
    vi.spyOn(wardConfigApi, 'slotGrid').mockResolvedValue(grid);
    const blocked: PlacementCheck = {
      boundaryVerified: false,
      issues: [{ severity: 'BLOCK', code: 'feature_blocks_business', message: 'Ô đè lên Trạm biến áp', featureId: 1, slotId: null, distanceMeters: 0 }],
    };
    vi.spyOn(wardConfigApi, 'checkPlacement').mockResolvedValue(blocked);
    mount(<SlotGridEditorScreen />);

    fireEvent.click(await screen.findByRole('button', { name: 'map-click' }));
    expect(await screen.findByText(/Ô đè lên Trạm biến áp/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thêm ô' })).toBeDisabled();
  });

  it('needs an acknowledgement with a reason before saving over a warning', async () => {
    vi.spyOn(wardConfigApi, 'listZones').mockResolvedValue([zone]);
    vi.spyOn(wardConfigApi, 'slotGrid').mockResolvedValue(grid);
    vi.spyOn(wardConfigApi, 'checkPlacement').mockResolvedValue({
      boundaryVerified: false,
      issues: [{ severity: 'WARN', code: 'slot_overlap', message: 'Có thể chồng lấn ô A-01', featureId: null, slotId: 5, distanceMeters: 0.5 }],
    });
    const create = vi.spyOn(wardConfigApi, 'createSlot').mockResolvedValue({
      slot: {
        slotId: 9, slotCode: 'HC1-NVL-001', zoneId: 1, zoneName: zone.zoneName, latitude: 16.05, longitude: 108.22,
        widthMeters: 2, lengthMeters: 2, status: 'AVAILABLE', source: 'WARD_DEFINED', hasPower: false, hasWater: false,
        hasTrashBin: false, businessCategory: null, canHardDelete: true, canEditGeometry: true, versionToken: 't',
      },
      check: { boundaryVerified: false, issues: [] },
    });
    mount(<SlotGridEditorScreen />);

    fireEvent.click(await screen.findByRole('button', { name: 'map-click' }));
    await screen.findByText(/Có thể chồng lấn ô A-01/);
    const add = screen.getByRole('button', { name: 'Thêm ô' });
    expect(add).toBeDisabled();

    fireEvent.click(screen.getByLabelText('Tôi đã xem cảnh báo và vẫn muốn lưu'));
    fireEvent.change(screen.getByLabelText('Lý do bỏ qua cảnh báo'), { target: { value: 'Hai ô ghép' } });
    fireEvent.click(add);
    await waitFor(() =>
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({ zoneId: 1, acknowledgeWarnings: true, warningReason: 'Hai ô ghép', slotCode: null }),
      ),
    );
  });
});
