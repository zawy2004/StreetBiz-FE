import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Button, Card, Divider, ListRow } from '@/components/common';
import { FormAlert, showToast } from '@/components/feedback';
import { AppHeader, Screen, Section, StickyActions } from '@/components/layout';
import { errorMessage, VENDOR_TYPE, type ApiEvidenceType } from '@/core/api';
import { isLiveApi } from '@/core/config/env';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';
import { Stepper } from '../components/Stepper';
import { EvidencePreview } from '../components/EvidencePreview';
import {
  EVIDENCE_LABELS,
  parseVndAmount,
  requiredEvidence,
  useNewRegistrationStore,
} from '../new-registration-store';
import { saveRegistrationDraft, submitRegistrationDraft } from '../submit-registration';
import { useRegistrationEvidence } from '../useRegistrationEvidence';
import { REGISTRATIONS_KEY } from '../useRegistrations';
import { vendorTypeLabel } from '../labels';

const NEW = '/vendor/registrations/new';

const GENDER_LABEL: Record<string, string> = { MALE: 'Nam', FEMALE: 'Nữ', OTHER: 'Khác' };

const dash = (value: string | number | null | undefined) =>
  value === null || value === undefined || value === '' ? 'Chưa nhập' : String(value);

function money(text: string) {
  const amount = parseVndAmount(text);
  return amount === null ? 'Chưa nhập' : `${amount.toLocaleString('vi-VN')} đ`;
}

/**
 * REG-01 step 5: read everything back, fix anything that is off, then send it to the ward.
 * Each block has an edit link that returns to its step; the draft is kept, so nothing is retyped.
 */
