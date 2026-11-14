import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { sellerStoreApi, type RentalChoice, type SellerStore } from '@/core/api/seller-store-api';
import { StoreScreen } from '@/features/storefronts/screens/StoreScreen';

// STO-01/02 against the live API: which contract can open a stall, creating and editing one.
vi.mock('@/core/config/env', () => ({
  env: { apiBaseUrl: 'https://api.example.test/api', useMockApi: false, appEnv: 'test', enablePhase2: true },
  isDev: true,
  isLiveApi: true,
}));

function Where() {
  const location = useLocation();
  return <div data-testid="where">{location.pathname + location.search}</div>;
}

function mount() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/vendor/store']}>
        <Routes>
          <Route path="/vendor/store" element={<StoreScreen />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const contract = (contractId: number, extra: Partial<RentalChoice> = {}): RentalChoice => ({
  contractId,
  applicationId: contractId,
  slotCode: `S-0${contractId}`,
  startDate: '2026-01-01',
  endDate: '2099-12-31',
  contractStatus: 'ACTIVE',
  ...extra,
});

const store: SellerStore = { storefrontId: 7, registrationId: 1, contractId: 1, name: 'Quán A', description: 'Bánh mì', availabilityStatus: 'OPEN' };

function stub(stores: SellerStore[], contracts: RentalChoice[]) {
  vi.spyOn(sellerStoreApi, 'stores').mockResolvedValue(stores);
  vi.spyOn(sellerStoreApi, 'contracts').mockResolvedValue(contracts);
  vi.spyOn(sellerStoreApi, 'applications').mockResolvedValue(contracts.map((c) => ({ applicationId: c.applicationId, registrationId: c.contractId })));
  vi.spyOn(sellerStoreApi, 'hours').mockResolvedValue({ storefrontId: 7, hours: [], allowedWindow: null, availabilityStatus: 'OPEN', isOpenNow: true });
}

beforeEach(() => {
  Element.prototype.scrollIntoView ??= () => {};
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('LiveStoreScreen', () => {
  it('without a contract in force it explains why and points to renting a slot', async () => {
    stub([], [contract(1, { startDate: '2099-01-01' })]);
    const user = userEvent.setup();
    mount();

    expect(await screen.findByText('Chưa đủ điều kiện mở gian hàng')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Thuê ô vỉa hè' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/vendor/slots');
  });

  it('creates the first stall on the contract the vendor picks', async () => {
    stub([], [contract(1), contract(2)]);
    const save = vi.spyOn(sellerStoreApi, 'saveStore').mockResolvedValue({ ...store, storefrontId: 9 });
    const user = userEvent.setup();
    mount();

    await user.click(await screen.findByRole('button', { name: 'Tạo gian hàng' }));
    const editor = await screen.findByRole('region', { name: /gian hàng/i });
    const saveButton = within(editor).getByRole('button', { name: 'Lưu gian hàng' });
    expect(saveButton).toBeDisabled(); // a name is required
    await user.type(within(editor).getByLabelText('Tên gian hàng'), '  Xôi gà Bà Năm  ');
    await user.click(within(editor).getByRole('radio', { name: /S-02/ }));
    await user.click(saveButton);

    await waitFor(() => expect(save).toHaveBeenCalledWith(null, {
      registrationId: 2, contractId: 2, name: 'Xôi gà Bà Năm', description: null, availabilityStatus: 'OPEN',
    }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Lưu gian hàng' })).not.toBeInTheDocument());
  });

  it('edits an existing stall in place, keeping its contract', async () => {
    stub([store], [contract(1)]);
    const save = vi.spyOn(sellerStoreApi, 'saveStore').mockResolvedValue(store);
    const user = userEvent.setup();
    mount();

    await user.click(await screen.findByRole('button', { name: 'Sửa gian hàng' }));
    const name = screen.getByLabelText('Tên gian hàng');
    expect(name).toHaveValue('Quán A');
    await user.clear(name);
    await user.type(name, 'Quán A mới');
    await user.click(screen.getByRole('radio', { name: 'Tạm dừng' }));
    await user.click(screen.getByRole('button', { name: 'Lưu gian hàng' }));

    await waitFor(() => expect(save).toHaveBeenCalledWith(7, {
      registrationId: 1, contractId: 1, name: 'Quán A mới', description: 'Bánh mì', availabilityStatus: 'PAUSED',
    }));
  });

  it('shows a refused save inside the editor and keeps it open', async () => {
    stub([store], [contract(1)]);
    vi.spyOn(sellerStoreApi, 'saveStore').mockRejectedValue(new Error('Tên gian hàng đã được dùng.'));
    const user = userEvent.setup();
    mount();

    await user.click(await screen.findByRole('button', { name: 'Sửa gian hàng' }));
    await user.click(screen.getByRole('button', { name: 'Lưu gian hàng' }));

    expect(await screen.findByText('Tên gian hàng đã được dùng.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Đóng' }));
    expect(screen.queryByRole('button', { name: 'Lưu gian hàng' })).not.toBeInTheDocument();
  });

  it('a stall links to its menu and ATTP files, and a second contract offers another stall', async () => {
    stub([store], [contract(1), contract(2)]);
    const user = userEvent.setup();
    mount();

    expect(await screen.findByRole('button', { name: 'Tạo gian hàng' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Giấy ATTP' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/vendor/store/food-safety?storefrontId=7');
  });

  it('opens the menu of the chosen stall', async () => {
    stub([store], [contract(1)]);
    const user = userEvent.setup();
    mount();

    await user.click(await screen.findByRole('button', { name: 'Quản lý thực đơn' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/vendor/store/menu?storefrontId=7');
  });

  it('offers a retry when the stalls cannot load', async () => {
    stub([], []);
    vi.spyOn(sellerStoreApi, 'stores').mockRejectedValue(new Error('Mất kết nối máy chủ'));
    mount();

    expect(await screen.findByText(/Mất kết nối máy chủ/)).toBeInTheDocument();
  });

  it('uploads a stall photo and sends its URL with the store', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:stall');
    stub([store], [contract(1)]);
    const upload = vi
      .spyOn(sellerStoreApi, 'uploadMenuImage')
      .mockResolvedValue({ fileUrl: '/api/uploads/menu-images/5/abc.jpg' });
    const save = vi.spyOn(sellerStoreApi, 'saveStore').mockResolvedValue(store);
    const user = userEvent.setup();
    mount();

    await user.click(await screen.findByRole('button', { name: 'Sửa gian hàng' }));
    const photo = new File([new Uint8Array([1, 2, 3])], 'stall.jpg', { type: 'image/jpeg' });
    await user.upload(screen.getByLabelText('Ảnh gian hàng'), photo);
    await waitFor(() => expect(upload).toHaveBeenCalledWith(photo));
    await user.click(screen.getByRole('button', { name: 'Lưu gian hàng' }));

    await waitFor(() =>
      expect(save).toHaveBeenCalledWith(7, expect.objectContaining({ imageUrl: '/api/uploads/menu-images/5/abc.jpg' })),
    );
  });

  it('removes the stall photo with an empty imageUrl', async () => {
    stub([{ ...store, imageUrl: '/api/uploads/menu-images/5/old.jpg' }], [contract(1)]);
    const save = vi.spyOn(sellerStoreApi, 'saveStore').mockResolvedValue(store);
    const user = userEvent.setup();
    mount();

    await user.click(await screen.findByRole('button', { name: 'Sửa gian hàng' }));
    await user.click(screen.getByRole('button', { name: 'Gỡ ảnh' }));
    await user.click(screen.getByRole('button', { name: 'Lưu gian hàng' }));

    await waitFor(() => expect(save).toHaveBeenCalledWith(7, expect.objectContaining({ imageUrl: '' })));
  });

  it('refuses a file that is not a photo without uploading it', async () => {
    stub([store], [contract(1)]);
    const upload = vi.spyOn(sellerStoreApi, 'uploadMenuImage');
    const user = userEvent.setup({ applyAccept: false });
    mount();

    await user.click(await screen.findByRole('button', { name: 'Sửa gian hàng' }));
    await user.upload(
      screen.getByLabelText('Ảnh gian hàng'),
      new File(['%PDF'], 'menu.pdf', { type: 'application/pdf' }),
    );

    expect(await screen.findByText('Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP.')).toBeInTheDocument();
    expect(upload).not.toHaveBeenCalled();
  });
});
