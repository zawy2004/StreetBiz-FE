import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiRegistration } from '@/core/api';

const api = vi.hoisted(() => ({
  uploadEvidenceFile: vi.fn(),
  submit: vi.fn(),
  update: vi.fn(),
  get: vi.fn(),
  submitEvidence: vi.fn(),
  removeEvidence: vi.fn(),
  file: vi.fn(),
}));

vi.mock('@/core/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/api')>();
  return { ...actual, vendorRegistrationApi: api };
});

const { useNewRegistrationStore } = await import(
  '@/features/business-registrations/new-registration-store'
);
const { saveRegistrationDraft, submitRegistrationDraft } = await import(
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
  registrationStatus: 'DRAFT',
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
  api.removeEvidence.mockResolvedValue(undefined);
  api.get.mockResolvedValue({ evidence: [] });
  api.file.mockImplementation(async (id: number) => ({ ...created, registrationId: id, registrationStatus: 'SUBMITTED' }));
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

describe('draft filing', () => {
  it('files a new draft with the ward once its documents are attached', async () => {
    const result = await submitRegistrationDraft();

    expect(api.file).toHaveBeenCalledWith(42);
    expect(result.registrationStatus).toBe('SUBMITTED');
    // Filing happens after every document is attached, never before.
    expect(api.file.mock.invocationCallOrder[0]!).toBeGreaterThan(
      Math.max(...api.submitEvidence.mock.invocationCallOrder),
    );
  });

  it('saveRegistrationDraft keeps the registration private to the vendor', async () => {
    const result = await saveRegistrationDraft();

    expect(result.registrationStatus).toBe('DRAFT');
    expect(api.file).not.toHaveBeenCalled();
  });

  it('does not file again when editing a registration that is already with the ward (REG-04)', async () => {
    useNewRegistrationStore.getState().setField('registrationId', 7);
    api.update.mockResolvedValue({ ...created, registrationId: 7, registrationStatus: 'SUBMITTED' });

    await submitRegistrationDraft();

    expect(api.file).not.toHaveBeenCalled();
  });

  it('replaces a document of the same type that is already on file', async () => {
    useNewRegistrationStore.getState().setField('registrationId', 7);
    api.update.mockResolvedValue({ ...created, registrationId: 7, registrationStatus: 'SUBMITTED' });
    api.get.mockResolvedValue({
      evidence: [{ evidenceId: 99, evidenceType: 'IDENTITY_DOCUMENT', fileUrl: '/old', registrationId: 7, uploadedAt: '' }],
    });

    await submitRegistrationDraft();

    expect(api.removeEvidence).toHaveBeenCalledWith(7, 99);
    expect(api.removeEvidence).toHaveBeenCalledTimes(1);
  });

  it('uploads the files in parallel', async () => {
    let inFlight = 0;
    let peak = 0;
    api.uploadEvidenceFile.mockImplementation(async (f: File) => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight -= 1;
      return { fileUrl: `/api/uploads/evidence/1/${f.name}`, contentType: 'image/jpeg', sizeBytes: 1 };
    });

    await saveRegistrationDraft();

    expect(peak).toBe(2);
  });
});
