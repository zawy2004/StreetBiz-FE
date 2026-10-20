import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import type { ServiceArea, StorefrontDetail } from '@/core/api/commerce-api';
import { NO_DISCOVERY_FILTERS } from '@/features/buyer-discovery/discovery-filters';
import { makeMenuItem, makeStorefront } from './discovery-fixtures';

const api = vi.hoisted(() => ({
  storefronts: vi.fn(),
  storefront: vi.fn(),
  serviceAreas: vi.fn(),
  marketplaceCategories: vi.fn(),
  menuItems: vi.fn(),
}));

vi.mock('@/core/api/commerce-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/api/commerce-api')>();
  return { ...actual, commerceApi: { ...actual.commerceApi, ...api } };
});

vi.mock('@/core/config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/config/env')>();
  return { ...actual, isLiveApi: true };
});

// The Leaflet map is the vendor tab's business, not what these screens are about.
vi.mock('@/features/vendor-map/components/ActiveVendorMap', () => ({ ActiveVendorMap: () => null }));

const { ExploreScreen } = await import('@/features/vendor-map/screens/ExploreScreen');
const { SearchScreen } = await import('@/features/buyer-discovery/screens/SearchScreen');
const { StorefrontDetailScreen } = await import('@/features/buyer-discovery/screens/StorefrontDetailScreen');
const { useDiscoveryStore } = await import('@/features/buyer-discovery/discovery-store');

const HERE = { latitude: 16.0605, longitude: 108.2145 };
const AREAS: ServiceArea[] = [
  { wardId: 1003, wardName: 'Phường Nam Dương', districtName: 'Quận Hải Châu', storefrontCount: 1, distanceMeters: 48 },
  { wardId: 3, wardName: 'Phường Hòa Quý', districtName: 'Quận Ngũ Hành Sơn', storefrontCount: 1, distanceMeters: 6042 },
];
const CATEGORIES = [
  { categoryId: 1, categoryName: 'Bún - Phở - Mì', itemCount: 2 },
  { categoryId: 3, categoryName: 'Bánh mì', itemCount: 2 },
];

function stubGeolocation(kind: 'ok' | 'denied') {
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition: (
        ok: (p: { coords: typeof HERE }) => void,
        fail: (e: { code: number }) => void,
      ) => (kind === 'ok' ? ok({ coords: HERE }) : fail({ code: 1 })),
    },
  });
}

