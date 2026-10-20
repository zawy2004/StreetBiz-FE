import { vi } from 'vitest';

import {
  platformApi,
  PlatformApiError,
  usePlatformSession,
} from '@/features/platform-administration/platform-api';

vi.mock('@/core/config/env', () => ({
  env: { apiBaseUrl: 'https://api.example.test/api' },
}));

describe('platform administration API', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    usePlatformSession.getState().disconnect();
    sessionStorage.clear();
  });

  it('connects only a backend platform administrator and stores the identity', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          accessToken: 'platform-token',
          user: { userId: 7, fullName: 'Quản trị viên', roleCode: 'PLATFORM_ADMIN' },
        }),
      }),
    );

    await platformApi.login('0900000007', 'password');

    expect(usePlatformSession.getState()).toMatchObject({
      token: 'platform-token',
      admin: { userId: 7, name: 'Quản trị viên' },
    });
  });

  it('rejects a non-platform account without retaining its token', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          accessToken: 'ward-token',
          user: { userId: 2, fullName: 'Ward reviewer', roleCode: 'WARD' },
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    vi.stubGlobal('fetch', fetcher);

    await expect(platformApi.login('0900000002', 'password')).rejects.toEqual(
      new PlatformApiError(403, 'Vui lòng đăng nhập bằng tài khoản quản trị nền tảng.'),
    );
    expect(usePlatformSession.getState().token).toBe('');
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      'https://api.example.test/api/auth/logout',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer ward-token' }),
      }),
    );
  });

  it('revokes the backend session before clearing the local platform session', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal('fetch', fetcher);
    usePlatformSession.getState().connect('platform-token', { userId: 7, name: 'Admin' });

    await platformApi.logout();

    expect(fetcher).toHaveBeenCalledWith(
      'https://api.example.test/api/auth/logout',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer platform-token' }),
      }),
    );
    expect(usePlatformSession.getState().token).toBe('');
  });

  it('sends the platform JWT and category name when creating a category', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ categoryId: 4, categoryName: 'Đồ uống', itemCount: 0 }),
    });
    vi.stubGlobal('fetch', fetcher);
    usePlatformSession.getState().connect('platform-token', { userId: 7, name: 'Admin' });

    await platformApi.createCategory('Đồ uống');

    const [url, options] = fetcher.mock.calls[0]!;
    expect(url).toBe('https://api.example.test/api/platform/food-categories');
    expect(options.method).toBe('POST');
    expect(options.headers.Authorization).toBe('Bearer platform-token');
    expect(JSON.parse(options.body)).toEqual({ name: 'Đồ uống' });
  });

  it('handles the empty 204 response when deleting a category', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, status: 204 });
    vi.stubGlobal('fetch', fetcher);
    usePlatformSession.getState().connect('platform-token', { userId: 7, name: 'Admin' });

    await expect(platformApi.deleteCategory(4)).resolves.toBeUndefined();

    const [url, options] = fetcher.mock.calls[0]!;
    expect(url).toBe('https://api.example.test/api/platform/food-categories/4');
    expect(options.method).toBe('DELETE');
  });

  it('sends the optimistic status when hiding reported content', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ reportId: 11, status: 'HIDDEN' }),
    });
    vi.stubGlobal('fetch', fetcher);
    usePlatformSession.getState().connect('platform-token', { userId: 7, name: 'Admin' });

    await platformApi.decideReportedContent(11, 'hide', 'PENDING');

    const [url, options] = fetcher.mock.calls[0]!;
    expect(url).toBe('https://api.example.test/api/platform/reported-content/11/hide');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({ expectedStatus: 'PENDING' });
  });

  it('sends complaint notes, status and optional refund amount', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ complaintId: 21, status: 'RESOLVED' }),
    });
    vi.stubGlobal('fetch', fetcher);
    usePlatformSession.getState().connect('platform-token', { userId: 7, name: 'Admin' });

    await platformApi.decideComplaint(21, {
      decision: 'RESOLVE',
      notes: 'Đã xác minh',
      expectedStatus: 'OPEN',
      approvedRefundAmount: 50_000,
    });

    const [url, options] = fetcher.mock.calls[0]!;
    expect(url).toBe('https://api.example.test/api/platform/order-complaints/21/decision');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({
      decision: 'RESOLVE',
      notes: 'Đã xác minh',
      expectedStatus: 'OPEN',
      approvedRefundAmount: 50_000,
    });
  });
});
