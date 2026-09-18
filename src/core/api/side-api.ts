import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { env } from '@/core/config/env';

// Sidewalk Slot & Rental (SIDE-01..13) client, mirroring the shape of
// src/features/ward-administration/ward-api.ts: a typed fetch wrapper plus a
// standalone token session, separate from the mock useAuthStore. The vendor
// sign-in flow is still mock (src/mocks/db.ts), so there is no real JWT to
// attach automatically yet -- VendorConnection lets a real access token
// (from POST /api/auth/login) be pasted in per browser session instead.

export type SidewalkSlot = {
  slotId: number;
  slotCode: string;
  zoneId: number;
  zoneName: string;
  wardUnitId: number;
  latitude: number;
  longitude: number;
  widthMeters: number | null;
  lengthMeters: number | null;
  slotStatus: string;
  source: string;
  pricePerDay: number;
  availableFrom: string | null;
  availableTo: string | null;
  distanceMeters: number | null;
};

export type SlotProposal = {
  slotId: number;
  slotCode: string;
  latitude: number;
  longitude: number;
  proposalReviewStatus: string;
  proposalPhotoUrl: string;
  proposalReviewReason: string | null;
  createdAt: string;
};

export type RentalApplication = {
  applicationId: number;
  registrationId: number;
  slotId: number;
  applicationMethod: string;
  requestedTermDays: number;
  applicationStatus: string;
  reviewDecisionReason: string | null;
  reviewedAt: string | null;
  createdAt: string;
};

export type RentalContract = {
  contractId: number;
  applicationId: number;
  slotId: number;
  slotCode: string;
  zoneName: string;
  startDate: string;
  endDate: string;
  contractStatus: string;
  cancellationReason: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string | null;
};

export type RenewalRequest = {
  renewalId: number;
  contractId: number;
  requestedTermDays: number;
  renewalStatus: string;
  newEndDate: string | null;
  reviewDecisionReason: string | null;
  reviewedAt: string | null;
  createdAt: string;
};

export type DigitalPermit = {
  permitId: number;
  contractId: number;
  qrPayload: string;
  startDate: string;
  endDate: string;
  permitStatus: string;
  contractStatus: string;
  effectiveStatus: string;
};

export type AddressChangeRequest = {
  addressChangeId: number;
  registrationId: number;
  newAddress: string;
  newLatitude: number | null;
  newLongitude: number | null;
  releasedContractId: number | null;
  requestedNewSlotId: number | null;
  changeStatus: string;
  conflictResolutionNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
};

export type SlotTransferRequest = {
  transferId: number;
  contractId: number;
  fromVendorId: number;
  toVendorId: number;
  transferStatus: string;
  initiatedAt: string;
  acceptedAt: string | null;
  reviewDecisionReason: string | null;
  reviewedAt: string | null;
};

export type SearchSlotsParams =
  | { lat: number; lng: number; radiusMeters: number; wardUnitId?: number; take?: number }
  | {
      minLat: number;
      maxLat: number;
      minLng: number;
      maxLng: number;
      wardUnitId?: number;
      take?: number;
    };

type ApiSession = {
  token: string;
  generation: number;
  connect: (token: string) => void;
  disconnect: () => void;
};

export const useVendorApiSession = create<ApiSession>()(
  persist(
    (set) => ({
      token: '',
      generation: 0,
      connect: (token) => set((state) => ({ token, generation: state.generation + 1 })),
      disconnect: () => set((state) => ({ token: '', generation: state.generation + 1 })),
    }),
    {
      name: 'streetbiz-vendor-api',
      storage: createJSONStorage(() => sessionStorage),
      partialize: ({ token, generation }) => ({ token, generation }),
    },
  ),
);

