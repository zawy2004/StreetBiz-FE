import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mode = vi.hoisted(() => ({ live: false }));
vi.mock('@/core/config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/config/env')>();
  return {
    ...actual,
    get isLiveApi() {
      return mode.live;
    },
  };
});

const { ApiError, authApi } = await import('@/core/api');
const { ChangePasswordScreen } =
  await import('@/features/account-management/screens/ChangePasswordScreen');
const { useAuthStore } = await import('@/store/auth-store');

const OLD = 'Old!Passw0rd';
const NEW = 'New!Passw0rd';

function mount() {
  return render(
    <MemoryRouter initialEntries={['/start', '/account/password']} initialIndex={1}>
      <Routes>
        <Route path="/start" element={<p>trang trước</p>} />
        <Route path="/account/password" element={<ChangePasswordScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

async function fill(current: string, next: string, confirm: string) {
  const user = userEvent.setup();
  if (current) await user.type(screen.getByLabelText('Mật khẩu hiện tại'), current);
  if (next) await user.type(screen.getByLabelText('Mật khẩu mới'), next);
  if (confirm) await user.type(screen.getByLabelText('Nhập lại mật khẩu mới'), confirm);
  await user.click(screen.getByRole('button', { name: /lưu thay đổi/i }));
}

beforeEach(() => {
  mode.live = false;
  useAuthStore.setState({
    user: {
      id: '1',
      fullName: 'A',
      phone: '0905000001',
      password: OLD,
      role_code: 'VENDOR',
      account_status: 'ACTIVE',
    },
    sessionExpired: false,
  });
});
afterEach(() => vi.restoreAllMocks());

describe('changing the password', () => {
  it('shows nothing without a signed-in user', () => {
    useAuthStore.setState({ user: null, sessionExpired: false });
    const { container } = mount();
    expect(container).toBeEmptyDOMElement();
  });

  it('asks for the current password first', async () => {
    mount();
    await fill('', NEW, NEW);
    expect(await screen.findByText('Vui lòng nhập mật khẩu hiện tại.')).toBeInTheDocument();
  });

  it('names the first rule a weak new password breaks', async () => {
    mount();
    await fill(OLD, 'short', 'short');
    expect(await screen.findByText(/Mật khẩu chưa đạt: tối thiểu 8 ký tự/)).toBeInTheDocument();
  });

  it('says when the two new passwords differ', async () => {
    mount();
    await fill(OLD, NEW, `${NEW}x`);
    expect(await screen.findByText('Mật khẩu nhập lại không khớp.')).toBeInTheDocument();
  });

  it('in the demo, refuses a wrong current password and accepts the right one', async () => {
    mount();
    await fill('Wrong!Pass1', NEW, NEW);
    expect(await screen.findByText('Mật khẩu hiện tại không đúng.')).toBeInTheDocument();
  });

  it('in the demo, saves the new password and goes back', async () => {
    mount();
    await fill(OLD, NEW, NEW);
    expect(await screen.findByText('trang trước')).toBeInTheDocument();
    expect(useAuthStore.getState().user?.password).toBe(NEW);
  });

  it('live: sends the change to the server and goes back', async () => {
    mode.live = true;
    const change = vi.spyOn(authApi, 'changePassword').mockResolvedValue(undefined as never);
    mount();
    await fill(OLD, NEW, NEW);
    expect(change).toHaveBeenCalledWith(OLD, NEW);
    expect(await screen.findByText('trang trước')).toBeInTheDocument();
  });

  it('live: puts the server’s field messages under the right fields', async () => {
    mode.live = true;
    vi.spyOn(authApi, 'changePassword').mockRejectedValue(
      new ApiError('validation_error', 400, 'Sai', { CurrentPassword: ['Mật khẩu hiện tại sai.'] }),
    );
    mount();
    await fill(OLD, NEW, NEW);
    expect(await screen.findByText('Mật khẩu hiện tại sai.')).toBeInTheDocument();
  });

  it('live: shows a validation message with no field, and any other failure', async () => {
    mode.live = true;
    const change = vi
      .spyOn(authApi, 'changePassword')
      .mockRejectedValueOnce(new ApiError('validation_error', 400, 'Không hợp lệ chung'))
      .mockRejectedValueOnce(new ApiError('server_error', 500, 'Hệ thống đang bận.'));
    mount();
    await fill(OLD, NEW, NEW);
    expect(await screen.findByText('Không hợp lệ chung')).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: /lưu thay đổi/i }));
    expect(change).toHaveBeenCalledTimes(2);
    expect(await screen.findByText(/Hệ thống đang bận/)).toBeInTheDocument();
  });
});
