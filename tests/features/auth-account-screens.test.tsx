import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { SessionsScreen } from '@/features/account-management/screens/SessionsScreen';
import { usePendingAuthStore } from '@/features/authentication/pending-auth-store';
import { OtpSignInScreen } from '@/features/authentication/screens/OtpSignInScreen';
import { ResetPasswordScreen } from '@/features/authentication/screens/ResetPasswordScreen';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';

function renderAt(path: string, element: React.ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={path} element={element} />
          <Route path="/vendor/home" element={<div>vendor home</div>} />
          <Route path="/auth/sign-in" element={<div>sign-in page</div>} />
          <Route path="/auth/password/reset-request" element={<div>reset request page</div>} />
          <Route path="*" element={<div>elsewhere</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function typeCode(user: ReturnType<typeof userEvent.setup>, code: string) {
  for (const [index, digit] of [...code].entries()) {
    await user.type(screen.getByLabelText(`Số thứ ${index + 1}`), digit);
  }
}

beforeEach(() => {
  useAuthStore.setState({ user: null, sessionExpired: false });
  usePendingAuthStore.getState().clear();
});

describe('OtpSignInScreen (AUTH-03, passwordless)', () => {
  it('refuses a malformed phone before sending anything', async () => {
    const user = userEvent.setup();
    renderAt('/auth/otp', <OtpSignInScreen />);

    await user.type(screen.getByPlaceholderText('912 345 678'), '12');
    await user.click(screen.getByRole('button', { name: 'Gửi mã OTP' }));

    expect(await screen.findByText(/10 số, bắt đầu bằng 0/)).toBeInTheDocument();
    expect(screen.getByText('Đăng nhập bằng mã OTP')).toBeInTheDocument();
  });

  it('moves to the code step and signs in with the right code', async () => {
    const user = userEvent.setup();
    renderAt('/auth/otp', <OtpSignInScreen />);

    await user.type(screen.getByPlaceholderText('912 345 678'), '0905000002');
    await user.click(screen.getByRole('button', { name: 'Gửi mã OTP' }));

    expect(await screen.findByText('Nhập mã xác thực')).toBeInTheDocument();
    expect(screen.getByText('0905 000 002')).toBeInTheDocument();
    expect(screen.getByText(/Giả lập: dùng mã 123456/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Đăng nhập' })).toBeDisabled();

    await typeCode(user, '123456');
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    expect(await screen.findByText('vendor home')).toBeInTheDocument();
    expect(useAuthStore.getState().user?.phone).toBe('0905000002');
  });

  it('rejects a wrong code and stays signed out', async () => {
    const user = userEvent.setup();
    renderAt('/auth/otp', <OtpSignInScreen />);
    await user.type(screen.getByPlaceholderText('912 345 678'), '0905000002');
    await user.click(screen.getByRole('button', { name: 'Gửi mã OTP' }));
    await screen.findByText('Nhập mã xác thực');

    await typeCode(user, '111111');
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    expect(await screen.findByText(/Mã không đúng/)).toBeInTheDocument();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('a phone without an account is told so only after the code step (no enumeration up front)', async () => {
    const user = userEvent.setup();
    renderAt('/auth/otp', <OtpSignInScreen />);

    await user.type(screen.getByPlaceholderText('912 345 678'), '0999888777');
    await user.click(screen.getByRole('button', { name: 'Gửi mã OTP' }));
    await screen.findByText('Nhập mã xác thực');
    await typeCode(user, '123456');
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    expect(await screen.findByText(/Không tìm thấy tài khoản/)).toBeInTheDocument();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('"Đổi số điện thoại" goes back to the phone step', async () => {
    const user = userEvent.setup();
    renderAt('/auth/otp', <OtpSignInScreen />);
    await user.type(screen.getByPlaceholderText('912 345 678'), '0905000002');
    await user.click(screen.getByRole('button', { name: 'Gửi mã OTP' }));
    await screen.findByText('Nhập mã xác thực');

    await user.click(screen.getByRole('button', { name: 'Đổi số điện thoại' }));

    expect(screen.getByText('Đăng nhập bằng mã OTP')).toBeInTheDocument();
  });
});

describe('ResetPasswordScreen (AUTH-06)', () => {
  it('sends the user back to the request step when there is no pending reset', async () => {
    renderAt('/auth/password/reset', <ResetPasswordScreen />);

    expect(await screen.findByText('reset request page')).toBeInTheDocument();
  });

  function startReset() {
    usePendingAuthStore.getState().startReset('0905000003');
    usePendingAuthStore.getState().setResetOtp('123456');
  }

  it('checks the policy and the confirmation before changing anything', async () => {
    startReset();
    const user = userEvent.setup();
    renderAt('/auth/password/reset', <ResetPasswordScreen />);

    await user.type(screen.getByLabelText('Mật khẩu mới'), 'yeu');
    await user.click(screen.getByRole('button', { name: 'Xác nhận' }));
    expect(await screen.findByText(/^Mật khẩu chưa đạt:/)).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Mật khẩu mới'));
    await user.type(screen.getByLabelText('Mật khẩu mới'), 'N3w!Passw0rd');
    await user.type(screen.getByLabelText('Nhập lại mật khẩu'), 'N3w!Passw0rX');
    await user.click(screen.getByRole('button', { name: 'Xác nhận' }));
    expect(await screen.findByText('Mật khẩu nhập lại không khớp.')).toBeInTheDocument();
  });

  it('sets the new password and sends the user to sign in with it', async () => {
    startReset();
    const user = userEvent.setup();
    renderAt('/auth/password/reset', <ResetPasswordScreen />);

    expect(screen.getByText('Cho tài khoản 0905 000 003')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Mật khẩu mới'), 'N3w!Passw0rd');
    await user.type(screen.getByLabelText('Nhập lại mật khẩu'), 'N3w!Passw0rd');
    await user.click(screen.getByRole('button', { name: 'Xác nhận' }));

    expect(await screen.findByText('sign-in page')).toBeInTheDocument();
    expect(usePendingAuthStore.getState().reset).toBeNull();
    await useAuthStore.getState().signIn('0905000003', 'N3w!Passw0rd');
    expect(useAuthStore.getState().user?.phone).toBe('0905000003');
    useMockDb.getState().updateUserPassword(useAuthStore.getState().user!.id, '123456');
  });
});

describe('SessionsScreen (AUTH-08 / AUTH-09)', () => {
  beforeEach(() => {
    const vendor = useMockDb.getState().users.find((u) => u.id === 'USR-VEN-1')!;
    useAuthStore.setState({ user: vendor });
    useMockDb.setState({
      sessions: [
        { id: 'SES-001', userId: 'USR-VEN-1', device: 'Chrome trên Windows', location: 'Đà Nẵng', last_active: '2026-11-01T07:00:00.000Z', current: true },
        { id: 'SES-002', userId: 'USR-VEN-1', device: 'Safari trên iPhone', location: 'Hà Nội', last_active: '2026-10-30T07:00:00.000Z', current: false },
        { id: 'SES-003', userId: 'USR-VEN-1', device: 'Chrome trên Android', location: 'Huế', last_active: '2026-10-29T07:00:00.000Z', current: false },
        { id: 'SES-900', userId: 'USR-CUS', device: 'Not mine', location: 'X', last_active: '2026-10-29T07:00:00.000Z', current: false },
      ],
    });
  });

  it('counts only my devices and draws this device apart', async () => {
    renderAt('/account/sessions', <SessionsScreen />);

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('thiết bị đang đăng nhập')).toBeInTheDocument();
    expect(within(screen.getByLabelText('Thiết bị này')).getByText('Chrome trên Windows')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Thiết bị khác' })).toBeInTheDocument();
    expect(screen.queryByText('Not mine')).not.toBeInTheDocument();
  });

  it('signs out one other device', async () => {
    const user = userEvent.setup();
    renderAt('/account/sessions', <SessionsScreen />);

    await user.click(screen.getByRole('button', { name: 'Đăng xuất Safari trên iPhone' }));

    await waitFor(() => expect(useMockDb.getState().sessions.some((s) => s.id === 'SES-002')).toBe(false));
    expect(useMockDb.getState().sessions.some((s) => s.id === 'SES-001')).toBe(true);
  });

  it('signs out every other device after confirmation and keeps this one', async () => {
    const user = userEvent.setup();
    renderAt('/account/sessions', <SessionsScreen />);

    await user.click(screen.getByRole('button', { name: 'Đăng xuất tất cả' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Đăng xuất tất cả' }));

    await waitFor(() =>
      expect(useMockDb.getState().sessions.filter((s) => s.userId === 'USR-VEN-1').map((s) => s.id)).toEqual(['SES-001']),
    );
  });

  it('shows an empty state when nobody is signed in anywhere', () => {
    useMockDb.setState({ sessions: [] });
    renderAt('/account/sessions', <SessionsScreen />);

    expect(screen.getByText('Không có phiên đăng nhập nào')).toBeInTheDocument();
  });
});
