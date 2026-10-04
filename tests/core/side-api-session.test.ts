import { afterEach, describe, expect, it, vi } from 'vitest';

import { sideRequest, SideApiError } from '@/core/api/side-api';
import { setTokens } from '@/core/api/token-storage';
import { useAuthStore } from '@/store/auth-store';

const user = {
  id: '1',
  fullName: 'Nguyen Thi Hoa',
  phone: '0905000002',
  password: '',
  role_code: 'VENDOR' as const,
  account_status: 'ACTIVE' as const,
};

function respond401() {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ title: 'Unauthorized' }), { status: 401 })),
  );
}

describe('sideRequest 401 handling', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    useAuthStore.setState({ user: null, sessionExpired: false });
  });

  it('keeps a mock-mode session when a request without a token gets a 401', async () => {
    useAuthStore.setState({ user, sessionExpired: false });
    respond401();

    await expect(sideRequest('/vendor/slot-holds', {}, '')).rejects.toBeInstanceOf(SideApiError);

    expect(useAuthStore.getState().user).toEqual(user);
    expect(useAuthStore.getState().sessionExpired).toBe(false);
  });

  it('still drops the session when the current token is rejected', async () => {
    setTokens({
      accessToken: 'expired',
      refreshToken: 'r',
      accessTokenExpiresAtUtc: '2026-01-01T00:00:00Z',
    });
    useAuthStore.setState({ user, sessionExpired: false });
    respond401();

    await expect(sideRequest('/vendor/slot-holds')).rejects.toBeInstanceOf(SideApiError);

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().sessionExpired).toBe(true);
  });
});
