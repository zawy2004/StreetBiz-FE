import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Button, Icon } from '@/components/common';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { AiHint } from '@/components/status';
import { showToast } from '@/components/feedback';
import { errorMessage, EVIDENCE_TYPE, VENDOR_TYPE, type ApiEvidenceType } from '@/core/api';
import { env, isLiveApi } from '@/core/config/env';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';
import { useCachedWards } from '../components/cached-data';
import { playOnce, prefersReducedMotion } from '../components/ui-motion';
import { DocPicker } from '../components/wizard/DocPicker';
import {
  DocProgressBadge,
  EvidenceEnvelope,
  NeedChip,
  ReviewSheet,
  SubmitPipeline,
} from '../components/wizard/EvidenceParts';
import { pipelineState, reviewItems } from '../components/wizard/evidence-review';
import { ConsentRow } from '../components/wizard/OwnerParts';
import { DocMiniArt } from '../components/wizard/TypeParts';
import {
  DraftNotice,
  EditingBanner,
  WizardProgress,
  WizardQuestion,
} from '../components/wizard/WizardFrame';
import {
  EVIDENCE_LABELS,
  evidenceFileProblem,
  requiredEvidence,
  useNewRegistrationStore,
} from '../new-registration-store';
import { submitRegistrationDraft } from '../submit-registration';
import { REGISTRATIONS_KEY } from '../useRegistrations';

const DOC_ART: Partial<
  Record<ApiEvidenceType, 'id-front' | 'id-back' | 'license' | 'address' | 'portrait'>
> = {
  IDENTITY_DOCUMENT: 'id-front',
  IDENTITY_DOCUMENT_BACK: 'id-back',
  BUSINESS_LICENSE: 'license',
  ADDRESS_PROOF: 'address',
  PORTRAIT_SELFIE: 'portrait',
};

/**
 * REG-01 step 4: supporting documents, then submit.
 *
 * MSG14: a new application needs the identity document, and a fixed storefront
 * also its business licence. When editing (REG-04) documents already on file
 * are kept, so new ones are optional — typically what the ward asked for.
 */
