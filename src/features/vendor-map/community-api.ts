import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type {
  VendorReportPriceEvidence,
  VendorReportResolution,
  VendorReportType,
} from '@/core/api/ai-api';
import { http } from '@/core/api/client';
import { ApiError } from '@/core/api/problem';
import type { PriceBoardItem } from '@/core/api/seller-store-api';
import { getTokens } from '@/core/api/token-storage';
import { env } from '@/core/config/env';
import { useAuthStore } from '@/store/auth-store';

export type ActiveVendor = {
  vendorId: number;
  displayName: string;
  vendorType: string;
  address: string | null;
  permitId: number;
  permitEndDate: string;
  slotId: number;
  slotCode: string;
  zoneName: string;
  latitude: number;
  longitude: number;
  distanceMeters: number | null;
  communityRating: number | null;
  communityCount: number;
  verifiedRating: number | null;
  verifiedCount: number;
};

export type VendorComment = {
  commentId: number;
  authorName: string;
  rating: number | null;
  commentText: string | null;
  createdAt: string;
};

export type PublicVendorProfile = {
  vendorId: number;
  displayName: string;
  vendorType: string;
  address: string | null;
  wardId: number;
  wardName: string | null;
  permitId: number;
  permitStatus: string;
  permitEndDate: string;
  slotId: number;
  slotCode: string;
  zoneName: string;
  latitude: number;
  longitude: number;
  communityRating: number | null;
  communityCount: number;
  verifiedRating: number | null;
  verifiedCount: number;
  comments: VendorComment[];
};

export type PermitVerification = {
  isValid: boolean;
  status: string;
  permitId: number | null;
  vendorId: number | null;
  displayName: string | null;
  slotId: number | null;
  slotCode: string | null;
  latitude: number | null;
  longitude: number | null;
  validFrom: string | null;
  validUntil: string | null;
  /**
   * The stall's price board, read live with the verdict (BR-39): only for a VALID permit whose
   * stall keeps a board on StreetBiz. Never kept for a later scan.
   */
  priceBoard?: PublicPriceBoard | null;
};

/** BUY-06: the public price board, as it stands now. */
export type PublicPriceBoard = {
  /** "Bản số N": grows by one with every change to the board. */
  version: number;
  updatedAt: string | null;
  /** Whether the paper board scanned (its `?v=`) is this version; null when no version was sent. */
  printedVersionIsCurrent: boolean | null;
  items: PriceBoardItem[];
};

/** POST /community/vendors/{id}/reports. Only an OVERCHARGE names a dish, quantity, amount and time. */
export type VendorReportRequest = {
  reportType: VendorReportType;
  /** Required for GENERAL only; the server words a typed report itself when it is left out. */
  reason?: string;
  evidenceUrl?: string;
  slotId?: number;
  scannedPermitId?: number;
  menuItemId?: number;
  quantity?: number;
  /** Whole VND. The posted price is the server's (price history at `purchasedAt`), never sent. */
  chargedAmount?: number;
  /** ISO date-time with its UTC offset. */
  purchasedAt?: string;
};

export type VendorReportReceipt = {
  reportId: number;
  status: string;
  reportType?: VendorReportType;
  dueAt?: string | null;
  postedAmount?: number | null;
  chargedAmount?: number | null;
};

/** "Phản ánh của tôi": one of the caller's own reports and how the ward closed it. */
export type MyVendorReport = {
  reportId: number;
  vendorId: number | null;
  vendorName: string | null;
  slotCode: string | null;
  reportType: VendorReportType;
  reason: string;
  status: string;
  createdAt: string;
  dueAt: string | null;
  isOverdue: boolean;
  resolution: VendorReportResolution | null;
  resolutionNote: string | null;
  refundAmount: number | null;
  reviewedAt: string | null;
  hasPhoto: boolean;
  priceEvidence: VendorReportPriceEvidence | null;
};

/** The server's page size for "Phản ánh của tôi". */
export const MY_REPORTS_PAGE_SIZE = 20;

export type CustomerIdentity = { id: number; fullName: string | null; roleCode: string };
type LoginResponse = {
  accessToken: string;
  user: { userId: number; fullName: string | null; roleCode: string };
};

type CommunitySession = {
  token: string;
  customer: CustomerIdentity | null;
  generation: number;
  connect: (token: string, customer: CustomerIdentity) => void;
  disconnect: () => void;
};

export const useCommunitySession = create<CommunitySession>()(
  persist(
    (set) => ({
      token: '',
      customer: null,
      generation: 0,
      connect: (token, customer) =>
        set((state) => ({ token, customer, generation: state.generation + 1 })),
      disconnect: () =>
        set((state) => ({ token: '', customer: null, generation: state.generation + 1 })),
    }),
    {
      name: 'streetbiz-community-api',
      storage: createJSONStorage(() => sessionStorage),
      partialize: ({ token, customer, generation }) => ({ token, customer, generation }),
    },
  ),
);

export class CommunityApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** A few server messages are still English; the buyer reads them in Vietnamese. */
const SERVER_MESSAGES: Record<string, string> = {
  'Active vendor not found.': 'Không tìm thấy hộ kinh doanh đang hoạt động.',
  'The selected slot or permit does not belong to this vendor.':
    'Ô hoặc giấy phép đã quét không thuộc hộ kinh doanh này.',
};

const TOO_MANY = 'Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.';

/**
 * The app's own signed-in buyer, when the app talks to the server: a community call made
 * without a session of its own goes with that account, so a buyer already signed in to
 * StreetBiz is not asked to sign in again on the report form or "Phản ánh của tôi".
 */
