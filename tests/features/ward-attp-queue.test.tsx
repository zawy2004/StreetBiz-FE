import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  foodSafetyApi,
  type FoodSafetyApplication,
  type FoodSafetyStatus,
} from '@/core/api/food-safety-api';
import { WardFoodSafetyListScreen } from '@/features/food-safety/screens/WardFoodSafetyListScreen';

const file = (
  id: number,
  status: FoodSafetyStatus,
  over: Partial<FoodSafetyApplication> = {},
): FoodSafetyApplication => ({
  applicationId: id,
  storefrontId: id,
  storefrontName: id === 1 ? 'Bánh mì & Xôi Cô Lan' : 'Bún chả Hải Châu',
  vendorName: id === 1 ? 'Phạm Thị Lan' : 'Hoàng Văn Tâm',
  status,
  vendorNote: null,
  reviewReason: null,
  reviewedAt: null,
  forwardedAt: status === 'FORWARDED' ? '2026-11-10T03:00:00Z' : null,
  departmentName: status === 'FORWARDED' ? 'Ban Quản lý ATTP Đà Nẵng' : null,
  certificateNumber: status === 'APPROVED' ? 'ATTP-DN-2026-0142' : null,
  issuedOn: status === 'APPROVED' ? '2026-10-11' : null,
  expiresOn: status === 'APPROVED' ? '2029-10-11' : null,
  isExpired: false,
  resultReason: status === 'REJECTED' ? 'Thiếu giấy khám sức khoẻ' : null,
  resultRecordedAt: null,
  submittedAt: '2026-10-01T03:00:00Z',
  dishes: [
    {
      menuItemId: id,
      name: id === 1 ? 'Xôi gà xé' : 'Bún chả',
      categoryName: 'Xôi',
      imageUrl: null,
    },
  ],
  evidence: [],
  actions: status === 'SUBMITTED' ? ['FORWARD', 'REQUEST_INFO', 'REJECT'] : [],
  ...over,
});

const QUEUE = [
  file(1, 'SUBMITTED'),
  file(2, 'FORWARDED'),
  file(3, 'APPROVED'),
  file(4, 'REJECTED'),
];

function mount() {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={['/ward/inbox/food-safety']}>
        <Routes>
          <Route path="/ward/inbox/food-safety" element={<WardFoodSafetyListScreen />} />
          <Route path="/ward/inbox/food-safety/:id" element={<p>chi tiết hồ sơ</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ward ATTP queue', () => {
  it('lists every file with its station counts, and opens one', async () => {
    vi.spyOn(foodSafetyApi, 'wardList').mockResolvedValue(QUEUE);
    mount();

    expect(await screen.findByText('Bánh mì & Xôi Cô Lan')).toBeInTheDocument();
    const tabs = screen.getAllByRole('tablist', { name: 'Lọc hồ sơ ATTP' })[0]!;
    expect(within(tabs).getByRole('tab', { name: 'Tất cả, 4 hồ sơ' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(within(tabs).getByRole('tab', { name: 'Chờ phường xét, 1 hồ sơ' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Hồ sơ #1, Bánh mì & Xôi Cô Lan/ }));
    expect(await screen.findByText('chi tiết hồ sơ')).toBeInTheDocument();
  });

  it('asks the server again for one station when its tab is picked', async () => {
    const list = vi
      .spyOn(foodSafetyApi, 'wardList')
      .mockImplementation(async (status) =>
        status ? QUEUE.filter((f) => f.status === status) : QUEUE,
      );
    mount();
    await screen.findByText('Bánh mì & Xôi Cô Lan');

    fireEvent.click(screen.getAllByRole('tab', { name: /Đã đạt/ })[0]!);

    await waitFor(() => expect(list).toHaveBeenCalledWith('APPROVED'));
    await waitFor(() => expect(screen.queryByText('Bánh mì & Xôi Cô Lan')).not.toBeInTheDocument());
  });

  it('narrows by shop, vendor or dish, and says when nothing matches', async () => {
    vi.spyOn(foodSafetyApi, 'wardList').mockResolvedValue(QUEUE);
    mount();
    await screen.findByText('Bánh mì & Xôi Cô Lan');
    const search = screen.getByRole('searchbox', { name: 'Tìm theo quán, người bán, món' });

    fireEvent.change(search, { target: { value: 'bún chả' } });
    expect(screen.queryByText('Bánh mì & Xôi Cô Lan')).not.toBeInTheDocument();
    expect(screen.getAllByText('Bún chả Hải Châu').length).toBeGreaterThan(0);

    fireEvent.change(search, { target: { value: 'phở bò' } });
    expect(screen.getByText('Không có hồ sơ khớp "phở bò"')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Xoá tìm kiếm' })[0]!);
    expect(screen.getByText('Bánh mì & Xôi Cô Lan')).toBeInTheDocument();
  });

  it('shows an empty queue, and from an empty station offers all files again', async () => {
    vi.spyOn(foodSafetyApi, 'wardList').mockImplementation(async (status) => (status ? [] : []));
    mount();

    expect(await screen.findByText('Không có hồ sơ ATTP')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('tab', { name: /Không đạt/ })[0]!);
    fireEvent.click(await screen.findByRole('button', { name: 'Xem tất cả hồ sơ' }));
    await waitFor(() =>
      expect(screen.getAllByRole('tab', { name: /Tất cả/ })[0]).toHaveAttribute(
        'aria-selected',
        'true',
      ),
    );
  });

  it('shows a server error with a retry', async () => {
    const list = vi
      .spyOn(foodSafetyApi, 'wardList')
      .mockRejectedValueOnce(new Error('Mất kết nối'))
      .mockResolvedValue(QUEUE);
    mount();

    fireEvent.click(await screen.findByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByText('Bánh mì & Xôi Cô Lan')).toBeInTheDocument();
    expect(list).toHaveBeenCalledTimes(2);
  });
});
