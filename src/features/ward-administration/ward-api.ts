import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { env } from '@/core/config/env';
import { getTokens } from '@/core/api/token-storage';

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
  token = useWardSession.getState().token || getTokens()?.accessToken,
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

// ---- Ward Review, Permit & Compliance (WARD-04..08, 11..13) ----

export type WardEvidence = { evidenceId: number; type: string; label: string; fileUrl: string };
export type AiDocumentCheck = {
  matchPercentage: number;
  isMatch: boolean;
  needsManualVerification: boolean;
  summary: string;
  discrepancies: string[];
  isAiGenerated: boolean;
};
export type WardEnrollmentItem = {
  id: string;
  displayName: string;
  ownerName: string;
  idNumber: string | null;
  vendorType: string;
  status: string;
  address: string;
  createdAt: string;
  fastTrack: boolean;
};
export type WardEnrollmentDetail = WardEnrollmentItem & {
  latitude: number | null;
  longitude: number | null;
  reviewReason: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  evidence: WardEvidence[];
  aiCheck: AiDocumentCheck | null;
};

export type WardRentalApplicationItem = {
  id: string;
  applicationMethod: string;
  requestedTermDays: number;
  status: string;
  vendorName: string;
  slotCode: string;
  slotStreet: string;
  pricePerDay: number;
  createdAt: string;
};
export type WardRentalApplicationDetail = WardRentalApplicationItem & {
  registrationId: number;
  registrationStatus: string;
  vendorPhone: string;
  slotId: number;
  slotWidth: number;
  slotLength: number;
  reviewReason: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  canApprove: boolean;
  blockers: string[];
};

export type AiEncroachment = {
  detectedEncroachment: boolean;
  encroachmentDistanceCm: number;
  analysis: string;
  visualCues: string[];
  isAiGenerated: boolean;
};
export type InspectPermitResult = {
  found: boolean;
  isValid: boolean;
  effectiveStatus: string;
  permitId: number | null;
  contractId: number | null;
  vendorId: number | null;
  vendorName: string | null;
  slotId: number | null;
  slotCode: string | null;
  slotStreet: string | null;
  width: number | null;
  length: number | null;
  startDate: string | null;
  endDate: string | null;
  distanceMeters: number | null;
  isLocationMatched: boolean;
  locationWarning: string | null;
  aiVisionResult: AiEncroachment | null;
};

export type PenaltyScheduleItem = {
  scheduleId: number;
  violationType: string;
  violationTypeName: string;
  penaltyAmount: number;
  legalBasis: string | null;
};
/** Fields mirror Mau MBB01 (Nghi dinh 118/2021/NĐ-CP). legalBasis is always copied verbatim
 * from the ward's own PenaltyFeeSchedules row on the backend -- never AI-authored text. */
export type AiLegalSuggestion = {
  violationType: string;
  penaltyScheduleId: number | null;
  legalBasis: string | null;
  suggestedPenaltyAmount: number | null;
  hanhViViPham: string;
  bienPhapKhacPhuc: string;
  isAiGenerated: boolean;
};
export type WardViolationItem = {
  violationId: number;
  contractId: number | null;
  slotCode: string | null;
  vendorName: string | null;
  violationType: string;
  violationTypeName: string;
  status: string;
  penaltyAmount: number | null;
  recordedAt: string;
  recordedByName: string;
};
export type WardViolationDetail = WardViolationItem & {
  slotId: number | null;
  vendorId: number | null;
  description: string | null;
  evidenceUrl: string | null;
  sanctionDecisionNumber: string | null;
  signerName: string | null;
  signerTitle: string | null;
  sanctionedAt: string | null;
  recentViolationCount90Days: number;
  aiSuggestion: AiLegalSuggestion | null;
};

export type WardRiskQueueItem = {
  registrationId: string;
  displayName: string;
  score: number;
  breakdown: { reason: string; points: number }[];
};
export type WardPatrolHeatmapPoint = {
  zoneId: number | null;
  zoneName: string | null;
  dayOfWeek: number;
  hourOfDay: number;
  violationCount: number;
};

