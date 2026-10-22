import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useToastStore } from '@/components/feedback';
import { ApiError } from '@/core/api';
import { sellerStoreApi, type StoreHours } from '@/core/api/seller-store-api';
import { BusinessHoursEditor } from '@/features/storefronts/components/store/BusinessHoursEditor';
import {
  copyDay,
  emptyWeek,
  fromWeek,
  toWeek,
  validateWeek,
} from '@/features/storefronts/hours-view';

const window6to22 = { from: '06:00', to: '22:00', overnight: false };

describe('hours-view', () => {
  it('turns server rows into a Monday-first week and back, remembering where each row came from', () => {
    const week = toWeek([
      { dayOfWeek: 3, opensAt: '16:00', closesAt: '20:00' },
      { dayOfWeek: 1, opensAt: '13:00', closesAt: '17:00' },
      { dayOfWeek: 1, opensAt: '06:00', closesAt: '11:00' },
    ]);

    expect(week[0]).toEqual([
      { opensAt: '06:00', closesAt: '11:00' },
      { opensAt: '13:00', closesAt: '17:00' },
    ]);
    expect(week[1]).toEqual([]);
    const { hours, origin } = fromWeek(week);
    expect(hours.map((h) => `${h.dayOfWeek} ${h.opensAt}`)).toEqual(['1 06:00', '1 13:00', '3 16:00']);
    expect(origin[2]).toEqual({ day: 2, index: 0 });
  });

  it('accepts a good week, including windows that only touch', () => {
    const week = emptyWeek();
    week[0] = [
      { opensAt: '08:00', closesAt: '12:00' },
      { opensAt: '12:00', closesAt: '15:00' },
    ];
    expect(validateWeek(week, window6to22)).toEqual({});
  });

  it('marks overlap on the later line, a reversed window, and a window outside the rental hours', () => {
    const week = emptyWeek();
    week[0] = [
      { opensAt: '08:00', closesAt: '12:00' },
      { opensAt: '11:00', closesAt: '14:00' },
    ];
    week[1] = [{ opensAt: '12:00', closesAt: '09:00' }];
    week[2] = [{ opensAt: '05:00', closesAt: '09:00' }];

    const errors = validateWeek(week, window6to22);

    expect(errors['0.0']).toBeUndefined();
    expect(errors['0.1']).toMatch(/Chồng/);
    expect(errors['1.0']).toMatch(/trước giờ đóng/);
    expect(errors['2.0']).toMatch(/06:00–22:00/);
  });

  it('applies the same overnight rule as the server', () => {
    const week = emptyWeek();
    week[4] = [
      { opensAt: '18:30', closesAt: '23:59' },
      { opensAt: '00:00', closesAt: '01:30' },
    ];
    week[5] = [{ opensAt: '10:00', closesAt: '14:00' }];

    const errors = validateWeek(week, { from: '18:00', to: '02:00', overnight: true });

    expect(errors['4.0']).toBeUndefined();
    expect(errors['4.1']).toBeUndefined();
    expect(errors['5.0']).toMatch(/qua đêm/);
  });

  it('copies a day onto the chosen days only, replacing what they had', () => {
    const week = emptyWeek();
    week[0] = [{ opensAt: '08:00', closesAt: '12:00' }];
    week[2] = [{ opensAt: '01:00', closesAt: '02:00' }];

    const copied = copyDay(week, 0, [1, 2, 0]);

    expect(copied[1]).toEqual(week[0]);
    expect(copied[2]).toEqual(week[0]);
    expect(copied[3]).toEqual([]);
    expect(copied[1]).not.toBe(week[0]);
  });
});

const stored = (extra: Partial<StoreHours> = {}): StoreHours => ({
  storefrontId: 7,
  hours: [{ dayOfWeek: 1, opensAt: '08:00', closesAt: '12:00' }],
  allowedWindow: window6to22,
  availabilityStatus: 'OPEN',
  isOpenNow: true,
  ...extra,
});

function mount() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <BusinessHoursEditor storefrontId={7} />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  useToastStore.setState({ message: null });
});

