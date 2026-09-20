import { apiGet, apiGetBlob, apiPathFromFileUrl, apiPost, apiPut } from '@/core/api';

export type CaseKind = 'registrations' | 'proposals' | 'conflicts' | 'transfers';
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
  /** REG-02 documents attached to a registration case; empty for slot cases. */
  documents: WardDocument[] | null;
  /** REG-06: flagged for expedited handling. */
  fastTrack: boolean;
};
export type WardDocument = {
  evidenceType: string;
  fileUrl: string;
  uploadedAt: string;
};
export type WardProfile = { userId: string; wardId: number; name: string };
export type CasePage = { items: WardCase[]; page: number; hasMore: boolean };

/**
 * Ward endpoints go through the app's shared axios client, so a signed-in ward
 * officer's ordinary session is the only credential involved. They used to run on
 * a private fetch client with its own token in sessionStorage, which meant an
 * officer had to paste a JWT by hand before they could review anything.
 *
 * What that buys us, for free: the bearer is attached by the request interceptor,
 * an expired access token is refreshed once and the call retried, a revoked
 * session clears the app session and redirects to sign-in, and every failure
 * arrives as an `ApiError` carrying the backend's own Vietnamese message
 * (`code: 'conflict'` for the 409 stale-status case the reviewer sees).
 */
export const wardApi = {
  me: () => apiGet<WardProfile>('/ward/me'),
  list: (kind: CaseKind, page: number) => apiGet<CasePage>(`/ward/cases/${kind}?page=${page}`),
  get: (kind: CaseKind, id: string) =>
    apiGet<WardCase>(`/ward/cases/${kind}/${encodeURIComponent(id)}`),
  decide: (record: WardCase, decision: string, reason: string) =>
    apiPost<WardCase>(`/ward/cases/${record.kind}/${record.id}/decision`, {
      decision,
      reason,
      expectedStatus: record.status,
    }),
  search: (address: string) =>
    apiGet<{ label: string; point: GeoPoint }[]>(
      `/ward/geo/search?address=${encodeURIComponent(address)}`,
    ),
  verify: (point: GeoPoint) => apiPost<GeoResult>('/ward/geo/verify', point),
  pin: (id: string, point: GeoPoint) =>
    apiPut<WardCase>(`/ward/cases/proposals/${id}/location`, point),

  /**
   * Evidence files require the bearer token (PRI-02), so they are fetched as a blob
   * rather than linked. `fileUrl` is origin-relative and already starts with /api,
   * which the client's baseURL also ends in - hence apiPathFromFileUrl.
   */
  document: async (fileUrl: string): Promise<string> =>
    URL.createObjectURL(await apiGetBlob(apiPathFromFileUrl(fileUrl))),
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
  registrations: 'Hồ sơ đăng ký',
  proposals: 'Đề xuất vị trí',
  conflicts: 'Xung đột địa chỉ',
  transfers: 'Chuyển nhượng ô',
};
export const actionLabels: Record<string, string> = {
  APPROVE: 'Phê duyệt',
  REJECT: 'Từ chối',
  QUEUE: 'Đưa vào hàng chờ',
  REVIEW: 'Nhận xét duyệt',
  REQUEST_INFO: 'Yêu cầu bổ sung',
};
export const statusLabels: Record<string, string> = {
  PENDING: 'Chờ xử lý',
  SUBMITTED: 'Chờ xét duyệt',
  UNDER_REVIEW: 'Đang xét duyệt',
  MORE_INFORMATION_REQUIRED: 'Chờ bổ sung giấy tờ',
  ACCEPTED_BY_RECEIVER: 'Bên nhận đã đồng ý',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Đã từ chối',
  WITHDRAWN: 'Đã rút',
};

/**
 * UNDER_REVIEW means "under review" for a registration but "queued for the slot"
 * for an address conflict, so the label depends on the case kind.
 */
export function statusLabel(kind: CaseKind, status: string): string {
  if (kind === 'conflicts' && status === 'UNDER_REVIEW') return 'Đang xếp hàng';
  return statusLabels[status] ?? status;
}

export const evidenceLabels: Record<string, string> = {
  IDENTITY_DOCUMENT: 'CCCD gắn chip',
  BUSINESS_LICENSE: 'Giấy phép kinh doanh',
  ADDRESS_PROOF: 'Giấy tờ địa chỉ',
  OTHER: 'Giấy tờ khác',
};
