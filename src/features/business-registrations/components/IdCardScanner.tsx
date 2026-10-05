import { useState } from 'react';

import { Button, Card } from '@/components/common';
import { PhotoPicker } from '@/components/forms';
import { showToast } from '@/components/feedback';
import { AiHint } from '@/components/status';
import {
  errorMessage,
  EVIDENCE_TYPE,
  vendorKycApi,
  vendorRegistrationApi,
  type ApiEvidenceType,
  type KycFaceMatchResult,
  type KycIdCardExtraction,
} from '@/core/api';
import { isLiveApi } from '@/core/config/env';
import {
  EVIDENCE_LABELS,
  evidenceFileProblem,
  useNewRegistrationStore,
} from '../new-registration-store';
import {
  SCAN_FIELD_LABELS,
  displayScanValue,
  planScanMerge,
  type ScanField,
  type ScanSuggestion,
} from '../id-card-merge';

/**
 * REG-02 eKYC capture: both sides of the CCCD (OCR pre-fills the Mẫu số 01 fields below) plus
 * an optional portrait compared against the photo printed on the card.
 *
 * Every extracted value lands in the form as an editable suggestion — OCR misreads Vietnamese
 * diacritics often enough that locking the fields would be worse than typing them. A Ward
 * Authority officer still confirms identity by hand before the enrollment can be approved
 * (BR-41); nothing here approves anything.
 */
