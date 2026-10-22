import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useToastStore } from '@/components/feedback';
import { ApiError, commerceApi } from '@/core/api';
import { useAuthStore } from '@/store/auth-store';

vi.mock('@/core/config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/config/env')>();
  return { ...actual, isLiveApi: true };
});

const { ReportContentScreen } = await import('@/features/vendor-reports/screens');
const { ReportContentLink } = await import(
  '@/features/buyer-discovery/components/ReportContentLink'
);

function Where() {
  const location = useLocation();
  return <p data-testid="where">{location.pathname}</p>;
}

function mount(search: string) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/prev', `/customer/explore/report-content${search}`]}>
        <Routes>
          <Route path="/customer/explore/report-content" element={<ReportContentScreen />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const signIn = () =>
  useAuthStore.setState({
    user: {
      id: '5',
      fullName: 'Lê An',
      phone: '0900000005',
      password: '',
      role_code: 'CUSTOMER',
      account_status: 'ACTIVE',
    },
  });

beforeEach(() => {
  useToastStore.setState({ message: null });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  useAuthStore.setState({ user: null, sessionExpired: false });
});

describe('REV-03 report a storefront or dish', () => {
  it('asks a guest to sign in instead of showing the form', async () => {
    const user = userEvent.setup();
    mount('?contentType=STOREFRONT&targetId=12&name=Bánh xèo');

    expect(screen.getByText('Đăng nhập để báo cáo')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Gửi báo cáo' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/auth/sign-in');
  });

  it('refuses an address that does not name a storefront or a dish', () => {
    signIn();
    mount('?contentType=REVIEW&targetId=12');

    expect(screen.getByText('Không xác định được nội dung cần báo cáo')).toBeInTheDocument();
  });

  it('shows what is being reported, keeps send locked until a reason is chosen, then reports the storefront', async () => {
    signIn();
    const report = vi
      .spyOn(commerceApi, 'reportStorefront')
      .mockResolvedValue({ reportId: 9, status: 'PENDING' });
    const user = userEvent.setup();
    mount('?contentType=STOREFRONT&targetId=12&name=Bánh xèo Cô Tư');

    expect(screen.getByText('Bánh xèo Cô Tư')).toBeInTheDocument();
    const send = screen.getByRole('button', { name: 'Gửi báo cáo' });
    expect(send).toBeDisabled();

    await user.click(screen.getByRole('radio', { name: 'Hàng giả, gian lận' }));
    expect(send).toBeEnabled();
    await user.click(send);

    await waitFor(() => expect(report).toHaveBeenCalledWith(12, { reasonCode: 'COUNTERFEIT', detail: null }));
    await waitFor(() => expect(useToastStore.getState().message).toBe('Đã gửi báo cáo tới quản trị viên'));
    // Back to where the customer came from.
    expect(screen.getByTestId('where')).toHaveTextContent('/prev');
  });

  it('reports a dish with the words the customer added', async () => {
    signIn();
    const report = vi
      .spyOn(commerceApi, 'reportMenuItem')
      .mockResolvedValue({ reportId: 10, status: 'PENDING' });
    const user = userEvent.setup();
    mount('?contentType=MENU_ITEM&targetId=77&name=Bún bò');

    await user.click(screen.getByRole('radio', { name: 'Thông tin hoặc hình ảnh sai sự thật' }));
    await user.type(screen.getByLabelText('Mô tả thêm (không bắt buộc)'), '  Ảnh không đúng món  ');
    await user.click(screen.getByRole('button', { name: 'Gửi báo cáo' }));

    await waitFor(() =>
      expect(report).toHaveBeenCalledWith(77, { reasonCode: 'MISLEADING', detail: 'Ảnh không đúng món' }),
    );
  });

  it('wants a real explanation when the reason is "other"', async () => {
    signIn();
    const report = vi.spyOn(commerceApi, 'reportStorefront');
    const user = userEvent.setup();
    mount('?contentType=STOREFRONT&targetId=12');

    await user.click(screen.getByRole('radio', { name: 'Lý do khác' }));
    const send = screen.getByRole('button', { name: 'Gửi báo cáo' });
    expect(send).toBeDisabled();
    expect(screen.getByText('Hãy mô tả lý do, tối thiểu 10 ký tự.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Mô tả lý do (bắt buộc)'), { target: { value: 'ngắn' } });
    expect(send).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Mô tả lý do (bắt buộc)'), {
      target: { value: 'Bán hàng quá giờ cho phép' },
    });
    expect(send).toBeEnabled();
    expect(report).not.toHaveBeenCalled();
  });

  it.each([
    [409, 'Bạn đã báo cáo nội dung này, báo cáo đang được xem xét.', undefined],
    [404, 'Nội dung này không còn hiển thị nên không thể báo cáo.', undefined],
    [429, 'Bạn đã gửi quá nhiều báo cáo. Hãy thử lại sau khoảng 50 phút.', 3000],
  ])('explains a %i answer in plain words and keeps the form', async (status, message, retry) => {
    signIn();
    vi.spyOn(commerceApi, 'reportStorefront').mockRejectedValue(
      new ApiError(status === 429 ? 'otp_cooldown' : 'conflict', status, 'raw server text', {}, retry),
    );
    const user = userEvent.setup();
    mount('?contentType=STOREFRONT&targetId=12');

    await user.click(screen.getByRole('radio', { name: 'Nội dung phản cảm, xúc phạm' }));
    await user.click(screen.getByRole('button', { name: 'Gửi báo cáo' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(screen.getByRole('button', { name: 'Gửi báo cáo' })).toBeEnabled();
    expect(screen.queryByTestId('where')).not.toBeInTheDocument();
  });

  it('shows the server message for any other failure, e.g. a network error', async () => {
    signIn();
    vi.spyOn(commerceApi, 'reportMenuItem').mockRejectedValue(
      new ApiError('network_error', 0, 'Không kết nối được máy chủ.'),
    );
    const user = userEvent.setup();
    mount('?contentType=MENU_ITEM&targetId=77');

    await user.click(screen.getByRole('radio', { name: 'Hàng giả, gian lận' }));
    await user.click(screen.getByRole('button', { name: 'Gửi báo cáo' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Không kết nối được máy chủ.');
  });
});

describe('ReportContentLink', () => {
  it('points at the report form with the kind, id and name', () => {
    render(
      <MemoryRouter>
        <ReportContentLink contentType="MENU_ITEM" targetId={77} name="Bún bò & chả" label="Báo cáo món này" />
      </MemoryRouter>,
    );

    const href = screen.getByRole('link', { name: 'Báo cáo món này' }).getAttribute('href')!;
    const url = new URL(href, 'http://x');
    expect(url.pathname).toBe('/customer/explore/report-content');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      contentType: 'MENU_ITEM',
      targetId: '77',
      name: 'Bún bò & chả',
    });
  });
});
