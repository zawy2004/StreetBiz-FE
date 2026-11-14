import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

import { vendorRegistrationApi } from '@/core/api';
import { foodSafetyApi, type FoodSafetyApplication } from '@/core/api/food-safety-api';
import { sellerStoreApi, type SellerMenuItem } from '@/core/api/seller-store-api';
import { FoodSafetyApplyScreen } from '@/features/food-safety/screens/FoodSafetyApplyScreen';
import { FoodSafetyListScreen } from '@/features/food-safety/screens/FoodSafetyListScreen';

// ATTP files from the vendor's side: the list grouped by who acts next, and the apply/resubmit form.
vi.mock('@/core/config/env', () => ({
  env: { apiBaseUrl: 'https://api.example.test/api', useMockApi: false, appEnv: 'test' },
  isDev: true,
  isLiveApi: true,
}));

function Where() {
  const location = useLocation();
  return <div data-testid="where">{location.pathname + location.search}</div>;
}

function mount(path: string, route: string, element: ReactNode) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={route} element={element} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const app = (applicationId: number, extra: Partial<FoodSafetyApplication> = {}): FoodSafetyApplication => ({
  applicationId,
  storefrontId: 1,
  storefrontName: 'Quán A',
  vendorName: 'Chị Lan',
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
  submittedAt: '2026-11-01T02:00:00Z',
  dishes: [{ menuItemId: 1, name: `Phở ${applicationId}`, categoryName: 'Món nước', imageUrl: null }],
  evidence: [],
  actions: [],
  ...extra,
});