export const complianceApi = {
  listEnrollments: (status?: string, page = 1) =>
    wardRequest<WardEnrollmentItem[]>(
      `/ward/enrollments?${new URLSearchParams({ ...(status ? { status } : {}), page: String(page) })}`,
    ),
  getEnrollment: (id: string) => wardRequest<WardEnrollmentDetail>(`/ward/enrollments/${id}`),
  decideEnrollment: (id: string, decision: string, reason: string, expectedStatus: string) =>
    wardRequest<WardEnrollmentDetail>(`/ward/enrollments/${id}/decision`, {
      method: 'POST',
      body: JSON.stringify({ decision, reason, expectedStatus }),
    }),

  listRentalApplications: (status?: string, page = 1) =>
    wardRequest<WardRentalApplicationItem[]>(
      `/ward/rental-applications?${new URLSearchParams({ ...(status ? { status } : {}), page: String(page) })}`,
    ),
  getRentalApplication: (id: string) =>
    wardRequest<WardRentalApplicationDetail>(`/ward/rental-applications/${id}`),
  decideRentalApplication: (id: string, decision: string, reason: string, expectedStatus: string) =>
    wardRequest<WardRentalApplicationDetail>(`/ward/rental-applications/${id}/decision`, {
      method: 'POST',
      body: JSON.stringify({ decision, reason, expectedStatus }),
    }),

  inspectPermit: (
    permitCodeOrPayload: string,
    latitude?: number,
    longitude?: number,
    inspectionPhotoUrl?: string,
  ) =>
    wardRequest<InspectPermitResult>('/ward/permits/inspect', {
      method: 'POST',
      body: JSON.stringify({ permitCodeOrPayload, latitude, longitude, inspectionPhotoUrl }),
    }),
  permitAction: (permitId: number, action: 'SUSPEND' | 'REVOKE', reason: string) =>
    wardRequest<boolean>(`/ward/permits/${permitId}/action`, {
      method: 'POST',
      body: JSON.stringify({ action, reason }),
    }),

  listPenaltySchedules: () => wardRequest<PenaltyScheduleItem[]>('/ward/penalty-schedules'),
  listViolations: (status?: string, page = 1) =>
    wardRequest<WardViolationItem[]>(
      `/ward/violations?${new URLSearchParams({ ...(status ? { status } : {}), page: String(page) })}`,
    ),
  getViolation: (id: number) => wardRequest<WardViolationDetail>(`/ward/violations/${id}`),
  recordViolation: (request: {
    contractId?: number;
    slotId?: number;
    vendorId?: number;
    violationType: string;
    description: string;
    evidenceUrl?: string;
  }) => wardRequest<WardViolationDetail>('/ward/violations', { method: 'POST', body: JSON.stringify(request) }),
  sanctionViolation: (
    id: number,
    penaltyScheduleId: number,
    decisionNumber: string,
    signerName: string,
    signerTitle: string,
    notes?: string,
  ) =>
    wardRequest<WardViolationDetail>(`/ward/violations/${id}/sanction`, {
      method: 'POST',
      body: JSON.stringify({ penaltyScheduleId, decisionNumber, signerName, signerTitle, notes }),
    }),

  riskQueue: () => wardRequest<WardRiskQueueItem[]>('/ward/insights/risk-queue'),
  patrolHeatmap: () => wardRequest<WardPatrolHeatmapPoint[]>('/ward/insights/patrol-heatmap'),

  /** Server-authoritative: loads this registration's own stored evidence + declared profile and
   * checks biometric consent server-side. Never send an evidence list / declared name-address
   * from the client -- an earlier draft did, and its shape drifted out of sync with the backend
   * (which only ever needed the registration id). */
  aiDocumentExtract: (registrationId: string) =>
    wardRequest<AiDocumentCheck>('/ward/ai/document-extract', {
      method: 'POST',
      body: JSON.stringify({ registrationId: Number(registrationId) }),
    }),

  aiEncroachmentCheck: (photoUrl: string, slotWidth?: number, slotLength?: number) =>
    wardRequest<AiEncroachment>('/ward/ai/encroachment-check', {
      method: 'POST',
      body: JSON.stringify({ photoUrl, slotWidth, slotLength }),
    }),

  askVendorAssistant: (question: string, context?: string) =>
    wardRequest<{ answer: string; isAiGenerated: boolean }>('/ward/ai/vendor-assistant', {
      method: 'POST',
      body: JSON.stringify({ question, context }),
    }),

  /** Shared with REG-02; UploadsController also authorizes WARD_AUTHORITY for WARD-11/12 evidence. */
  uploadEvidence: async (file: File): Promise<{ fileUrl: string }> => {
    const base = env.apiBaseUrl.replace(/\/$/, '');
    const form = new FormData();
    form.append('file', file);
    const token = useWardSession.getState().token || getTokens()?.accessToken;
    const response = await fetch(base + '/uploads/evidence', {
      method: 'POST',
      body: form,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      const problem = (await response.json().catch(() => ({}))) as { detail?: string; title?: string };
      throw new WardApiError(response.status, problem.detail ?? problem.title ?? 'Tải ảnh thất bại.');
    }
    return response.json() as Promise<{ fileUrl: string }>;
  },
};

export const violationTypeLabels: Record<string, string> = {
  UNAUTHORIZED_BUSINESS_USE: 'Sử dụng trái phép vỉa hè để kinh doanh',
  EXPIRED_OR_INVALID_PERMIT: 'Giấy phép hết hạn / sai nội dung',
  STREET_VENDING_RESTRICTED: 'Bán hàng rong tại tuyến phố cấm',
  HYGIENE_LITTERING: 'Vứt rác, mất vệ sinh vỉa hè',
  OBSTRUCT_PUBLIC_ORDER: 'Cản trở an ninh trật tự công cộng',
};

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