export function NewRegistrationEvidenceScreen() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const draft = useNewRegistrationStore();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const registerVendor = useMockDb((s) => s.registerVendor);
  const submitMockRegistration = useMockDb((s) => s.submitRegistration);

  const [error, setError] = useState<string>();
  const [missing, setMissing] = useState<ApiEvidenceType[]>([]);

  const isEditing = draft.registrationId !== null;
  const required = requiredEvidence(draft.vendorType);
  // When editing, offer the same slots plus proof of address for "more information" requests.
  const slots: ApiEvidenceType[] = isEditing ? [...required, EVIDENCE_TYPE.addressProof] : required;

  const uriFor = (type: ApiEvidenceType) =>
    draft.evidence.find((e) => e.evidenceType === type)?.uri;

  const submission = useMutation({
    mutationFn: submitRegistrationDraft,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: REGISTRATIONS_KEY });
      draft.reset();
      showToast(isEditing ? 'Đã cập nhật và gửi lại hồ sơ' : 'Đã nộp hồ sơ đăng ký');
      navigate('/vendor/registrations', { replace: true });
    },
    onError: (err) => setError(errorMessage(err)),
  });

  const submit = () => {
    if (!isEditing && (!draft.displayName.trim() || !draft.wardUnitId)) {
      setError(
        'Thông tin bước 1 và 2 chưa đầy đủ (tên hộ kinh doanh, phường/xã). Vui lòng quay lại kiểm tra.',
      );
      return;
    }

    const absent = isEditing ? [] : required.filter((type) => !uriFor(type));
    setMissing(absent);
    if (absent.length > 0) {
      setError(`Vui lòng tải ${absent.map((t) => EVIDENCE_LABELS[t].toLowerCase()).join(' và ')}.`);
      return;
    }
    setError(undefined);

    if (isLiveApi) {
      submission.mutate();
      return;
    }

    submitMock();
    draft.reset();
    showToast('Đã nộp hồ sơ đăng ký');
    navigate('/vendor/registrations', { replace: true });
  };

  /** Offline demo path: write the registration into the mock database. */
  function submitMock() {
    if (!user) return;
    let vendorId = user.vendorId;
    if (!vendorId) {
      const vendor = registerVendor({
        userId: user.id,
        vendor_type: draft.vendorType,
        business_name: draft.displayName,
        owner_name: user.fullName,
        phone: user.phone,
        address: draft.declaredAddress || undefined,
        ward_unit_type: 'Phường Hải Châu 1',
      });
      vendorId = vendor.id;
      setUser({ ...user, vendorId });
    }
    submitMockRegistration({
      vendorId,
      vendor_type: draft.vendorType,
      business_name: draft.displayName,
      owner_name: user.fullName,
      id_number: '',
      address: draft.declaredAddress || 'Lưu trú tại phường',
      ward_unit_type: 'Phường Hải Châu 1',
      fast_track: draft.vendorType === VENDOR_TYPE.fixedStorefront,
      evidence: draft.evidence.map((e) => ({ type: e.evidenceType, uri: e.uri, label: e.label })),
    });
  }

  // ---- presentation, read back from the store and the mutation ------------------------------

  const cardRefs = useRef<Partial<Record<ApiEvidenceType, HTMLDivElement | null>>>({});
  const previousMissing = useRef<ApiEvidenceType[]>([]);
  // A file the step asked for is missing (after pressing submit): shake it and bring the
  // first one into view. Picking one of them only shrinks the list, which does not shake.
  useEffect(() => {
    const shrank =
      missing.length < previousMissing.current.length &&
      missing.every((t) => previousMissing.current.includes(t));
    previousMissing.current = missing;
    if (missing.length === 0 || shrank) return;
    const first = missing[0];
    const el = first ? cardRefs.current[first] : null;
    el?.scrollIntoView?.({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'center' });
    for (const type of missing) {
      playOnce(
        cardRefs.current[type],
        [
          { transform: 'translateX(0)' },
          { transform: 'translateX(-6px)' },
          { transform: 'translateX(6px)' },
          { transform: 'translateX(0)' },
        ],
        { duration: 240 },
      );
    }
  }, [missing]);

  const wards = useCachedWards();
  const wardName = wards.find((w) => w.unitId === draft.wardUnitId)?.unitName ?? null;
  const review = reviewItems(draft, wardName);
  const pipeline = pipelineState(
    draft.evidence,
    draft.createdRegistrationId,
    submission.isPending,
    submission.isError,
  );
  const showPipeline = isLiveApi && (submission.isPending || submission.isError);
  const submitLabel = isEditing ? 'Cập nhật & Gửi lại' : 'Nộp hồ sơ';
  // The one file submitRegistrationDraft is uploading right now (it goes in order).
  const uploadingNow = submission.isPending
    ? draft.evidence.find((e) => e.file && !e.uploadedUrl)?.evidenceType
    : undefined;
  // Files already in the store that have no slot here (the portrait from step 3) still go with the file.
  const extras = draft.evidence.filter((e) => !slots.includes(e.evidenceType));

  const progressBadge = (type: ApiEvidenceType) => {
    const item = draft.evidence.find((e) => e.evidenceType === type);
    if (!item || !isLiveApi) return undefined;
    if (item.attached) return <DocProgressBadge state="attached" />;
    if (item.uploadedUrl) return <DocProgressBadge state="saved" />;
    if (submission.isPending)
      return <DocProgressBadge state={uploadingNow === type ? 'uploading' : 'waiting'} />;
    return undefined;
  };

  return (
    <Screen
      footer={
        <>
          {showPipeline ? <SubmitPipeline pipeline={pipeline} /> : null}
          <StickyActions>
            <Button label={submitLabel} loading={submission.isPending} onPress={submit} />
          </StickyActions>
        </>
      }
    >
      <AppHeader title={isEditing ? 'Cập nhật hồ sơ' : 'Đăng ký kinh doanh'} back />
      <WizardProgress step={4} />
      {isEditing ? <EditingBanner displayName={draft.displayName} /> : null}

      <div className="grid items-start gap-lg xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-xl">
        <div className="flex min-w-0 flex-col gap-md">
          <WizardQuestion
            hint={
              isEditing
                ? 'Giấy tờ đã nộp trước đó vẫn được giữ. Chỉ tải thêm giấy tờ nếu Phường yêu cầu. Cập nhật sẽ gửi hồ sơ đi duyệt lại.'
                : 'Ảnh JPG, PNG, WEBP hoặc file PDF, tối đa 5 MB mỗi tệp.'
            }
          >
            Giấy tờ minh chứng
          </WizardQuestion>

          {env.enableAiCompliance ? (
            <AiHint title="Tự động điền từ giấy tờ">
              Tải ảnh rõ nét, hệ thống sẽ đọc và đối chiếu thông tin với dữ liệu bạn đã nhập ở bước
              trước.
            </AiHint>
          ) : null}

          <EvidenceEnvelope title="Phong bì hồ sơ">
            {slots.map((type) => {
              const item = draft.evidence.find((e) => e.evidenceType === type);
              const sent = submission.isPending && !!item?.uploadedUrl;
              const need =
                isEditing || type === EVIDENCE_TYPE.addressProof ? 'optional' : 'required';
              return (
                <div
                  key={type}
                  ref={(el) => {
                    cardRefs.current[type] = el;
                  }}
                  className={`flex min-w-0 flex-col gap-xs transition-transform duration-[420ms] [transition-timing-function:var(--ease-out)] ${
                    sent ? 'translate-y-1 scale-[.97]' : ''
                  }`}
                >
                  <DocPicker
                    label={EVIDENCE_LABELS[type]}
                    uri={uriFor(type)}
                    fileType={item?.file?.type}
                    error={missing.includes(type)}
                    accept="image/*,application/pdf"
                    validate={evidenceFileProblem}
                    onInvalid={setError}
                    onChange={(uri, file) => {
                      draft.addEvidence({
                        evidenceType: type,
                        uri,
                        file,
                        label: EVIDENCE_LABELS[type],
                      });
                      setMissing((current) => current.filter((t) => t !== type));
                      setError(undefined);
                    }}
                    onRemove={() => draft.removeEvidence(type)}
                    need={need === 'required' ? 'bắt buộc' : 'thêm nếu cần'}
                    shape="sheet"
                    badge={progressBadge(type)}
                    className={item?.attached ? 'ring-[3px] !ring-tertiary' : ''}
                    placeholder={
                      <span className="flex flex-col items-center gap-1">
                        <DocMiniArt
                          kind={DOC_ART[type] ?? 'license'}
                          className="h-14 w-14 md:h-16 md:w-16"
                        />
                        <span className="flex items-center gap-1 text-[12.5px] font-semibold text-primary">
                          <Icon name="camera-plus-outline" size={15} color="currentColor" />
                          Chọn ảnh hoặc PDF
                        </span>
                      </span>
                    }
                  />
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span className="text-[15px] font-semibold leading-5 text-text">
                      {EVIDENCE_LABELS[type]}
                    </span>
                    <NeedChip need={need} />
                  </div>
                </div>
              );
            })}
            {extras.map((item) => (
              <div key={item.evidenceType} className="flex min-w-0 flex-col gap-xs">
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[16px] bg-card shadow-card ring-1 ring-border">
                  {item.file && !item.file.type.startsWith('image/') ? (
                    <span className="flex h-full w-full flex-col items-center justify-center gap-1">
                      <Icon
                        name="file-document-outline"
                        size={30}
                        color="currentColor"
                        className="text-muted"
                      />
                      <span className="text-body-sm font-semibold text-muted">Đã chọn file</span>
                    </span>
                  ) : (
                    <img src={item.uri} alt={item.label} className="h-full w-full object-cover" />
                  )}
                  {progressBadge(item.evidenceType) ? (
                    <span className="absolute bottom-2 left-2">
                      {progressBadge(item.evidenceType)}
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <span className="text-[15px] font-semibold leading-5 text-text">
                    {item.label}
                  </span>
                  <NeedChip need="fromStep3" />
                </div>
              </div>
            ))}
          </EvidenceEnvelope>

          {slots.includes(EVIDENCE_TYPE.identityDocument) ? (
            <ConsentRow
              checked={draft.biometricConsent}
              onChange={(checked) => draft.setField('biometricConsent', checked)}
              aside={
                draft.biometricConsent ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-card px-2 py-0.5 text-[12.5px] font-semibold text-[#0B5D33] ring-1 ring-tertiary/40 dark:text-[#8BE3B0]">
                    <Icon name="check" size={13} color="currentColor" />
                    Cùng một sự đồng ý với bước 3
                  </span>
                ) : null
              }
            >
              Tôi đồng ý <strong>riêng biệt</strong> để hệ thống dùng công nghệ nhận diện quang học
              (OCR) đối soát ảnh CCCD/CMND theo Luật Bảo vệ dữ liệu cá nhân 2025 (Nghị định
              356/2025/NĐ-CP). Không đồng ý vẫn nộp hồ sơ được — cán bộ phường sẽ đối chiếu giấy tờ
              thủ công thay vì tự động.
            </ConsentRow>
          ) : null}

          {error ? (
            <div
              role="alert"
              className="flex flex-col gap-xs rounded-[16px] bg-[#FDEBEA] p-md text-[15px] font-medium leading-[22px] text-[#8F1717] dark:bg-[#3A1414] dark:text-[#FF9A90]"
            >
              <span className="flex items-start gap-sm">
                <Icon
                  name="alert-circle-outline"
                  size={20}
                  color="currentColor"
                  className="mt-0.5 shrink-0"
                />
                <span>{error}</span>
              </span>
              {submission.isError && pipeline.partial ? (
                <span className="ml-[28px] rounded-[12px] bg-[#FFF3D1] p-sm text-[14px] leading-5 text-[#6B4100] dark:bg-[#3A2A08] dark:text-[#FFD27A]">
                  Đã lưu {pipeline.uploaded}/{pipeline.upload.total} giấy tờ
                  {pipeline.created ? ' và đã tạo hồ sơ' : ''}. Bấm “{submitLabel}” lần nữa để gửi
                  nốt, hồ sơ không bị tạo hai lần. Đừng tải lại trang.
                </span>
              ) : null}
            </div>
          ) : null}

          <div className="xl:hidden">
            <ReviewSheet items={review} />
          </div>
          <div className="xl:hidden">
            <DraftNotice />
          </div>
        </div>

        <aside className="hidden min-w-0 flex-col gap-md xl:sticky xl:top-0 xl:flex">
          <ReviewSheet items={review} />
          <DraftNotice />
        </aside>
      </div>
    </Screen>
  );
}