function renderAt(path: string, routePath: string, element: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={routePath} element={element} />
          <Route path="/customer/explore/stores/:storefrontId" element={<div>store page</div>} />
          <Route path="/customer/explore/items/:itemId" element={<div>item page</div>} />
          <Route path="/customer/explore/search" element={<div>search page</div>} />
          <Route path="/customer/explore/vendors/:vendorId" element={<div>vendor page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const lastStorefrontQuery = () => api.storefronts.mock.calls.at(-1)?.[0];

beforeEach(() => {
  vi.resetAllMocks();
  sessionStorage.clear();
  useDiscoveryStore.setState({ position: null, locateStatus: 'IDLE', filters: NO_DISCOVERY_FILTERS });
  api.serviceAreas.mockResolvedValue(AREAS);
  api.marketplaceCategories.mockResolvedValue(CATEGORIES);
  api.storefronts.mockResolvedValue([
    makeStorefront(),
    makeStorefront({ storefrontId: 2, storefrontName: 'Bánh mì & Xôi Cô Lan', wardName: 'Phường Hòa Quý', isOpenNow: false, todayHours: [] }),
  ]);
  api.menuItems.mockResolvedValue([makeMenuItem()]);
  stubGeolocation('ok');
});

describe('Explore: storefronts (DISC-03)', () => {
  it('lists the open storefronts with their state, ward and rating', async () => {
    renderAt('/customer/explore', '/customer/explore', <ExploreScreen />);

    const first = (await screen.findByText('Bún chả Hải Châu')).closest('button')!;
    expect(within(first).getByText('ĐANG MỞ')).toBeInTheDocument();
    expect(within(first).getByText(/Phường Nam Dương/)).toBeInTheDocument();
    expect(within(first).getByText('Ô NVL-14')).toBeInTheDocument();
    expect(within(first).getByText(/4\.5 ★ \(3\)/)).toBeInTheDocument();
    expect(within(first).getByText(/10:00–21:00/)).toBeInTheDocument();
    const closed = screen.getByText('Bánh mì & Xôi Cô Lan').closest('button')!;
    expect(within(closed).getByText('ĐÓNG CỬA')).toBeInTheDocument();
    expect(within(closed).getByText(/Nghỉ hôm nay/)).toBeInTheDocument();
    expect(lastStorefrontQuery()).toMatchObject({ sort: 'name', position: undefined });
  });

  it('opens a storefront and the search screen', async () => {
    const user = userEvent.setup();
    renderAt('/customer/explore', '/customer/explore', <ExploreScreen />);

    await user.click(await screen.findByText('Bún chả Hải Châu'));
    expect(await screen.findByText('store page')).toBeInTheDocument();
  });

  it('has a way into the search screen', async () => {
    const user = userEvent.setup();
    renderAt('/customer/explore', '/customer/explore', <ExploreScreen />);

    await user.click(await screen.findByRole('button', { name: 'Tìm kiếm' }));
    expect(await screen.findByText('search page')).toBeInTheDocument();
  });

  it('says so, and offers to clear the filters, when nothing matches', async () => {
    const user = userEvent.setup();
    api.storefronts.mockResolvedValue([]);
    renderAt('/customer/explore', '/customer/explore', <ExploreScreen />);

    await user.click(await screen.findByRole('button', { name: 'Đang mở' }));

    expect(await screen.findByText('Không có quán phù hợp')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Xoá lọc' }).at(-1)!);
    await waitFor(() => expect(useDiscoveryStore.getState().filters.openNow).toBe(false));
  });
});

describe('Explore: location (DISC-01)', () => {
  it('detects the position, then asks for storefronts nearest first and shows the distance', async () => {
    const user = userEvent.setup();
    api.storefronts.mockResolvedValue([makeStorefront({ distanceMeters: 48.5 })]);
    renderAt('/customer/explore', '/customer/explore', <ExploreScreen />);

    await user.click(await screen.findByRole('button', { name: /Tìm quanh tôi/ }));

    await waitFor(() => expect(lastStorefrontQuery()).toMatchObject({ position: HERE, sort: 'distance' }));
    expect(await screen.findByText(/· 49 m/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cập nhật vị trí' })).toBeInTheDocument();
  });

  it('explains a refused permission and keeps listing without a position', async () => {
    const user = userEvent.setup();
    stubGeolocation('denied');
    renderAt('/customer/explore', '/customer/explore', <ExploreScreen />);

    await user.click(await screen.findByRole('button', { name: /Tìm quanh tôi/ }));

    expect(await screen.findByText(/Chưa được cấp quyền định vị/)).toBeInTheDocument();
    expect(lastStorefrontQuery()).toMatchObject({ position: undefined });
  });

  it('offers distance filters only once the position is known, and drops them with it', async () => {
    const user = userEvent.setup();
    renderAt('/customer/explore', '/customer/explore', <ExploreScreen />);
    await screen.findByText('Bún chả Hải Châu');
    expect(screen.queryByRole('button', { name: '≤ 2 km' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Tìm quanh tôi/ }));
    await user.click(await screen.findByRole('button', { name: '≤ 2 km' }));
    await waitFor(() => expect(lastStorefrontQuery()).toMatchObject({ radiusMeters: 2000 }));

    await user.click(screen.getByRole('button', { name: 'Xoá vị trí' }));
    await waitFor(() => expect(lastStorefrontQuery()).toMatchObject({ position: undefined, radiusMeters: undefined }));
    expect(screen.queryByRole('button', { name: '≤ 2 km' })).not.toBeInTheDocument();
  });
});

describe('Explore: service area (DISC-02)', () => {
  it('lists the wards that have storefronts and filters by the chosen one', async () => {
    const user = userEvent.setup();
    renderAt('/customer/explore', '/customer/explore', <ExploreScreen />);

    const select = await screen.findByRole('combobox', { name: 'Khu vực' });
    expect(within(select).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Tất cả khu vực',
      'Phường Nam Dương (1)',
      'Phường Hòa Quý (1)',
    ]);

    await user.selectOptions(select, '3');
    await waitFor(() => expect(lastStorefrontQuery()).toMatchObject({ wardId: 3 }));

    await user.selectOptions(select, '');
    await waitFor(() => expect(lastStorefrontQuery()).toMatchObject({ wardId: undefined }));
  });

  it('suggests the nearest ward once the customer is located, and applies it on request', async () => {
    const user = userEvent.setup();
    renderAt('/customer/explore', '/customer/explore', <ExploreScreen />);
    await screen.findByText('Bún chả Hải Châu');

    await user.click(screen.getByRole('button', { name: /Tìm quanh tôi/ }));
    await user.click(await screen.findByRole('button', { name: /Gần bạn nhất: Phường Nam Dương · 48 m/ }));

    await waitFor(() => expect(lastStorefrontQuery()).toMatchObject({ wardId: 1003 }));
    expect(screen.queryByRole('button', { name: /Gần bạn nhất/ })).not.toBeInTheDocument();
  });

  it('forgets a remembered area that no longer has storefronts', async () => {
    useDiscoveryStore.setState({ filters: { ...NO_DISCOVERY_FILTERS, wardId: 999 } });
    renderAt('/customer/explore', '/customer/explore', <ExploreScreen />);

    await waitFor(() => expect(useDiscoveryStore.getState().filters.wardId).toBeNull());
  });
});

describe('Explore: filters (DISC-05)', () => {
  it('narrows by category and by opening hours', async () => {
    const user = userEvent.setup();
    renderAt('/customer/explore', '/customer/explore', <ExploreScreen />);

    await user.click(await screen.findByRole('tab', { name: 'Bánh mì' }));
    await waitFor(() => expect(lastStorefrontQuery()).toMatchObject({ categoryId: 3 }));

    await user.click(screen.getByRole('button', { name: 'Đang mở' }));
    await waitFor(() => expect(lastStorefrontQuery()).toMatchObject({ categoryId: 3, openNow: true }));

    await user.click(screen.getByRole('tab', { name: 'Tất cả' }));
    await waitFor(() => expect(lastStorefrontQuery()).toMatchObject({ categoryId: undefined, openNow: true }));
  });

  it('re-sorts the list', async () => {
    const user = userEvent.setup();
    renderAt('/customer/explore', '/customer/explore', <ExploreScreen />);

    await user.click(await screen.findByRole('tab', { name: 'Đánh giá' }));

    await waitFor(() => expect(lastStorefrontQuery()).toMatchObject({ sort: 'rating' }));
  });
});

describe('Search (DISC-04)', () => {
  it('searches storefronts and dishes together and lists both', async () => {
    const user = userEvent.setup();
    renderAt('/customer/explore/search', '/customer/explore/search', <SearchScreen />);
    expect(api.storefronts).not.toHaveBeenCalled();

    await user.type(screen.getByPlaceholderText(/Tìm món ăn hoặc quán/), 'bun');

    expect(await screen.findByText('Quán (2)')).toBeInTheDocument();
    expect(screen.getByText('Món (1)')).toBeInTheDocument();
    expect(lastStorefrontQuery()).toMatchObject({ query: 'bun' });
    expect(api.menuItems.mock.calls.at(-1)?.[0]).toMatchObject({ query: 'bun', sort: 'name' });
    // typing "bun" letter by letter must not have fired a request per keystroke
    expect(api.storefronts.mock.calls.filter(([q]) => q.query === 'b')).toHaveLength(0);
  });

  it('opens a dish and a storefront from the results', async () => {
    const user = userEvent.setup();
    renderAt('/customer/explore/search', '/customer/explore/search', <SearchScreen />);
    await user.type(screen.getByPlaceholderText(/Tìm món ăn hoặc quán/), 'bun');

    await user.click(await screen.findByText('Bún chả'));
    expect(await screen.findByText('item page')).toBeInTheDocument();
  });

  it('says when nothing was found', async () => {
    const user = userEvent.setup();
    api.storefronts.mockResolvedValue([]);
    api.menuItems.mockResolvedValue([]);
    renderAt('/customer/explore/search', '/customer/explore/search', <SearchScreen />);

    await user.type(screen.getByPlaceholderText(/Tìm món ăn hoặc quán/), 'zzz');

    expect(await screen.findByText('Không tìm thấy kết quả')).toBeInTheDocument();
  });
});

describe('Search filters (DISC-05)', () => {
  it('lists results with no words once a filter is on, capping the price of dishes', async () => {
    const user = userEvent.setup();
    renderAt('/customer/explore/search', '/customer/explore/search', <SearchScreen />);
    expect(api.menuItems).not.toHaveBeenCalled();

    await user.click(await screen.findByRole('button', { name: '≤ 50k' }));

    await waitFor(() => expect(api.menuItems.mock.calls.at(-1)?.[0]).toMatchObject({ maxPrice: 50_000 }));
    expect(await screen.findByText('Món (1)')).toBeInTheDocument();
  });

  it('orders dishes by price and storefronts by rating', async () => {
    const user = userEvent.setup();
    renderAt('/customer/explore/search', '/customer/explore/search', <SearchScreen />);
    await user.click(await screen.findByRole('button', { name: 'Đang mở' }));

    await user.click(screen.getByRole('tab', { name: 'Giá thấp' }));
    await waitFor(() => expect(api.menuItems.mock.calls.at(-1)?.[0]).toMatchObject({ sort: 'price_asc' }));

    await user.click(screen.getByRole('tab', { name: 'Đánh giá' }));
    await waitFor(() => expect(lastStorefrontQuery()).toMatchObject({ sort: 'rating' }));
  });

  it('offers "nearest" only with a position, and always shows which order is in effect', async () => {
    const user = userEvent.setup();
    renderAt('/customer/explore/search', '/customer/explore/search', <SearchScreen />);
    expect(screen.queryByRole('tab', { name: 'Gần nhất' })).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Tên' })).toHaveAttribute('aria-selected', 'true');

    await user.click(screen.getByRole('button', { name: /Tìm quanh tôi/ }));

    expect(await screen.findByRole('tab', { name: 'Gần nhất' })).toHaveAttribute('aria-selected', 'true');
  });
});

describe('Storefront detail (DISC-06)', () => {
  const detail: StorefrontDetail = {
    storefront: makeStorefront({ distanceMeters: 850, address: '10 Nguyễn Văn Linh' }),
    weeklyHours: [
      { dayOfWeek: 1, opensAt: '10:00', closesAt: '21:00' },
      { dayOfWeek: 6, opensAt: '10:00', closesAt: '21:00' },
    ],
    menu: [
      {
        categoryId: 1,
        categoryName: 'Bún - Phở - Mì',
        items: [makeMenuItem(), makeMenuItem({ menuItemId: 21, itemName: 'Bún đậu mắm tôm', unitPrice: 40_000 })],
      },
      {
        categoryId: 2,
        categoryName: 'Cơm',
        items: [makeMenuItem({ menuItemId: 22, itemName: 'Cơm gà xối mỡ', availabilityStatus: 'SOLD_OUT' })],
      },
    ],
  };

  beforeEach(() => {
    api.storefront.mockResolvedValue(detail);
  });

  it('shows where the storefront is, whether it is open and how far away', async () => {
    renderAt('/customer/explore/stores/1', '/customer/explore/stores/:storefrontId', <StorefrontDetailScreen />);

    expect(await screen.findByRole('heading', { name: 'Bún chả Hải Châu' })).toBeInTheDocument();
    expect(screen.getByText('ĐANG MỞ')).toBeInTheDocument();
    expect(screen.getByText(/10 Nguyễn Văn Linh · Đường Nguyễn Văn Linh · Ô NVL-14 · Phường Nam Dương · 850 m/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Chỉ đường' })).toHaveAttribute(
      'href',
      'https://www.google.com/maps/dir/?api=1&destination=16.060169,108.214204',
    );
  });

  it('lists the whole week, resting on days with no window', async () => {
    renderAt('/customer/explore/stores/1', '/customer/explore/stores/:storefrontId', <StorefrontDetailScreen />);

    const monday = (await screen.findByText('Thứ 2')).closest('li')!;
    expect(within(monday).getByText('10:00–21:00')).toBeInTheDocument();
    expect(within(screen.getByText('Chủ nhật').closest('li')!).getByText('Nghỉ')).toBeInTheDocument();
  });

  it('says so when no hours were published', async () => {
    api.storefront.mockResolvedValue({ ...detail, weeklyHours: [] });
    renderAt('/customer/explore/stores/1', '/customer/explore/stores/:storefrontId', <StorefrontDetailScreen />);

    expect(await screen.findByText('Quán chưa đăng giờ mở cửa.')).toBeInTheDocument();
  });

  it('groups the menu by category and marks what is sold out', async () => {
    renderAt('/customer/explore/stores/1', '/customer/explore/stores/:storefrontId', <StorefrontDetailScreen />);

    expect(await screen.findByText('Bún - Phở - Mì', { selector: 'h3' })).toBeInTheDocument();
    expect(screen.getByText('Bún đậu mắm tôm')).toBeInTheDocument();
    expect(screen.getByText('Cơm', { selector: 'h3' })).toBeInTheDocument();
    const soldOut = screen.getByText('Cơm gà xối mỡ').closest('button')!;
    expect(within(soldOut).getByText('HẾT MÓN')).toBeInTheDocument();
  });

  it('opens a dish and the vendor behind the storefront', async () => {
    const user = userEvent.setup();
    renderAt('/customer/explore/stores/1', '/customer/explore/stores/:storefrontId', <StorefrontDetailScreen />);

    await user.click(await screen.findByText('Bún đậu mắm tôm'));
    expect(await screen.findByText('item page')).toBeInTheDocument();
  });

  it('asks the API for the distance from the known position', async () => {
    useDiscoveryStore.setState({ position: HERE, locateStatus: 'OK' });
    renderAt('/customer/explore/stores/1', '/customer/explore/stores/:storefrontId', <StorefrontDetailScreen />);

    await screen.findByRole('heading', { name: 'Bún chả Hải Châu' });
    expect(api.storefront).toHaveBeenCalledWith('1', HERE);
  });

  it('shows an error state with a retry when the storefront is gone', async () => {
    api.storefront.mockRejectedValue(new Error('The storefront was not found.'));
    renderAt('/customer/explore/stores/9', '/customer/explore/stores/:storefrontId', <StorefrontDetailScreen />);

    expect(await screen.findByText('The storefront was not found.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
  });
});
