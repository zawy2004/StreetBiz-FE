import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { env } from '@/core/config/env';

export type PlatformAdminProfile = { userId: number; name: string };

export type FoodCategory = {
  categoryId: number;
  categoryName: string;
  itemCount: number;
  createdByName: string | null;
};

export type ReportedContent = {
  reportId: number;
  contentType: string;
  contentId: number;
  contentTitle: string;
  contentBody: string | null;
  contentStatus: string;
  contentExists: boolean;
  reporterName: string;
  reason: string;
  status: string;
  reviewedByName: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

export type OrderComplaint = {
  complaintId: number;
  orderId: number;
  orderCode: string;
  orderStatus: string;
  customerName: string;
  storefrontName: string;
  complaintType: string;
  description: string;
  requestedRefundAmount: number | null;
  status: string;
  resolutionNotes: string | null;
  resolvedByName: string | null;
  createdAt: string;
  resolvedAt: string | null;
  paymentAmount: number | null;
  paymentProvider: string | null;
  refundedAmount: number;
  latestRefundId: number | null;
  latestRefundStatus: string | null;
};

export type PlatformPage<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
};

type PlatformSession = {
  token: string;
  admin: PlatformAdminProfile | null;
  generation: number;
  connect: (token: string, admin: PlatformAdminProfile) => void;
  disconnect: () => void;
};

export const usePlatformSession = create<PlatformSession>()(
  persist(
    (set) => ({
      token: '',
      admin: null,
      generation: 0,
      connect: (token, admin) =>
        set((state) => ({ token, admin, generation: state.generation + 1 })),
      disconnect: () =>
        set((state) => ({ token: '', admin: null, generation: state.generation + 1 })),
    }),
    {
      name: 'streetbiz-platform-api',
      storage: createJSONStorage(() => sessionStorage),
      partialize: ({ token, admin, generation }) => ({ token, admin, generation }),
    },
  ),
);

export class PlatformApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function platformRequest<T>(
  path: string,
  init: RequestInit = {},
  token = usePlatformSession.getState().token,
): Promise<T> {
  const base = env.apiBaseUrl.replace(/\/$/, '');
  if (!base) throw new PlatformApiError(0, 'Chưa cấu hình VITE_API_BASE_URL cho Backend.');

  let response: Response;
  try {
    response = await fetch(base + path, {
      ...init,
      signal: init.signal ?? AbortSignal.timeout(15_000),
      headers: {
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new PlatformApiError(
      0,
      'Không kết nối được Backend. Kiểm tra URL API, CORS và trạng thái server.',
    );
  }

  if (!response.ok) {
    const problem = (await response.json().catch(() => ({}))) as {
      title?: string;
      detail?: string;
      errors?: Record<string, string[]>;
    };
    if (response.status === 401 && token === usePlatformSession.getState().token) {
      usePlatformSession.getState().disconnect();
    }
    throw new PlatformApiError(
      response.status,
      Object.values(problem.errors ?? {})[0]?.[0] ??
        problem.detail ??
        problem.title ??
        (response.status === 401
          ? 'Phiên quản trị đã hết hạn.'
          : response.status === 403
            ? 'Tài khoản không có quyền quản trị nền tảng.'
            : 'Không thể xử lý yêu cầu.'),
    );
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

type LoginResponse = {
  accessToken: string;
  user: { userId: number; fullName: string | null; roleCode: string };
};

export const platformApi = {
  login: async (phoneNumber: string, password: string) => {
    const result = await platformRequest<LoginResponse>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ phoneNumber, password }) },
      '',
    );
    if (result.user.roleCode !== 'PLATFORM_ADMIN') {
      await platformRequest<unknown>('/auth/logout', { method: 'POST' }, result.accessToken).catch(
        () => undefined,
      );
      throw new PlatformApiError(403, 'Vui lòng đăng nhập bằng tài khoản quản trị nền tảng.');
    }
    const admin = {
      userId: result.user.userId,
      name: result.user.fullName || `Quản trị viên #${result.user.userId}`,
    };
    usePlatformSession.getState().connect(result.accessToken, admin);
    return admin;
  },
  logout: async () => {
    const token = usePlatformSession.getState().token;
    try {
      if (token) {
        await platformRequest<unknown>('/auth/logout', { method: 'POST' }, token);
      }
    } finally {
      usePlatformSession.getState().disconnect();
    }
  },
  me: (token?: string) => platformRequest<PlatformAdminProfile>('/platform/me', {}, token),
  categories: () => platformRequest<FoodCategory[]>('/platform/food-categories'),
  createCategory: (name: string) =>
    platformRequest<FoodCategory>('/platform/food-categories', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  renameCategory: (categoryId: number, name: string) =>
    platformRequest<FoodCategory>(`/platform/food-categories/${categoryId}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    }),
  deleteCategory: (categoryId: number) =>
    platformRequest<void>(`/platform/food-categories/${categoryId}`, { method: 'DELETE' }),
  reportedContent: (status?: string) =>
    platformRequest<PlatformPage<ReportedContent>>(
      `/platform/reported-content${status ? `?status=${encodeURIComponent(status)}` : ''}`,
    ),
  reportedContentDetail: (reportId: string | number) =>
    platformRequest<ReportedContent>(`/platform/reported-content/${encodeURIComponent(reportId)}`),
  decideReportedContent: (
    reportId: string | number,
    decision: 'dismiss' | 'hide',
    expectedStatus: string,
  ) =>
    platformRequest<ReportedContent>(
      `/platform/reported-content/${encodeURIComponent(reportId)}/${decision}`,
      { method: 'POST', body: JSON.stringify({ expectedStatus }) },
    ),
  complaints: (status?: string) =>
    platformRequest<PlatformPage<OrderComplaint>>(
      `/platform/order-complaints${status ? `?status=${encodeURIComponent(status)}` : ''}`,
    ),
  complaintDetail: (complaintId: string | number) =>
    platformRequest<OrderComplaint>(
      `/platform/order-complaints/${encodeURIComponent(complaintId)}`,
    ),
  decideComplaint: (
    complaintId: string | number,
    request: {
      decision: 'RESOLVE' | 'REJECT';
      notes: string;
      expectedStatus: string;
      approvedRefundAmount?: number;
    },
  ) =>
    platformRequest<OrderComplaint>(
      `/platform/order-complaints/${encodeURIComponent(complaintId)}/decision`,
      { method: 'POST', body: JSON.stringify(request) },
    ),
};
