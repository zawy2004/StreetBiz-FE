import { vi } from 'vitest';

import {
  platformApi,
  PlatformApiError,
  usePlatformSession,
} from '@/features/platform-administration/platform-api';

vi.mock('@/core/config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/config/env')>();
  // The offline demo: no app session token is shared, so the separate connection is what these tests exercise.
  return { ...actual, isLiveApi: false, env: { ...actual.env, apiBaseUrl: 'https://api.example.test/api' } };
});

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

  it('lists accounts with only the filters that were set', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], page: 2, pageSize: 20, totalCount: 0 }),
    });
    vi.stubGlobal('fetch', fetcher);
    usePlatformSession.getState().connect('platform-token', { userId: 7, name: 'Admin' });

    await platformApi.accounts({ role: 'VENDOR', q: 'Minh Anh', page: 2, pageSize: 20 });

    expect(fetcher.mock.calls[0]![0]).toBe(
      'https://api.example.test/api/platform/accounts?role=VENDOR&q=Minh+Anh&page=2&pageSize=20',
    );
  });

  it('suspends with a reason and the status it expects, and reactivates with an optional note', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal('fetch', fetcher);
    usePlatformSession.getState().connect('platform-token', { userId: 7, name: 'Admin' });

    await platformApi.suspendAccount(31, 'Bán hàng giả');
    await platformApi.reactivateAccount(31);

    const [suspendUrl, suspend] = fetcher.mock.calls[0]!;
    expect(suspendUrl).toBe('https://api.example.test/api/platform/accounts/31/suspend');
    expect(JSON.parse(suspend.body)).toEqual({ reason: 'Bán hàng giả', expectedStatus: 'ACTIVE' });
    const [, reactivate] = fetcher.mock.calls[1]!;
    expect(JSON.parse(reactivate.body)).toEqual({ note: null, expectedStatus: 'SUSPENDED' });
  });

  it('keeps the server error message (409 stale status) for the screen to show', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({ detail: 'Trạng thái tài khoản đã thay đổi.' }),
      }),
    );
    usePlatformSession.getState().connect('platform-token', { userId: 7, name: 'Admin' });

    await expect(platformApi.suspendAccount(31, 'Vi phạm')).rejects.toEqual(
      new PlatformApiError(409, 'Trạng thái tài khoản đã thay đổi.'),
    );
  });

  it('asks for the dashboard of a period', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal('fetch', fetcher);
    usePlatformSession.getState().connect('platform-token', { userId: 7, name: 'Admin' });

    await platformApi.dashboard({ from: '2026-10-01', to: '2026-10-30' });

    expect(fetcher.mock.calls[0]![0]).toBe(
      'https://api.example.test/api/platform/dashboard?from=2026-10-01&to=2026-10-30',
    );
  });

  it('exports a report and reads the file name and id the server chose', async () => {
    const blob = new Blob(['x']);
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({
        'Content-Disposition': "attachment; filename=f.xlsx; filename*=UTF-8''streetbiz-orders-20261001-20261003.xlsx",
        'X-Export-Id': '55',
      }),
      blob: async () => blob,
    });
    vi.stubGlobal('fetch', fetcher);
    usePlatformSession.getState().connect('platform-token', { userId: 7, name: 'Admin' });

    const file = await platformApi.exportReport({
      reportType: 'ORDERS',
      from: '2026-10-01',
      to: '2026-10-03',
      format: 'xlsx',
    });

    const [url, options] = fetcher.mock.calls[0]!;
    expect(url).toBe('https://api.example.test/api/platform/reports/export');
    expect(options.method).toBe('POST');
    expect(options.headers.Authorization).toBe('Bearer platform-token');
    expect(JSON.parse(options.body)).toEqual({
      reportType: 'ORDERS',
      from: '2026-10-01',
      to: '2026-10-03',
      format: 'xlsx',
    });
    expect(file).toEqual({ blob, fileName: 'streetbiz-orders-20261001-20261003.xlsx', exportId: 55 });
  });

  it('surfaces a failed export instead of saving an error page as a file', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        json: async () => ({ detail: 'Báo cáo vượt quá 50.000 dòng.' }),
      }),
    );
    usePlatformSession.getState().connect('platform-token', { userId: 7, name: 'Admin' });

    await expect(
      platformApi.exportReport({ reportType: 'ORDERS', from: '2026-01-01', to: '2026-12-31', format: 'csv' }),
    ).rejects.toEqual(new PlatformApiError(422, 'Báo cáo vượt quá 50.000 dòng.'));
  });
});
