import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { ApiSecurityEvent, ApiSession } from '@/core/api';
import { useAuthStore } from '@/store/auth-store';

vi.mock('@/core/config/env', () => ({
  env: { apiBaseUrl: 'https://api.example.test/api', useMockApi: false, appEnv: 'test' },
  isDev: true,
  isLiveApi: true,
}));

const api = vi.hoisted(() => ({
  listSessions: vi.fn(),
  revokeSession: vi.fn(),
  revokeOtherSessions: vi.fn(),
  loginHistory: vi.fn(),
}));

vi.mock('@/core/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/api')>();
  return { ...actual, authApi: { ...actual.authApi, ...api } };
});

const { SessionsScreen } = await import('@/features/account-management/screens/SessionsScreen');
const { SecurityHistoryScreen } = await import(
  '@/features/account-management/screens/SecurityHistoryScreen'
);

const session = (id: number, current: boolean, device: string): ApiSession => ({
  sessionId: id,
  deviceInfo: device,
  ipAddress: '10.0.0.' + id,
  createdAt: '2026-10-01T00:00:00Z',
  lastActiveAt: '2026-10-05T00:00:00Z',
  expiresAt: '2026-11-01T00:00:00Z',
  isCurrent: current,
});

function renderAt(path: string, element: React.ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
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
  vi.resetAllMocks();
  useAuthStore.setState({
    user: { id: '1', fullName: 'A', phone: '0905000001', password: '', role_code: 'VENDOR', account_status: 'ACTIVE' },
  });
  api.listSessions.mockResolvedValue([
    session(1, true, 'Mozilla/5.0 (Windows NT 10.0) Chrome/120.0'),
    session(2, false, 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/604.1 Version/17.0'),
    session(3, false, 'Mozilla/5.0 (Linux; Android 14) Chrome/120.0 Mobile'),
  ]);
  api.revokeSession.mockResolvedValue({ message: 'ok' });
  api.revokeOtherSessions.mockResolvedValue({ message: 'ok' });
});

describe('SessionsScreen', () => {
  it('asks before signing one device out, and does nothing if cancelled', async () => {
    const user = userEvent.setup();
    renderAt('/account/sessions', <SessionsScreen />);

    await user.click((await screen.findAllByRole('button', { name: /^Đăng xuất / }))[0]!);
    expect(screen.getByRole('dialog')).toHaveTextContent('Đăng xuất thiết bị này?');
    expect(api.revokeSession).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Huỷ' }));
    expect(api.revokeSession).not.toHaveBeenCalled();
  });

  it('signs the confirmed device out', async () => {
    const user = userEvent.setup();
    renderAt('/account/sessions', <SessionsScreen />);

    await user.click((await screen.findAllByRole('button', { name: /^Đăng xuất .*iPhone/ }))[0]!);
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Đăng xuất' }));

    await waitFor(() => expect(api.revokeSession).toHaveBeenCalledWith(2));
  });

  it('offers to sign out every other device and keeps the current one', async () => {
    const user = userEvent.setup();
    renderAt('/account/sessions', <SessionsScreen />);

    await user.click(await screen.findByRole('button', { name: 'Đăng xuất 2 thiết bị khác' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Đăng xuất tất cả' }));

    await waitFor(() => expect(api.revokeOtherSessions).toHaveBeenCalledTimes(1));
    expect(api.revokeSession).not.toHaveBeenCalled();
  });

  it('hides the sign-out-others button when this is the only session', async () => {
    api.listSessions.mockResolvedValue([session(1, true, 'Chrome')]);
    renderAt('/account/sessions', <SessionsScreen />);

    await screen.findByText(/đang dùng/i);
    expect(screen.queryByRole('button', { name: /thiết bị khác/ })).not.toBeInTheDocument();
  });
});

describe('SecurityHistoryScreen', () => {
  const event = (id: number, action: string, details: string | null = null): ApiSecurityEvent => ({
    id,
    action,
    details,
    createdAt: '2026-10-05T08:00:00Z',
  });

  it('lists sign-ins and flags the worrying ones in plain words', async () => {
    api.loginHistory.mockResolvedValue([
      event(3, 'ACCOUNT_LOCKED'),
      event(2, 'LOGIN_FAILED', 'IP 10.0.0.9 · Firefox'),
      event(1, 'LOGIN_SUCCESS'),
    ]);
    renderAt('/account/security-history', <SecurityHistoryScreen />);

    expect(await screen.findByText('Tài khoản bị khoá tạm thời')).toBeInTheDocument();
    expect(screen.getByText('Đăng nhập sai mật khẩu')).toBeInTheDocument();
    expect(screen.getByText(/IP 10\.0\.0\.9 · Firefox/)).toBeInTheDocument();
    expect(screen.getByText('Đăng nhập')).toBeInTheDocument();
  });

  it('shows an unknown action code rather than hiding it', async () => {
    api.loginHistory.mockResolvedValue([event(1, 'SOMETHING_NEW')]);
    renderAt('/account/security-history', <SecurityHistoryScreen />);

    expect(await screen.findByText('SOMETHING_NEW')).toBeInTheDocument();
  });

  it('pages backwards from the oldest entry shown', async () => {
    const user = userEvent.setup();
    const firstPage = Array.from({ length: 20 }, (_, i) => event(100 - i, 'LOGIN_SUCCESS'));
    api.loginHistory.mockResolvedValueOnce(firstPage).mockResolvedValueOnce([event(80, 'PASSWORD_CHANGED')]);
    renderAt('/account/security-history', <SecurityHistoryScreen />);

    await user.click(await screen.findByRole('button', { name: 'Xem thêm' }));

    await waitFor(() => expect(api.loginHistory).toHaveBeenLastCalledWith(81, 20));
    expect(await screen.findByText('Đổi mật khẩu')).toBeInTheDocument();
  });

  it('says so when nothing has been recorded yet', async () => {
    api.loginHistory.mockResolvedValue([]);
    renderAt('/account/security-history', <SecurityHistoryScreen />);

    expect(await screen.findByText('Chưa có hoạt động nào được ghi lại')).toBeInTheDocument();
  });
});