function appCustomer(): CustomerIdentity | null {
  if (env.useMockApi || !env.apiBaseUrl) return null;
  const user = useAuthStore.getState().user;
  if (user?.role_code !== 'CUSTOMER' || !getTokens()?.accessToken) return null;
  return { id: Number(user.id), fullName: user.fullName, roleCode: user.role_code };
}

/** Who a report or comment is sent with: this tab's community session, else the app's buyer. */
export function useCommunityCustomer(): CustomerIdentity | null {
  const own = useCommunitySession((state) => state.customer);
  const token = useCommunitySession((state) => state.token);
  const appUser = useAuthStore((state) => state.user);
  if (token && own) return own;
  return appUser ? appCustomer() : null;
}

/** Through the app's own client, which refreshes its session; errors keep the community shape. */
async function viaAppSession<T>(path: string, init: RequestInit): Promise<T> {
  try {
    const { data } = await http.request<T>({
      url: path,
      method: init.method ?? 'GET',
      data: init.body ?? undefined,
      headers:
        init.body instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
    });
    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw new CommunityApiError(
        error.status,
        error.status === 429 ? TOO_MANY : (SERVER_MESSAGES[error.message] ?? error.message),
      );
    }
    throw error;
  }
}

/**
 * `explicitToken` given (even '') sends exactly that: '' is an anonymous call. Left out, the
 * call goes with this tab's community session, or with the app's signed-in buyer when there
 * is none.
 */
async function communityRequest<T>(
  path: string,
  init: RequestInit = {},
  explicitToken?: string,
): Promise<T> {
  const token = explicitToken ?? useCommunitySession.getState().token;
  if (explicitToken === undefined && !token && appCustomer()) return viaAppSession<T>(path, init);

  const base = env.apiBaseUrl.replace(/\/$/, '');
  if (!base) throw new CommunityApiError(0, 'Chưa cấu hình VITE_API_BASE_URL cho Backend.');

  let response: Response;
  try {
    const isForm = init.body instanceof FormData;
    response = await fetch(base + path, {
      ...init,
      signal: init.signal ?? AbortSignal.timeout(15_000),
      headers: {
        ...(init.body && !isForm ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new CommunityApiError(
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
    if (response.status === 401 && token === useCommunitySession.getState().token) {
      useCommunitySession.getState().disconnect();
    }
    const message =
      response.status === 429
        ? (problem.detail ?? TOO_MANY)
        : (Object.values(problem.errors ?? {})[0]?.[0] ??
          problem.detail ??
          problem.title ??
          (response.status === 401
            ? 'Phiên đăng nhập đã hết hạn.'
            : response.status === 403
              ? 'Chức năng này chỉ dành cho tài khoản người mua.'
              : 'Không thể xử lý yêu cầu.'));
    throw new CommunityApiError(response.status, SERVER_MESSAGES[message] ?? message);
  }

  return response.json() as Promise<T>;
}

export const communityApi = {
  activeVendors: (position?: { latitude: number; longitude: number; radiusMeters: number }) => {
    const query = position
      ? `?latitude=${position.latitude}&longitude=${position.longitude}&radiusMeters=${position.radiusMeters}`
      : '';
    return communityRequest<ActiveVendor[]>(`/community/vendors${query}`, {}, '');
  },
  profile: (vendorId: string | number) =>
    communityRequest<PublicVendorProfile>(
      `/community/vendors/${encodeURIComponent(vendorId)}`,
      {},
      '',
    ),
  /**
   * BUY-02 / BUY-06: a live check of the scanned text (the bare signed token or a `/q/{token}`
   * link; the server reads `?v=` from a link itself). Never cached (BR-39): no HTTP cache, and
   * callers keep the answer only while it is on screen.
   */
  verifyPermit: (
    qrPayload: string,
    point?: { latitude: number; longitude: number },
    printedVersion?: number,
  ) =>
    communityRequest<PermitVerification>(
      '/community/permits/verify',
      {
        method: 'POST',
        cache: 'no-store',
        body: JSON.stringify({
          qrPayload,
          ...point,
          ...(printedVersion ? { printedVersion } : {}),
        }),
      },
      '',
    ),
  login: async (phoneNumber: string, password: string) => {
    const result = await communityRequest<LoginResponse>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ phoneNumber, password }) },
      '',
    );
    if (result.user.roleCode !== 'CUSTOMER') {
      throw new CommunityApiError(403, 'Vui lòng đăng nhập bằng tài khoản người mua.');
    }
    const customer = {
      id: result.user.userId,
      fullName: result.user.fullName,
      roleCode: result.user.roleCode,
    };
    useCommunitySession.getState().connect(result.accessToken, customer);
    return customer;
  },
  comment: (vendorId: string | number, rating: number, commentText: string) =>
    communityRequest<VendorComment>(`/community/vendors/${encodeURIComponent(vendorId)}/comment`, {
      method: 'PUT',
      body: JSON.stringify({ rating, commentText }),
    }),
  uploadEvidence: async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return communityRequest<{ fileUrl: string; contentType: string; sizeBytes: number }>(
      '/uploads/evidence',
      { method: 'POST', body: form },
    );
  },
  /**
   * BUY-05 / BUY-07. 409: a pending report about this vendor already exists; 422: the charge is
   * not above the posted price, the dish was not on the board then, or the purchase is outside
   * the last 7 days; 404: unknown vendor or dish; 429: more than 5 reports an hour.
   */
  report: (vendorId: string | number, request: VendorReportRequest) =>
    communityRequest<VendorReportReceipt>(
      `/community/vendors/${encodeURIComponent(vendorId)}/reports`,
      { method: 'POST', body: JSON.stringify(request) },
    ),
  /** "Phản ánh của tôi", newest first, 20 a page. */
  myReports: (page = 1) =>
    communityRequest<MyVendorReport[]>(`/community/my-reports${page > 1 ? `?page=${page}` : ''}`),
};
