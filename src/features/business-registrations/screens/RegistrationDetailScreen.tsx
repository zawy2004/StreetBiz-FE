import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Button, Card, Divider, ListRow } from '@/components/common';
import { AppHeader, Screen, Section, StickyActions } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { ConfirmDialog, ErrorState, LoadingState, showToast } from '@/components/feedback';
import { EDITABLE_STATUSES, errorMessage, VENDOR_TYPE } from '@/core/api';
import { useNewRegistrationStore } from '../new-registration-store';
import { EvidencePreview } from '../components/EvidencePreview';
import { useRegistrationDetail, useWithdrawRegistration } from '../useRegistrations';
import { vendorTypeLabel } from '../labels';

/** REG-03 detail, plus REG-04 (edit) and REG-05 (withdraw). */
export function RegistrationDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const registrationId = Number(id);

  const { registration, evidence, isLoading, isError, error, refetch } =
    useRegistrationDetail(registrationId);
  const withdraw = useWithdrawRegistration();
  const loadForEdit = useNewRegistrationStore((s) => s.loadForEdit);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);

  if (isLoading) {
    return (
      <Screen>
        <AppHeader title="Hồ sơ đăng ký" back />
        <LoadingState />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen>
        <AppHeader title="Hồ sơ đăng ký" back />
        <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
      </Screen>
    );
  }

  if (!registration) {
    return (
      <Screen>
        <AppHeader title="Hồ sơ đăng ký" back />
        <ErrorState message="Không tìm thấy hồ sơ." />
      </Screen>
    );
  }

  const canEdit = EDITABLE_STATUSES.includes(registration.registrationStatus);
  // Mirrors WithdrawRegistrationCommand: anything not already terminal. An approved
  // registration backing an active contract is refused by the backend (BR-16).
  const canWithdraw = !['WITHDRAWN', 'REJECTED'].includes(registration.registrationStatus);
  const isFixedApproved =
    registration.vendorType === VENDOR_TYPE.fixedStorefront &&
    registration.registrationStatus === 'APPROVED';
  const needsMoreInfo = registration.registrationStatus === 'MORE_INFORMATION_REQUIRED';

  const startEdit = () => {
    loadForEdit({
      registrationId: registration.registrationId,
      vendorType: registration.vendorType,
      displayName: registration.displayName,
      declaredAddress: registration.declaredAddress ?? '',
      addressLatitude: registration.addressLatitude,
      addressLongitude: registration.addressLongitude,
      wardUnitId: registration.wardUnitId,
    });
    navigate('/vendor/registrations/new/type');
  };

  const doWithdraw = async () => {
    try {
      await withdraw.mutateAsync(registration.registrationId);
      setConfirmWithdraw(false);
      showToast('Đã rút hồ sơ đăng ký');
      navigate('/vendor/registrations', { replace: true });
    } catch (err) {
      setConfirmWithdraw(false);
      showToast(errorMessage(err));
    }
  };

  return (
    <Screen
      footer={
        canEdit || canWithdraw ? (
          <StickyActions>
            {canWithdraw ? (
              <Button
                label="Rút hồ sơ"
                variant="outline"
                loading={withdraw.isPending}
                onPress={() => setConfirmWithdraw(true)}
              />
            ) : null}
            {canEdit ? <Button label="Chỉnh sửa" onPress={startEdit} /> : null}
          </StickyActions>
        ) : undefined
      }
    >
      <AppHeader title={registration.displayName} back />

      <Card>
        <div className="flex items-start justify-between gap-sm">
          <div className="flex flex-col gap-2xs">
            <span className="text-body-md text-muted">
              {vendorTypeLabel(registration.vendorType)}
            </span>
            <span className="text-body-sm text-muted">
              Nộp ngày {new Date(registration.createdAt).toLocaleDateString('vi-VN')}
            </span>
            {registration.reviewedAt ? (
              <span className="text-body-sm text-muted">
                Xét duyệt ngày {new Date(registration.reviewedAt).toLocaleDateString('vi-VN')}
              </span>
            ) : null}
          </div>
          <StatusChip code={registration.registrationStatus} />
        </div>
      </Card>

      {registration.reviewDecisionReason ? (
        <Card style={{ backgroundColor: '#FFDAD614', borderColor: '#BA1A1A33' }}>
          <p className="mb-1 text-label text-error">Phản hồi từ Phường</p>
          <p className="text-body-md text-text">{registration.reviewDecisionReason}</p>
          {needsMoreInfo ? (
            <p className="mt-xs text-body-sm text-muted">
              Cập nhật hồ sơ theo yêu cầu rồi gửi lại để được xét duyệt tiếp.
            </p>
          ) : null}
        </Card>
      ) : null}

      <Section title="Thông tin đã nộp">
        <Card padded={false}>
          <div className="px-md">
            <ListRow title="Tên hộ kinh doanh" subtitle={registration.displayName} />
            <Divider />
            <ListRow title="Loại hình" subtitle={vendorTypeLabel(registration.vendorType)} />
            <Divider />
            <ListRow
              title="Địa chỉ kinh doanh"
              subtitle={registration.declaredAddress ?? 'Không khai báo (bán hàng lưu động)'}
            />
            <Divider />
            <ListRow
              title="Ưu tiên xử lý nhanh"
              subtitle={registration.fastTrackFlag ? 'Có' : 'Không'}
            />
          </div>
        </Card>
      </Section>

      <Section title="Giấy tờ minh chứng">
        {evidence.length === 0 ? (
          <p className="text-body-md text-muted">
            Chưa có giấy tờ nào.{canEdit ? ' Chọn "Chỉnh sửa" để tải lên.' : ''}
          </p>
        ) : (
          <div className="flex flex-wrap gap-sm">
            {evidence.map((item) => (
              <EvidencePreview key={item.evidenceId} evidence={item} />
            ))}
          </div>
        )}
      </Section>

      {isFixedApproved ? (
        <Section title="Tiếp theo">
          <Button
            label="Thuê ô vỉa hè liền kề"
            onPress={() =>
              navigate(`/vendor/registrations/${registration.registrationId}/adjacent-slot`)
            }
          />
          <Button
            label="Cập nhật địa chỉ kinh doanh"
            variant="outline"
            onPress={() =>
              navigate(`/vendor/registrations/${registration.registrationId}/address`)
            }
          />
        </Section>
      ) : null}

      <ConfirmDialog
        visible={confirmWithdraw}
        title="Rút hồ sơ đăng ký?"
        description="Bạn có thể nộp lại hồ sơ mới bất cứ lúc nào."
        confirmLabel="Rút hồ sơ"
        confirmVariant="danger"
        onConfirm={doWithdraw}
        onCancel={() => setConfirmWithdraw(false)}
      />
    </Screen>
  );
}
