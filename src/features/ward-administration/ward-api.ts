import { apiGet, apiGetBlob, apiPathFromFileUrl, apiPost, apiPut, apiUpload } from '@/core/api';

// Business-registration review ("registrations") is NOT a CaseKind: it goes through
// WardComplianceController's dedicated /ward/enrollments endpoints below (complianceApi),
// which enforce the BR-41 identity-verification gate. See RegistrationReviewScreen.
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
 * (`code: 'conflict'` for the 409 stale-status case the reviewer sees). complianceApi
 * below (WARD-04/05/06, 11..13) was migrated onto the same client for the same reason --
 * it used to share the old private fetch client and the same paste-a-JWT problem.
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
/** Mẫu số 01 Phụ lục II, Thông tư 68/2025/TT-BTC -- chủ hộ kinh doanh. */
export type WardOwnerProfile = {
  dateOfBirth: string | null;
  gender: string | null;
  ethnicity: string | null;
  nationality: string | null;
  idType: string | null;
  idIssuedDate: string | null;
  idIssuedPlace: string | null;
  permanentAddress: string | null;
  contactAddress: string | null;
};
export type WardBusinessProfile = {
  businessLine: string | null;
  businessLineCode: string | null;
  capitalAmount: number | null;
  laborCount: number | null;
  plannedStartDate: string | null;
};
export type WardHouseholdMember = {
  fullName: string;
  dateOfBirth: string | null;
  idNumber: string | null;
  relationshipToOwner: string | null;
  capitalContribution: number | null;
};
/** A server-recorded eKYC check. Scores are written where they are computed, never sent by
 * the applicant's browser, so a client cannot claim a similarity it did not get. */
