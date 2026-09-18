import { vi } from 'vitest';

import {
  communityApi,
  CommunityApiError,
  useCommunitySession,
} from '@/features/vendor-map/community-api';

vi.mock('@/core/config/env', () => ({
  env: { apiBaseUrl: 'https://api.example.test/api' },
}));

describe('community vendor API', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    useCommunitySession.getState().disconnect();
    sessionStorage.clear();
  });

  it('loads active vendors anonymously with the requested search area', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });
    vi.stubGlobal('fetch', fetcher);

    await communityApi.activeVendors({ latitude: 10.75, longitude: 106.67, radiusMeters: 5_000 });

    const [url, options] = fetcher.mock.calls[0]!;
    expect(url).toBe(
      'https://api.example.test/api/community/vendors?latitude=10.75&longitude=106.67&radiusMeters=5000',
    );
    expect(options.headers.Authorization).toBeUndefined();
  });

  it('connects only a backend customer and stores the returned identity', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          accessToken: 'customer-token',
          user: { userId: 17, fullName: 'Nguyễn An', roleCode: 'CUSTOMER' },
        }),
      }),
    );

    await communityApi.login('0900000017', 'password');

    expect(useCommunitySession.getState()).toMatchObject({
      token: 'customer-token',
      customer: { id: 17, fullName: 'Nguyễn An', roleCode: 'CUSTOMER' },
    });
  });

  it('sends the customer JWT when upserting a rating', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ commentId: 1, rating: 5, commentText: 'Tốt' }),
    });
    vi.stubGlobal('fetch', fetcher);
    useCommunitySession
      .getState()
      .connect('customer-token', { id: 17, fullName: 'Nguyễn An', roleCode: 'CUSTOMER' });

    await communityApi.comment(8, 5, 'Tốt');

    const [url, options] = fetcher.mock.calls[0]!;
    expect(url).toBe('https://api.example.test/api/community/vendors/8/comment');
    expect(options.method).toBe('PUT');
    expect(options.headers.Authorization).toBe('Bearer customer-token');
    expect(JSON.parse(options.body)).toEqual({ rating: 5, commentText: 'Tốt' });
  });

  it('rejects a non-customer backend account without retaining its token', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          accessToken: 'ward-token',
          user: { userId: 2, fullName: 'Ward reviewer', roleCode: 'WARD' },
        }),
      }),
    );

    await expect(communityApi.login('0900000002', 'password')).rejects.toEqual(
      new CommunityApiError(403, 'Vui lòng đăng nhập bằng tài khoản người mua.'),
    );
    expect(useCommunitySession.getState().token).toBe('');
  });
});
