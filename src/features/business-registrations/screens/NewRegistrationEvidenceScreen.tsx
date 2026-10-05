import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/common';
import { FormAlert } from '@/components/feedback';
import { PhotoPicker } from '@/components/forms';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { AiHint } from '@/components/status';
import { EVIDENCE_TYPE, type ApiEvidenceType } from '@/core/api';
import { env } from '@/core/config/env';
import { EvidencePreview } from '../components/EvidencePreview';
import { Stepper } from '../components/Stepper';
import {
  EVIDENCE_LABELS,
  evidenceFileProblem,
  requiredEvidence,
  useNewRegistrationStore,
} from '../new-registration-store';
import { useRegistrationEvidence } from '../useRegistrationEvidence';

/**
 * REG-01 step 4: supporting documents. The next step reads everything back before it is sent.
 *
 * MSG14: a new application needs the identity document, and a fixed storefront also its business
 * licence. Documents already stored on the server (an earlier session, or a registration being
 * edited under REG-04) count as present; picking a new file for the same slot replaces them.
 */
export function NewRegistrationEvidenceScreen() {
  const navigate = useNavigate();
  const draft = useNewRegistrationStore();

  const [error, setError] = useState<string>();
  const [missing, setMissing] = useState<ApiEvidenceType[]>([]);
  // Slots whose stored document the vendor chose to replace.
  const [replacing, setReplacing] = useState<ApiEvidenceType[]>([]);

  const isEditing = draft.registrationId !== null;
  const serverId = draft.registrationId ?? draft.createdRegistrationId;
  const onServer = useRegistrationEvidence(serverId).data ?? [];
  const required = requiredEvidence(draft.vendorType);
  // When editing, offer the same slots plus proof of address for "more information" requests.
  const slots: ApiEvidenceType[] = isEditing ? [...required, EVIDENCE_TYPE.addressProof] : required;

  const localFor = (type: ApiEvidenceType) => draft.evidence.find((e) => e.evidenceType === type);
  const storedFor = (type: ApiEvidenceType) => onServer.find((e) => e.evidenceType === type);

  const next = () => {
    const absent = required.filter((type) => !localFor(type) && !storedFor(type));
    setMissing(absent);
    if (absent.length > 0) {
      setError(`Vui lòng tải ${absent.map((t) => EVIDENCE_LABELS[t].toLowerCase()).join(' và ')}.`);
      return;
    }
    setError(undefined);
    navigate('/vendor/registrations/new/review');
  };

  return (
    <Screen
      footer={
        <StickyActions>
          <Button label="Xem lại hồ sơ" onPress={next} />
        </StickyActions>
      }
    >
      <AppHeader title={isEditing ? 'Cập nhật hồ sơ' : 'Đăng ký kinh doanh'} back />
      <Stepper step={4} total={5} label="Giấy tờ minh chứng" />

      {env.enableAiCompliance ? (
        <AiHint title="Tự động điền từ giấy tờ">
          Tải ảnh rõ nét, hệ thống sẽ đọc và đối chiếu thông tin với dữ liệu bạn đã nhập ở bước
          trước.
        </AiHint>
      ) : null}

      <p className="text-body-sm text-muted">
        {isEditing
          ? 'Giấy tờ đã nộp trước đó vẫn được giữ. Chỉ tải thêm giấy tờ nếu Phường yêu cầu. Cập nhật sẽ gửi hồ sơ đi duyệt lại.'
          : 'Ảnh JPG, PNG, WEBP hoặc file PDF, tối đa 5 MB mỗi tệp. Tệp được tải lên khi bạn nộp hồ sơ.'}
      </p>

      <div className="flex flex-wrap gap-sm">
        {slots.map((type) => {
          const local = localFor(type);
          const stored = storedFor(type);

          // A document already on the server and not being replaced: show it, offer to swap it.
          if (!local && stored && !replacing.includes(type)) {
            return (
              <div key={type} className="flex flex-col items-center gap-2xs">
                <EvidencePreview evidence={stored} />
                <Button
                  label="Thay tệp khác"
                  variant="ghost"
                  fullWidth={false}
                  onPress={() => setReplacing((current) => [...current, type])}
                />
              </div>
            );
          }

          return (
            <PhotoPicker
              key={type}
              label={EVIDENCE_LABELS[type]}
              uri={local?.uri}
              error={missing.includes(type)}
              accept="image/*,application/pdf"
              validate={evidenceFileProblem}
              onInvalid={setError}
              progress={local?.progress}
              uploaded={local?.attached || Boolean(local?.uploadedUrl)}
              onChange={(uri, file) => {
                draft.addEvidence({ evidenceType: type, uri, file, label: EVIDENCE_LABELS[type] });
                setMissing((current) => current.filter((t) => t !== type));
                setError(undefined);
              }}
              onRemove={() => {
                draft.removeEvidence(type);
                // Back to the stored document, if there is one.
                setReplacing((current) => current.filter((t) => t !== type));
              }}
            />
          );
        })}
      </div>

      {slots.includes(EVIDENCE_TYPE.identityDocument) ? (
        <label className="flex items-start gap-sm rounded-sm border border-border bg-card p-md">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 shrink-0"
            checked={draft.biometricConsent}
            onChange={(e) => draft.setField('biometricConsent', e.target.checked)}
          />
          <span className="text-body-sm text-text">
            Tôi đồng ý <strong>riêng biệt</strong> để hệ thống dùng công nghệ nhận diện quang học
            (OCR) đối soát ảnh CCCD/CMND theo Luật Bảo vệ dữ liệu cá nhân 2025 (Nghị định
            356/2025/NĐ-CP). Không đồng ý vẫn nộp hồ sơ được — cán bộ phường sẽ đối chiếu giấy tờ
            thủ công thay vì tự động.
          </span>
        </label>
      ) : null}

      <FormAlert message={error} />
    </Screen>
  );
}
