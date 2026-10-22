import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios';

import { apiGet, apiPost, http } from '@/core/api/client';
import { clearTokens, setTokens } from '@/core/api/token-storage';
import { parseFineBracket } from '@/features/ward-administration/components/ops/violation/violation-utils';

/**
 * Only the sign-in endpoints themselves go out without a bearer token. A prefix match
 * used to treat `/auth/login-history` as `/auth/login`, so the history call reached the
 * server unauthenticated and came back 401.
 */
describe('which requests carry the bearer token', () => {
  const original = http.defaults.adapter;
  let seen: InternalAxiosRequestConfig | undefined;

  beforeEach(() => {
    setTokens({
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      accessTokenExpiresAtUtc: new Date(Date.now() + 3_600_000).toISOString(),
    });
    const adapter: AxiosAdapter = async (config) => {
      seen = config;
      return { data: {}, status: 200, statusText: '', headers: {}, config };
    };
    http.defaults.adapter = adapter;
  });

  afterEach(() => {
    http.defaults.adapter = original;
    clearTokens();
    seen = undefined;
  });

  const authHeader = () => seen?.headers?.Authorization;

  it('sends the token to signed-in endpoints that merely start like an anonymous one', async () => {
    await apiGet('/auth/login-history', { params: { take: 20 } });
    expect(authHeader()).toBe('Bearer access-1');
    await apiGet('/auth/sessions');
    expect(authHeader()).toBe('Bearer access-1');
  });

  it('never sends it to the sign-in endpoints themselves', async () => {
    for (const path of ['/auth/login', '/auth/login-otp', '/auth/send-otp', '/auth/register', '/auth/forgot-password']) {
      await apiPost(path, {});
      expect(authHeader()).toBeUndefined();
    }
  });

  it('ignores a query string when deciding', async () => {
    await apiPost('/auth/login?source=app', {});
    expect(authHeader()).toBeUndefined();
  });
});

describe('parseFineBracket (mirrors LegalBasisText.TryParseBracket)', () => {
  it('reads the bracket a legal basis ends with', () => {
    expect(
      parseFineBracket('Điểm a khoản 1 Điều 12 Nghị định 100/2019/NĐ-CP (khung 2.000.000 - 3.000.000đ)'),
    ).toEqual({ min: 2_000_000, max: 3_000_000 });
  });

  it('tolerates the spacing the server tolerates', () => {
    expect(parseFineBracket('(khung 500.000-1.000.000 đ)')).toEqual({ min: 500_000, max: 1_000_000 });
  });

  it('is null without a bracket, exactly like the server', () => {
    expect(parseFineBracket('Khoản 2 Điều 12')).toBeNull();
    expect(parseFineBracket('khung 2.000.000 - 3.000.000đ')).toBeNull();
    expect(parseFineBracket(null)).toBeNull();
  });
});
