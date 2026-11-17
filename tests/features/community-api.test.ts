import { vi } from 'vitest';

import {
  communityApi,
  CommunityApiError,
  useCommunitySession,
} from '@/features/vendor-map/community-api';

vi.mock('@/core/config/env', () => ({
  env: { apiBaseUrl: 'https://api.example.test/api' },
  // community-api reads the app's own sign-in (auth-store), which reads this switch.
  isLiveApi: false,
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

  it('sends a guest report with no Authorization header (BUY-05)', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ reportId: 61, status: 'PENDING', reportType: 'GENERAL' }),
    });
    vi.stubGlobal('fetch', fetcher);

    const receipt = await communityApi.report(8, { reportType: 'GENERAL', reason: 'Lấn vỉa hè' });

    expect(receipt.reportId).toBe(61);
    const [url, options] = fetcher.mock.calls[0]!;
    expect(url).toBe('https://api.example.test/api/community/vendors/8/reports');
    expect(options.method).toBe('POST');
    expect(options.headers.Authorization).toBeUndefined();
    expect(options.headers['Content-Type']).toBe('application/json');
  });

  it('says "too fast" on 429 whatever the server wrote', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 429, json: async () => ({}) }),
    );

    await expect(communityApi.report(8, { reportType: 'GENERAL', reason: 'x' })).rejects.toMatchObject({
      status: 429,
      message: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.',
    });
  });

  it('shows the first field error of a 400', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ title: 'validation', errors: { EvidenceUrl: ['Ảnh không hợp lệ.'] } }),
      }),
    );

    await expect(communityApi.report(8, { reportType: 'GENERAL', reason: 'x' })).rejects.toMatchObject({
      status: 400,
      message: 'Ảnh không hợp lệ.',
    });
  });

  it('drops an expired community session on 401', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) }));
    useCommunitySession
      .getState()
      .connect('old-token', { id: 17, fullName: 'Nguyễn An', roleCode: 'CUSTOMER' });

    await expect(communityApi.myReports()).rejects.toMatchObject({ status: 401 });

    expect(useCommunitySession.getState().token).toBe('');
    expect(useCommunitySession.getState().customer).toBeNull();
  });

  it('turns a network failure into a readable error instead of a crash', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(communityApi.profile(8)).rejects.toMatchObject({ status: 0 });
  });
});