export function NewRegistrationReviewScreen() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const draft = useNewRegistrationStore();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const registerVendor = useMockDb((s) => s.registerVendor);
  const submitMockRegistration = useMockDb((s) => s.submitRegistration);

  const [error, setError] = useState<string>();
  const isEditing = draft.registrationId !== null;
  // Editing a draft is still a first filing; editing a filed registration re-files it.
  const isRefiling = isEditing && draft.editingStatus !== 'DRAFT';
  const serverId = draft.registrationId ?? draft.createdRegistrationId;
  const required = requiredEvidence(draft.vendorType);
  const onServer = useRegistrationEvidence(serverId);

  // A deep link or reload can land here with nothing entered; send the vendor back to the start.
  const hasBasics = draft.displayName.trim() !== '' && draft.wardUnitId !== null;
  useEffect(() => {
    if (!hasBasics) navigate(`${NEW}/type`, { replace: true });
  }, [hasBasics, navigate]);

  const attachedTypes = new Set<string>([
    ...draft.evidence.map((e) => e.evidenceType),
    ...(onServer.data ?? []).map((e) => e.evidenceType),
  ]);
  const missing = required.filter((type) => !attachedTypes.has(type));
  const uploading = draft.evidence.some((e) => e.progress !== undefined && e.progress < 1 && !e.uploadedUrl);

  const finish = async (message: string) => {
    await queryClient.invalidateQueries({ queryKey: REGISTRATIONS_KEY });
    draft.reset();
    showToast(message);
    navigate('/vendor/registrations', { replace: true });
  };

  const submission = useMutation({
    mutationFn: submitRegistrationDraft,
    onSuccess: () => finish(isRefiling ? 'Đã cập nhật và gửi lại hồ sơ' : 'Đã nộp hồ sơ đăng ký'),
    onError: (err) => setError(errorMessage(err)),
  });

  const saving = useMutation({
    mutationFn: saveRegistrationDraft,
    onSuccess: () => finish('Đã lưu bản nháp. Bạn có thể quay lại nộp sau.'),
    onError: (err) => setError(errorMessage(err)),
  });

  const busy = submission.isPending || saving.isPending;

  const submit = () => {
    if (missing.length > 0) {
      setError(`Còn thiếu: ${missing.map((t) => EVIDENCE_LABELS[t].toLowerCase()).join(', ')}.`);
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

  const edit = (step: string) => () => navigate(`${NEW}/${step}`);

  const block = (title: string, step: string, rows: [string, string][]) => (
    <Section
      title={title}
      action={<Button label="Sửa" variant="ghost" fullWidth={false} onPress={edit(step)} />}
    >
      <Card padded={false}>
        <div className="px-md">
          {rows.map(([label, value], index) => (
            <div key={label}>
              {index > 0 ? <Divider /> : null}
              <ListRow title={label} subtitle={value} />
            </div>
          ))}
        </div>
      </Card>
    </Section>
  );

  const members = draft.householdMembers.filter((m) => m.fullName.trim());
  const memberRows: [string, string][] =
    members.length > 0 ? [['Thành viên hộ gia đình', members.map((m) => m.fullName.trim()).join(', ')]] : [];

  return (
    <Screen
      footer={
        <StickyActions>
          {!isRefiling ? (
            <div className="flex-1">
              <Button
                label="Lưu nháp"
                variant="outline"
                loading={saving.isPending}
                disabled={busy && !saving.isPending}
                onPress={() => {
                  setError(undefined);
                  if (isLiveApi) saving.mutate();
                  else navigate('/vendor/registrations', { replace: true });
                }}
              />
            </div>
          ) : null}
          <div className="flex-1">
            <Button
              label={isRefiling ? 'Cập nhật & Gửi lại' : 'Nộp hồ sơ'}
              loading={submission.isPending}
              disabled={busy && !submission.isPending}
              onPress={submit}
            />
          </div>
        </StickyActions>
      }
    >
      <AppHeader title={isRefiling ? 'Cập nhật hồ sơ' : 'Đăng ký kinh doanh'} back />
      <Stepper step={5} total={5} label="Xem lại và nộp" />
      <p className="text-body-sm text-muted">
        Kiểm tra kỹ thông tin trước khi nộp. Sau khi nộp, cán bộ phường sẽ xem xét hồ sơ và bạn sẽ nhận được
        thông báo kết quả.
      </p>

      {block('Loại hình và địa điểm', 'details', [
        ['Loại hình', vendorTypeLabel(draft.vendorType)],
        ['Tên hộ kinh doanh', dash(draft.displayName)],
        ['Địa chỉ kinh doanh', dash(draft.declaredAddress)],
      ])}

      {block('Chủ hộ kinh doanh', 'owner', [
        ['Ngày sinh / Giới tính', `${dash(draft.ownerDateOfBirth)} · ${GENDER_LABEL[draft.ownerGender] ?? 'Chưa chọn'}`],
        ['Giấy tờ pháp lý', `${draft.idType || 'Chưa chọn'} · cấp ${dash(draft.idIssuedDate)} tại ${dash(draft.idIssuedPlace)}`],
        ['Địa chỉ thường trú', dash(draft.permanentAddress)],
        ['Ngành, nghề kinh doanh', dash(draft.businessLine)],
        ['Vốn / Lao động', `${money(draft.capitalAmount)} · ${dash(draft.laborCount)} lao động`],
        ['Ngày dự kiến bắt đầu', dash(draft.plannedStartDate)],
        ['Cam kết an toàn thực phẩm', draft.foodSafetyCommitment ? 'Đã cam kết' : 'Chưa cam kết'],
        ...memberRows,
      ])}

      <Section
        title="Giấy tờ minh chứng"
        action={<Button label="Sửa" variant="ghost" fullWidth={false} onPress={edit('evidence')} />}
      >
        <div className="flex flex-col gap-xs">
          {required.map((type: ApiEvidenceType) => (
            <div key={type} className="flex items-center justify-between gap-sm text-body-md">
              <span className="text-text">{EVIDENCE_LABELS[type]}</span>
              <span className={attachedTypes.has(type) ? 'text-tertiary-ink' : 'text-error'}>
                {attachedTypes.has(type) ? 'Đã có' : 'Còn thiếu'}
              </span>
            </div>
          ))}
        </div>
        {(onServer.data ?? []).length > 0 ? (
          <div className="mt-sm flex flex-row flex-wrap gap-sm">
            {(onServer.data ?? []).map((e) => (
              <EvidencePreview key={e.evidenceId} evidence={e} />
            ))}
          </div>
        ) : null}
      </Section>

      {uploading ? (
        <p role="status" className="text-body-sm text-muted">
          Đang tải giấy tờ lên: {draft.evidence.filter((e) => e.uploadedUrl).length}/{draft.evidence.length}
        </p>
      ) : null}
      <FormAlert message={error} />
    </Screen>
  );
}
