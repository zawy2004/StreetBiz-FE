import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { env } from '@/core/config/env';

export type CaseKind = 'proposals' | 'conflicts' | 'transfers';
export const wardReviewRoot = '/ward/inbox/reviews';
export type GeoPoint = { latitude: number; longitude: number };
export type GeoResult = { inside: boolean; wardId: number; boundaryVersion: string };
export type WardCase = {
  id: string;
  kind: CaseKind;
  title: string;
  status: string;
  slotCode: string;
  applicant: string;
  summary: string;
  location: GeoPoint | null;
  evidenceUrl: string | null;
  createdAt: string;
  reason: string | null;
  blockers: string[];
  actions: string[];
  queuePosition: number | null;
  contractTerm: string | null;
  outstanding: number | null;
};
export type WardProfile = { userId: string; wardId: number; name: string };
export type CasePage = { items: WardCase[]; page: number; hasMore: boolean };

type ApiSession = {
  token: string;
  generation: number;
  connect: (token: string) => void;
  disconnect: () => void;
};
export const useWardSession = create<ApiSession>()(
  persist(
    (set) => ({
      token: '',
      generation: 0,
      connect: (token) => set((state) => ({ token, generation: state.generation + 1 })),
      disconnect: () => set((state) => ({ token: '', generation: state.generation + 1 })),
    }),
    {
      name: 'streetbiz-ward-api',
      storage: createJSONStorage(() => sessionStorage),
      partialize: ({ token, generation }) => ({ token, generation }),
    },
  ),
);

export class WardApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function wardRequest<T>(
  path: string,
  init: RequestInit = {},
  token = useWardSession.getState().token,
): Promise<T> {
  const base = env.apiBaseUrl.replace(/\/$/, '');
  if (!base) throw new WardApiError(0, 'Chưa cấu hình VITE_API_BASE_URL cho Backend.');
  let response: Response;
  try {
    response = await fetch(base + path, {
      ...init,
      signal: init.signal ?? AbortSignal.timeout(15000),
      headers: {
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new WardApiError(
      0,
      'Không kết nối được Backend. Kiểm tra URL API, HTTPS và CORS rồi thử lại.',
    );
  }
  if (!response.ok) {
    const problem = (await response.json().catch(() => ({}))) as {
      title?: string;
      detail?: string;
      errors?: Record<string, string[]>;
    };
    if (response.status === 401 && token === useWardSession.getState().token)
      useWardSession.getState().disconnect();
    throw new WardApiError(
      response.status,
      Object.values(problem.errors ?? {})[0]?.[0] ??
        problem.detail ??
        problem.title ??
        (response.status === 401
          ? 'Phiên đã hết hạn hoặc token không hợp lệ. Vui lòng kết nối lại.'
          : response.status === 403
            ? 'Tài khoản không có quyền cán bộ phường.'
            : response.status === 429
              ? 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.'
              : 'Không thể xử lý yêu cầu.'),
    );
  }
  return response.json() as Promise<T>;
}

export const wardApi = {
  me: (token?: string) => wardRequest<WardProfile>('/ward/me', {}, token),
  list: (kind: CaseKind, page: number) => wardRequest<CasePage>(`/ward/cases/${kind}?page=${page}`),
  get: (kind: CaseKind, id: string) =>
    wardRequest<WardCase>(`/ward/cases/${kind}/${encodeURIComponent(id)}`),
  decide: (record: WardCase, decision: string, reason: string) =>
    wardRequest<WardCase>(`/ward/cases/${record.kind}/${record.id}/decision`, {
      method: 'POST',
      body: JSON.stringify({ decision, reason, expectedStatus: record.status }),
    }),
  search: (address: string) =>
    wardRequest<{ label: string; point: GeoPoint }[]>(
      `/ward/geo/search?address=${encodeURIComponent(address)}`,
    ),
  verify: (point: GeoPoint) =>
    wardRequest<GeoResult>('/ward/geo/verify', { method: 'POST', body: JSON.stringify(point) }),
  pin: (id: string, point: GeoPoint) =>
    wardRequest<WardCase>(`/ward/cases/proposals/${id}/location`, {
      method: 'PUT',
      body: JSON.stringify(point),
    }),
};

export function parsePoint(latitude: string, longitude: string): GeoPoint | null {
  if (!latitude.trim() || !longitude.trim()) return null;
  const point = { latitude: Number(latitude), longitude: Number(longitude) };
  return Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude) &&
    Math.abs(point.latitude) <= 90 &&
    Math.abs(point.longitude) <= 180
    ? point
    : null;
}

export const caseLabels: Record<CaseKind, string> = {
  proposals: 'Đề xuất vị trí',
  conflicts: 'Xung đột địa chỉ',
  transfers: 'Chuyển nhượng ô',
};
export const actionLabels: Record<string, string> = {
  APPROVE: 'Phê duyệt',
  REJECT: 'Từ chối',
  QUEUE: 'Đưa vào hàng chờ',
};
export const statusLabels: Record<string, string> = {
  PENDING: 'Chờ xử lý',
  UNDER_REVIEW: 'Đang xếp hàng',
  ACCEPTED_BY_RECEIVER: 'Bên nhận đã đồng ý',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Đã từ chối',
  WITHDRAWN: 'Đã rút',
};
