import { beforeEach, describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
}));

vi.mock('@/core/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/api')>();
  return { ...actual, ...http };
});

const { platformApi, PlatformApiError } =
  await import('@/features/platform-administration/platform-api');
const { ApiError } = await import('@/core/api');

describe('platform administration API', () => {
  beforeEach(() => vi.resetAllMocks());

  it('uses the shared client and its session, with no sign-in of its own', () => {
    expect(platformApi).not.toHaveProperty('login');
    expect(platformApi).not.toHaveProperty('logout');
    // Screens keep checking `instanceof PlatformApiError`; it is the shared ApiError.
    expect(PlatformApiError).toBe(ApiError);
  });

  it('confirms the administrator through /platform/me', async () => {
    http.apiGet.mockResolvedValue({ userId: 7, name: 'Quản trị viên' });

    await expect(platformApi.me()).resolves.toEqual({ userId: 7, name: 'Quản trị viên' });
    expect(http.apiGet).toHaveBeenCalledWith('/platform/me');
  });

  it('sends the category name when creating, renaming and deleting a category', async () => {
    await platformApi.createCategory('Đồ uống');
    await platformApi.renameCategory(4, 'Nước');
    await platformApi.deleteCategory(4);

    expect(http.apiPost).toHaveBeenCalledWith('/platform/food-categories', { name: 'Đồ uống' });
    expect(http.apiPut).toHaveBeenCalledWith('/platform/food-categories/4', { name: 'Nước' });
    expect(http.apiDelete).toHaveBeenCalledWith('/platform/food-categories/4');
  });

  it('filters lists by status only when one is given', async () => {
    await platformApi.reportedContent();
    await platformApi.complaints('OPEN');

    expect(http.apiGet).toHaveBeenCalledWith('/platform/reported-content');
    expect(http.apiGet).toHaveBeenCalledWith('/platform/order-complaints?status=OPEN');
  });

  it('sends the optimistic status when hiding reported content', async () => {
    await platformApi.decideReportedContent(11, 'hide', 'PENDING');

    expect(http.apiPost).toHaveBeenCalledWith('/platform/reported-content/11/hide', {
      expectedStatus: 'PENDING',
    });
  });

  it('sends complaint notes, status and optional refund amount', async () => {
    const request = {
      decision: 'RESOLVE' as const,
      notes: 'Đã xác minh',
      expectedStatus: 'OPEN',
      approvedRefundAmount: 50_000,
    };

    await platformApi.decideComplaint(21, request);

    expect(http.apiPost).toHaveBeenCalledWith('/platform/order-complaints/21/decision', request);
  });
});
