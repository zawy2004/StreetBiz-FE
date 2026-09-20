import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { RegisterScreen } from '@/features/authentication/screens/RegisterScreen';
import { SignInScreen } from '@/features/authentication/screens/SignInScreen';
import { ResetPasswordRequestScreen } from '@/features/authentication/screens/ResetPasswordRequestScreen';
import { useAuthStore } from '@/store/auth-store';

function renderAt(path: string, element: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={path} element={element} />
          <Route path="*" element={<div>elsewhere</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  useAuthStore.setState({ user: null, sessionExpired: false });
});

describe('SignInScreen', () => {
  it('renders the sign-in form', () => {
    renderAt('/auth/sign-in', <SignInScreen />);
    expect(screen.getByText('Đăng nhập StreetBiz')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /đăng nhập/i })).toBeInTheDocument();
  });

  it('rejects a malformed phone number before calling the API', async () => {
    const user = userEvent.setup();
    renderAt('/auth/sign-in', <SignInScreen />);

    await user.type(screen.getByPlaceholderText('912 345 678'), '123');
    await user.click(screen.getByRole('button', { name: /đăng nhập/i }));

    expect(await screen.findByText(/10 số/)).toBeInTheDocument();
  });

  it('explains an expired session when the refresh token was rejected', () => {
    useAuthStore.setState({ user: null, sessionExpired: true });
    renderAt('/auth/sign-in', <SignInScreen />);
    expect(screen.getByRole('status')).toHaveTextContent(/hết hạn/i);
  });
});

describe('RegisterScreen', () => {
  it('shows the BR-59 password checklist once the user starts typing', async () => {
    const user = userEvent.setup();
    renderAt('/auth/register', <RegisterScreen />);

    expect(screen.queryByText(/Có ký tự đặc biệt/)).not.toBeInTheDocument();
    await user.type(screen.getByPlaceholderText('Tối thiểu 8 ký tự'), 'abc');
    expect(await screen.findByText(/Có ký tự đặc biệt/)).toBeInTheDocument();
  });

  it('blocks submission and flags every empty required field', async () => {
    const user = userEvent.setup();
    renderAt('/auth/register', <RegisterScreen />);

    await user.click(screen.getByRole('button', { name: /nhận otp/i }));

    expect(await screen.findByText('Vui lòng nhập họ tên.')).toBeInTheDocument();
    expect(screen.getByText('Vui lòng nhập số điện thoại.')).toBeInTheDocument();
    // Still on the form: no navigation to the verify screen happened.
    expect(screen.getByText('Tạo tài khoản StreetBiz')).toBeInTheDocument();
  });

  it('rejects a mismatched confirmation of an otherwise valid password', async () => {
    const user = userEvent.setup();
    renderAt('/auth/register', <RegisterScreen />);

    await user.type(screen.getByLabelText('Họ và tên'), 'Tran Thi B');
    await user.type(screen.getByLabelText('Số điện thoại'), '905123456');
    await user.type(screen.getByLabelText('Mật khẩu'), 'Str0ng!Pass');
    await user.type(screen.getByLabelText('Nhập lại mật khẩu'), 'Str0ng!Other');
    await user.click(screen.getByRole('button', { name: /nhận otp/i }));

    expect(await screen.findByText('Mật khẩu nhập lại không khớp.')).toBeInTheDocument();
  });
});

describe('ResetPasswordRequestScreen', () => {
  it('never reveals whether the phone is registered', () => {
    renderAt('/auth/password/reset-request', <ResetPasswordRequestScreen />);
    expect(screen.getByText(/nếu số điện thoại đã đăng ký/i)).toBeInTheDocument();
    expect(screen.queryByText(/không tìm thấy tài khoản/i)).not.toBeInTheDocument();
  });
});

describe('sign-up data handling', () => {
  it('keeps the password out of the URL when moving to the verify step', async () => {
    const { usePendingAuthStore } = await import('@/features/authentication/pending-auth-store');
    const user = userEvent.setup();
    const queryClient = new QueryClient();
    let lastLocation = '';

    const { useLocation } = await import('react-router-dom');
    function LocationSpy() {
      const location = useLocation();
      lastLocation = `${location.pathname}${location.search}`;
      return <div>verify step</div>;
    }

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/auth/register']}>
          <Routes>
            <Route path="/auth/register" element={<RegisterScreen />} />
            <Route path="/auth/verify-phone" element={<LocationSpy />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await user.type(screen.getByLabelText('Họ và tên'), 'Tran Thi B');
    await user.type(screen.getByLabelText('Số điện thoại'), '905123456');
    await user.type(screen.getByLabelText('Mật khẩu'), 'Str0ng!Pass');
    await user.type(screen.getByLabelText('Nhập lại mật khẩu'), 'Str0ng!Pass');
    await user.click(screen.getByRole('button', { name: /nhận otp/i }));

    expect(await screen.findByText('verify step')).toBeInTheDocument();
    expect(lastLocation).not.toContain('Str0ng');
    expect(lastLocation).not.toContain('password');
    expect(usePendingAuthStore.getState().registration?.password).toBe('Str0ng!Pass');
  });

  it('sends the user back to sign-up when the verify step is opened without pending data', async () => {
    const { VerifyPhoneScreen } = await import('@/features/authentication/screens/VerifyPhoneScreen');
    const { usePendingAuthStore } = await import('@/features/authentication/pending-auth-store');
    usePendingAuthStore.getState().clear();

    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/auth/verify-phone?purpose=REGISTRATION']}>
          <Routes>
            <Route path="/auth/verify-phone" element={<VerifyPhoneScreen />} />
            <Route path="/auth/register" element={<div>register start</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('register start')).toBeInTheDocument();
  });

  it('sends a newly registered user to sign in rather than straight into the app', async () => {
    const { VerifyPhoneScreen } = await import('@/features/authentication/screens/VerifyPhoneScreen');
    const { usePendingAuthStore } = await import('@/features/authentication/pending-auth-store');
    const { useAuthStore } = await import('@/store/auth-store');
    const { SignInScreen } = await import('@/features/authentication/screens/SignInScreen');

    usePendingAuthStore.getState().startRegistration({
      phoneNumber: '0912345678',
      fullName: 'Người Dùng Mới',
      password: 'Str0ng!Pass',
      roleCode: 'VENDOR',
      wardUnitId: 10,
    });

    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/auth/verify-phone?purpose=REGISTRATION']}>
          <Routes>
            <Route path="/auth/verify-phone" element={<VerifyPhoneScreen />} />
            <Route path="/auth/sign-in" element={<SignInScreen />} />
            <Route path="/vendor/home" element={<div>vendor home</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // Mock mode accepts the fixed demo code.
    const boxes = screen.getAllByRole('textbox');
    for (const [index, character] of [...'123456'].entries()) {
      fireEvent.change(boxes[index]!, { target: { value: character } });
    }
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận & Tạo tài khoản' }));

    // Lands on sign-in, with the reason explained and the number carried over.
    expect(
      await screen.findByText('Tạo tài khoản thành công. Vui lòng đăng nhập bằng mật khẩu bạn vừa đặt.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('vendor home')).not.toBeInTheDocument();
    // No session was started, and the plaintext password did not survive the hop.
    expect(useAuthStore.getState().user).toBeNull();
    expect(usePendingAuthStore.getState().registration).toBeNull();
  });
});
