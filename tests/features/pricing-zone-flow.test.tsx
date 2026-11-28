import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/core/api';
import { useToastStore } from '@/components/feedback';
import { wardApi } from '@/features/ward-administration/ward-api';
import { wardConfigApi, type WardZone } from '@/features/ward-administration/ward-config-api';
import { useAuthStore } from '@/store/auth-store';

vi.mock('@/core/config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/config/env')>();
  return { ...actual, isLiveApi: true };
});

const { PricingScheduleScreen } =
  await import('@/features/ward-administration/screens/PricingScheduleScreen');

/** WARD-02 beyond the price change itself: new zones, events, fees, deleting, history, errors. */
const zone = (over: Partial<WardZone> = {}): WardZone => ({
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
  slotCount: 0,
  activeSlotCount: 0,
  featureCount: 0,
  feeComponents: [],
  versionToken: 'zone-v1',
  priceDisplayUnit: 'DAY',
  pricePerMonth: null,
  rentalMode: 'STANDARD',
  quarterDiscountPercent: null,
  eventStartDate: null,
  eventEndDate: null,
  ...over,
});

function mount() {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <PricingScheduleScreen />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const toast = () => useToastStore.getState().message;
const type = (label: string | RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

beforeEach(() => {
  useToastStore.setState({ message: null });
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
  vi.spyOn(wardConfigApi, 'priceSuggestion').mockRejectedValue(new Error('no suggestion'));
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('pricing zones', () => {
  it('shows a load failure and retries', async () => {
    const list = vi
      .spyOn(wardConfigApi, 'listZones')
      .mockRejectedValueOnce(new ApiError('server_error', 500, 'Máy chủ lỗi'))
      .mockResolvedValue([]);
    mount();
    expect(await screen.findByRole('alert')).toHaveTextContent('Máy chủ lỗi');
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByText('Chưa có khu vực nào')).toBeInTheDocument();
    expect(list).toHaveBeenCalledTimes(2);
  });

  it('creates an event zone with a fee component and its permitting document', async () => {
    vi.spyOn(wardConfigApi, 'listZones').mockResolvedValue([]);
    const create = vi.spyOn(wardConfigApi, 'createZone').mockResolvedValue(zone({ zoneId: 9 }));
    mount();

    const [createButton] = await screen.findAllByRole('button', { name: 'Tạo khu vực' });
    fireEvent.click(createButton!);
    type('Tên khu vực', 'Phố đi bộ');
    type('Mã khu vực', 'hc-pdb');
    expect(screen.getByLabelText('Mã khu vực')).toHaveValue('HC-PDB');

    fireEvent.click(screen.getByRole('tab', { name: 'Sự kiện (ngắn hạn, theo ngày)' }));
    type('Ngày bắt đầu sự kiện', '2026-12-20');
    type('Ngày kết thúc sự kiện', '2026-12-31');
    type('Giá thuê mỗi ngày', '50000');
    type('Đoạn từ', 'Bạch Đằng');
    type('Đoạn đến', 'Trần Phú');
    type('Hạn nhận đơn (không bắt buộc)', '2026-12-15');
    type('Số hiệu văn bản', '12/QĐ-UBND');
    type('Ngày ban hành', '2026-11-01');
    type('Cơ quan ban hành', 'UBND phường');

    fireEvent.click(screen.getByRole('button', { name: 'Thêm khoản phí' }));
    type('Tên khoản phí', ' Vệ sinh ');
    type('Số tiền', '5000');
    fireEvent.click(screen.getByRole('button', { name: 'Thêm khoản phí' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Bỏ khoản này' })[1]!);

    const dock = screen.getAllByRole('button', { name: 'Tạo khu vực' }).at(-1)!;
    fireEvent.click(dock);
    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create.mock.calls[0]![0]).toMatchObject({
      zoneName: 'Phố đi bộ',
      zoneCode: 'HC-PDB',
      rentalMode: 'EVENT',
      eventStartDate: '2026-12-20',
      eventEndDate: '2026-12-31',
      priceDisplayUnit: 'DAY',
      quarterDiscountPercent: null,
      segmentFrom: 'Bạch Đằng',
      segmentTo: 'Trần Phú',
      applicationDeadline: '2026-12-15',
      regulationNumber: '12/QĐ-UBND',
      regulationIssuer: 'UBND phường',
      feeComponents: [{ componentName: 'Vệ sinh', unitAmount: 5000 }],
    });
    await waitFor(() => expect(toast()).toBe('Đã tạo khu vực'));
  });

  it('deletes an empty zone after confirming, and reports a failed delete', async () => {
    vi.spyOn(wardConfigApi, 'listZones').mockResolvedValue([zone()]);
    const remove = vi
      .spyOn(wardConfigApi, 'deleteZone')
      .mockRejectedValueOnce(new ApiError('domain_rule', 422, 'Khu vực đang có ô'))
      .mockResolvedValueOnce(undefined);
    mount();

    fireEvent.click(await screen.findByRole('button', { name: /Đường Nguyễn Văn Linh/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Xoá khu vực' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Huỷ' }));
    expect(remove).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Xoá khu vực' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Xoá' }));
    await waitFor(() => expect(toast()).toBe('Khu vực đang có ô'));

    fireEvent.click(screen.getByRole('button', { name: 'Xoá khu vực' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Xoá' }));
    await waitFor(() => expect(toast()).toBe('Đã xoá khu vực'));
    expect(remove).toHaveBeenLastCalledWith(expect.objectContaining({ zoneId: 1 }));
  });

  it('lists the change history, with the price move and the reason', async () => {
    vi.spyOn(wardConfigApi, 'listZones').mockResolvedValue([zone()]);
    vi.spyOn(wardConfigApi, 'zoneHistory').mockResolvedValue([
      {
        auditId: 1,
        action: 'ZONE_UPDATED',
        actorName: 'Cán bộ A',
        createdAt: '2026-11-01T02:00:00Z',
        details: JSON.stringify({
          before: { pricePerDay: 30000 },
          after: { pricePerDay: 35000 },
          reason: 'Giá thị trường',
        }),
      },
      {
        auditId: 2,
        action: 'X',
        actorName: 'Cán bộ B',
        createdAt: '2026-11-02T02:00:00Z',
        details: 'not json',
      },
    ] as never);
    mount();

    fireEvent.click(await screen.findByRole('button', { name: /Đường Nguyễn Văn Linh/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Lịch sử thay đổi' }));
    expect(await screen.findByText('Lý do: Giá thị trường')).toBeInTheDocument();
    expect(screen.getByText(/Giá .*30\.000.*→/)).toBeInTheDocument();
    expect(screen.getByText(/Cán bộ B/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ẩn lịch sử' }));
    expect(screen.queryByText('Lý do: Giá thị trường')).not.toBeInTheDocument();
  });

  it('says when there is no history, or it fails to load', async () => {
    vi.spyOn(wardConfigApi, 'listZones').mockResolvedValue([
      zone(),
      zone({ zoneId: 2, zoneName: 'Đường Bạch Đằng', zoneCode: 'HC-BD' }),
    ]);
    vi.spyOn(wardConfigApi, 'zoneHistory')
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new ApiError('server_error', 500, 'Không tải được lịch sử'));
    mount();

    fireEvent.click(await screen.findByRole('button', { name: /Đường Nguyễn Văn Linh/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Lịch sử thay đổi' }));
    expect(await screen.findByText('Chưa có thay đổi nào được ghi nhận.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Đường Bạch Đằng/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Lịch sử thay đổi' }));
    expect(await screen.findByText('Không tải được lịch sử')).toBeInTheDocument();
  });

  it('explains a concurrent edit when saving', async () => {
    vi.spyOn(wardConfigApi, 'listZones').mockResolvedValue([zone()]);
    vi.spyOn(wardConfigApi, 'updateZone').mockRejectedValue(new ApiError('conflict', 409, 'stale'));
    mount();

    fireEvent.click(await screen.findByRole('button', { name: /Đường Nguyễn Văn Linh/ }));
    type('Tên khu vực', 'Đường NVL mới');
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    await waitFor(() =>
      expect(toast()).toBe(
        'Dữ liệu vừa được cán bộ khác cập nhật. Vui lòng tải lại trước khi lưu.',
      ),
    );
  });

  it('switches a zone to a monthly price and shows the day rate', async () => {
    vi.spyOn(wardConfigApi, 'listZones').mockResolvedValue([zone()]);
    mount();

    fireEvent.click(await screen.findByRole('button', { name: /Đường Nguyễn Văn Linh/ }));
    fireEvent.click(screen.getByRole('tab', { name: 'Giá theo tháng' }));
    type('Giá thuê mỗi tháng', '900000');
    expect(screen.getByText(/≈ 30\.000đ\/ngày/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    expect(screen.queryByLabelText('Giá thuê mỗi tháng')).not.toBeInTheDocument();
  });
});
