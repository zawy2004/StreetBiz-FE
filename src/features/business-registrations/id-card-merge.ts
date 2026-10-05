import type { KycIdCardExtraction } from '@/core/api';

/** Form fields an ID card scan can suggest a value for. */
export type ScanField =
  | 'ownerDateOfBirth'
  | 'ownerGender'
  | 'ownerNationality'
  | 'ownerEthnicity'
  | 'permanentAddress'
  | 'idIssuedDate'
  | 'idIssuedPlace';

export const SCAN_FIELD_LABELS: Record<ScanField, string> = {
  ownerDateOfBirth: 'Ngày sinh',
  ownerGender: 'Giới tính',
  ownerNationality: 'Quốc tịch',
  ownerEthnicity: 'Dân tộc',
  permanentAddress: 'Địa chỉ thường trú',
  idIssuedDate: 'Ngày cấp',
  idIssuedPlace: 'Nơi cấp',
};

const GENDER_LABEL: Record<string, string> = { MALE: 'Nam', FEMALE: 'Nữ', OTHER: 'Khác' };

/** How a stored value reads to a person (gender codes become words, the rest is shown as typed). */
export function displayScanValue(field: ScanField, value: string): string {
  return field === 'ownerGender' ? (GENDER_LABEL[value] ?? value) : value;
}

export type ScanSuggestion = { field: ScanField; current: string; suggested: string };

/**
 * Splits a scan into what can be filled in safely and what disagrees with something the user
 * already typed. A value the user wrote is never overwritten silently: OCR misreads Vietnamese
 * diacritics often enough that the typed text may be the right one, so the officer-facing form
 * only changes what was empty, and the rest is offered as a choice.
 */
export function planScanMerge(
  current: Record<ScanField, string>,
  scan: KycIdCardExtraction,
): { fill: Partial<Record<ScanField, string>>; conflicts: ScanSuggestion[] } {
  const suggested: Partial<Record<ScanField, string | null>> = {
    ownerDateOfBirth: scan.dateOfBirth,
    ownerGender: scan.gender,
    ownerNationality: scan.nationality,
    ownerEthnicity: scan.ethnicity,
    permanentAddress: scan.permanentAddress,
    idIssuedDate: scan.idIssuedDate,
    idIssuedPlace: scan.idIssuedPlace,
  };

  const fill: Partial<Record<ScanField, string>> = {};
  const conflicts: ScanSuggestion[] = [];
  for (const field of Object.keys(suggested) as ScanField[]) {
    const value = suggested[field]?.trim();
    if (!value) continue;
    const existing = current[field].trim();
    if (existing === '') fill[field] = value;
    else if (existing.toLowerCase() !== value.toLowerCase()) {
      conflicts.push({ field, current: existing, suggested: value });
    }
  }
  return { fill, conflicts };
}
