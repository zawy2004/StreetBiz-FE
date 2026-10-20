import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { LandingScreen } from '@/features/landing/screens';
import { RegisterScreen } from '@/features/authentication/screens/RegisterScreen';
import { ResetPasswordRequestScreen } from '@/features/authentication/screens/ResetPasswordRequestScreen';
import { ResetPasswordScreen } from '@/features/authentication/screens/ResetPasswordScreen';
import { SignInScreen } from '@/features/authentication/screens/SignInScreen';
import { VerifyPhoneScreen } from '@/features/authentication/screens/VerifyPhoneScreen';
import { usePendingAuthStore } from '@/features/authentication/pending-auth-store';
import { useAuthStore } from '@/store/auth-store';

function StateProbe() {
  const location = useLocation();
  const state = location.state as { role?: string } | null;
  return <div>{`at ${location.pathname} as ${state?.role ?? 'default'}`}</div>;
}

function renderAt(path: string, element: React.ReactNode, routePath = path.split('?')[0]!) {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={routePath} element={element} />
          <Route path="*" element={<StateProbe />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  useAuthStore.setState({ user: null, sessionExpired: false });
  usePendingAuthStore.getState().clear();
});

describe('LandingScreen doors', () => {
  it('gives each role its own way in, with names that never repeat the hero links', () => {
    renderAt('/', <LandingScreen />);
    expect(screen.getByRole('link', { name: 'Xem quán có phép' })).toHaveAttribute(
      'href',
      '/customer/explore',
    );
    expect(screen.getByRole('link', { name: 'Xem cách phường làm việc' })).toHaveAttribute(
      'href',
      '#cho-phuong',
    );
    expect(screen.getByRole('link', { name: 'Kiểm tra một giấy phép' })).toHaveAttribute(
      'href',
      '/customer/scan',
    );
    expect(screen.getByRole('link', { name: 'Đăng nhập cán bộ' })).toHaveAttribute(
      'href',
      '/auth/sign-in',
    );
    expect(screen.getAllByRole('link', { name: /tìm quán quanh đây/i })).toHaveLength(1);
    expect(screen.getAllByRole('link', { name: /đăng ký bán hàng/i })).toHaveLength(1);
    for (const id of ['vai-tro', 'cach-hoat-dong', 'cho-phuong', 'noi-dung']) {
      expect(document.getElementById(id)).not.toBeNull();
    }
  });

  it('opens sign-up as a vendor from "Mở gian hàng"', async () => {
    const user = userEvent.setup();
    renderAt('/', <LandingScreen />);
    await user.click(screen.getByRole('link', { name: 'Mở gian hàng' }));
    expect(screen.getByText('at /auth/register as VENDOR')).toBeInTheDocument();
  });
});

describe('SignInScreen extras', () => {
  it('shows both banners together and keeps a single status role per banner', () => {
    useAuthStore.setState({ user: null, sessionExpired: true });
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter
          initialEntries={[
            { pathname: '/auth/sign-in', state: { registered: true, phone: '0912345678' } },
          ]}
        >
          <Routes>
            <Route path="/auth/sign-in" element={<SignInScreen />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    const banners = screen.getAllByRole('status');
    expect(banners).toHaveLength(2);
    expect(banners[0]).toHaveTextContent(/Tạo tài khoản thành công/);
    expect(banners[1]).toHaveTextContent(/hết hạn/);
  });

  it('opens the buyer home from the demo block in mock mode', async () => {
    const user = userEvent.setup();
    renderAt('/auth/sign-in', <SignInScreen />);
    await user.click(screen.getByRole('button', { name: /^Người mua/ }));
    expect(await screen.findByText(/at \/customer\/explore/)).toBeInTheDocument();
  });
});

describe('RegisterScreen role cards', () => {
  it('preselects the vendor card and moves the choice with arrow keys', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={[{ pathname: '/auth/register', state: { role: 'VENDOR' } }]}>
          <Routes>
            <Route path="/auth/register" element={<RegisterScreen />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    const vendor = screen.getByRole('radio', { name: /Hộ kinh doanh/ });
    const buyer = screen.getByRole('radio', { name: /Người mua/ });
    expect(vendor).toHaveAttribute('aria-checked', 'true');
    fireEvent.keyDown(vendor, { key: 'ArrowLeft' });
    expect(buyer).toHaveAttribute('aria-checked', 'true');
    expect(vendor).toHaveAttribute('aria-checked', 'false');
  });

  it('reads 6/6 on the strength meter for a valid password', async () => {
    const user = userEvent.setup();
    renderAt('/auth/register', <RegisterScreen />);
    await user.type(screen.getByPlaceholderText('Tối thiểu 8 ký tự'), 'Str0ng!Pass');
    expect(screen.getByText(/Đạt 6\/6 yêu cầu/)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /đạt 6 trên 6 yêu cầu/ })).toBeInTheDocument();
  });
});

describe('VerifyPhoneScreen slots', () => {
  it('has exactly six text boxes and enables confirm only with six digits (reset flow)', () => {
    usePendingAuthStore.getState().startReset('0912345678');
    renderAt('/auth/verify-phone?purpose=PASSWORD_RESET', <VerifyPhoneScreen />);
    const boxes = screen.getAllByRole('textbox');
    expect(boxes).toHaveLength(6);
    const confirm = screen.getByRole('button', { name: 'Xác nhận' });
    expect(confirm).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Gửi lại mã sau 60s' })).toBeDisabled();
    for (const [index, character] of [...'123456'].entries()) {
      fireEvent.change(boxes[index]!, { target: { value: character } });
    }
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);
    expect(screen.getByText('at /auth/password/reset as default')).toBeInTheDocument();
  });
});

describe('Password reset screens', () => {
  it('links back to sign-in from the request step', () => {
    renderAt('/auth/password/reset-request', <ResetPasswordRequestScreen />);
    expect(screen.getByRole('link', { name: /Đăng nhập/ })).toHaveAttribute(
      'href',
      '/auth/sign-in',
    );
  });

  it('opens the account plate once the new password meets every rule', async () => {
    const user = userEvent.setup();
    usePendingAuthStore.getState().startReset('0912345678');
    usePendingAuthStore.getState().setResetOtp('123456');
    renderAt('/auth/password/reset', <ResetPasswordScreen />);
    expect(screen.getByText('Mật khẩu chưa đủ mạnh')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Mật khẩu mới'), 'Str0ng!Pass');
    expect(screen.getByText('Mật khẩu đủ mạnh', { selector: '[aria-live]' })).toBeInTheDocument();
  });
});
