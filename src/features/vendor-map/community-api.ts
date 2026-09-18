import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { env } from '@/core/config/env';

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
};

type CustomerIdentity = { id: number; fullName: string | null; roleCode: string };
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

async function communityRequest<T>(
  path: string,
  init: RequestInit = {},
  token = useCommunitySession.getState().token,
): Promise<T> {
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
    throw new CommunityApiError(
      response.status,
      Object.values(problem.errors ?? {})[0]?.[0] ??
        problem.detail ??
        problem.title ??
        (response.status === 401
          ? 'Phiên đăng nhập đã hết hạn.'
          : response.status === 403
            ? 'Chức năng này chỉ dành cho tài khoản người mua.'
            : 'Không thể xử lý yêu cầu.'),
    );
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
  verifyPermit: (qrPayload: string, point?: { latitude: number; longitude: number }) =>
    communityRequest<PermitVerification>(
      '/community/permits/verify',
      {
        method: 'POST',
        body: JSON.stringify({ qrPayload, ...point }),
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
  report: (
    vendorId: string | number,
    request: {
      reason: string;
      evidenceUrl?: string;
      slotId?: number;
      scannedPermitId?: number;
    },
  ) =>
    communityRequest<{ reportId: number; status: string }>(
      `/community/vendors/${encodeURIComponent(vendorId)}/reports`,
      { method: 'POST', body: JSON.stringify(request) },
    ),
};
