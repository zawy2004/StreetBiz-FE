import { vi } from 'vitest';
import {
  parsePoint,
  useWardSession,
  wardApi,
  WardApiError,
} from '@/features/ward-administration/ward-api';

vi.mock('@/core/config/env', () => ({ env: { apiBaseUrl: 'https://api.example.test/api' } }));

describe('ward API', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    useWardSession.getState().disconnect();
  });

  it('sends the JWT and the status the reviewer actually saw', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ status: 'APPROVED' }) });
    vi.stubGlobal('fetch', fetcher);
    useWardSession.getState().connect('test-token');
    await wardApi.decide(
      { id: '42', kind: 'proposals', status: 'PENDING' } as Parameters<typeof wardApi.decide>[0],
      'APPROVE',
      'Đã kiểm tra',
    );
    const [url, options] = fetcher.mock.calls[0]!;
    expect(url).toBe('https://api.example.test/api/ward/cases/proposals/42/decision');
    expect(options.headers.Authorization).toBe('Bearer test-token');
    expect(JSON.parse(options.body)).toEqual({
      decision: 'APPROVE',
      reason: 'Đã kiểm tra',
      expectedStatus: 'PENDING',
    });
  });

  it('surfaces conflicts rather than showing a successful decision', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({
          title: 'review_conflict',
          detail: 'Hồ sơ đã được duyệt',
        }),
      }),
    );
    await expect(wardApi.get('proposals', '42')).rejects.toEqual(
      new WardApiError(409, 'Hồ sơ đã được duyệt'),
    );
  });

  it('clears an expired session on 401', async () => {
    useWardSession.getState().connect('expired');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({}),
      }),
    );
    await expect(wardApi.me()).rejects.toThrow();
    expect(useWardSession.getState().token).toBe('');
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
