import { useEffect, useId, useRef, useState } from 'react';

import { Button, Icon } from '@/components/common';
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
import { DocPicker, UploadBadge, type UploadState } from './wizard/DocPicker';
import { ConsentRow, IdCardFace, PortraitFace } from './wizard/OwnerParts';
import { playOnce } from './ui-motion';

/** Draft fields `applyExtraction` may fill, reported up so the form can tag them [AI]. */
export type AiFilledKey =
  | 'ownerDateOfBirth'
  | 'ownerGender'
  | 'ownerNationality'
  | 'ownerEthnicity'
  | 'permanentAddress'
  | 'idIssuedDate'
  | 'idIssuedPlace';

type Props = {
  /** Anchor for the step's section rail. */
  id?: string;
  /** Called with the fields OCR just wrote into the form. */
  onExtracted?: (keys: AiFilledKey[]) => void;
};

/**
 * REG-02 eKYC capture: both sides of the CCCD (OCR pre-fills the Mẫu số 01 fields below) plus
 * an optional portrait compared against the photo printed on the card.
 *
 * Every extracted value lands in the form as an editable suggestion — OCR misreads Vietnamese
 * diacritics often enough that locking the fields would be worse than typing them. A Ward
 * Authority officer still confirms identity by hand before the enrollment can be approved
 * (BR-41); nothing here approves anything.
 */