describe('BusinessHoursEditor', () => {
  it('shows the saved week, the rental window and whether the shop is open now', async () => {
    vi.spyOn(sellerStoreApi, 'hours').mockResolvedValue(stored());
    mount();

    expect(await screen.findByLabelText('Thứ Hai, khung 1, giờ mở')).toHaveValue('08:00');
    expect(screen.getByLabelText('Thứ Hai, khung 1, giờ đóng')).toHaveValue('12:00');
    expect(screen.getByText(/Khung giờ cho thuê của khu vực: 06:00–22:00/)).toBeInTheDocument();
    expect(screen.getByText('Đang mở')).toBeInTheDocument();
    expect(screen.queryByLabelText('Thứ Ba, khung 1, giờ mở')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lưu giờ mở cửa' })).toBeDisabled();
  });

  it('adds and removes windows, up to three a day', async () => {
    vi.spyOn(sellerStoreApi, 'hours').mockResolvedValue(stored());
    const user = userEvent.setup();
    mount();
    await screen.findByLabelText('Thứ Hai, khung 1, giờ mở');

    const add = screen.getByRole('button', { name: '+ Thêm khung giờ' });
    await user.click(add);
    await user.click(add);
    expect(screen.getByLabelText('Thứ Hai, khung 3, giờ mở')).toBeInTheDocument();
    expect(add).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Xoá khung 3 của Thứ Hai' }));
    expect(screen.queryByLabelText('Thứ Hai, khung 3, giờ mở')).not.toBeInTheDocument();
    expect(add).toBeEnabled();
  });

  it('blocks overlapping windows on the client and shows the problem on the line', async () => {
    vi.spyOn(sellerStoreApi, 'hours').mockResolvedValue(stored());
    const save = vi.spyOn(sellerStoreApi, 'saveHours');
    const user = userEvent.setup();
    mount();
    await screen.findByLabelText('Thứ Hai, khung 1, giờ mở');

    await user.click(screen.getByRole('button', { name: '+ Thêm khung giờ' }));
    fireEvent.change(screen.getByLabelText('Thứ Hai, khung 2, giờ mở'), { target: { value: '10:00' } });
    fireEvent.change(screen.getByLabelText('Thứ Hai, khung 2, giờ đóng'), { target: { value: '18:00' } });

    expect(screen.getByRole('alert')).toHaveTextContent('Chồng lên');
    expect(screen.getByRole('button', { name: 'Lưu giờ mở cửa' })).toBeDisabled();
    expect(save).not.toHaveBeenCalled();
  });

  it('sends the whole week in the right shape, and a closed day sends nothing', async () => {
    vi.spyOn(sellerStoreApi, 'hours').mockResolvedValue(stored());
    const save = vi.spyOn(sellerStoreApi, 'saveHours').mockResolvedValue(
      stored({ hours: [{ dayOfWeek: 1, opensAt: '08:00', closesAt: '12:00' }, { dayOfWeek: 2, opensAt: '08:00', closesAt: '12:00' }] }),
    );
    const user = userEvent.setup();
    mount();
    await screen.findByLabelText('Thứ Hai, khung 1, giờ mở');

    await user.click(screen.getByRole('checkbox', { name: /Thứ Ba/ }));
    await user.click(screen.getByRole('button', { name: 'Lưu giờ mở cửa' }));

    await waitFor(() =>
      expect(save).toHaveBeenCalledWith(7, [
        { dayOfWeek: 1, opensAt: '08:00', closesAt: '12:00' },
        { dayOfWeek: 2, opensAt: '08:00', closesAt: '12:00' },
      ]),
    );
    await waitFor(() => expect(useToastStore.getState().message).toBe('Đã lưu giờ mở cửa'));
  });

  it('copies a day onto the days picked', async () => {
    vi.spyOn(sellerStoreApi, 'hours').mockResolvedValue(stored());
    const save = vi.spyOn(sellerStoreApi, 'saveHours').mockResolvedValue(stored());
    const user = userEvent.setup();
    mount();
    await screen.findByLabelText('Thứ Hai, khung 1, giờ mở');

    await user.click(screen.getByRole('button', { name: 'Sao chép sang ngày khác' }));
    const group = screen.getByRole('group', { name: /Sao chép giờ của Thứ Hai sang/ });
    await user.click(within(group).getByRole('checkbox', { name: 'Thứ Tư' }));
    await user.click(within(group).getByRole('checkbox', { name: 'Thứ Sáu' }));
    await user.click(within(group).getByRole('button', { name: 'Sao chép' }));
    await user.click(screen.getByRole('button', { name: 'Lưu giờ mở cửa' }));

    await waitFor(() => expect(save).toHaveBeenCalled());
    expect(save.mock.calls[0]![1].map((h) => h.dayOfWeek)).toEqual([1, 3, 5]);
  });

  it('puts a server complaint on the line it is about', async () => {
    vi.spyOn(sellerStoreApi, 'hours').mockResolvedValue(stored({ allowedWindow: null }));
    vi.spyOn(sellerStoreApi, 'saveHours').mockRejectedValue(
      new ApiError('validation_error', 400, 'Thông tin chưa hợp lệ.', {
        'hours[1]': ['Thứ Ba: khung 06:00–09:00 nằm ngoài khung giờ cho thuê của khu vực (17:00–22:00).'],
      }),
    );
    const user = userEvent.setup();
    mount();
    await screen.findByLabelText('Thứ Hai, khung 1, giờ mở');

    await user.click(screen.getByRole('checkbox', { name: /Thứ Ba/ }));
    await user.click(screen.getByRole('button', { name: 'Lưu giờ mở cửa' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('17:00–22:00');
    // It sits under Thứ Ba's line, not as a generic banner.
    expect(alert.closest('li')).toHaveTextContent('Thứ Ba');
  });

  it('says what a shop without hours does, and offers a retry when loading fails', async () => {
    vi.spyOn(sellerStoreApi, 'hours')
      .mockRejectedValueOnce(new ApiError('network_error', 0, 'Không kết nối được máy chủ.'))
      .mockResolvedValue(stored({ hours: [], isOpenNow: false, allowedWindow: null }));
    const user = userEvent.setup();
    mount();

    expect(await screen.findByText('Không kết nối được máy chủ.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByText(/Chưa đặt giờ: gian hàng mở hay đóng theo công tắc/)).toBeInTheDocument();
    expect(screen.getByText('Đã đóng')).toBeInTheDocument();
    expect(screen.getByText(/không giới hạn khung giờ cho thuê/)).toBeInTheDocument();
  });
});