export class SideApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function sideRequest<T>(
  path: string,
  init: RequestInit = {},
  token = useVendorApiSession.getState().token,
): Promise<T> {
  const base = env.apiBaseUrl.replace(/\/$/, '');
  if (!base) throw new SideApiError(0, 'Chưa cấu hình VITE_API_BASE_URL cho Backend.');
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
    throw new SideApiError(
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
    if (response.status === 401 && token === useVendorApiSession.getState().token)
      useVendorApiSession.getState().disconnect();
    throw new SideApiError(
      response.status,
      Object.values(problem.errors ?? {})[0]?.[0] ??
        problem.detail ??
        problem.title ??
        (response.status === 401
          ? 'Phiên đã hết hạn hoặc token không hợp lệ. Vui lòng kết nối lại.'
          : response.status === 403
            ? 'Bạn không có quyền thực hiện thao tác này.'
            : response.status === 409
              ? 'Yêu cầu xung đột với trạng thái hiện tại.'
              : response.status === 422
                ? 'Không thoả điều kiện nghiệp vụ.'
                : 'Không thể xử lý yêu cầu.'),
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function query(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined) as [
    string,
    string | number,
  ][];
  return entries.length ? '?' + entries.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&') : '';
}

/**
 * There is no GET /api/auth/me on the backend, so VendorConnection reads the
 * phone number and role straight out of the JWT payload instead of an extra
 * round trip. A bad/expired token is caught the normal way: the first real
 * call 401s and sideRequest above disconnects the session.
 */
export function decodeVendorToken(token: string): { phone: string; role: string } | null {
  try {
    const segment = token.split('.')[1];
    if (!segment) return null;
    const payload = JSON.parse(atob(segment.replace(/-/g, '+').replace(/_/g, '/')));
    const role = payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ?? payload.role;
    return typeof payload.phone === 'string' && typeof role === 'string'
      ? { phone: payload.phone, role }
      : null;
  } catch {
    return null;
  }
}

export const sideApi = {
  // SIDE-01/02
  searchSlots: (params: SearchSlotsParams) =>
    sideRequest<SidewalkSlot[]>(`/sidewalk-slots${query(params as Record<string, number>)}`),
  getSlot: (slotId: number) => sideRequest<SidewalkSlot>(`/sidewalk-slots/${slotId}`),

  // SIDE-03A/03B/04
  submitOpenSlotApplication: (body: {
    registrationId: number;
    slotId: number;
    requestedTermDays: number;
  }) =>
    sideRequest<{ message: string; data: RentalApplication }>(
      '/vendor/rental-applications/open-slot',
      { method: 'POST', body: JSON.stringify(body) },
    ),
  submitAdjacentApplication: (body: {
    registrationId: number;
    slotId: number;
    requestedTermDays: number;
  }) =>
    sideRequest<{ message: string; data: RentalApplication }>(
      '/vendor/rental-applications/adjacent',
      { method: 'POST', body: JSON.stringify(body) },
    ),
  listApplications: () => sideRequest<RentalApplication[]>('/vendor/rental-applications'),
  getApplication: (applicationId: number) =>
    sideRequest<RentalApplication>(`/vendor/rental-applications/${applicationId}`),
  withdrawApplication: (applicationId: number) =>
    sideRequest<{ message: string }>(`/vendor/rental-applications/${applicationId}/withdraw`, {
      method: 'POST',
    }),

  // SIDE-05/06/07/08
  listContracts: (status?: string) =>
    sideRequest<RentalContract[]>(`/vendor/rental-contracts${query({ status })}`),
  getContract: (contractId: number) =>
    sideRequest<RentalContract>(`/vendor/rental-contracts/${contractId}`),
  requestRenewal: (contractId: number, requestedTermDays: number) =>
    sideRequest<{ message: string; data: RenewalRequest }>(
      `/vendor/rental-contracts/${contractId}/renewals`,
      { method: 'POST', body: JSON.stringify({ requestedTermDays }) },
    ),
  listRenewals: (contractId: number) =>
    sideRequest<RenewalRequest[]>(`/vendor/rental-contracts/${contractId}/renewals`),
  cancelContract: (contractId: number, reason: string | null) =>
    sideRequest<{ message: string }>(`/vendor/rental-contracts/${contractId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  getPermit: (contractId: number) =>
    sideRequest<DigitalPermit>(`/vendor/rental-contracts/${contractId}/permit`),

  // SIDE-11
  proposeSlot: (body: {
    registrationId: number;
    zoneId: number;
    latitude: number;
    longitude: number;
    widthMeters?: number;
    lengthMeters?: number;
    proposalPhotoUrl: string;
  }) =>
    sideRequest<{ message: string; data: SlotProposal }>('/vendor/slot-proposals', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  listProposals: () => sideRequest<SlotProposal[]>('/vendor/slot-proposals'),

  // SIDE-09/10
  requestAddressChange: (body: {
    registrationId: number;
    newAddress: string;
    newLatitude?: number | null;
    newLongitude?: number | null;
    releasedContractId?: number | null;
    requestedNewSlotId?: number | null;
  }) =>
    sideRequest<{ message: string; data: AddressChangeRequest }>('/vendor/address-changes', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  listAddressChanges: () => sideRequest<AddressChangeRequest[]>('/vendor/address-changes'),

  // SIDE-12/13
  requestTransfer: (body: { contractId: number; toVendorPhone: string }) =>
    sideRequest<{ message: string; data: SlotTransferRequest }>('/vendor/slot-transfers', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  listTransfers: (direction: 'outgoing' | 'incoming') =>
    sideRequest<SlotTransferRequest[]>(`/vendor/slot-transfers${query({ direction })}`),
  acceptTransfer: (transferId: number) =>
    sideRequest<{ message: string }>(`/vendor/slot-transfers/${transferId}/accept`, {
      method: 'POST',
    }),
  declineTransfer: (transferId: number) =>
    sideRequest<{ message: string }>(`/vendor/slot-transfers/${transferId}/decline`, {
      method: 'POST',
    }),
};
