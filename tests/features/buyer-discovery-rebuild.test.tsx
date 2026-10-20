import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { vi } from 'vitest';

import type { ServiceArea } from '@/core/api/commerce-api';
import { NO_DISCOVERY_FILTERS } from '@/features/buyer-discovery/discovery-filters';
import { appendPhrase } from '@/features/buyer-discovery/append-phrase';
import { mealTags } from '@/features/buyer-discovery/mealtime';
import { todayStatus } from '@/features/buyer-discovery/storefront-hours';
import { passTone, passVerdict, distanceBetween } from '@/features/vendor-map/scan-format';
import {
  daysUntil,
  ratingDistribution,
  vendorTypeText,
} from '@/features/vendor-map/vendor-profile-format';
import { makeMenuItem, makeStorefront } from './discovery-fixtures';

const api = vi.hoisted(() => ({
  storefronts: vi.fn(),
  storefront: vi.fn(),
  serviceAreas: vi.fn(),
  marketplaceCategories: vi.fn(),
  menuItems: vi.fn(),
  menuItem: vi.fn(),
  cart: vi.fn(),
  addCartItem: vi.fn(),
}));

const community = vi.hoisted(() => ({
  profile: vi.fn(),
  comment: vi.fn(),
  report: vi.fn(),
  uploadEvidence: vi.fn(),
  verifyPermit: vi.fn(),
}));

vi.mock('@/core/api/commerce-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/api/commerce-api')>();
  return { ...actual, commerceApi: { ...actual.commerceApi, ...api } };
});

vi.mock('@/features/vendor-map/community-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/vendor-map/community-api')>();
  return { ...actual, communityApi: { ...actual.communityApi, ...community } };
});

vi.mock('@/core/config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/config/env')>();
  return { ...actual, isLiveApi: true };
});

vi.mock('@/features/vendor-map/components/ActiveVendorMap', () => ({
  ActiveVendorMap: () => null,
}));

const { ExploreScreen } = await import('@/features/vendor-map/screens/ExploreScreen');
const { SearchScreen } = await import('@/features/buyer-discovery/screens/SearchScreen');
const { ItemDetailScreen } = await import('@/features/buyer-discovery/screens/ItemDetailScreen');
const { CommentFormScreen } = await import('@/features/vendor-map/screens/CommentFormScreen');
const { VendorProfileScreen } = await import('@/features/vendor-map/screens/VendorProfileScreen');
const { VendorReportFormScreen } =
  await import('@/features/vendor-reports/screens/VendorReportFormScreen');
const { PublicScanScreen } = await import('@/features/vendor-map/screens/PublicScanScreen');
const { ReportContentScreen } =
  await import('@/features/vendor-reports/screens/ReportContentScreen');
const { useDiscoveryStore } = await import('@/features/buyer-discovery/discovery-store');
const { useCommunitySession } = await import('@/features/vendor-map/community-api');
const { useAuthStore } = await import('@/store/auth-store');
const { useMockDb } = await import('@/mocks/db');

const AREAS: ServiceArea[] = [
  {
    wardId: 1003,
    wardName: 'Phường Nam Dương',
    districtName: 'Quận Hải Châu',
    storefrontCount: 1,
    distanceMeters: null,
  },
  {
    wardId: 3,
    wardName: 'Phường Hòa Quý',
    districtName: 'Quận Ngũ Hành Sơn',
    storefrontCount: 2,
    distanceMeters: null,
  },
];

const PROFILE = {
  vendorId: 8,
  displayName: 'Xôi gà Bà Năm',
  vendorType: 'FIXED_STOREFRONT',
  address: null,
  wardId: 1003,
  wardName: 'Phường Nam Dương',
  permitId: 12,
  permitStatus: 'VALID',
  permitEndDate: '2099-12-31',
  slotId: 5,
  slotCode: 'NVL-022',
  zoneName: 'Đường Nguyễn Văn Linh',
  latitude: 16.06,
  longitude: 108.21,
  communityRating: null,
  communityCount: 0,
  verifiedRating: null,
  verifiedCount: 0,
  comments: [],
};

function Where() {
  const location = useLocation();
  return <div data-testid="where">{location.pathname + location.search}</div>;
}

