import { vi } from 'vitest';
import axios, { type AxiosAdapter } from 'axios';

import { ApiError, http } from '@/core/api';
import { clearTokens, setTokens } from '@/core/api/token-storage';
import { parsePoint, wardApi } from '@/features/ward-administration/ward-api';

// ward-api reads the base URL through the shared client, and WardGate reads
// isLiveApi; both come from this module.
vi.mock('@/core/config/env', () => ({
  env: { apiBaseUrl: 'https://api.example.test/api', useMockApi: false, appEnv: 'test' },
  isDev: true,
  isLiveApi: true,
}));

/**
 * Stubs axios at the adapter, not at the module boundary, so the request and
 * response interceptors still run -- which is where the interesting behaviour
 * now lives (bearer attachment, refresh-on-401, ProblemDetails mapping).
 */
function stubAdapter(
  responder: (config: Parameters<AxiosAdapter>[0]) => {
    status: number;
    data?: unknown;
  },
) {
  const adapter = vi.fn(async (config: Parameters<AxiosAdapter>[0]) => {
    const { status, data } = responder(config);
    const response = { data, status, statusText: '', headers: {}, config };
    if (status >= 400) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const error: any = new Error(`Request failed with status code ${status}`);
      error.isAxiosError = true;
      error.config = config;
      error.response = response;
      throw error;
    }
    return response;
  });
  http.defaults.adapter = adapter as unknown as AxiosAdapter;
  return adapter;
}

describe('ward API', () => {
  const originalAdapter = http.defaults.adapter;
  const originalDefaultAdapter = axios.defaults.adapter;

  beforeEach(() => {
    clearTokens();
    // refreshTokens() posts through bare axios, not the `http` instance. Without
    // this the refresh path escapes the stub and jsdom attempts a real DNS lookup.
    axios.defaults.adapter = (async () => {
      throw Object.assign(new Error('refresh rejected'), {
        isAxiosError: true,
        response: { status: 401, data: '', headers: {}, statusText: '', config: {} },
      });
    }) as unknown as AxiosAdapter;
  });

  afterEach(() => {
    http.defaults.adapter = originalAdapter;
    axios.defaults.adapter = originalDefaultAdapter;
    clearTokens();
    vi.restoreAllMocks();
  });

  it('authenticates with the ordinary signed-in session, not a ward-specific token', async () => {
    // The whole point of unifying the two auth systems: no sessionStorage key of
    // its own, no paste-a-JWT form -- just the app's access token.
    setTokens({
      accessToken: 'app-access-token',
      refreshToken: 'app-refresh-token',
      accessTokenExpiresAtUtc: new Date(Date.now() + 60_000).toISOString(),
    });
    const adapter = stubAdapter(() => ({ status: 200, data: { status: 'APPROVED' } }));

    await wardApi.decide(
      { id: '42', kind: 'proposals', status: 'PENDING' } as Parameters<typeof wardApi.decide>[0],
      'APPROVE',
      'Đã kiểm tra',
    );

    const config = adapter.mock.calls[0]![0];
    expect(config.url).toBe('/ward/cases/proposals/42/decision');
    expect(config.baseURL).toBe('https://api.example.test/api');
    expect(config.headers.Authorization).toBe('Bearer app-access-token');
    expect(JSON.parse(String(config.data))).toEqual({
      decision: 'APPROVE',
      reason: 'Đã kiểm tra',
      expectedStatus: 'PENDING',
    });
  });

  it('sends the status the reviewer actually saw, so a stale decision can be refused', async () => {
    setTokens({
      accessToken: 'app-access-token',
      refreshToken: 'r',
      accessTokenExpiresAtUtc: new Date(Date.now() + 60_000).toISOString(),
    });
    const adapter = stubAdapter(() => ({ status: 200, data: {} }));

    await wardApi.decide(
      {
        id: '7',
        kind: 'registrations',
        status: 'UNDER_REVIEW',
      } as Parameters<typeof wardApi.decide>[0],
      'REQUEST_INFO',
      'Thiếu CCCD',
    );

    expect(JSON.parse(String(adapter.mock.calls[0]![0].data)).expectedStatus).toBe('UNDER_REVIEW');
  });

  it('surfaces a 409 conflict as ApiError rather than showing a successful decision', async () => {
    // The backend's own code for this is `review_conflict`, which the FE does not
    // model; it must still map onto `conflict` by status and keep the server's
    // message, or the reviewer is told nothing useful.
    stubAdapter(() => ({
      status: 409,
      data: {
        type: 'review_conflict',
        title: 'review_conflict',
        detail: 'Hồ sơ đã thay đổi hoặc chưa đủ điều kiện. Tải lại hồ sơ để kiểm tra.',
      },
    }));

    await expect(wardApi.get('proposals', '42')).rejects.toMatchObject({
      name: 'ApiError',
      code: 'conflict',
      status: 409,
      message: 'Hồ sơ đã thay đổi hoặc chưa đủ điều kiện. Tải lại hồ sơ để kiểm tra.',
    });
  });

  it('reports a forbidden ward actor so the gate can explain it', async () => {
    stubAdapter(() => ({
      status: 403,
      data: { type: 'forbidden', detail: 'Tài khoản hiện tại không phải cán bộ phường.' },
    }));

    await expect(wardApi.me()).rejects.toMatchObject({
      code: 'forbidden',
      message: 'Tài khoản hiện tại không phải cán bộ phường.',
    });
  });

  it('clears the app session when an empty 401 cannot be refreshed', async () => {
    setTokens({
      accessToken: 'expired',
      refreshToken: 'also-expired',
      accessTokenExpiresAtUtc: new Date(Date.now() - 1000).toISOString(),
    });
    // Empty-bodied 401 = the JWT middleware, which is what triggers a refresh.
    // The refresh itself goes through bare axios, so it fails here too.
    stubAdapter(() => ({ status: 401, data: '' }));

    await expect(wardApi.me()).rejects.toBeInstanceOf(ApiError);
    expect(localStorage.getItem('streetbiz-tokens')).toBeNull();
  });

  it('strips the duplicate /api segment when fetching an evidence document', async () => {
    setTokens({
      accessToken: 'app-access-token',
      refreshToken: 'r',
      accessTokenExpiresAtUtc: new Date(Date.now() + 60_000).toISOString(),
    });
    const adapter = stubAdapter(() => ({ status: 200, data: new Blob(['x']) }));
    const createObjectURL = vi.fn(() => 'blob:ward-doc');
    vi.stubGlobal('URL', { ...URL, createObjectURL });

    const url = await wardApi.document('/api/uploads/evidence/5/abc.jpg');

    expect(adapter.mock.calls[0]![0].url).toBe('/uploads/evidence/5/abc.jpg');
    expect(url).toBe('blob:ward-doc');
    vi.unstubAllGlobals();
  });

  it.each([
    ['', '106'],
    ['10', ''],
    ['91', '106'],
    ['10', '181'],
    ['NaN', '1'],
  ])('rejects invalid coordinates %s, %s', (lat, lon) => expect(parsePoint(lat, lon)).toBeNull());

  it('accepts valid zero coordinates', () =>
    expect(parsePoint('0', '0')).toEqual({ latitude: 0, longitude: 0 }));
});
