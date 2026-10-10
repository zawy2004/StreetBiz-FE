import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { Button, Icon, IconButton } from '@/components/common';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { ConfirmDialog, ErrorState, showToast } from '@/components/feedback';
import { EDITABLE_STATUSES, errorMessage, VENDOR_TYPE, vendorRegistrationApi } from '@/core/api';
import { isLiveApi } from '@/core/config/env';
import { householdMemberToDraft, useNewRegistrationStore } from '../new-registration-store';
import {
  CoverSkeleton,
  EvidenceTile,
  Form01Card,
  NextStepCard,
  RegistrationCover,
  SubmittedInfo,
  WardFeedbackNote,
} from '../components/detail/DetailParts';
import { useRegistrationDetail, useWithdrawRegistration } from '../useRegistrations';

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
  const [downloadingFormat, setDownloadingFormat] = useState<'docx' | 'pdf' | null>(null);

  if (isLoading) {
    return (
      <Screen>
        <AppHeader title="Hồ sơ đăng ký" back />
        <CoverSkeleton />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen>
        <AppHeader title="Hồ sơ đăng ký" back />
        <div className="rounded-[28px] border-2 border-dashed border-error/40 bg-card">
          <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
        </div>
      </Screen>
    );
  }

  if (!registration) {
    return (
      <Screen>
        <AppHeader title="Hồ sơ đăng ký" back />
        <div className="flex flex-col items-center rounded-[28px] bg-card pb-lg text-center shadow-card ring-1 ring-border">
          <ErrorState message="Không tìm thấy hồ sơ." />
          <Link
            to="/vendor/registrations"
            className="-mt-lg inline-flex min-h-12 items-center gap-1.5 rounded-[12px] px-md text-[15px] font-semibold text-primary hover:bg-tint-primary"
          >
            <Icon name="format-list-bulleted" size={18} color="currentColor" />
            Về danh sách hồ sơ
          </Link>
        </div>
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
  // The address-change screen posts to the backend through sideApi (SIDE-09/10),
  // so it is offered in both modes. The adjacent-slot screen still picks a slot
  // out of src/mocks: sideApi.submitAdjacentApplication exists but nothing calls
  // it yet, and SIDE-03A needs a real picker bound by the backend's 150 m radius.
  // Offering it against a live backend would be a dead end, so hide it until then.
  const canRentAdjacentSlot = isFixedApproved && !isLiveApi;
  const needsMoreInfo = registration.registrationStatus === 'MORE_INFORMATION_REQUIRED';
  // BR-08: an approved itinerant file still needs its own slot application.
  const isItinerantApproved =
    registration.vendorType !== VENDOR_TYPE.fixedStorefront &&
    registration.registrationStatus === 'APPROVED';

  const startEdit = () => {
    loadForEdit({
      registrationId: registration.registrationId,
      vendorType: registration.vendorType,
      displayName: registration.displayName,
      declaredAddress: registration.declaredAddress ?? '',
      addressLatitude: registration.addressLatitude,
      addressLongitude: registration.addressLongitude,
      wardUnitId: registration.wardUnitId,
      ownerDateOfBirth: registration.ownerDateOfBirth ?? '',
      ownerGender: registration.ownerGender ?? '',
      ownerEthnicity: registration.ownerEthnicity ?? '',
      ownerNationality: registration.ownerNationality ?? 'Việt Nam',
      idType: registration.idType ?? 'CCCD',
      idIssuedDate: registration.idIssuedDate ?? '',
      idIssuedPlace: registration.idIssuedPlace ?? '',
      permanentAddress: registration.permanentAddress ?? '',
      contactAddress: registration.contactAddress ?? '',
      businessLine: registration.businessLine ?? '',
      businessLineCode: registration.businessLineCode ?? '',
      capitalAmount: registration.capitalAmount != null ? String(registration.capitalAmount) : '',
      laborCount: registration.laborCount != null ? String(registration.laborCount) : '',
      plannedStartDate: registration.plannedStartDate ?? '',
      // Already committed once cannot be un-committed (mirrors biometricConsent) -- re-editing
      // never resets this back to false.
      foodSafetyCommitment: registration.foodSafetyCommitmentAt != null,
      householdMembers: registration.householdMembers.map(householdMemberToDraft),
    });
    navigate('/vendor/registrations/new/type');
  };

  const downloadDocument = async (format: 'docx' | 'pdf') => {
    setDownloadingFormat(format);
    try {
      const blob = await vendorRegistrationApi.downloadDocument(
        registration.registrationId,
        format,
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DangKyHKD_${registration.registrationId}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      showToast(errorMessage(err));
    } finally {
      setDownloadingFormat(null);
    }
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

  const nextSteps =
    isFixedApproved || isItinerantApproved ? (
      <section aria-label="Tiếp theo" className="flex flex-col gap-sm">
        <h2 className="font-sign text-[21px] font-extrabold leading-tight text-text">Tiếp theo</h2>
        <div className="grid gap-sm md:grid-cols-2 xl:grid-cols-1">
          {canRentAdjacentSlot ? (
            <NextStepCard
              label="Thuê ô vỉa hè liền kề"
              caption="Xin ô ngay trước mặt tiền cửa hàng"
              art="frontage"
              primary
              onPress={() =>
                navigate(`/vendor/registrations/${registration.registrationId}/adjacent-slot`)
              }
            />
          ) : null}
          {isFixedApproved ? (
            <NextStepCard
              label="Cập nhật địa chỉ kinh doanh"
              caption="Báo Phường khi cửa hàng chuyển địa chỉ"
              art="plate"
              onPress={() =>
                navigate(`/vendor/registrations/${registration.registrationId}/address`)
              }
            />
          ) : null}
          {isItinerantApproved ? (
            <NextStepCard
              label="Thuê ô vỉa hè"
              caption="Hồ sơ đã duyệt; thuê ô là một đơn riêng"
              art="slot"
              primary
              onPress={() => navigate('/vendor/slots')}
            />
          ) : null}
        </div>
      </section>
    ) : null;

  const form01 = isLiveApi ? (
    <Form01Card
      approved={registration.registrationStatus === 'APPROVED'}
      downloadingFormat={downloadingFormat}
      onDownload={downloadDocument}
    />
  ) : null;

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
      <div className="flex">
        <IconButton icon="arrow-left" accessibilityLabel="Quay lại" onPress={() => navigate(-1)} />
      </div>

      <RegistrationCover registration={registration} />

      <div className="grid items-start gap-lg xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-xl">
        <div className="flex min-w-0 flex-col gap-lg">
          {registration.reviewDecisionReason ? (
            <WardFeedbackNote
              status={registration.registrationStatus}
              reason={registration.reviewDecisionReason}
              needsMoreInfo={needsMoreInfo}
              action={
                needsMoreInfo && canEdit ? (
                  <Button
                    label="Cập nhật hồ sơ"
                    icon={<Icon name="pencil-outline" size={18} color="currentColor" />}
                    onPress={startEdit}
                  />
                ) : undefined
              }
            />
          ) : null}

          <div className="xl:hidden">{nextSteps}</div>

          <SubmittedInfo registration={registration} />

          <section aria-labelledby="registration-evidence" className="flex flex-col gap-sm">
            <h2
              id="registration-evidence"
              className="font-sign text-[21px] font-extrabold leading-tight text-text"
            >
              Giấy tờ minh chứng
            </h2>
            {evidence.length === 0 ? (
              <p className="rounded-[18px] bg-sunken/70 p-md text-body-md text-muted">
                Chưa có giấy tờ nào.{canEdit ? ' Chọn "Chỉnh sửa" để tải lên.' : ''}
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-sm sm:grid-cols-[repeat(auto-fill,minmax(150px,160px))] sm:gap-md">
                {evidence.map((item) => (
                  <EvidenceTile key={item.evidenceId} evidence={item} />
                ))}
              </div>
            )}
          </section>

          <div className="xl:hidden">{form01}</div>
        </div>

        <aside className="hidden min-w-0 flex-col gap-lg xl:sticky xl:top-0 xl:flex">
          {nextSteps}
          {form01}
        </aside>
      </div>

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