const dish = (menuItemId: number, extra: Partial<SellerMenuItem> = {}): SellerMenuItem => ({
  menuItemId,
  storefrontId: 1,
  categoryId: 1,
  name: `Món ${menuItemId}`,
  description: null,
  unitPrice: 30000,
  availabilityStatus: 'AVAILABLE',
  imageUrl: null,
  categoryName: 'Món nước',
  requiresFoodSafety: true,
  foodSafetyStatus: 'MISSING',
  foodSafetyExpiresOn: null,
  nameEn: null,
  priceUnit: 'tô',
  ...extra,
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('FoodSafetyListScreen', () => {
  it('shows the empty state and links the apply button to the new form for that stall', async () => {
    vi.spyOn(foodSafetyApi, 'mine').mockResolvedValue([]);
    const user = userEvent.setup();
    mount('/vendor/store/food-safety?storefrontId=1', '/vendor/store/food-safety', <FoodSafetyListScreen />);

    expect(await screen.findByText('Chưa có hồ sơ ATTP')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Nộp hồ sơ ATTP' }));

    expect(screen.getByTestId('where')).toHaveTextContent('/vendor/store/food-safety/new?storefrontId=1');
  });

  it('groups files by who acts next and tallies them', async () => {
    vi.spyOn(foodSafetyApi, 'mine').mockResolvedValue([
      app(1, { status: 'MORE_INFORMATION_REQUIRED', actions: ['RESUBMIT', 'WITHDRAW'], reviewReason: 'Thiếu giấy khám sức khỏe' }),
      app(2, { status: 'FORWARDED', departmentName: 'Sở Y tế', forwardedAt: '2026-11-02T02:00:00Z' }),
      app(3, { status: 'APPROVED', certificateNumber: 'ATTP-1', issuedOn: '2026-11-03', expiresOn: '2029-11-03' }),
      app(4, { status: 'APPROVED', isExpired: true, expiresOn: '2026-10-01' }),
      app(5, { status: 'REJECTED' }),
    ]);
    mount('/vendor/store/food-safety', '/vendor/store/food-safety', <FoodSafetyListScreen />);

    const todo = await screen.findByRole('region', { name: /Cần bạn bổ sung/ });
    expect(within(todo).getByText(/Thiếu giấy khám sức khỏe/)).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Đang xét' })).getByText(/Sở Y tế/)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Giấy còn hiệu lực' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Đã kết thúc' })).toBeInTheDocument();

    const tally = within(screen.getByRole('list', { name: 'Tình trạng hồ sơ' })).getAllByRole('listitem');
    expect(tally.map((li) => li.textContent)).toEqual(['1giấy còn hiệu lực', '1đang xét', '1cần bổ sung']);
  });

  it('hides finished files past three behind "Xem thêm"', async () => {
    vi.spyOn(foodSafetyApi, 'mine').mockResolvedValue([1, 2, 3, 4, 5].map((id) => app(id, { status: 'WITHDRAWN' })));
    const user = userEvent.setup();
    mount('/vendor/store/food-safety', '/vendor/store/food-safety', <FoodSafetyListScreen />);

    await user.click(await screen.findByRole('button', { name: /Xem thêm 2 hồ sơ/ }));

    expect(screen.queryByRole('button', { name: /Xem thêm/ })).not.toBeInTheDocument();
    expect(screen.getByText('Phở 5')).toBeInTheDocument();
  });

  it('sends "Bổ sung hồ sơ" to the edit form', async () => {
    vi.spyOn(foodSafetyApi, 'mine').mockResolvedValue([app(7, { status: 'MORE_INFORMATION_REQUIRED', actions: ['RESUBMIT'] })]);
    const user = userEvent.setup();
    mount('/vendor/store/food-safety', '/vendor/store/food-safety', <FoodSafetyListScreen />);

    await user.click(await screen.findByRole('button', { name: 'Bổ sung hồ sơ' }));

    expect(screen.getByTestId('where')).toHaveTextContent('/vendor/store/food-safety/7/edit');
  });

  it('withdraws a file only after confirmation', async () => {
    const mine = vi.spyOn(foodSafetyApi, 'mine').mockResolvedValue([app(8, { actions: ['WITHDRAW'] })]);
    const withdraw = vi.spyOn(foodSafetyApi, 'withdraw').mockResolvedValue(app(8, { status: 'WITHDRAWN' }));
    const user = userEvent.setup();
    mount('/vendor/store/food-safety', '/vendor/store/food-safety', <FoodSafetyListScreen />);

    await user.click(await screen.findByRole('button', { name: 'Rút hồ sơ' }));
    const dialog = await screen.findByRole('dialog');
    expect(withdraw).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole('button', { name: 'Rút hồ sơ' }));

    await waitFor(() => expect(withdraw).toHaveBeenCalledWith(8));
    await waitFor(() => expect(mine).toHaveBeenCalledTimes(2));
  });

  it('shows the server message when withdrawing fails', async () => {
    vi.spyOn(foodSafetyApi, 'mine').mockResolvedValue([app(8, { actions: ['WITHDRAW'] })]);
    vi.spyOn(foodSafetyApi, 'withdraw').mockRejectedValue(new Error('Hồ sơ đã được chuyển Sở, không rút được.'));
    const user = userEvent.setup();
    mount('/vendor/store/food-safety', '/vendor/store/food-safety', <FoodSafetyListScreen />);

    await user.click(await screen.findByRole('button', { name: 'Rút hồ sơ' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Rút hồ sơ' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('không rút được');
  });

  it('offers a retry when the list cannot load', async () => {
    vi.spyOn(foodSafetyApi, 'mine').mockRejectedValue(new Error('Mất kết nối'));
    mount('/vendor/store/food-safety', '/vendor/store/food-safety', <FoodSafetyListScreen />);

    expect(await screen.findByText(/Mất kết nối/)).toBeInTheDocument();
  });
});

describe('FoodSafetyApplyScreen', () => {
  function stubStore(items: SellerMenuItem[], stores = 1) {
    vi.spyOn(sellerStoreApi, 'stores').mockResolvedValue(
      Array.from({ length: stores }, (_, i) => ({
        storefrontId: i + 1, registrationId: i + 1, contractId: i + 1, name: `Quán ${i + 1}`, description: null, availabilityStatus: 'OPEN' as const,
      })),
    );
    vi.spyOn(sellerStoreApi, 'menu').mockResolvedValue({ items, maxItems: 5 });
  }

  it('asks for a stall first when the vendor has none', async () => {
    vi.spyOn(sellerStoreApi, 'stores').mockResolvedValue([]);
    mount('/vendor/store/food-safety/new', '/vendor/store/food-safety/new', <FoodSafetyApplyScreen />);

    expect(await screen.findByText('Cần tạo gian hàng trước')).toBeInTheDocument();
  });

  it('needs a dish and a file before sending, then submits and returns to the list', async () => {
    stubStore([dish(1), dish(2, { foodSafetyStatus: 'APPROVED', foodSafetyExpiresOn: '2029-01-01' }), dish(3, { foodSafetyStatus: 'NOT_REQUIRED', requiresFoodSafety: false })]);
    vi.spyOn(vendorRegistrationApi, 'uploadEvidenceFile').mockResolvedValue({ fileUrl: '/api/uploads/evidence/1/a.pdf' } as never);
    const submit = vi.spyOn(foodSafetyApi, 'submit').mockResolvedValue(app(9));
    const user = userEvent.setup();
    mount('/vendor/store/food-safety/new', '/vendor/store/food-safety/new', <FoodSafetyApplyScreen />);

    const send = await screen.findByRole('button', { name: /Gửi hồ sơ cho phường/ });
    expect(send).toBeDisabled();
    expect(await screen.findByText('Cần giấy để được bán')).toBeInTheDocument();
    // A dish that already holds a certificate cannot be put in a second file.
    expect(screen.getByRole('checkbox', { name: /Món 2/ })).toBeDisabled();

    await user.click(screen.getByRole('checkbox', { name: /Món 1/ }));
    expect(send).toBeDisabled();
    await user.upload(screen.getByLabelText('Thêm giấy tờ'), new File(['%PDF'], 'cam-ket.pdf', { type: 'application/pdf' }));
    await waitFor(() => expect(send).toBeEnabled());
    await user.type(screen.getByPlaceholderText('VD: nguồn nguyên liệu, nơi chế biến…'), '  Nguyên liệu chợ Hàn  ');
    await user.click(send);

    await waitFor(() => expect(submit).toHaveBeenCalledWith({
      storefrontId: 1,
      menuItemIds: [1],
      note: 'Nguyên liệu chợ Hàn',
      evidence: [{ evidenceType: 'CERTIFICATE', fileUrl: '/api/uploads/evidence/1/a.pdf' }],
    }));
    expect(await screen.findByTestId('where')).toHaveTextContent('/vendor/store/food-safety?storefrontId=1');
  });

  it('refuses a file over 5 MB without uploading it', async () => {
    stubStore([dish(1)]);
    const upload = vi.spyOn(vendorRegistrationApi, 'uploadEvidenceFile');
    const user = userEvent.setup();
    mount('/vendor/store/food-safety/new', '/vendor/store/food-safety/new', <FoodSafetyApplyScreen />);

    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'to.jpg', { type: 'image/jpeg' });
    await user.upload(await screen.findByLabelText('Thêm giấy tờ'), big);

    expect(await screen.findByText('File tối đa 5 MB.')).toBeInTheDocument();
    expect(upload).not.toHaveBeenCalled();
  });

  it('shows an upload failure next to the files', async () => {
    stubStore([dish(1)]);
    vi.spyOn(vendorRegistrationApi, 'uploadEvidenceFile').mockRejectedValue(new Error('Định dạng file không được hỗ trợ.'));
    const user = userEvent.setup();
    mount('/vendor/store/food-safety/new', '/vendor/store/food-safety/new', <FoodSafetyApplyScreen />);

    await user.upload(await screen.findByLabelText('Thêm giấy tờ'), new File(['x'], 'a.pdf', { type: 'application/pdf' }));

    expect(await screen.findByText('Định dạng file không được hỗ trợ.')).toBeInTheDocument();
  });

  it('resubmitting starts from the file the ward sent back and keeps its own dishes pickable', async () => {
    stubStore([dish(1, { foodSafetyStatus: 'PENDING' }), dish(2)]);
    vi.spyOn(foodSafetyApi, 'get').mockResolvedValue(app(7, {
      status: 'MORE_INFORMATION_REQUIRED',
      reviewReason: 'Ảnh khu chế biến bị mờ',
      vendorNote: 'Ghi chú cũ',
      dishes: [{ menuItemId: 1, name: 'Món 1', categoryName: 'Món nước', imageUrl: null }],
      evidence: [{ evidenceType: 'PREMISES_PHOTO', fileUrl: '/api/uploads/evidence/1/old.jpg', uploadedAt: '2026-11-01T02:00:00Z' }],
    }));
    const resubmit = vi.spyOn(foodSafetyApi, 'resubmit').mockResolvedValue(app(7));
    const user = userEvent.setup();
    mount('/vendor/store/food-safety/7/edit', '/vendor/store/food-safety/:id/edit', <FoodSafetyApplyScreen />);

    expect(await screen.findByText('Bổ sung hồ sơ #7')).toBeInTheDocument();
    expect(screen.getByText(/Ảnh khu chế biến bị mờ/)).toBeInTheDocument();
    const own = await screen.findByRole('checkbox', { name: /Món 1/ });
    expect(own).toBeChecked();
    expect(own).toBeEnabled();
    expect(screen.getByPlaceholderText('VD: nguồn nguyên liệu, nơi chế biến…')).toHaveValue('Ghi chú cũ');

    await user.click(screen.getByRole('button', { name: /Gửi lại hồ sơ/ }));

    await waitFor(() => expect(resubmit).toHaveBeenCalledWith(7, {
      storefrontId: 1,
      menuItemIds: [1],
      note: 'Ghi chú cũ',
      evidence: [{ evidenceType: 'PREMISES_PHOTO', fileUrl: '/api/uploads/evidence/1/old.jpg' }],
    }));
  });

  it('shows the server refusal and stays on the form', async () => {
    stubStore([dish(1)]);
    vi.spyOn(vendorRegistrationApi, 'uploadEvidenceFile').mockResolvedValue({ fileUrl: '/api/uploads/evidence/1/a.pdf' } as never);
    vi.spyOn(foodSafetyApi, 'submit').mockRejectedValue(new Error('Món đã có hồ sơ đang xét.'));
    const user = userEvent.setup();
    mount('/vendor/store/food-safety/new', '/vendor/store/food-safety/new', <FoodSafetyApplyScreen />);

    await user.click(await screen.findByRole('checkbox', { name: /Món 1/ }));
    await user.upload(screen.getByLabelText('Thêm giấy tờ'), new File(['x'], 'a.pdf', { type: 'application/pdf' }));
    const send = screen.getByRole('button', { name: /Gửi hồ sơ cho phường/ });
    await waitFor(() => expect(send).toBeEnabled());
    await user.click(send);

    expect(await screen.findByRole('alert')).toHaveTextContent('Món đã có hồ sơ đang xét.');
    expect(screen.queryByTestId('where')).not.toBeInTheDocument();
  });
});
