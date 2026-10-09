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
  type WardSlot,
  type WardSlotGrid,
  type WardStreetFeature,
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

// Goong does not render in jsdom; the stand-in exposes the taps the screen needs. "map-click-double"
// replays what goong-map-react really does: two onClick calls for one physical tap.
vi.mock('@/features/ward-administration/components/SlotGridMap', () => ({
  SlotGridMap: ({ onMapClick }: { onMapClick: (p: { latitude: number; longitude: number }) => void }) => (
    <>
      <button type="button" onClick={() => onMapClick({ latitude: 16.05, longitude: 108.22 })}>
        map-click
      </button>
      <button
        type="button"
        onClick={() => {
          onMapClick({ latitude: 16.05, longitude: 108.22 });
          onMapClick({ latitude: 16.05, longitude: 108.22 });
        }}
      >
        map-click-double
      </button>
      {/* ~33 m north of map-click */}
      <button type="button" onClick={() => onMapClick({ latitude: 16.0503, longitude: 108.22 })}>
        map-click-far
      </button>
      {/* ~1.7 m north of map-click: shorter than a 2 m slot, but clearly a second point */}
      <button type="button" onClick={() => onMapClick({ latitude: 16.050015, longitude: 108.22 })}>
        map-click-near
      </button>
    </>
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
  priceDisplayUnit: 'DAY',
  pricePerMonth: null,
  rentalMode: 'STANDARD',
  eventStartDate: null,
  eventEndDate: null,
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
  vi.spyOn(wardApi, 'me').mockResolvedValue({ userId: '1', wardId: 1, name: 'Ward', sanctionAuthorityTitle: null });
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
  beforeEach(() => {
    // This section loads alongside the rates; unit tests must not call a live API.
    vi.spyOn(wardConfigApi, 'getCompliancePolicy').mockResolvedValue({
      violationThresholdCount: null,
      violationWindowDays: null,
      unpaidPenaltyGraceDays: null,
      updatedAt: null,
      updatedByName: null,
    });
  });

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
        actorName: 'Nguyễn Thị Hồng Vân',
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
    expect(await screen.findByText('⚠️ THIẾU CĂN CỨ PHÁP LÝ')).toBeInTheDocument();
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
      amountChanged: true,
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
    expect(preview).toHaveBeenCalledWith(1, 40000, '05:00:00', '22:00:00', []);
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

  it('saves a pure metadata edit without requiring an impact preview or a reason', async () => {
    vi.spyOn(wardConfigApi, 'listZones').mockResolvedValue([zone]);
    const preview = vi.spyOn(wardConfigApi, 'previewZoneImpact');
    const update = vi.spyOn(wardConfigApi, 'updateZone').mockResolvedValue(zone);
    mount(<PricingScheduleScreen />);

    fireEvent.click(await screen.findByRole('button', { name: /Đường Nguyễn Văn Linh/ }));
    // Price, hours and fee components are untouched -- only a metadata field changes.
    fireEvent.change(screen.getByLabelText('Đoạn từ'), { target: { value: 'Ngã tư mới' } });

    expect(screen.queryByRole('button', { name: 'Xem tác động trước khi lưu' })).not.toBeInTheDocument();
    const save = screen.getByRole('button', { name: 'Lưu thay đổi' });
    expect(save).not.toBeDisabled();
    fireEvent.click(save);

    await waitFor(() => expect(update).toHaveBeenCalledWith(1, expect.objectContaining({ segmentFrom: 'Ngã tư mới' })));
    expect(preview).not.toHaveBeenCalled();
  });

  it('requires the impact preview when only the fee components change, price and hours untouched', async () => {
    vi.spyOn(wardConfigApi, 'listZones').mockResolvedValue([zone]);
    vi.spyOn(wardConfigApi, 'previewZoneImpact').mockResolvedValue({
      amountChanged: true,
      hoursChanged: false,
      pendingApplications: [],
      openRenewals: [],
      activeContractsAffectedByHours: 0,
      totalDelta: 0,
      vendorsToNotify: 0,
    });
    mount(<PricingScheduleScreen />);

    fireEvent.click(await screen.findByRole('button', { name: /Đường Nguyễn Văn Linh/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Thêm khoản phí' }));
    fireEvent.change(screen.getByLabelText('Tên khoản phí'), { target: { value: 'Phí vệ sinh' } });

    const save = screen.getByRole('button', { name: 'Lưu thay đổi' });
    expect(save).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Xem tác động trước khi lưu' })).toBeInTheDocument();
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

  const slot = (over: Partial<WardSlot>): WardSlot => ({
    slotId: 1, slotCode: 'NVL-01', zoneId: 1, zoneName: zone.zoneName, latitude: 16.05, longitude: 108.22,
    widthMeters: 2, lengthMeters: 3, status: 'AVAILABLE', source: 'WARD_DEFINED', hasPower: false, hasWater: false,
    hasTrashBin: false, businessCategory: null, canHardDelete: false, canEditGeometry: true, versionToken: 'v1',
    ...over,
  });

  async function openBatch() {
    vi.spyOn(wardConfigApi, 'listZones').mockResolvedValue([zone]);
    vi.spyOn(wardConfigApi, 'slotGrid').mockResolvedValue(grid);
    mount(<SlotGridEditorScreen />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Rải hàng loạt' }));
  }

  it('counts one physical tap once even though the map library fires onClick twice', async () => {
    await openBatch();
    fireEvent.click(screen.getByRole('button', { name: 'map-click-double' }));
    expect(screen.getByText(/Đã chọn 1\/2 điểm/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'map-click-far' }));
    // Two distinct pins: the start survived the duplicate call, so a real segment is measured.
    expect(screen.getByText(/Đoạn dài khoảng/)).toBeInTheDocument();
  });

  it('shows the segment length and how many slots it fits before any server call', async () => {
    await openBatch();
    const preview = vi.spyOn(wardConfigApi, 'previewBatch');
    fireEvent.click(screen.getByRole('button', { name: 'map-click' }));
    fireEvent.click(screen.getByRole('button', { name: 'map-click-far' }));
    // 33.4 m, 2 m slots, 1 m gap: floor((33.4 - 2) / 3) + 1 = 11, same formula as SlotLine.Positions.
    expect(screen.getByText(/rải được khoảng 11 ô/)).toBeInTheDocument();
    expect(preview).not.toHaveBeenCalled();
  });

  it('blocks the preview when the segment is shorter than one slot', async () => {
    await openBatch();
    fireEvent.click(screen.getByRole('button', { name: 'map-click' }));
    fireEvent.click(screen.getByRole('button', { name: 'map-click-near' }));
    expect(screen.getByText(/ngắn hơn chiều dài một ô/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Xem trước' })).toBeDisabled();
  });

  it("lists a slot's change history with who, what and why", async () => {
    vi.spyOn(wardConfigApi, 'listZones').mockResolvedValue([zone]);
    vi.spyOn(wardConfigApi, 'slotGrid').mockResolvedValue({ ...grid, slots: [slot({})] });
    const history = vi.spyOn(wardConfigApi, 'slotHistory').mockResolvedValue([
      {
        auditId: 2,
        action: 'SLOT_STATUS_CHANGED',
        actorName: 'Nguyễn Thị Hồng Vân',
        createdAt: '2026-09-20T03:00:00Z',
        details: JSON.stringify({ before: { status: 'AVAILABLE' }, after: { status: 'SUSPENDED' }, reason: 'Thi công cống' }),
      },
      {
        auditId: 1,
        action: 'SLOT_UPDATED',
        actorName: 'Nguyễn Thị Hồng Vân',
        createdAt: '2026-09-19T03:00:00Z',
        details: JSON.stringify({
          before: { slotCode: 'NVL-01', zoneId: 1, latitude: 16.05, longitude: 108.22, widthMeters: 2, lengthMeters: 2, hasPower: false },
          after: { slotCode: 'NVL-01', zoneId: 1, latitude: 16.05, longitude: 108.22, widthMeters: 2, lengthMeters: 3, hasPower: true },
        }),
      },
    ]);
    mount(<SlotGridEditorScreen />);

    fireEvent.click(await screen.findByRole('button', { name: /NVL-01/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Lịch sử thay đổi' }));
    expect(await screen.findByText('Trống → Tạm ngưng')).toBeInTheDocument();
    expect(screen.getByText('Lý do: Thi công cống')).toBeInTheDocument();
    expect(screen.getByText('Kích thước 2×2 → 2×3 m')).toBeInTheDocument();
    expect(screen.getByText('Điện: không → có')).toBeInTheDocument();
    expect(history).toHaveBeenCalledWith(1);
  });

  it('suspends every selected free slot with one reason and skips slots in use', async () => {
    vi.spyOn(wardConfigApi, 'listZones').mockResolvedValue([zone]);
    vi.spyOn(wardConfigApi, 'slotGrid').mockResolvedValue({
      ...grid,
      slots: [
        slot({ slotId: 1, slotCode: 'NVL-01' }),
        slot({ slotId: 2, slotCode: 'NVL-02', versionToken: 'v2' }),
        slot({ slotId: 3, slotCode: 'NVL-03', status: 'ACTIVE' }),
      ],
    });
    const setStatus = vi.spyOn(wardConfigApi, 'setSlotStatus').mockImplementation(async (s) => ({ ...s, status: 'SUSPENDED' }));
    mount(<SlotGridEditorScreen />);

    fireEvent.click(await screen.findByRole('button', { name: 'Chọn nhiều ô' }));
    fireEvent.click(screen.getByRole('button', { name: 'Chọn tất cả 3 ô khớp bộ lọc' }));
    expect(screen.getByText(/1 ô đang có đơn hoặc hợp đồng sẽ được bỏ qua/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Lý do (áp dụng cho tất cả ô đã chọn)'), {
      target: { value: 'Thi công vỉa hè' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Tạm ngưng 2 ô' }));

    await waitFor(() => expect(setStatus).toHaveBeenCalledTimes(2));
    expect(setStatus).toHaveBeenCalledWith(expect.objectContaining({ slotId: 1, versionToken: 'v1' }), 'SUSPENDED', 'Thi công vỉa hè');
    expect(setStatus).toHaveBeenCalledWith(expect.objectContaining({ slotId: 2, versionToken: 'v2' }), 'SUSPENDED', 'Thi công vỉa hè');
  });

  it('paginates a long slot list, 20 per page, and resets to page 1 on a new search', async () => {
    const slots = Array.from({ length: 25 }, (_, i) =>
      slot({ slotId: i + 1, slotCode: `NVL-${String(i + 1).padStart(2, '0')}`, versionToken: `v${i + 1}` }),
    );
    vi.spyOn(wardConfigApi, 'listZones').mockResolvedValue([zone]);
    vi.spyOn(wardConfigApi, 'slotGrid').mockResolvedValue({ ...grid, slots });
    mount(<SlotGridEditorScreen />);

    expect(await screen.findByText('Ô trên lưới (25)')).toBeInTheDocument();
    expect(screen.getByText('Trang 1/2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /NVL-01\b/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /NVL-21\b/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Trang trước' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Trang sau' }));
    expect(screen.getByText('Trang 2/2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /NVL-21\b/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /NVL-01\b/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Trang sau' })).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Tìm theo mã ô'), { target: { value: 'NVL-0' } });
    expect(screen.getByText('Ô trên lưới (9/25 khớp bộ lọc)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /NVL-01\b/ })).toBeInTheDocument();
    expect(screen.queryByText(/Trang \d\/\d/)).not.toBeInTheDocument();
  });

  it('explains why a slot with an open application cannot be suspended here', async () => {
    vi.spyOn(wardConfigApi, 'listZones').mockResolvedValue([zone]);
    vi.spyOn(wardConfigApi, 'slotGrid').mockResolvedValue({
      ...grid,
      slots: [slot({ status: 'PENDING_APPLICATION', canEditGeometry: false })],
    });
    mount(<SlotGridEditorScreen />);

    fireEvent.click(await screen.findByRole('button', { name: /NVL-01/ }));
    expect(screen.getByText(/đang có đơn thuê chờ xử lý nên chưa tạm ngưng được/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tạm ngưng ô' })).not.toBeInTheDocument();
  });

  it('edits a street feature in place, keeping its position unless a new one is tapped', async () => {
    const feature: WardStreetFeature = {
      featureId: 4, zoneId: 1, featureType: 'HYDRANT', label: 'Trụ nước', latitude: 16.06, longitude: 108.21,
      blocksBusiness: true, note: null, clearanceMeters: null, versionToken: 'f1',
    };
    vi.spyOn(wardConfigApi, 'listZones').mockResolvedValue([zone]);
    vi.spyOn(wardConfigApi, 'slotGrid').mockResolvedValue({ ...grid, features: [feature] });
    const update = vi.spyOn(wardConfigApi, 'updateFeature').mockResolvedValue({ feature, affectedSlots: [] });
    mount(<SlotGridEditorScreen />);

    fireEvent.click(await screen.findByRole('tab', { name: 'Chướng ngại vật' }));
    fireEvent.click(screen.getByRole('button', { name: 'map-click' })); // stray tap before choosing "Sửa"
    fireEvent.click(screen.getByRole('button', { name: 'Sửa' }));
    fireEvent.change(screen.getByLabelText('Tên / mô tả ngắn'), { target: { value: 'Trụ nước PCCC số 2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith(
        feature,
        expect.objectContaining({ label: 'Trụ nước PCCC số 2', latitude: 16.06, longitude: 108.21 }),
      ),
    );
  });
});
