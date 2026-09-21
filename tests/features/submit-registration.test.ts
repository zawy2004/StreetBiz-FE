import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiRegistration } from '@/core/api';

const api = vi.hoisted(() => ({
  uploadEvidenceFile: vi.fn(),
  submit: vi.fn(),
  update: vi.fn(),
  get: vi.fn(),
  submitEvidence: vi.fn(),
}));

vi.mock('@/core/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/api')>();
  return { ...actual, vendorRegistrationApi: api };
});

const { useNewRegistrationStore } = await import(
  '@/features/business-registrations/new-registration-store'
);
const { submitRegistrationDraft } = await import(
  '@/features/business-registrations/submit-registration'
);

const created: ApiRegistration = {
  registrationId: 42,
  vendorType: 'FIXED_STOREFRONT',
  displayName: 'Xoi ga Ba Nam',
  declaredAddress: '12 Le Duan',
  addressLatitude: null,
  addressLongitude: null,
  wardUnitId: 10,
  registrationStatus: 'SUBMITTED',
  fastTrackFlag: false,
  reviewDecisionReason: null,
  reviewedAt: null,
  createdAt: '2026-09-16T00:00:00Z',
  updatedAt: null,
  ownerDateOfBirth: null,
  ownerGender: null,
  ownerEthnicity: null,
  ownerNationality: null,
  idType: null,
  idIssuedDate: null,
  idIssuedPlace: null,
  permanentAddress: null,
  contactAddress: null,
  businessLine: null,
  businessLineCode: null,
  capitalAmount: null,
  laborCount: null,
  plannedStartDate: null,
  foodSafetyCommitmentAt: null,
  identityVerifiedAt: null,
  identityVerificationNote: null,
  householdMembers: [],
};

function file(name: string) {
  return new File(['x'], name, { type: 'image/jpeg' });
}

beforeEach(() => {
  vi.resetAllMocks();
  useNewRegistrationStore.getState().reset();
  const s = useNewRegistrationStore.getState();
  s.setField('vendorType', 'FIXED_STOREFRONT');
  s.setField('displayName', 'Xoi ga Ba Nam');
  s.setField('declaredAddress', '12 Le Duan');
  s.setField('wardUnitId', 10);
  s.addEvidence({ evidenceType: 'IDENTITY_DOCUMENT', uri: 'preview-1', label: 'CCCD', file: file('id.jpg') });
  s.addEvidence({ evidenceType: 'BUSINESS_LICENSE', uri: 'preview-2', label: 'GPKD', file: file('gpkd.jpg') });

  api.uploadEvidenceFile.mockImplementation(async (f: File) => ({
    fileUrl: `/api/uploads/evidence/1/${f.name}`,
    contentType: 'image/jpeg',
    sizeBytes: 1,
  }));
  api.submit.mockResolvedValue(created);
  api.update.mockResolvedValue(created);
  api.submitEvidence.mockResolvedValue({});
});

describe('submitRegistrationDraft', () => {
  it('uploads files, creates the application, then attaches the uploaded URLs', async () => {
    await submitRegistrationDraft();

    expect(api.uploadEvidenceFile).toHaveBeenCalledTimes(2);
    expect(api.submit).toHaveBeenCalledWith(
      expect.objectContaining({ vendorType: 'FIXED_STOREFRONT', wardUnitId: 10 }),
    );
    expect(api.submitEvidence).toHaveBeenCalledWith(42, {
      evidenceType: 'IDENTITY_DOCUMENT',
      fileUrl: '/api/uploads/evidence/1/id.jpg',
      ocrExtractedData: null,
      biometricConsent: false,
    });
    // Never the browser-only preview URL.
    for (const [, payload] of api.submitEvidence.mock.calls) {
      expect(payload.fileUrl).not.toMatch(/^blob:|^preview/);
    }
  });

  it('does not create the application when a file upload fails', async () => {
    api.uploadEvidenceFile.mockRejectedValueOnce(new Error('too large'));

    await expect(submitRegistrationDraft()).rejects.toThrow('too large');
    expect(api.submit).not.toHaveBeenCalled();
  });

  it('resumes after a partial failure instead of creating a second application (BR-09)', async () => {
    api.submitEvidence.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('network'));
    await expect(submitRegistrationDraft()).rejects.toThrow('network');

    await submitRegistrationDraft();

    expect(api.submit).toHaveBeenCalledTimes(1);
    expect(api.uploadEvidenceFile).toHaveBeenCalledTimes(2);
    // The retry updates the application it already created and attaches only the missing file.
    expect(api.update).toHaveBeenCalledWith(42, expect.anything());
    expect(api.submitEvidence).toHaveBeenCalledTimes(3);
    expect(api.submitEvidence.mock.calls[2]![1].evidenceType).toBe('BUSINESS_LICENSE');
  });

  it('updates rather than creates when editing an existing registration (REG-04)', async () => {
    useNewRegistrationStore.getState().setField('registrationId', 7);

    await submitRegistrationDraft();

    expect(api.update).toHaveBeenCalledWith(7, expect.anything());
    expect(api.submit).not.toHaveBeenCalled();
  });
});
