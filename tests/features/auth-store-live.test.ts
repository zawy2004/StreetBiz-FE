import { beforeEach, describe, expect, it, vi } from 'vitest';

// Live mode: the store talks to StreetBiz-BE through authApi and keeps the issued tokens.
vi.mock('@/core/config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/config/env')>();
  return { ...actual, isLiveApi: true, env: { ...actual.env, apiBaseUrl: 'https://api.example.test/api', useMockApi: false } };
});

const authApi = vi.hoisted(() => ({
  login: vi.fn(),
  loginWithOtp: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
}));

vi.mock('@/core/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/api')>();
  return { ...actual, authApi: { ...actual.authApi, ...authApi } };
});

const { useAuthStore } = await import('@/store/auth-store');
const { getTokens, clearTokens } = await import('@/core/api/token-storage');

const result = {
  accessToken: 'access-1',
  refreshToken: 'refresh-1',
  accessTokenExpiresAtUtc: '2099-01-01T00:00:00Z',
  user: { userId: 15, phoneNumber: '0905123456', fullName: null, roleCode: 'VENDOR', wardUnitId: 10, accountStatus: 'ACTIVE' },
};

beforeEach(() => {
  vi.resetAllMocks();
  clearTokens();
  useAuthStore.setState({ user: null, sessionExpired: true });
});

describe('auth store (live API)', () => {
  it('stores the tokens and maps the API user onto the app user', async () => {
    authApi.login.mockResolvedValue(result);

    await useAuthStore.getState().signIn('0905123456', 'Str0ng!Pass');

    expect(authApi.login).toHaveBeenCalledWith('0905123456', 'Str0ng!Pass');
    expect(getTokens()?.accessToken).toBe('access-1');
    expect(useAuthStore.getState().user).toMatchObject({
      id: '15', fullName: '0905123456', phone: '0905123456', role_code: 'VENDOR', wardUnitId: 10, account_status: 'ACTIVE', password: '',
    });
    expect(useAuthStore.getState().sessionExpired).toBe(false);
  });

  it('marks a suspended API account as suspended', async () => {
    authApi.loginWithOtp.mockResolvedValue({ ...result, user: { ...result.user, accountStatus: 'SUSPENDED' } });

    await useAuthStore.getState().signInWithOtp('0905123456', '654321');

    expect(authApi.loginWithOtp).toHaveBeenCalledWith('0905123456', '654321');
    expect(useAuthStore.getState().user?.account_status).toBe('SUSPENDED');
  });

  it('a failed sign-in keeps the user signed out and stores no tokens', async () => {
    authApi.login.mockRejectedValue(new Error('Số điện thoại hoặc mật khẩu không đúng.'));

    await expect(useAuthStore.getState().signIn('0905123456', 'sai')).rejects.toThrow();

    expect(useAuthStore.getState().user).toBeNull();
    expect(getTokens()).toBeNull();
  });

  it('registration keeps the session the API hands back', async () => {
    authApi.register.mockResolvedValue({ ...result, user: { ...result.user, fullName: 'Chị Lan' } });

    const user = await useAuthStore.getState().register({ phoneNumber: '0905123456', password: 'Str0ng!Pass', fullName: 'Chị Lan', roleCode: 'VENDOR', wardUnitId: 10, otp: '123456' });

    expect(user.fullName).toBe('Chị Lan');
    expect(getTokens()?.refreshToken).toBe('refresh-1');
  });

  it('signing out clears the tokens even when the logout call fails', async () => {
    authApi.login.mockResolvedValue(result);
    await useAuthStore.getState().signIn('0905123456', 'Str0ng!Pass');
    authApi.logout.mockRejectedValue(new Error('401'));

    await useAuthStore.getState().signOut();

    expect(authApi.logout).toHaveBeenCalled();
    expect(getTokens()).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });
});
