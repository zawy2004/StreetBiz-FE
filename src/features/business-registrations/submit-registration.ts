import { EVIDENCE_TYPE, vendorRegistrationApi, type ApiRegistration, type RegistrationPayload } from '@/core/api';
import { parseVndAmount, useNewRegistrationStore } from './new-registration-store';

/**
 * REG-01/02/04 against StreetBiz-BE, in resumable steps:
 *
 * 1. upload every picked file, in parallel (nothing is created if a file is rejected);
 * 2. create the registration as a DRAFT -- or update it when editing (REG-04);
 * 3. attach each uploaded file as evidence, replacing a document of the same type already on file;
 * 4. file the draft with the ward (only for `submitRegistrationDraft`; `saveRegistrationDraft`
 *    stops before this so the vendor can come back to it).
 *
 * Progress is written back to the wizard store as it happens, so if a step fails, pressing
 * submit again skips what already succeeded. Without that a retry would create a second
 * application and hit BR-09.
 */
async function saveRegistration(): Promise<ApiRegistration> {
  const store = useNewRegistrationStore.getState;

  await Promise.all(
    store()
      .evidence.filter((item) => !item.uploadedUrl && item.file)
      .map(async (item) => {
        const uploaded = await vendorRegistrationApi.uploadEvidenceFile(item.file!, (progress) =>
          store().patchEvidence(item.evidenceType, { progress }),
        );
        store().patchEvidence(item.evidenceType, { uploadedUrl: uploaded.fileUrl, progress: 1 });
      }),
  );

  const draft = store();
  if (!draft.displayName.trim() || !draft.wardUnitId) {
    throw new Error('Vui lòng hoàn thành thông tin hộ kinh doanh và chọn phường/xã ở các bước trước.');
  }

  const payload: RegistrationPayload = {
    vendorType: draft.vendorType,
    displayName: draft.displayName.trim(),
    declaredAddress: draft.declaredAddress.trim() || null,
    addressLatitude: draft.addressLatitude,
    addressLongitude: draft.addressLongitude,
    wardUnitId: draft.wardUnitId,
    ownerDateOfBirth: draft.ownerDateOfBirth || null,
    ownerGender: draft.ownerGender || null,
    ownerEthnicity: draft.ownerEthnicity.trim() || null,
    ownerNationality: draft.ownerNationality.trim() || null,
    idType: draft.idType || null,
    idIssuedDate: draft.idIssuedDate || null,
    idIssuedPlace: draft.idIssuedPlace.trim() || null,
    permanentAddress: draft.permanentAddress.trim() || null,
    contactAddress: draft.contactAddress.trim() || null,
    businessLine: draft.businessLine.trim() || null,
    businessLineCode: draft.businessLineCode.trim() || null,
    capitalAmount: parseVndAmount(draft.capitalAmount),
    laborCount: draft.laborCount.trim() ? Number(draft.laborCount) : null,
    plannedStartDate: draft.plannedStartDate || null,
    foodSafetyCommitment: draft.foodSafetyCommitment,
    householdMembers: draft.householdMembers
      .filter((m) => m.fullName.trim())
      .map((m) => ({
        fullName: m.fullName.trim(),
        dateOfBirth: m.dateOfBirth || null,
        idNumber: m.idNumber.trim() || null,
        relationshipToOwner: m.relationshipToOwner.trim() || null,
        capitalContribution: parseVndAmount(m.capitalContribution),
      })),
  };

  // Editing, or retrying after this wizard already created the application: update
  // it, which also applies anything the user changed before retrying. Idempotent.
  const existingId = draft.registrationId ?? draft.createdRegistrationId;

  let registration: ApiRegistration;
  if (existingId !== null) {
    registration = await vendorRegistrationApi.update(existingId, payload);
  } else {
    registration = await vendorRegistrationApi.submit(payload);
    store().setField('createdRegistrationId', registration.registrationId);
  }

  const pending = store().evidence.filter((item) => !item.attached && item.uploadedUrl);
  if (pending.length > 0) {
    // A document of the same type already on file is replaced, not duplicated.
    const onFile =
      existingId !== null ? (await vendorRegistrationApi.get(registration.registrationId)).evidence : [];
    for (const item of pending) {
      for (const old of onFile.filter((e) => e.evidenceType === item.evidenceType)) {
        await vendorRegistrationApi.removeEvidence(registration.registrationId, old.evidenceId);
      }
      await vendorRegistrationApi.submitEvidence(registration.registrationId, {
        evidenceType: item.evidenceType,
        fileUrl: item.uploadedUrl!,
        ocrExtractedData: null,
        // Only meaningful for the ID photo -- ward's AI-OCR document check reads this,
        // never inferred from other checkboxes.
        biometricConsent: item.evidenceType === EVIDENCE_TYPE.identityDocument && draft.biometricConsent,
      });
      store().patchEvidence(item.evidenceType, { attached: true });
    }
  }

  return registration;
}

/** Saves everything entered so far without sending it to the ward. */
export const saveRegistrationDraft = saveRegistration;

/** Saves, then files the registration with the ward when it is still a draft. */
export async function submitRegistrationDraft(): Promise<ApiRegistration> {
  const registration = await saveRegistration();
  // Editing a filed registration (REG-04) is re-filed by the update itself.
  if (registration.registrationStatus === 'DRAFT') {
    return vendorRegistrationApi.file(registration.registrationId);
  }
  return registration;
}