function renderAt(path: string, routePath: string, element: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/start', path]} initialIndex={1}>
        <Routes>
          <Route path={routePath} element={element} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  sessionStorage.clear();
  useDiscoveryStore.setState({
    position: null,
    locateStatus: 'IDLE',
    filters: NO_DISCOVERY_FILTERS,
  });
  useCommunitySession.setState({ token: '', customer: null, generation: 0 });
  useAuthStore.setState({ user: null });
  api.serviceAreas.mockResolvedValue(AREAS);
  api.marketplaceCategories.mockResolvedValue([]);
  api.storefronts.mockResolvedValue([makeStorefront()]);
  api.menuItems.mockResolvedValue([makeMenuItem()]);
  community.profile.mockResolvedValue(PROFILE);
});

describe('pure helpers of the rebuilt buyer screens', () => {
  it('reads early and late windows off today’s hours', () => {
    expect(mealTags([{ opensAt: '05:30', closesAt: '10:00' }])).toEqual(['EARLY']);
    expect(mealTags([{ opensAt: '17:00', closesAt: '23:00' }])).toEqual(['LATE']);
    expect(mealTags([{ opensAt: '18:00', closesAt: '01:00' }])).toEqual(['LATE']);
    expect(mealTags([{ opensAt: '10:00', closesAt: '21:00' }])).toEqual([]);
  });

  it('says how today looks, and nothing when the hours disagree with the server', () => {
    // Saturday 2026-10-10 15:00 in Vietnam = 08:00 UTC.
    const now = new Date('2026-10-10T08:00:00Z');
    const hours = [
      { dayOfWeek: 6, opensAt: '10:00', closesAt: '21:00' },
      { dayOfWeek: 1, opensAt: '06:00', closesAt: '09:00' },
    ];
    expect(todayStatus(hours, true, now)).toBe('Đang mở, đóng lúc 21:00');
    expect(todayStatus(hours, false, now)).toBeNull();
    expect(todayStatus(hours, false, new Date('2026-10-10T15:00:00Z'))).toBe(
      'Đang đóng, mở lại 06:00 thứ hai',
    );
    expect(
      todayStatus(
        [{ dayOfWeek: 6, opensAt: '18:00', closesAt: '02:00' }],
        true,
        new Date('2026-10-10T18:30:00Z'),
      ),
    ).toBe('Đang mở, đóng lúc 02:00');
    expect(todayStatus([], true, now)).toBeNull();
  });

  it('counts days by the Vietnam calendar and names vendor types', () => {
    expect(daysUntil('2026-10-11', new Date('2026-10-10T17:01:00Z'))).toBe(0);
    expect(daysUntil('2026-10-11', new Date('2026-10-10T10:00:00Z'))).toBe(1);
    expect(vendorTypeText('ITINERANT')).toBe('Bán hàng lưu động');
    expect(vendorTypeText('OTHER')).toBe('OTHER');
    expect(
      ratingDistribution([{ rating: 5 }, { rating: 4 }, { rating: 5 }, { rating: null }]),
    ).toEqual([2, 1, 0, 0, 0]);
  });

  it('never shows an invalid permit in green', () => {
    expect(passTone('VALID', true)).toBe('ok');
    expect(passTone('VALID', false)).toBe('danger');
    expect(passVerdict('VALID', false)).toBe('Không hợp lệ');
    expect(passTone('NOT_YET_VALID', false)).toBe('pending');
    expect(passVerdict('WEIRD', true)).toBe('WEIRD');
    expect(
      Math.round(
        distanceBetween({ latitude: 16, longitude: 108 }, { latitude: 16.001, longitude: 108 }),
      ),
    ).toBe(111);
  });

  it('writes quick phrases once, after a comma', () => {
    expect(appendPhrase('', 'Món ngon')).toBe('Món ngon');
    expect(appendPhrase('Món ngon', 'Sạch sẽ')).toBe('Món ngon, sạch sẽ');
    expect(appendPhrase('Món ngon, sạch sẽ', 'Sạch sẽ')).toBe('Món ngon, sạch sẽ');
  });
});