export function IdCardScanner() {
  const draft = useNewRegistrationStore();
  const [scanning, setScanning] = useState(false);
  const [matching, setMatching] = useState(false);
  const [extraction, setExtraction] = useState<KycIdCardExtraction | null>(null);
  const [faceMatch, setFaceMatch] = useState<KycFaceMatchResult | null>(null);
  const [error, setError] = useState<string>();
  // Fields the scan filled in (so they can be double-checked) and values that disagree with what
  // the user typed (offered as a choice, never applied silently).
  const [filled, setFilled] = useState<ScanField[]>([]);
  const [conflicts, setConflicts] = useState<ScanSuggestion[]>([]);
  // Files still travelling to the server; the scan needs the stored URL, not the local picture.
  const [uploading, setUploading] = useState(0);

  const photo = (type: ApiEvidenceType) => draft.evidence.find((e) => e.evidenceType === type);
  const front = photo(EVIDENCE_TYPE.identityDocument);
  const back = photo(EVIDENCE_TYPE.identityDocumentBack);
  const selfie = photo(EVIDENCE_TYPE.portraitSelfie);

  /** Uploads immediately: the eKYC endpoints take a stored file URL, not raw bytes. */
  const pick = async (type: ApiEvidenceType, uri: string, file: File) => {
    draft.addEvidence({ evidenceType: type, uri, file, label: EVIDENCE_LABELS[type] });
    setError(undefined);
    if (!isLiveApi) return;

    setUploading((n) => n + 1);
    try {
      const uploaded = await vendorRegistrationApi.uploadEvidenceFile(file, (progress) =>
        draft.patchEvidence(type, { progress }),
      );
      draft.patchEvidence(type, { uploadedUrl: uploaded.fileUrl, progress: 1 });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUploading((n) => n - 1);
    }
  };

  const applyExtraction = (result: KycIdCardExtraction) => {
    const { fill, conflicts: disagreements } = planScanMerge(
      {
        ownerDateOfBirth: draft.ownerDateOfBirth,
        ownerGender: draft.ownerGender,
        ownerNationality: draft.ownerNationality,
        ownerEthnicity: draft.ownerEthnicity,
        permanentAddress: draft.permanentAddress,
        idIssuedDate: draft.idIssuedDate,
        idIssuedPlace: draft.idIssuedPlace,
      },
      result,
    );
    for (const [field, value] of Object.entries(fill) as [ScanField, string][]) {
      draft.setField(field, value as never);
    }
    setFilled(Object.keys(fill) as ScanField[]);
    setConflicts(disagreements);
  };

  const acceptSuggestion = (suggestion: ScanSuggestion) => {
    draft.setField(suggestion.field, suggestion.suggested as never);
    setFilled((current) => [...new Set([...current, suggestion.field])]);
    setConflicts((current) => current.filter((c) => c.field !== suggestion.field));
  };

  const scan = async () => {
    if (!draft.biometricConsent) {
      setError('Vui lòng đồng ý cho phép đối soát dữ liệu sinh trắc học trước khi quét CCCD.');
      return;
    }
    if (!front) {
      setError('Vui lòng tải ảnh mặt trước CCCD.');
      return;
    }
    if (!front.uploadedUrl) {
      setError(uploading > 0 ? 'Ảnh đang được tải lên, vui lòng chờ vài giây rồi thử lại.' : 'Không tải được ảnh mặt trước CCCD. Vui lòng chọn lại ảnh.');
      return;
    }

    setScanning(true);
    setError(undefined);
    try {
      const result = await vendorKycApi.extractIdCard({
        frontFileUrl: front.uploadedUrl,
        backFileUrl: back?.uploadedUrl ?? null,
        biometricConsent: draft.biometricConsent,
      });
      setExtraction(result);
      applyExtraction(result);
      showToast(
        result.isAiGenerated
          ? 'Đã đọc thông tin từ CCCD — vui lòng kiểm tra lại từng trường.'
          : result.summary,
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setScanning(false);
    }
  };

  const runFaceMatch = async () => {
    if (!draft.biometricConsent) {
      setError('Vui lòng đồng ý cho phép đối soát dữ liệu sinh trắc học trước khi đối chiếu khuôn mặt.');
      return;
    }
    if (!selfie?.uploadedUrl || !front?.uploadedUrl) {
      setError('Cần cả ảnh chân dung và ảnh mặt trước CCCD để đối chiếu.');
      return;
    }

    setMatching(true);
    setError(undefined);
    try {
      const result = await vendorKycApi.matchFace({
        selfieFileUrl: selfie.uploadedUrl,
        idCardFrontFileUrl: front.uploadedUrl,
        biometricConsent: draft.biometricConsent,
      });
      setFaceMatch(result);
      showToast(result.summary);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setMatching(false);
    }
  };

  return (
    <Card>
      <div className="flex flex-col gap-sm">
        <div>
          <p className="text-headline-sm text-text">Quét CCCD để tự động điền</p>
          <p className="mt-1 text-body-sm text-muted">
            Tải ảnh <strong>cả hai mặt</strong> CCCD: mặt trước có số, họ tên, ngày sinh, giới tính,
            quốc tịch, địa chỉ; mặt sau có dân tộc, ngày cấp và nơi cấp. Thông tin đọc được chỉ là
            gợi ý — bạn kiểm tra và sửa lại bên dưới trước khi nộp.
          </p>
        </div>

        <label className="flex items-start gap-sm rounded-sm border border-border bg-bg p-sm">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 shrink-0"
            checked={draft.biometricConsent}
            onChange={(e) => draft.setField('biometricConsent', e.target.checked)}
          />
          <span className="text-body-sm text-text">
            Tôi đồng ý <strong>riêng biệt</strong> cho phép hệ thống xử lý ảnh CCCD và ảnh chân dung
            của tôi bằng công nghệ nhận dạng (OCR, đối chiếu khuôn mặt) theo Luật Bảo vệ dữ liệu cá
            nhân 2025 (Nghị định 356/2025/NĐ-CP). Không đồng ý vẫn nộp hồ sơ được — bạn tự nhập
            thông tin và cán bộ phường đối chiếu giấy tờ trực tiếp.
          </span>
        </label>

        <div className="flex flex-wrap gap-sm">
          <PhotoPicker
            label={EVIDENCE_LABELS[EVIDENCE_TYPE.identityDocument]}
            uri={front?.uri}
            progress={front?.progress}
            uploaded={Boolean(front?.uploadedUrl)}
            validate={evidenceFileProblem}
            onInvalid={setError}
            onChange={(uri, file) => pick(EVIDENCE_TYPE.identityDocument, uri, file)}
            onRemove={() => draft.removeEvidence(EVIDENCE_TYPE.identityDocument)}
          />
          <PhotoPicker
            label={EVIDENCE_LABELS[EVIDENCE_TYPE.identityDocumentBack]}
            uri={back?.uri}
            progress={back?.progress}
            uploaded={Boolean(back?.uploadedUrl)}
            validate={evidenceFileProblem}
            onInvalid={setError}
            onChange={(uri, file) => pick(EVIDENCE_TYPE.identityDocumentBack, uri, file)}
            onRemove={() => draft.removeEvidence(EVIDENCE_TYPE.identityDocumentBack)}
          />
          <PhotoPicker
            label={EVIDENCE_LABELS[EVIDENCE_TYPE.portraitSelfie]}
            uri={selfie?.uri}
            progress={selfie?.progress}
            uploaded={Boolean(selfie?.uploadedUrl)}
            validate={evidenceFileProblem}
            onInvalid={setError}
            onChange={(uri, file) => pick(EVIDENCE_TYPE.portraitSelfie, uri, file)}
            onRemove={() => draft.removeEvidence(EVIDENCE_TYPE.portraitSelfie)}
          />
        </div>

        {isLiveApi ? (
          <div className="flex flex-wrap gap-sm">
            <Button
              label={scanning ? 'Đang đọc CCCD...' : 'Đọc thông tin từ ảnh CCCD'}
              variant="outline"
              fullWidth={false}
              loading={scanning}
              disabled={uploading > 0}
              onPress={scan}
            />
            <Button
              label={matching ? 'Đang đối chiếu...' : 'Đối chiếu khuôn mặt với CCCD'}
              variant="outline"
              fullWidth={false}
              loading={matching}
              onPress={runFaceMatch}
            />
          </div>
        ) : (
          <p className="text-body-sm text-muted">
            Chế độ demo không gọi dịch vụ eKYC thật — vui lòng nhập thông tin thủ công bên dưới.
          </p>
        )}

        {extraction ? (
          <AiHint title="Kết quả đọc CCCD (AI, chỉ để tham khảo)">
            <p>{extraction.summary}</p>
            <p className="mt-1 text-body-sm text-muted">
              Độ tin cậy {Math.round(extraction.confidencePercent)}%
              {extraction.needsManualVerification ? ' · cần kiểm tra kỹ từng trường' : ''}
            </p>
            {filled.length > 0 ? (
              <p className="mt-1 text-body-sm text-text">
                Đã điền: {filled.map((f) => SCAN_FIELD_LABELS[f]).join(', ')}. Vui lòng kiểm tra lại.
              </p>
            ) : null}
            {conflicts.length > 0 ? (
              <div className="mt-sm flex flex-col gap-xs">
                <p className="text-body-sm text-text">Khác với nội dung bạn đã nhập, giữ nguyên cho đến khi bạn chọn:</p>
                {conflicts.map((c) => (
                  <div key={c.field} className="flex items-center justify-between gap-sm rounded-sm border border-border bg-card p-xs">
                    <div className="min-w-0 text-body-sm">
                      <p className="text-muted">{SCAN_FIELD_LABELS[c.field]}</p>
                      <p className="text-text">Bạn nhập: {displayScanValue(c.field, c.current)}</p>
                      <p className="text-text">Đọc được: {displayScanValue(c.field, c.suggested)}</p>
                    </div>
                    <Button label="Dùng giá trị đọc được" variant="outline" fullWidth={false} onPress={() => acceptSuggestion(c)} />
                  </div>
                ))}
              </div>
            ) : null}
            {extraction.warnings.length > 0 ? (
              <ul className="mt-1 list-disc pl-4 text-body-sm text-error-ink">
                {extraction.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            ) : null}
          </AiHint>
        ) : null}

        {faceMatch ? (
          <AiHint title="Đối chiếu khuôn mặt (AI, chỉ để tham khảo)">
            <p>{faceMatch.summary}</p>
            {faceMatch.warnings.length > 0 ? (
              <ul className="mt-1 list-disc pl-4 text-body-sm text-error-ink">
                {faceMatch.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            ) : null}
            <p className="mt-1 text-body-sm text-muted">
              Kết quả này chỉ cho biết hai ảnh có cùng khuôn mặt hay không; cán bộ phường vẫn đối
              chiếu CCCD gốc trước khi duyệt hồ sơ.
            </p>
          </AiHint>
        ) : null}

        {error ? (
          <span role="alert" className="text-body-sm text-error">
            {error}
          </span>
        ) : null}
      </div>
    </Card>
  );
}
