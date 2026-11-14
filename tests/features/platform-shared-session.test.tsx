import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearTokens, setTokens } from '@/core/api/token-storage';
import { useAuthStore } from '@/store/auth-store';

vi.mock('@/core/config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/config/env')>();
  return {
    ...actual,
    isLiveApi: true,
    env: { ...actual.env, apiBaseUrl: 'http://api.test/api' },
  };
});

const refresh = vi.hoisted(() => vi.fn());
vi.mock('@/core/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/api/client')>();
  return { ...actual, refreshAccessToken: refresh };
});

const { platformApi, PlatformApiError, usePlatformSession } = await import(
  '@/features/platform-administration/platform-api'
);
const { PlatformConnection } = await import(
  '@/features/platform-administration/components/PlatformConnection'
);

const tokens = (accessToken: string) => ({
  accessToken,
  refreshToken: 'refresh-1',
  accessTokenExpiresAtUtc: '2099-01-01T00:00:00Z',
});

const signIn = (role: 'PLATFORM_ADMIN' | 'CUSTOMER') =>
  useAuthStore.setState({
    user: {
      id: '9',
      fullName: 'Đỗ Quốc Anh',
      phone: '0900000001',
      password: '',
      role_code: role,
      account_status: 'ACTIVE',
    },
  });

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const authHeader = (call: unknown[]) =>
  ((call[1] as RequestInit).headers as Record<string, string>).Authorization;

beforeEach(() => {
  usePlatformSession.setState({ token: '', admin: null, generation: 0 });
  refresh.mockReset();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  clearTokens();
  useAuthStore.setState({ user: null, sessionExpired: false });
});

describe('platform admin uses the app sign-in (one login)', () => {
  it('sends the app session token on admin calls', async () => {
    setTokens(tokens('app-access'));
    signIn('PLATFORM_ADMIN');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json([]));

    await platformApi.categories();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(authHeader(fetchMock.mock.calls[0]!)).toBe('Bearer app-access');
  });

  it('rotates the app session once on a 401 and asks again with the new token', async () => {
    setTokens(tokens('old'));
    signIn('PLATFORM_ADMIN');
    refresh.mockResolvedValue(tokens('new'));
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json({ title: 'expired' }, 401))
      .mockResolvedValueOnce(json([{ categoryId: 1 }]));

    const result = await platformApi.categories();

    expect(result).toEqual([{ categoryId: 1 }]);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(authHeader(fetchMock.mock.calls[1]!)).toBe('Bearer new');
  });

  it('does not loop when the new token is refused too', async () => {
    setTokens(tokens('old'));
    signIn('PLATFORM_ADMIN');
    refresh.mockResolvedValue(tokens('new'));
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ title: 'no' }, 401));

    await expect(platformApi.categories()).rejects.toMatchObject({ status: 401 });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('reports an expired session when the refresh itself fails', async () => {
    setTokens(tokens('old'));
    signIn('PLATFORM_ADMIN');
    refresh.mockRejectedValue(new Error('refresh rejected'));
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ title: 'expired' }, 401));

    const failure = await platformApi.categories().catch((e: unknown) => e);

    expect(failure).toBeInstanceOf(PlatformApiError);
    expect((failure as InstanceType<typeof PlatformApiError>).status).toBe(401);
  });

  it('shows the screen straight away, with no connect form and no disconnect button', async () => {
    setTokens(tokens('app-access'));
    signIn('PLATFORM_ADMIN');
    const me = vi.spyOn(platformApi, 'me').mockResolvedValue({ userId: 9, name: 'Đỗ Quốc Anh' });
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter>
          <PlatformConnection>
            <p>Nội dung quản trị</p>
          </PlatformConnection>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Nội dung quản trị')).toBeInTheDocument();
    expect(me).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Kết nối Backend' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ngắt kết nối' })).not.toBeInTheDocument();
    expect(screen.getByText(/Đỗ Quốc Anh · Platform Admin/)).toBeInTheDocument();
  });

  it('still asks for the separate connection when the app user is not a platform admin', async () => {
    setTokens(tokens('app-access'));
    signIn('CUSTOMER');
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter>
          <PlatformConnection>
            <p>Nội dung quản trị</p>
          </PlatformConnection>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByRole('button', { name: 'Kết nối Backend' })).toBeInTheDocument();
    expect(screen.queryByText('Nội dung quản trị')).not.toBeInTheDocument();
    await waitFor(() => expect(refresh).not.toHaveBeenCalled());
  });
});
