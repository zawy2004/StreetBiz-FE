import { apiGet, apiGetBlob, apiPathFromFileUrl, apiPost, apiPut, apiUpload } from './client';

/**
 * Mirrors StreetBiz-BE `VendorRegistrationController` (REG-01…REG-05).
 * Value sets come from `Application/Common/Security/VendorConstants.cs`.
 */

/** BusinessRegistrations.vendor_type (DB CHECK). */
export const VENDOR_TYPE = {
  fixedStorefront: 'FIXED_STOREFRONT',
  itinerant: 'ITINERANT',
} as const;

export type ApiVendorType = (typeof VENDOR_TYPE)[keyof typeof VENDOR_TYPE];

/** BusinessRegistrations.registration_status (DB CHECK). */
export type RegistrationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'MORE_INFORMATION_REQUIRED'
  | 'APPROVED'
  | 'REJECTED'
  | 'WITHDRAWN';

/** Statuses a vendor may still edit — mirrors `RegistrationStatuses.Editable`. */
export const EDITABLE_STATUSES: RegistrationStatus[] = [
  'DRAFT',
  'SUBMITTED',
  'MORE_INFORMATION_REQUIRED',
];

/** RegistrationEvidence.evidence_type (DB CHECK). */
export const EVIDENCE_TYPE = {
  identityDocument: 'IDENTITY_DOCUMENT',
  businessLicense: 'BUSINESS_LICENSE',
  addressProof: 'ADDRESS_PROOF',
  other: 'OTHER',
} as const;

export type ApiEvidenceType = (typeof EVIDENCE_TYPE)[keyof typeof EVIDENCE_TYPE];

export type ApiRegistration = {
  registrationId: number;
  vendorType: ApiVendorType;
  displayName: string;
  declaredAddress: string | null;
  addressLatitude: number | null;
  addressLongitude: number | null;
  wardUnitId: number;
  registrationStatus: RegistrationStatus;
  fastTrackFlag: boolean;
  reviewDecisionReason: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
};

export type ApiEvidence = {
  evidenceId: number;
  registrationId: number;
  evidenceType: ApiEvidenceType;
  fileUrl: string;
  uploadedAt: string;
};

export type ApiRegistrationDetail = {
  registration: ApiRegistration;
  evidence: ApiEvidence[];
};

export type UploadedFile = {
  fileUrl: string;
  contentType: string;
  sizeBytes: number;
};

/** Mirrors `EvidenceFiles` on the backend. */
export const EVIDENCE_MAX_BYTES = 5 * 1024 * 1024;
export const EVIDENCE_ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export type RegistrationPayload = {
  vendorType: ApiVendorType;
  displayName: string;
  declaredAddress: string | null;
  addressLatitude: number | null;
  addressLongitude: number | null;
  wardUnitId: number;
};

export type EvidencePayload = {
  evidenceType: ApiEvidenceType;
  fileUrl: string;
  ocrExtractedData: string | null;
  /** Separate, explicit consent to later run AI-OCR on this photo (WARD-04/05/06's document
   * check) -- only meaningful (and only sent as true) for IDENTITY_DOCUMENT uploads. Luat Bao
   * ve du lieu ca nhan 2025 / Nghi dinh 356/2025/ND-CP requires this consent to be its own
   * affirmative action, never bundled into a general terms checkbox. */
  biometricConsent?: boolean;
};

export const vendorRegistrationApi = {
  /** REG-01. The controller wraps the created row in `{ message, data }`. */
  submit: async (payload: RegistrationPayload) => {
    const response = await apiPost<{ message: string; data: ApiRegistration }>(
      '/vendor/registrations',
      payload,
    );
    return response.data;
  },

  /** REG-03 */
  list: () => apiGet<ApiRegistration[]>('/vendor/registrations'),

  /** REG-03 detail, with the evidence documents attached so far. */
  get: (registrationId: number) =>
    apiGet<ApiRegistrationDetail>(`/vendor/registrations/${registrationId}`),

  /** Stores a document and returns the URL to attach with `submitEvidence`. */
  uploadEvidenceFile: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiUpload<UploadedFile>('/uploads/evidence', form);
  },

  /** Evidence files require the bearer token, so they are fetched rather than linked. */
  downloadEvidenceFile: (fileUrl: string) => apiGetBlob(apiPathFromFileUrl(fileUrl)),

  /** REG-02 */
  submitEvidence: (registrationId: number, payload: EvidencePayload) =>
    apiPost<ApiEvidence>(`/vendor/registrations/${registrationId}/evidence`, payload),

  /** REG-04 — updating an editable registration also re-submits it for review. */
  update: (registrationId: number, payload: RegistrationPayload) =>
    apiPut<ApiRegistration>(`/vendor/registrations/${registrationId}`, payload),

  /** REG-05 */
  withdraw: (registrationId: number) =>
    apiPost<{ message: string }>(`/vendor/registrations/${registrationId}/withdraw`),
};
