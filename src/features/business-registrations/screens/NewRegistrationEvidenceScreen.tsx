import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/common';
import { PhotoPicker } from '@/components/forms';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { AiHint } from '@/components/status';
import { showToast } from '@/components/feedback';
import { errorMessage, EVIDENCE_TYPE, VENDOR_TYPE, type ApiEvidenceType } from '@/core/api';
import { env, isLiveApi } from '@/core/config/env';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';
import { Stepper } from '../components/Stepper';
import {
  EVIDENCE_LABELS,
  evidenceFileProblem,
  requiredEvidence,
  useNewRegistrationStore,
} from '../new-registration-store';
import { submitRegistrationDraft } from '../submit-registration';
import { REGISTRATIONS_KEY } from '../useRegistrations';

/**
 * REG-01 step 3: supporting documents, then submit.
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
  const slots: ApiEvidenceType[] = isEditing
    ? [...required, EVIDENCE_TYPE.addressProof]
    : required;

  const uriFor = (type: ApiEvidenceType) => draft.evidence.find((e) => e.evidenceType === type)?.uri;

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

  return (
    <Screen
      footer={
        <StickyActions>
          <Button
            label={isEditing ? 'Cập nhật & Gửi lại' : 'Nộp hồ sơ'}
            loading={submission.isPending}
            onPress={submit}
          />
        </StickyActions>
      }
    >
      <AppHeader title={isEditing ? 'Cập nhật hồ sơ' : 'Đăng ký kinh doanh'} back />
      <Stepper step={3} total={3} label="Giấy tờ minh chứng" />

      {env.enableAiCompliance ? (
        <AiHint title="Tự động điền từ giấy tờ">
          Tải ảnh rõ nét, hệ thống sẽ đọc và đối chiếu thông tin với dữ liệu bạn đã nhập ở bước
          trước.
        </AiHint>
      ) : null}

      <p className="text-body-sm text-muted">
        {isEditing
          ? 'Giấy tờ đã nộp trước đó vẫn được giữ. Chỉ tải thêm giấy tờ nếu Phường yêu cầu. Cập nhật sẽ gửi hồ sơ đi duyệt lại.'
          : 'Ảnh JPG, PNG, WEBP hoặc file PDF, tối đa 5 MB mỗi tệp.'}
      </p>

      <div className="flex flex-wrap gap-sm">
        {slots.map((type) => (
          <PhotoPicker
            key={type}
            label={EVIDENCE_LABELS[type]}
            uri={uriFor(type)}
            error={missing.includes(type)}
            accept="image/*,application/pdf"
            validate={evidenceFileProblem}
            onInvalid={setError}
            onChange={(uri, file) => {
              draft.addEvidence({ evidenceType: type, uri, file, label: EVIDENCE_LABELS[type] });
              setMissing((current) => current.filter((t) => t !== type));
              setError(undefined);
            }}
            onRemove={() => draft.removeEvidence(type)}
          />
        ))}
      </div>

      {error ? (
        <span role="alert" className="text-body-sm text-error">
          {error}
        </span>
      ) : null}
    </Screen>
  );
}