describe('Explore: food streets (C01 tier B)', () => {
  it('filters by the ward card that was tapped, and counts what is open', async () => {
    const user = userEvent.setup();
    renderAt('/customer/explore', '/customer/explore', <ExploreScreen />);

    expect(await screen.findByText('1 đang mở')).toBeInTheDocument();
    const strip = (await screen.findByRole('heading', { name: 'Khu phố ẩm thực' })).closest(
      'section',
    )!;
    await user.click(within(strip).getByRole('button', { name: /Phường Hòa Quý/ }));

    await waitFor(() =>
      expect(api.storefronts.mock.calls.at(-1)?.[0]).toMatchObject({ wardId: 3 }),
    );
    expect(within(strip).getByRole('button', { name: /Phường Hòa Quý/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});

describe('Search (C02 rebuild)', () => {
  it('opens on the dish board without asking the API, and a dish tap searches for it', async () => {
    const user = userEvent.setup();
    renderAt('/customer/explore/search', '/customer/explore/search', <SearchScreen />);
    expect(screen.getByRole('heading', { name: 'Thèm gì hôm nay?' })).toBeInTheDocument();
    expect(api.menuItems).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Tìm Bún chả' }));

    await waitFor(() =>
      expect(api.menuItems.mock.calls.at(-1)?.[0]).toMatchObject({ query: 'Bún chả' }),
    );
    expect(screen.queryByRole('heading', { name: 'Thèm gì hôm nay?' })).not.toBeInTheDocument();
  });

  it('marks a sold-out dish and gives a lone stall the wide spread', async () => {
    const user = userEvent.setup();
    api.menuItems.mockResolvedValue([
      makeMenuItem(),
      makeMenuItem({ menuItemId: 21, itemName: 'Bún bò', availabilityStatus: 'SOLD_OUT' }),
    ]);
    renderAt('/customer/explore/search', '/customer/explore/search', <SearchScreen />);
    await user.type(screen.getByPlaceholderText(/Tìm món ăn hoặc quán/), 'bun');

    const soldOut = (await screen.findByText('Bún bò')).closest('button')!;
    expect(within(soldOut).getByText('HẾT MÓN')).toBeInTheDocument();
    expect(screen.getByText('Xem thực đơn')).toBeInTheDocument();
  });
});

describe('Item detail (C04 rebuild)', () => {
  beforeEach(() => {
    api.menuItem.mockResolvedValue(makeMenuItem({ storefrontId: 1 }));
  });

  it('sends a guest to sign in, from the one order button', async () => {
    const user = userEvent.setup();
    renderAt('/customer/explore/items/20', '/customer/explore/items/:itemId', <ItemDetailScreen />);

    const buttons = await screen.findAllByRole('button', { name: /Thêm vào giỏ/i });
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveAccessibleName('Đăng nhập để thêm vào giỏ');
    await user.click(buttons[0]!);
    expect(await screen.findByTestId('where')).toHaveTextContent('/auth/sign-in');
  });

  it('writes a quick note through the 300-character field and sends it', async () => {
    const user = userEvent.setup();
    useAuthStore.setState({
      user: {
        id: '1',
        fullName: 'A',
        phone: '1',
        password: '',
        role_code: 'CUSTOMER',
        account_status: 'ACTIVE',
      },
    });
    api.cart.mockResolvedValue({
      cartId: 1,
      storefrontId: 1,
      storefrontName: 'Bún chả Hải Châu',
      storefrontAddress: null,
      storefrontStatus: 'OPEN',
      items: [],
      subtotal: 0,
    });
    api.addCartItem.mockResolvedValue({});
    renderAt('/customer/explore/items/20', '/customer/explore/items/:itemId', <ItemDetailScreen />);

    await user.click(await screen.findByRole('button', { name: 'Ít cay' }));
    await user.click(screen.getByRole('button', { name: 'Tăng số lượng' }));
    const order = await screen.findByRole('button', { name: 'Thêm vào giỏ · 90.000 đ' });
    await waitFor(() => expect(order).toBeEnabled());
    await user.click(order);

    await waitFor(() => expect(api.addCartItem).toHaveBeenCalledWith(20, 2, 'Ít cay'));
  });

  it('warns before a cart from another stall is replaced, and still asks', async () => {
    const user = userEvent.setup();
    useAuthStore.setState({
      user: {
        id: '1',
        fullName: 'A',
        phone: '1',
        password: '',
        role_code: 'CUSTOMER',
        account_status: 'ACTIVE',
      },
    });
    api.cart.mockResolvedValue({
      cartId: 1,
      storefrontId: 9,
      storefrontName: 'Quán Cô Lan',
      storefrontAddress: null,
      storefrontStatus: 'OPEN',
      items: [
        {
          cartItemId: 1,
          menuItemId: 3,
          itemName: 'Xôi',
          imageUrl: null,
          unitPrice: 1,
          availabilityStatus: 'AVAILABLE',
          quantity: 2,
          note: null,
        },
      ],
      subtotal: 2,
    });
    renderAt('/customer/explore/items/20', '/customer/explore/items/:itemId', <ItemDetailScreen />);

    expect(await screen.findByText(/Thêm món này sẽ thay giỏ ở Quán Cô Lan/)).toBeInTheDocument();
    const order = screen.getByRole('button', { name: /Thêm vào giỏ ·/ });
    await waitFor(() => expect(order).toBeEnabled());
    await user.click(order);
    expect(await screen.findByText('Thay giỏ hàng hiện tại?')).toBeInTheDocument();
    expect(api.addCartItem).not.toHaveBeenCalled();
  });

  it('hides the stepper and keeps the button disabled when sold out', async () => {
    api.menuItem.mockResolvedValue(makeMenuItem({ availabilityStatus: 'SOLD_OUT' }));
    renderAt('/customer/explore/items/20', '/customer/explore/items/:itemId', <ItemDetailScreen />);

    expect(await screen.findByRole('button', { name: /thêm vào giỏ/i })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Tăng số lượng' })).not.toBeInTheDocument();
    expect(screen.getByText('HẾT MÓN')).toBeInTheDocument();
  });
});

describe('Vendor profile (C05 rebuild)', () => {
  it('shows the gaps in words and both ways to have a say', async () => {
    const user = userEvent.setup();
    renderAt(
      '/customer/explore/vendors/8',
      '/customer/explore/vendors/:vendorId',
      <VendorProfileScreen />,
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Xôi gà Bà Năm' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Chưa có điểm')).toBeInTheDocument();
    expect(screen.getByText('Chưa cập nhật')).toBeInTheDocument();
    expect(screen.getByText('Cửa hàng cố định')).toBeInTheDocument();
    expect(screen.queryByText('Đánh giá từ giao dịch xác thực')).not.toBeInTheDocument();
    expect(screen.getByText('ngày còn hiệu lực')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Báo cáo vi phạm' }));
    expect(screen.getByTestId('where')).toHaveTextContent(
      '/customer/explore/vendors/8/reports/new',
    );
  });

  it('drops the day count for a permit that is not valid', async () => {
    community.profile.mockResolvedValue({ ...PROFILE, permitStatus: 'SUSPENDED' });
    renderAt(
      '/customer/explore/vendors/8',
      '/customer/explore/vendors/:vendorId',
      <VendorProfileScreen />,
    );

    expect(await screen.findByText('Giấy phép tạm ngưng')).toBeInTheDocument();
    expect(screen.queryByText('ngày còn hiệu lực')).not.toBeInTheDocument();
  });
});

describe('Review form (C06 rebuild)', () => {
  it('sends the chosen stars with trimmed words, only once signed in', async () => {
    const user = userEvent.setup();
    community.comment.mockResolvedValue({});
    renderAt(
      '/customer/explore/vendors/8/comments/new',
      '/customer/explore/vendors/:vendorId/comments/new',
      <CommentFormScreen />,
    );

    const send = await screen.findByRole('button', { name: 'Gửi đánh giá' });
    await user.click(screen.getByRole('button', { name: 'Món ngon' }));
    expect(send).toBeDisabled();

    useCommunitySession.setState({
      token: 't',
      customer: { id: 1, fullName: 'An', roleCode: 'CUSTOMER' },
    });
    const stars = screen.getByRole('radiogroup', { name: 'Số sao' });
    within(stars).getByRole('radio', { name: '5 sao' }).focus();
    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(within(stars).getByRole('radio', { name: '3 sao' })).toHaveAttribute(
      'aria-checked',
      'true',
    );

    await user.click(await screen.findByRole('button', { name: 'Gửi đánh giá' }));
    await waitFor(() => expect(community.comment).toHaveBeenCalledWith('8', 3, 'Món ngon'));
  });
});

describe('Report form (C07 rebuild)', () => {
  it('uploads the photo first, then reports with the scan it came from', async () => {
    const user = userEvent.setup();
    useCommunitySession.setState({
      token: 't',
      customer: { id: 1, fullName: 'An', roleCode: 'CUSTOMER' },
    });
    community.uploadEvidence.mockResolvedValue({
      fileUrl: '/files/1.jpg',
      contentType: 'image/jpeg',
      sizeBytes: 1,
    });
    community.report.mockResolvedValue({ reportId: 44, status: 'PENDING' });
    URL.createObjectURL = vi.fn(() => 'blob:1');
    renderAt(
      '/customer/explore/vendors/8/reports/new?permitId=12&slotId=null',
      '/customer/explore/vendors/:vendorId/reports/new',
      <VendorReportFormScreen />,
    );

    expect(await screen.findByText('Kính gửi: Phường Nam Dương')).toBeInTheDocument();
    expect(screen.getByText(/Gắn với lần kiểm tra giấy phép #12/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Bán sai vị trí' }));
    await user.upload(
      screen.getByLabelText('Ảnh minh chứng'),
      new File(['x'], 'a.jpg', { type: 'image/jpeg' }),
    );
    expect(screen.getByRole('button', { name: 'Xoá ảnh Ảnh minh chứng' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Gửi phản ánh' }));
    await waitFor(() =>
      expect(community.report).toHaveBeenCalledWith('8', {
        reason: 'Bán sai vị trí',
        evidenceUrl: '/files/1.jpg',
        slotId: undefined,
        scannedPermitId: 12,
      }),
    );
    expect(community.uploadEvidence.mock.invocationCallOrder[0]).toBeLessThan(
      community.report.mock.invocationCallOrder[0]!,
    );
  });
});

describe('Content report (C08 rebuild)', () => {
  it('names an unknown kind "Nội dung" and keeps the reason as typed', async () => {
    const user = userEvent.setup();
    renderAt(
      '/customer/explore/report-content?contentType=OTHER&targetId=7',
      '/customer/explore/report-content',
      <ReportContentScreen />,
    );

    expect(screen.getByText('Nội dung')).toBeInTheDocument();
    const send = screen.getByRole('button', { name: 'Gửi báo cáo' });
    await user.type(screen.getByLabelText('Lý do báo cáo'), '   ');
    expect(send).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Giá không đúng' }));
    await user.click(send);

    expect(useMockDb.getState().reportedContent.at(-1)).toMatchObject({
      content_type: 'OTHER',
      targetId: '7',
      reason: 'Giá không đúng',
      status: 'PENDING',
    });
  });
});

describe('Public permit check (C09 rebuild)', () => {
  it('asks the server on every press, keeps nothing, and links on with the scan', async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined });
    community.verifyPermit.mockResolvedValue({
      isValid: false,
      status: 'VALID',
      permitId: 12,
      vendorId: 8,
      displayName: 'Xôi gà Bà Năm',
      slotId: null,
      slotCode: 'NVL-022',
      latitude: null,
      longitude: null,
      validFrom: '2026-01-01',
      validUntil: '2026-12-31',
    });
    const before = { local: localStorage.length, session: sessionStorage.length };
    renderAt('/customer/scan', '/customer/scan', <PublicScanScreen />);

    const check = screen.getByRole('button', { name: 'Kiểm tra' });
    expect(check).toBeDisabled();
    await user.type(screen.getByLabelText('Nội dung QR giấy phép'), '  SB-1  ');
    await user.click(check);
    expect(await screen.findByRole('heading', { name: 'Không hợp lệ' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Kiểm tra' }));
    await waitFor(() => expect(community.verifyPermit).toHaveBeenCalledTimes(2));
    expect(community.verifyPermit).toHaveBeenNthCalledWith(2, 'SB-1', undefined);
    expect({ local: localStorage.length, session: sessionStorage.length }).toEqual(before);

    await user.click(await screen.findByRole('button', { name: 'Báo cáo bất thường' }));
    expect(screen.getByTestId('where')).toHaveTextContent(
      '/customer/explore/vendors/8/reports/new?permitId=12&slotId=null',
    );
  });
});
