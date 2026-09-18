import { create } from 'zustand';

import {
  EVIDENCE_ACCEPTED_TYPES,
  EVIDENCE_MAX_BYTES,
  EVIDENCE_TYPE,
  VENDOR_TYPE,
  type ApiEvidenceType,
  type ApiVendorType,
} from '@/core/api';

/** One picked document, held locally until it is uploaded and attached (REG-02). */
export type DraftEvidence = {
  evidenceType: ApiEvidenceType;
  /** Object URL used for the preview only. */
  uri: string;
  label: string;
  /** The picked file; absent in mock mode seeds. */
  file?: File;
  /** URL returned by POST /api/uploads/evidence once the file is stored. */
  uploadedUrl?: string;
  /** True once the URL has been attached to the registration. */
  attached?: boolean;
};

/**
 * REG-01/REG-02 wizard state. Field names follow the backend's
 * SubmitRegistrationRequest so the submit step is a direct mapping.
 */
type Draft = {
  /** Set when the wizard is editing an existing registration (REG-04). */
  registrationId: number | null;
  /**
   * Id of the registration this wizard already created. Submitting is several
   * requests (upload, create, attach), so a retry after a partial failure must
   * resume instead of creating a second application.
   */
  createdRegistrationId: number | null;
  vendorType: ApiVendorType;
  displayName: string;
  declaredAddress: string;
  addressLatitude: number | null;
  addressLongitude: number | null;
  wardUnitId: number | null;
  evidence: DraftEvidence[];
};

type NewRegistrationState = Draft & {
  setField: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
  addEvidence: (file: DraftEvidence) => void;
  removeEvidence: (evidenceType: ApiEvidenceType) => void;
  patchEvidence: (evidenceType: ApiEvidenceType, patch: Partial<DraftEvidence>) => void;
  /** Seeds the wizard from an existing registration for REG-04. */
  loadForEdit: (draft: Partial<Draft> & { registrationId: number }) => void;
  reset: () => void;
};

const initial: Draft = {
  registrationId: null,
  createdRegistrationId: null,
  vendorType: VENDOR_TYPE.itinerant,
  displayName: '',
  declaredAddress: '',
  addressLatitude: null,
  addressLongitude: null,
  wardUnitId: null,
  evidence: [],
};

/** Evidence the user is asked for, by vendor type (MSG14). */
export function requiredEvidence(vendorType: ApiVendorType): ApiEvidenceType[] {
  return vendorType === VENDOR_TYPE.fixedStorefront
    ? [EVIDENCE_TYPE.identityDocument, EVIDENCE_TYPE.businessLicense]
    : [EVIDENCE_TYPE.identityDocument];
}

export const EVIDENCE_LABELS: Record<ApiEvidenceType, string> = {
  IDENTITY_DOCUMENT: 'CCCD gắn chip',
  BUSINESS_LICENSE: 'Giấy phép kinh doanh',
  ADDRESS_PROOF: 'Giấy tờ địa chỉ',
  OTHER: 'Giấy tờ khác',
};

/**
 * Parses an optional decimal coordinate as the user types.
 *
 * `Number('16.06.78')` or `Number('abc')` is `NaN`, and `JSON.stringify` turns a
 * `NaN` into `null` silently — so a typo would submit as "no coordinate" with no
 * feedback at all. Returning `undefined` for anything unparseable lets the caller
 * discard the keystroke instead, so the field only ever holds a valid number.
 */
export function parseOptionalCoordinate(text: string): number | null | undefined {
  if (text.trim() === '') return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** Client-side mirror of the backend's upload rules, checked when a file is picked. */
export function evidenceFileProblem(file: File): string | undefined {
  if (!EVIDENCE_ACCEPTED_TYPES.includes(file.type)) {
    return 'Chỉ chấp nhận ảnh JPG, PNG, WEBP hoặc file PDF.';
  }
  if (file.size > EVIDENCE_MAX_BYTES) return 'Dung lượng file tối đa 5 MB.';
  return undefined;
}

function revoke(items: DraftEvidence[]) {
  for (const item of items) {
    if (item.uri.startsWith('blob:')) URL.revokeObjectURL(item.uri);
  }
}

/** Holds in-progress REG-01/02 form state across the multi-step wizard routes. */
export const useNewRegistrationStore = create<NewRegistrationState>((set, get) => ({
  ...initial,
  setField: (key, value) => set({ [key]: value } as Partial<Draft>),
  addEvidence: (file) => {
    revoke(get().evidence.filter((e) => e.evidenceType === file.evidenceType));
    set((s) => ({
      evidence: [...s.evidence.filter((e) => e.evidenceType !== file.evidenceType), file],
    }));
  },
  removeEvidence: (evidenceType) => {
    revoke(get().evidence.filter((e) => e.evidenceType === evidenceType));
    set((s) => ({ evidence: s.evidence.filter((e) => e.evidenceType !== evidenceType) }));
  },
  patchEvidence: (evidenceType, patch) =>
    set((s) => ({
      evidence: s.evidence.map((e) => (e.evidenceType === evidenceType ? { ...e, ...patch } : e)),
    })),
  loadForEdit: (draft) => {
    revoke(get().evidence);
    set({ ...initial, ...draft });
  },
  reset: () => {
    revoke(get().evidence);
    set(initial);
  },
}));
