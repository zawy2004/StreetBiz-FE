import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import type { ReactNode } from 'react';

import { foodSafetyApi, type FoodSafetyApplication } from '@/core/api/food-safety-api';
import { sellerStoreApi, type SellerMenuItem } from '@/core/api/seller-store-api';
import { WardFoodSafetyReviewScreen } from '@/features/food-safety/screens/WardFoodSafetyReviewScreen';
import { LiveMenuScreen } from '@/features/storefronts/screens/LiveMenuScreen';

vi.mock('@/core/config/env', () => ({
  env: { apiBaseUrl: 'https://api.example.test/api', useMockApi: false, appEnv: 'test' },
  isDev: true,
  isLiveApi: true,
}));

function mount(path: string, route: string, element: ReactNode) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={route} element={element} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const dish = (menuItemId: number, extra: Partial<SellerMenuItem> = {}): SellerMenuItem => ({
  menuItemId,
  storefrontId: 1,
  categoryId: 1,
  name: `Món ${menuItemId}`,
  description: null,
  unitPrice: 30000,
  availabilityStatus: 'AVAILABLE',
  imageUrl: '/api/uploads/menu-images/5/0123456789abcdef0123456789abcdef.jpg',
  categoryName: 'Món nước',
  requiresFoodSafety: true,
  foodSafetyStatus: 'APPROVED',
  foodSafetyExpiresOn: '2029-01-31',
  ...extra,
});

function stubMenu(items: SellerMenuItem[]) {
  vi.spyOn(sellerStoreApi, 'stores').mockResolvedValue([
    { storefrontId: 1, registrationId: 1, contractId: 1, name: 'Quán', description: null, availabilityStatus: 'OPEN' },
  ]);
  vi.spyOn(sellerStoreApi, 'categories').mockResolvedValue([
    { categoryId: 1, name: 'Món nước', requiresFoodSafety: true },
    { categoryId: 4, name: 'Đồ uống', requiresFoodSafety: false },
  ]);
  vi.spyOn(sellerStoreApi, 'menu').mockResolvedValue({ items, maxItems: 5 });
}

describe('vendor menu', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('counts dishes against the limit, shows ATTP state and needs a photo for a new dish', async () => {
    stubMenu([dish(1), dish(2, { foodSafetyStatus: 'MISSING', foodSafetyExpiresOn: null, imageUrl: null })]);
    const save = vi.spyOn(sellerStoreApi, 'saveItem');
    mount('/vendor/store/menu', '/vendor/store/menu', <LiveMenuScreen />);

    expect(await screen.findByText('2/5 món chủ lực')).toBeInTheDocument();
    expect(screen.getByText('ĐẠT ATTP ĐẾN 31/01/2029')).toBeInTheDocument();
    expect(screen.getByText('CẦN GIẤY ATTP')).toBeInTheDocument();
    expect(screen.getByText('CHƯA CÓ ẢNH')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Giấy ATTP (1 món cần)' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Tên món'), { target: { value: 'Phở bò' } });
    fireEvent.change(screen.getByLabelText('Giá (đ)'), { target: { value: '45000' } });
    // Without a photo the dish cannot be added.
    expect(screen.getByRole('button', { name: 'Thêm món' })).toBeDisabled();
    expect(save).not.toHaveBeenCalled();
  });

  it('hides the add form once the stall has five dishes', async () => {
    stubMenu([1, 2, 3, 4, 5].map((id) => dish(id)));
    mount('/vendor/store/menu', '/vendor/store/menu', <LiveMenuScreen />);

    expect(await screen.findByText('Thực đơn đã đủ 5 món')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Thêm món' })).not.toBeInTheDocument();
  });
});

const application = (extra: Partial<FoodSafetyApplication> = {}): FoodSafetyApplication => ({
  applicationId: 3,
  storefrontId: 1,
  storefrontName: 'Bánh mì & Xôi Cô Lan',
  vendorName: 'Cô Lan',
  status: 'SUBMITTED',
  vendorNote: null,
  reviewReason: null,
  reviewedAt: null,
  forwardedAt: null,
  departmentName: null,
  certificateNumber: null,
  issuedOn: null,
  expiresOn: null,
  isExpired: false,
  resultReason: null,
  resultRecordedAt: null,
  submittedAt: '2026-09-28T01:00:00Z',
  dishes: [{ menuItemId: 3, name: 'Xôi gà xé', categoryName: 'Bánh mì - Xôi', imageUrl: null }],
  evidence: [],
  actions: ['FORWARD', 'REQUEST_INFO', 'REJECT'],
  ...extra,
});

describe('ward ATTP review', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('forwards a submitted file to the department only with a reason', async () => {
    vi.spyOn(foodSafetyApi, 'wardGet').mockResolvedValue(application());
    const decide = vi
      .spyOn(foodSafetyApi, 'decide')
      .mockResolvedValue(application({ status: 'FORWARDED', actions: ['RECORD_APPROVED', 'RECORD_REJECTED'] }));
    mount('/ward/inbox/food-safety/3', '/ward/inbox/food-safety/:id', <WardFoodSafetyReviewScreen />);

    const forward = await screen.findByRole('button', { name: 'Chuyển cục kiểm tra' });
    expect(forward).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Ghi chú / lý do *'), { target: { value: 'Hồ sơ đầy đủ' } });
    fireEvent.click(forward);

    await waitFor(() =>
      expect(decide).toHaveBeenCalledWith(3, {
        decision: 'FORWARD',
        reason: 'Hồ sơ đầy đủ',
        expectedStatus: 'SUBMITTED',
        departmentName: 'Chi cục An toàn vệ sinh thực phẩm',
        certificateNumber: null,
        issuedOn: null,
        expiresOn: null,
      }),
    );
    // The file now waits on the department: the result form replaces the review form.
    expect(await screen.findByRole('button', { name: 'Ghi nhận: Đạt ATTP' })).toBeDisabled();
  });
});
