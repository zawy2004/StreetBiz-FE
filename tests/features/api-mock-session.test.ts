import type { AxiosAdapter } from 'axios';

vi.mock('@/core/config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/config/env')>();
  return {
    ...actual,
    env: { ...actual.env, useMockApi: true, apiBaseUrl: 'http://api.test/api' },
    isLiveApi: false,
  };
});

import { ApiError, apiGet, http, setSessionExpiredHandler } from '@/core/api';
import { getTokens, setTokens } from '@/core/api/token-storage';

/**
 * In mock mode some modules still reach the backend with the demo account's token, which
 * the backend never issued. Its 401 used to trigger a refresh, fail, clear the tokens and
 * sign the demo user out mid-walkthrough. Now it is only that request's error.
 */
describe('a 401 in mock mode', () => {
  const original = http.defaults.adapter;
  const calls: string[] = [];

  beforeEach(() => {
    calls.length = 0;
    setTokens({
      accessToken: 'mock-access',
      refreshToken: 'mock-refresh',
      accessTokenExpiresAtUtc: '2099-01-01T00:00:00Z',
    });
    const adapter: AxiosAdapter = async (config) => {
      calls.push(config.url ?? '');
      return Promise.reject(
        Object.assign(new Error('Unauthorized'), {
          isAxiosError: true,
          config,
          response: { status: 401, data: '', statusText: '', headers: {}, config },
        }),
      );
    };
    http.defaults.adapter = adapter;
  });

  afterEach(() => {
    http.defaults.adapter = original;
  });

  it('keeps the demo session and does not try to refresh the token', async () => {
    const expired = vi.fn();
    setSessionExpiredHandler(expired);

    await expect(apiGet('/vendor/slot-holds?registrationId=1')).rejects.toBeInstanceOf(ApiError);

    expect(calls).toEqual(['/vendor/slot-holds?registrationId=1']); // no /auth/refresh
    expect(expired).not.toHaveBeenCalled();
    expect(getTokens()?.accessToken).toBe('mock-access');
  });
});