export type WardKycCheck = {
  checkType: 'ID_CARD_OCR' | 'FACE_MATCH';
  provider: string;
  isMatch: boolean | null;
  similarityPercent: number | null;
  confidencePercent: number | null;
  warnings: string | null;
  createdAt: string;
};
export type WardEnrollmentDetail = WardEnrollmentItem & {
  latitude: number | null;
  longitude: number | null;
  reviewReason: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  evidence: WardEvidence[];
  aiCheck: AiDocumentCheck | null;
  ownerProfile: WardOwnerProfile;
  businessProfile: WardBusinessProfile;
  foodSafetyCommitmentAt: string | null;
  householdMembers: WardHouseholdMember[];
  /** BR-41 KYC gate: true only after an officer called confirmIdentity -- AI-OCR alone never
   * sets this, since it only reads/self-compares a photo and never queries the national
   * population database. decideEnrollment's APPROVE is refused server-side until this is true. */
  identityVerified: boolean;
  identityVerifiedAt: string | null;
  identityVerifiedByName: string | null;
  identityVerificationNote: string | null;
  kycChecks: WardKycCheck[];
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

// -- Renewal Review (WARD-09) --
export type WardRenewalItem = {
  id: string;
  contractId: number;
  slotCode: string;
  slotStreet: string;
  vendorName: string;
  status: string;
  requestedTermDays: number;
  currentEndDate: string;
  proposedEndDate: string;
  pricePerDay: number;
  totalFee: number;
  isFastTrackEligible: boolean;
  violationCount: number;
  createdAt: string;
  /** NĐ 241/2026 Điều 21: hạn xử lý 3 ngày làm việc, tính gần đúng bằng ngày lịch. */
  slaDueAt: string;
  isOverdue: boolean;
};
export type WardVendorComplianceScorecard = {
  totalInspections: number;
  violationCount: number;
  unpaidPenaltyCount: number;
  totalPenaltyAmount: number;
  reportCount: number;
  currentPermitStatus: string;
  isCleanRecord: boolean;
};
/** Idea 4 (WARD-09): batch fast-approval for the Fast-track filtered renewal queue. Each item
 * runs through the exact same precondition checks as a single decision -- a batch call never
 * skips a check a single approval would run, it just lets an officer fire many at once. */
export type WardRenewalBatchDecisionItemResult = {
  renewalId: number;
  success: boolean;
  errorMessage: string | null;
  newEndDate: string | null;
};
export type WardRenewalBatchDecisionResult = {
  totalRequested: number;
  successCount: number;
  failureCount: number;
  results: WardRenewalBatchDecisionItemResult[];
};
export type WardRenewalDetail = WardRenewalItem & {
  requestedTermDays: number;
  currentEndDate: string;
  proposedEndDate: string;
  remainingDaysOnCurrentContract: number;
  slotId: number;
  slotWidth: number;
  slotLength: number;
  pricePerDay: number;
  totalEstimatedFee: number;
  vendorId: number;
  vendorPhone: string;
  vendorType: string;
  registrationId: number;
  registrationStatus: string;
  reviewReason: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  canApprove: boolean;
  isFastTrackEligible: boolean;
  blockers: string[];
  scorecard: WardVendorComplianceScorecard;
};

export const complianceApi = {
  listEnrollments: (status?: string, page = 1) =>
    apiGet<WardEnrollmentItem[]>(
      `/ward/enrollments?${new URLSearchParams({ ...(status ? { status } : {}), page: String(page) })}`,
    ),
  getEnrollment: (id: string) => apiGet<WardEnrollmentDetail>(`/ward/enrollments/${id}`),
  decideEnrollment: (id: string, decision: string, reason: string, expectedStatus: string) =>
    apiPost<WardEnrollmentDetail>(`/ward/enrollments/${id}/decision`, { decision, reason, expectedStatus }),
  /** BR-41 KYC gate: officer confirms they compared the vendor against their physical/chip
   * CCCD. The backend refuses decideEnrollment's APPROVE until this has been called. */
  confirmIdentity: (id: string, note: string) =>
    apiPost<WardEnrollmentDetail>(`/ward/enrollments/${id}/confirm-identity`, { note }),

  listRentalApplications: (status?: string, page = 1) =>
    apiGet<WardRentalApplicationItem[]>(
      `/ward/rental-applications?${new URLSearchParams({ ...(status ? { status } : {}), page: String(page) })}`,
    ),
  getRentalApplication: (id: string) =>
    apiGet<WardRentalApplicationDetail>(`/ward/rental-applications/${id}`),
  decideRentalApplication: (id: string, decision: string, reason: string, expectedStatus: string) =>
    apiPost<WardRentalApplicationDetail>(`/ward/rental-applications/${id}/decision`, {
      decision,
      reason,
      expectedStatus,
    }),

  // -- Renewal Applications (WARD-09) --
  listRenewals: (status?: string, page = 1) =>
    apiGet<WardRenewalItem[]>(
      `/ward/renewals?${new URLSearchParams({ ...(status ? { status } : {}), page: String(page) })}`,
    ),
  getRenewal: (id: string) => apiGet<WardRenewalDetail>(`/ward/renewals/${id}`),
  decideRenewal: (id: string, decision: string, reason: string, expectedStatus: string) =>
    apiPost<WardRenewalDetail>(`/ward/renewals/${id}/decision`, {
      decision,
      reason,
      expectedStatus,
    }),
  /** Idea 4: batch-approve renewals an officer has selected from the Fast-track filtered queue. */
  batchDecideRenewals: (
    items: { renewalId: number; expectedStatus: string }[],
    decision: string,
    reason: string,
  ) =>
    apiPost<WardRenewalBatchDecisionResult>('/ward/renewals/batch-decision', {
      items: items.map((i) => ({ renewalId: i.renewalId, expectedStatus: i.expectedStatus })),
      decision,
      reason,
    }),

  inspectPermit: (
    permitCodeOrPayload: string,
    latitude?: number,
    longitude?: number,
    inspectionPhotoUrl?: string,
  ) =>
    apiPost<InspectPermitResult>('/ward/permits/inspect', {
      permitCodeOrPayload,
      latitude,
      longitude,
      inspectionPhotoUrl,
    }),
  permitAction: (permitId: number, action: 'SUSPEND' | 'REVOKE', reason: string) =>
    apiPost<boolean>(`/ward/permits/${permitId}/action`, { action, reason }),

  listPenaltySchedules: () => apiGet<PenaltyScheduleItem[]>('/ward/penalty-schedules'),
  listViolations: (status?: string, page = 1) =>
    apiGet<WardViolationItem[]>(
      `/ward/violations?${new URLSearchParams({ ...(status ? { status } : {}), page: String(page) })}`,
    ),
  getViolation: (id: number) => apiGet<WardViolationDetail>(`/ward/violations/${id}`),
  recordViolation: (request: {
    contractId?: number;
    slotId?: number;
    vendorId?: number;
    violationType: string;
    description: string;
    evidenceUrl?: string;
  }) => apiPost<WardViolationDetail>('/ward/violations', request),
  sanctionViolation: (
    id: number,
    penaltyScheduleId: number,
    decisionNumber: string,
    signerName: string,
    signerTitle: string,
    notes?: string,
  ) =>
    apiPost<WardViolationDetail>(`/ward/violations/${id}/sanction`, {
      penaltyScheduleId,
      decisionNumber,
      signerName,
      signerTitle,
      notes,
    }),

  riskQueue: () => apiGet<WardRiskQueueItem[]>('/ward/insights/risk-queue'),
  patrolHeatmap: () => apiGet<WardPatrolHeatmapPoint[]>('/ward/insights/patrol-heatmap'),

  /** Server-authoritative: loads this registration's own stored evidence + declared profile and
   * checks biometric consent server-side. Never send an evidence list / declared name-address
   * from the client -- an earlier draft did, and its shape drifted out of sync with the backend
   * (which only ever needed the registration id). */
  aiDocumentExtract: (registrationId: string) =>
    apiPost<AiDocumentCheck>('/ward/ai/document-extract', { registrationId: Number(registrationId) }),

  aiEncroachmentCheck: (photoUrl: string, slotWidth?: number, slotLength?: number) =>
    apiPost<AiEncroachment>('/ward/ai/encroachment-check', { photoUrl, slotWidth, slotLength }),

  askVendorAssistant: (question: string, context?: string) =>
    apiPost<{ answer: string; isAiGenerated: boolean }>('/ward/ai/vendor-assistant', { question, context }),

  /** Shared with REG-02; UploadsController also authorizes WARD_AUTHORITY for WARD-11/12 evidence. */
  uploadEvidence: (file: File): Promise<{ fileUrl: string }> => {
    const form = new FormData();
    form.append('file', file);
    return apiUpload<{ fileUrl: string }>('/uploads/evidence', form);
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
