import { cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import type { ReactElement } from 'react';
import { wardApi } from '@/features/ward-administration/ward-api';
import {
  wardConfigApi,
  type WardPenaltyType,
  type WardZone,
} from '@/features/ward-administration/ward-config-api';
import { PenaltyScheduleScreen } from '@/features/ward-administration/screens/PenaltyScheduleScreen';
import { PricingScheduleScreen } from '@/features/ward-administration/screens/PricingScheduleScreen';
import { HourBand24 } from '@/features/ward-administration/components/ops/schedule/TariffSign';
import {
  compactVnd,
  makeLogScale,
} from '@/features/ward-administration/components/ops/schedule/schedule-format';
import { useAuthStore } from '@/store/auth-store';

vi.mock('@/core/config/env', () => ({
  env: { apiBaseUrl: 'https://api.example.test/api', useMockApi: false, appEnv: 'test' },
  isDev: true,
  isLiveApi: true,
}));

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
  vi.spyOn(wardApi, 'me').mockResolvedValue({
    userId: '1',
    wardId: 1,
    name: 'Ward',
    sanctionAuthorityTitle: null,
  });
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  useAuthStore.setState({ user: null, sessionExpired: false });
});

const zone = (over: Partial<WardZone>): WardZone => ({
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
  ...over,
});

function paintedWidths(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll<HTMLElement>('span.bg-brand')).map(
    (el) => el.style.width,
  );
}

describe('HourBand24', () => {
  it('paints one piece for a daytime window', () => {
    const { container } = render(<HourBand24 from="06:00:00" to="18:00:00" />);
    expect(paintedWidths(container)).toEqual(['50%']);
    expect(container.textContent).toContain('06:00');
    expect(container.textContent).toContain('18:00');
  });

  it('paints two pieces across midnight for an overnight window', () => {
    const { container } = render(<HourBand24 from="18:00" to="02:00" />);
    const widths = paintedWidths(container).map((w) => Number.parseFloat(w));
    expect(widths).toHaveLength(2);
    expect(widths[0]).toBeCloseTo(25);
    expect(widths[1]).toBeCloseTo((2 / 24) * 100);
  });

  it('washes the whole day when there is no window', () => {
    const { container } = render(<HourBand24 from={null} to={null} />);
    expect(paintedWidths(container)).toEqual([]);
    expect(container.querySelector('span.bg-brand\\/30')).not.toBeNull();
    expect(container.textContent).toContain('Cả ngày');
  });
});

describe('shared penalty scale', () => {
  it('spans 200 nghìn to 20 tr on a log axis and only widens for real data', () => {
    const scale = makeLogScale([2_000_000, 4_000_000]);
    expect(scale.at(200_000)).toBe(0);
    expect(scale.at(20_000_000)).toBe(1);
    expect(scale.at(2_000_000)).toBeCloseTo(0.5);
    expect(makeLogScale([40_000_000]).hi).toBe(40_000_000);
  });

  it('labels ticks in short form, never the full amount', () => {
    expect(compactVnd(200_000)).toBe('200 nghìn');
    expect(compactVnd(3_000_000)).toBe('3 tr');
    expect(compactVnd(2_500_000)).toBe('2,5 tr');
  });
});

describe('W17 pricing presentation', () => {
  it('counts zones without a permitting document in the summary line', async () => {
    vi.spyOn(wardConfigApi, 'listZones').mockResolvedValue([
      zone({}),
      zone({ zoneId: 2, zoneName: 'Hẻm 12', zoneCode: 'HC1-H12', regulationRef: null }),
    ]);
    mount(<PricingScheduleScreen />);
    expect(await screen.findByText(/1 khu vực chưa có văn bản cho phép/)).toBeInTheDocument();
    const sign = screen.getByRole('button', { name: /Hẻm 12/ });
    expect(sign).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(sign);
    expect(sign).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('heading', { name: 'Sửa khu vực Hẻm 12' })).toHaveFocus();
  });

  it('offers "Tạo khu vực" from the empty state too, opening the same blank form', async () => {
    vi.spyOn(wardConfigApi, 'listZones').mockResolvedValue([]);
    mount(<PricingScheduleScreen />);
    expect(await screen.findByText('Khu vực (0)')).toBeInTheDocument();
    expect(screen.getByText('Chưa có khu vực nào')).toBeInTheDocument();
    const create = screen.getAllByRole('button', { name: 'Tạo khu vực' });
    expect(create).toHaveLength(2);
    fireEvent.click(create[1]!);
    expect(screen.getByRole('heading', { name: 'Tạo khu vực mới' })).toBeInTheDocument();
  });
});

describe('W18 penalty presentation', () => {
  beforeEach(() => {
    vi.spyOn(wardConfigApi, 'getCompliancePolicy').mockResolvedValue({
      violationThresholdCount: 3,
      violationWindowDays: 90,
      unpaidPenaltyGraceDays: 15,
      updatedAt: '2026-10-01T03:00:00Z',
      updatedByName: 'Nguyễn Thị Hồng Vân',
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
        legalBasis: 'Nghị định 168/2024/NĐ-CP',
        effectiveFrom: '2026-01-01',
        effectiveTo: null,
        createdAt: '2026-01-01T00:00:00Z',
        isInUse: true,
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

  it('shows legal-basis coverage and filters to the types still missing one', async () => {
    vi.spyOn(wardConfigApi, 'penaltyOverview').mockResolvedValue(types);
    mount(<PenaltyScheduleScreen />);
    expect(await screen.findByText('1/2')).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(
      screen.getByRole('img', {
        name: 'Khung 2.000.000 đến 3.000.000 đồng, áp dụng 2.500.000 đồng',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('đã dùng cho quyết định xử phạt')).toBeInTheDocument();

    const filters = screen.getByRole('group', { name: 'Lọc hành vi' });
    fireEvent.click(within(filters).getByRole('button', { name: /Thiếu căn cứ/ }));
    const rows = screen.getAllByRole('article');
    expect(rows).toHaveLength(1);
    expect(within(rows[0]!).getByText('Kinh doanh ngoài khung giờ')).toBeInTheDocument();
  });

  it('reads the policy as one sentence while keeping the three field names', async () => {
    vi.spyOn(wardConfigApi, 'penaltyOverview').mockResolvedValue(types);
    mount(<PenaltyScheduleScreen />);
    const threshold = await screen.findByLabelText(
      'Ngưỡng số lần vi phạm đã có quyết định xử phạt',
    );
    // The policy fills in after the overview resolves; wait for the value, not just the field.
    await waitFor(() => expect(threshold).toHaveValue('3'));
    expect(screen.getByLabelText('Trong vòng (số ngày)')).toHaveValue('90');
    expect(screen.getByLabelText('Số ngày ân hạn trước khi nhắc nộp phạt quá hạn')).toHaveValue(
      '15',
    );
    expect(screen.getByText(/Cập nhật lần cuối .* bởi Nguyễn Thị Hồng Vân/)).toBeInTheDocument();
  });
});