export function IdCardScanner({ id, onExtracted }: Props) {
  const draft = useNewRegistrationStore();
  const headingId = useId();
  const consentRef = useRef<HTMLDivElement>(null);
  const [scanning, setScanning] = useState(false);
  const [matching, setMatching] = useState(false);
  const [extraction, setExtraction] = useState<KycIdCardExtraction | null>(null);
  const [faceMatch, setFaceMatch] = useState<KycFaceMatchResult | null>(null);
  const [error, setError] = useState<string>();
  // Display only: where each upload stands. The upload call itself is unchanged.
  const [uploadState, setUploadState] = useState<Partial<Record<ApiEvidenceType, UploadState>>>({});

  const photo = (type: ApiEvidenceType) => draft.evidence.find((e) => e.evidenceType === type);
  const front = photo(EVIDENCE_TYPE.identityDocument);
  const back = photo(EVIDENCE_TYPE.identityDocumentBack);
  const selfie = photo(EVIDENCE_TYPE.portraitSelfie);

  /** Uploads immediately: the eKYC endpoints take a stored file URL, not raw bytes. */
  const pick = async (type: ApiEvidenceType, uri: string, file: File) => {
    draft.addEvidence({ evidenceType: type, uri, file, label: EVIDENCE_LABELS[type] });
    setError(undefined);
    if (!isLiveApi) return;

    setUploadState((s) => ({ ...s, [type]: 'uploading' }));
    try {
      const uploaded = await vendorRegistrationApi.uploadEvidenceFile(file);
      draft.patchEvidence(type, { uploadedUrl: uploaded.fileUrl });
      setUploadState((s) => ({ ...s, [type]: 'done' }));
    } catch (err) {
      setError(errorMessage(err));
      setUploadState((s) => ({ ...s, [type]: 'error' }));
    }
  };

  const remove = (type: ApiEvidenceType) => {
    draft.removeEvidence(type);
    setUploadState((s) => {
      const next = { ...s };
      delete next[type];
      return next;
    });
  };

  const applyExtraction = (result: KycIdCardExtraction): AiFilledKey[] => {
    const filled: AiFilledKey[] = [];
    if (result.dateOfBirth) {
      draft.setField('ownerDateOfBirth', result.dateOfBirth);
      filled.push('ownerDateOfBirth');
    }
    if (result.gender) {
      draft.setField('ownerGender', result.gender);
      filled.push('ownerGender');
    }
    if (result.nationality) {
      draft.setField('ownerNationality', result.nationality);
      filled.push('ownerNationality');
    }
    if (result.ethnicity) {
      draft.setField('ownerEthnicity', result.ethnicity);
      filled.push('ownerEthnicity');
    }
    if (result.permanentAddress) {
      draft.setField('permanentAddress', result.permanentAddress);
      filled.push('permanentAddress');
    }
    if (result.idIssuedDate) {
      draft.setField('idIssuedDate', result.idIssuedDate);
      filled.push('idIssuedDate');
    }
    if (result.idIssuedPlace) {
      draft.setField('idIssuedPlace', result.idIssuedPlace);
      filled.push('idIssuedPlace');
    }
    return filled;
  };

  const scan = async () => {
    if (!draft.biometricConsent) {
      setError('Vui lòng đồng ý cho phép đối soát dữ liệu sinh trắc học trước khi quét CCCD.');
      return;
    }
    if (!front?.uploadedUrl) {
      setError('Vui lòng tải ảnh mặt trước CCCD.');
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
      onExtracted?.(applyExtraction(result));
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
      setError(
        'Vui lòng đồng ý cho phép đối soát dữ liệu sinh trắc học trước khi đối chiếu khuôn mặt.',
      );
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

  const consentMissing = !!error && error.startsWith('Vui lòng đồng ý');
  useEffect(() => {
    if (!consentMissing) return;
    playOnce(
      consentRef.current,
      [
        { transform: 'translateX(0)' },
        { transform: 'translateX(-6px)' },
        { transform: 'translateX(6px)' },
        { transform: 'translateX(0)' },
      ],
      { duration: 240 },
    );
  }, [consentMissing, error]);

  const badgeFor = (type: ApiEvidenceType, uploadedUrl?: string) => {
    if (!isLiveApi) return undefined;
    const state = uploadState[type] ?? (uploadedUrl ? 'done' : undefined);
    return state ? <UploadBadge state={state} /> : undefined;
  };
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;

  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className="scroll-mt-[72px] flex flex-col gap-md rounded-[24px] bg-card p-md shadow-card ring-1 ring-border md:p-lg xl:scroll-mt-md"
    >
      <div>
        <h2
          id={headingId}
          className="flex flex-wrap items-center gap-xs font-sign text-[20px] font-extrabold leading-[26px] tracking-[-0.01em] text-text md:text-[24px] md:leading-[30px]"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary-bg text-on-secondary">
            <Icon name="creation" size={18} color="currentColor" weight="fill" />
          </span>
          Quét CCCD để tự động điền [AI]
        </h2>
        <p className="mt-xs text-body-md text-muted">
          Tải ảnh <strong className="text-text">cả hai mặt</strong> CCCD: mặt trước có số, họ tên,
          ngày sinh, giới tính, quốc tịch, địa chỉ; mặt sau có dân tộc, ngày cấp và nơi cấp. Thông
          tin đọc được chỉ là gợi ý — bạn kiểm tra và sửa lại bên dưới trước khi nộp.
        </p>
      </div>

      <div ref={consentRef}>
        <ConsentRow
          checked={draft.biometricConsent}
          onChange={(checked) => draft.setField('biometricConsent', checked)}
          invalid={consentMissing}
        >
          Tôi đồng ý <strong>riêng biệt</strong> cho phép hệ thống xử lý ảnh CCCD và ảnh chân dung
          của tôi bằng công nghệ nhận dạng (OCR, đối chiếu khuôn mặt) theo Luật Bảo vệ dữ liệu cá
          nhân 2025 (Nghị định 356/2025/NĐ-CP). Không đồng ý vẫn nộp hồ sơ được — bạn tự nhập thông
          tin và cán bộ phường đối chiếu giấy tờ trực tiếp.
        </ConsentRow>
      </div>

      <div className="relative grid gap-sm sm:grid-cols-2">
        <DocPicker
          label={EVIDENCE_LABELS[EVIDENCE_TYPE.identityDocument]}
          uri={front?.uri}
          fileType={front?.file?.type}
          validate={evidenceFileProblem}
          onInvalid={setError}
          onChange={(uri, file) => pick(EVIDENCE_TYPE.identityDocument, uri, file)}
          onRemove={() => remove(EVIDENCE_TYPE.identityDocument)}
          placeholder={<IdCardFace side="front" />}
          badge={badgeFor(EVIDENCE_TYPE.identityDocument, front?.uploadedUrl)}
          shape="card"
        />
        <DocPicker
          label={EVIDENCE_LABELS[EVIDENCE_TYPE.identityDocumentBack]}
          uri={back?.uri}
          fileType={back?.file?.type}
          validate={evidenceFileProblem}
          onInvalid={setError}
          onChange={(uri, file) => pick(EVIDENCE_TYPE.identityDocumentBack, uri, file)}
          onRemove={() => remove(EVIDENCE_TYPE.identityDocumentBack)}
          placeholder={<IdCardFace side="back" />}
          badge={badgeFor(EVIDENCE_TYPE.identityDocumentBack, back?.uploadedUrl)}
          shape="card"
        />
        {scanning ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 animate-[sb-shimmer_1.2s_linear_infinite] rounded-[14px] bg-[linear-gradient(90deg,transparent_0%,rgb(var(--c-secondary)/0.35)_45%,transparent_90%)] bg-[length:220%_100%]"
          />
        ) : null}
      </div>

      <div className="flex items-center gap-md">
        <DocPicker
          label={EVIDENCE_LABELS[EVIDENCE_TYPE.portraitSelfie]}
          uri={selfie?.uri}
          fileType={selfie?.file?.type}
          validate={evidenceFileProblem}
          onInvalid={setError}
          onChange={(uri, file) => pick(EVIDENCE_TYPE.portraitSelfie, uri, file)}
          onRemove={() => remove(EVIDENCE_TYPE.portraitSelfie)}
          placeholder={<PortraitFace />}
          need="không bắt buộc"
          badge={badgeFor(EVIDENCE_TYPE.portraitSelfie, selfie?.uploadedUrl)}
          shape="round"
          className="!w-[104px] shrink-0"
        />
        <p className="min-w-0 text-body-md text-muted">
          <span className="block text-[15px] font-semibold text-text">
            Ảnh chân dung (không bắt buộc)
          </span>
          Dùng để đối chiếu khuôn mặt với ảnh in trên CCCD.
        </p>
      </div>

      {isLiveApi ? (
        <div className="flex flex-col gap-xs">
          <div className="grid gap-sm sm:grid-cols-2">
            <Button
              label={scanning ? 'Đang đọc CCCD...' : 'Đọc thông tin từ ảnh CCCD'}
              variant="outline"
              loading={scanning}
              icon={<Icon name="creation" size={18} color="currentColor" />}
              onPress={scan}
            />
            <Button
              label={matching ? 'Đang đối chiếu...' : 'Đối chiếu khuôn mặt với CCCD'}
              variant="outline"
              loading={matching}
              icon={<Icon name="account-circle-outline" size={18} color="currentColor" />}
              onPress={runFaceMatch}
            />
          </div>
          {uploadState[EVIDENCE_TYPE.identityDocument] === 'uploading' ? (
            <p className="text-body-sm font-medium text-muted">
              Chờ ảnh mặt trước tải xong rồi hãy bấm đọc.
            </p>
          ) : null}
        </div>
      ) : (
        <p className="flex items-start gap-sm rounded-[14px] bg-sunken/70 p-sm text-body-md text-muted">
          <Icon
            name="information-outline"
            size={18}
            color="currentColor"
            className="mt-0.5 shrink-0"
          />
          Chế độ demo không gọi dịch vụ eKYC thật — vui lòng nhập thông tin thủ công bên dưới.
        </p>
      )}

      {extraction ? (
        <AiHint title="Kết quả đọc CCCD [AI - FPT.AI]">
          <p>{extraction.summary}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-sm gap-y-1 text-body-sm font-semibold text-text">
            <span>Độ tin cậy {extraction.confidencePercent}%</span>
            {extraction.needsManualVerification ? (
              <span className="rounded-full bg-[#FFF3D1] px-2 py-0.5 text-[#6B4100] dark:bg-[#3A2A08] dark:text-[#FFD27A]">
                Cần cán bộ đối chiếu thêm
              </span>
            ) : null}
          </p>
          {extraction.warnings.length > 0 ? (
            <ul className="mt-1 list-disc pl-4 text-body-sm text-danger">
              {extraction.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          ) : null}
        </AiHint>
      ) : null}

      {faceMatch ? (
        <AiHint title="Đối chiếu khuôn mặt [AI - FPT.AI]">
          <p>{faceMatch.summary}</p>
          {faceMatch.warnings.length > 0 ? (
            <ul className="mt-1 list-disc pl-4 text-body-sm text-danger">
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
        <div
          role="alert"
          className="flex items-start gap-sm rounded-[14px] bg-[#FDEBEA] p-sm text-[14px] font-medium leading-5 text-[#8F1717] dark:bg-[#3A1414] dark:text-[#FF9A90]"
        >
          <Icon
            name="alert-circle-outline"
            size={18}
            color="currentColor"
            className="mt-0.5 shrink-0"
          />
          <span>
            {error}
            {offline ? <span className="block">Kiểm tra kết nối mạng rồi thử lại.</span> : null}
            {uploadState[EVIDENCE_TYPE.identityDocument] === 'error' ||
            uploadState[EVIDENCE_TYPE.identityDocumentBack] === 'error' ||
            uploadState[EVIDENCE_TYPE.portraitSelfie] === 'error' ? (
              <span className="block text-text/75">Chọn lại ảnh để thử tải lên lần nữa.</span>
            ) : null}
          </span>
        </div>
      ) : null}
    </section>
  );
}
