import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button, Icon } from '@/components/common';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { ConfirmDialog, ErrorState, Skeleton, showToast } from '@/components/feedback';
import { PermitStamp, VERDICT_TONES } from '@/components/illustrations';
import { sideApi, SideApiError, type SlotTransferRequest } from '@/core/api/side-api';
import { Callout } from '@/features/sidewalk-slots/components/Callout';
import { ContractSummary } from '@/features/sidewalk-slots/components/ContractSummary';
import { TransferTimeline } from '@/features/sidewalk-slots/components/TransferTimeline';
import { contractProgress, transferSteps } from '@/features/sidewalk-slots/my-slots-view';
import { hkdCode } from '@/features/sidewalk-slots/slot-format';
import { useAuthStore } from '@/store/auth-store';
import { useRegistrations } from '@/features/business-registrations/useRegistrations';

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('vi-VN');
const validIso = (iso: string | null | undefined): iso is string =>
  !!iso && !Number.isNaN(Date.parse(iso));

/**
 * A transfer sent to this vendor, drawn as a deed: the two parties joined by
 * an ink stroke, the slot and the term in the middle, the three steps, and an
 * empty place for the ward's stamp (a real stamp only once the ward approved).
 */
export function AcceptTransferScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const transferId = Number(id);
  const validId = Number.isFinite(transferId);
  const [confirmDecline, setConfirmDecline] = useState(false);

  // SIDE-13 has no GET-by-id -- the incoming list is the only place a
  // transfer's own data can be read from.
  const incoming = useQuery({
    queryKey: ['side', userId, 'transfers', 'incoming'],
    queryFn: () => sideApi.listTransfers('incoming'),
    enabled: validId,
  });
  const { registrations } = useRegistrations();

  const done = (message: string) => {
    showToast(message);
    void queryClient.invalidateQueries({ queryKey: ['side', userId, 'transfers'] });
    navigate(-1);
  };
  const accept = useMutation({
    mutationFn: () => sideApi.acceptTransfer(transferId),
    onSuccess: (result) => done(result.message),
    onError: (error) =>
      showToast(error instanceof SideApiError ? error.message : 'Không chấp nhận được yêu cầu.'),
  });
  const decline = useMutation({
    mutationFn: () => sideApi.declineTransfer(transferId),
    onSuccess: (result) => done(result.message),
    onError: (error) =>
      showToast(error instanceof SideApiError ? error.message : 'Không từ chối được yêu cầu.'),
    onSettled: () => setConfirmDecline(false),
  });

  if (!validId)
    return (
      <Screen>
        <ErrorState message="Mã yêu cầu không hợp lệ." />
      </Screen>
    );
  if (incoming.isPending) return <DeedSkeleton />;
  if (incoming.error)
    return (
      <Screen>
        <ErrorState message={incoming.error.message} onRetry={() => void incoming.refetch()} />
      </Screen>
    );
  const transfer = incoming.data.find((t) => t.transferId === transferId);
  if (!transfer)
    return (
      <Screen>
        <ErrorState message="Không tìm thấy yêu cầu." />
      </Screen>
    );

  const hasApprovedRegistration = registrations.some((r) => r.registrationStatus === 'APPROVED');
  const approvedRegistration = registrations.find((r) => r.registrationStatus === 'APPROVED');
  const pending = transfer.transferStatus === 'PENDING';
  const steps = transferSteps(transfer.transferStatus);
  const daysLeft =
    steps !== null
      ? contractProgress(transfer.contractStartDate, transfer.contractEndDate, new Date()).daysLeft
      : null;

  return (
    <Screen
      footer={
        pending ? (
          <StickyActions>
            <div className="flex w-full gap-sm lg:w-auto">
              <div className="flex-1 lg:w-[160px] lg:flex-none">
                <Button label="Từ chối" variant="outline" onPress={() => setConfirmDecline(true)} />
              </div>
              <div className="flex-[2] lg:w-[280px] lg:flex-none">
                <Button
                  label="Chấp nhận chuyển nhượng"
                  disabled={!hasApprovedRegistration}
                  loading={accept.isPending}
                  onPress={() => accept.mutate()}
                />
              </div>
            </div>
          </StickyActions>
        ) : undefined
      }
    >
      <AppHeader title="Chuyển nhượng ô" back subtitle="Yêu cầu chuyển nhượng gửi đến bạn" />

      <div className="flex flex-col gap-lg xl:grid xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] xl:items-start xl:gap-xl">
        {/* The deed */}
        <article className="min-w-0 overflow-hidden rounded-[24px] bg-card shadow-sheet ring-1 ring-border">
          <div aria-hidden="true" className="sb-kerb sb-kerb-thin" />
          <div className="flex flex-col gap-md p-md md:p-lg">
            <div className="flex items-start justify-between gap-sm">
              <div className="min-w-0">
                <p className="font-sign text-[22px] font-bold leading-7 text-text">
                  Yêu cầu #{transfer.transferId}
                </p>
                <p className="text-body-sm text-muted">Từ hộ kinh doanh khác gửi cho bạn</p>
              </div>
              <StatusChip code={transfer.transferStatus} />
            </div>

            <div className="flex flex-col gap-xs sm:flex-row sm:items-center">
              <Party label="Bên chuyển" name="Hộ kinh doanh khác" />
              <svg
                aria-hidden="true"
                viewBox="0 0 120 24"
                className="mx-auto h-6 w-16 rotate-90 sm:mx-0 sm:w-28 sm:rotate-0"
              >
                <path
                  d="M4 14 C 30 2, 60 22, 104 10"
                  fill="none"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  className="stroke-primary"
                />
                <path
                  d="M98 4 L108 9 L100 17"
                  fill="none"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="stroke-primary"
                />
              </svg>
              <Party
                label="Bên nhận"
                name={approvedRegistration?.displayName || 'Bạn'}
                sub={
                  approvedRegistration?.registrationId != null
                    ? hkdCode(approvedRegistration.registrationId)
                    : undefined
                }
                you
              />
            </div>

            <div className="flex flex-col gap-xs rounded-[16px] bg-bg p-sm ring-1 ring-inset ring-border">
              <ContractSummary
                contract={{
                  slotCode: transfer.slotCode,
                  zoneName: transfer.zoneName,
                  startDate: transfer.contractStartDate,
                  endDate: transfer.contractEndDate,
                }}
                live={steps !== null}
              />
              {daysLeft != null ? (
                <p className="text-body-md font-semibold text-text">
                  Bạn sẽ tiếp tục {daysLeft} ngày còn lại của hợp đồng.
                </p>
              ) : null}
            </div>
          </div>

          {/* Tear line */}
          <div aria-hidden="true" className="relative h-0">
            <span className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-bg ring-1 ring-border" />
            <span className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-bg ring-1 ring-border" />
            <span className="absolute inset-x-md top-0 border-t-2 border-dashed border-border" />
          </div>

          <div className="flex flex-col gap-md p-md md:flex-row md:items-end md:p-lg">
            <div className="flex min-w-0 flex-1 flex-col gap-sm">
              {steps && (
                <TransferTimeline
                  steps={steps}
                  dates={[transfer.initiatedAt, transfer.acceptedAt, transfer.reviewedAt]}
                />
              )}
              <dl className="flex items-baseline gap-xs text-body-md">
                <dt className="text-muted">Ngày gửi</dt>
                <dd className="font-tabular font-semibold text-text">
                  {formatDate(transfer.initiatedAt)}
                </dd>
              </dl>
              {transfer.transferStatus === 'REJECTED' && transfer.reviewDecisionReason ? (
                <Callout tone="danger">
                  <strong>Lý do từ chối:</strong> {transfer.reviewDecisionReason}
                </Callout>
              ) : null}
            </div>
            <StampSlot status={transfer.transferStatus} />
          </div>
        </article>

        <div className="flex min-w-0 flex-col gap-md">
          <EligibilityChecklist
            transfer={transfer}
            hasApprovedRegistration={hasApprovedRegistration}
          />
          <Callout tone="neutral">
            Nếu bạn chấp nhận, yêu cầu chuyển sang Phường duyệt. Việc chuyển nhượng chỉ có hiệu lực
            khi Phường duyệt.
          </Callout>
          {pending && !hasApprovedRegistration && (
            <Callout tone="pending">
              Bạn cần có hồ sơ đăng ký kinh doanh đã được duyệt trước khi nhận chuyển nhượng.
            </Callout>
          )}
        </div>
      </div>

      <ConfirmDialog
        visible={confirmDecline}
        title="Từ chối yêu cầu chuyển nhượng?"
        description="Yêu cầu sẽ chuyển sang trạng thái từ chối và không thể hoàn tác."
        confirmLabel="Từ chối"
        confirmVariant="danger"
        onConfirm={() => decline.mutate()}
        onCancel={() => setConfirmDecline(false)}
      />
    </Screen>
  );
}

function Party({
  label,
  name,
  sub,
  you,
}: {
  label: string;
  name: string;
  sub?: string;
  you?: boolean;
}) {
  return (
    <div
      className={`flex min-w-0 flex-1 flex-col rounded-[14px] px-sm py-xs ${
        you ? 'bg-tint-primary' : 'bg-sunken'
      }`}
    >
      <span className="text-body-xs text-muted">{label}</span>
      <span
        className={`text-[16px] font-semibold leading-snug ${you ? 'text-primary' : 'text-text'}`}
      >
        {name}
      </span>
      {sub ? <span className="font-sign text-body-sm font-bold text-muted">{sub}</span> : null}
    </div>
  );
}

/** Where the ward's stamp goes: an empty dashed ring until the ward approves; a real stamp after. */
function StampSlot({ status }: { status: string }) {
  if (status === 'APPROVED') {
    const ok = VERDICT_TONES.ok;
    return (
      <PermitStamp
        icon="check-circle"
        inkClass={ok.ink}
        strokeClass={ok.stroke}
        ringText="PHƯỜNG ĐÃ DUYỆT ★ STREETBIZ ★"
        className="h-[104px] w-[104px] shrink-0 self-end"
      />
    );
  }
  if (status === 'REJECTED') {
    return (
      <span
        aria-hidden="true"
        className="flex h-[88px] w-[88px] shrink-0 items-center justify-center self-end rounded-full border-2 border-dashed border-border text-muted md:h-[104px] md:w-[104px]"
      >
        <Icon name="block-helper" size={30} color="currentColor" />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className="flex h-[88px] w-[88px] shrink-0 -rotate-6 items-center justify-center self-end rounded-full border-2 border-dashed border-[#B86E00] bg-[#FFF3D1]/60 px-2 text-center text-[12px] font-bold leading-tight text-[#6B4100] dark:bg-[#3A2A08]/60 dark:text-[#FFD27A] md:h-[104px] md:w-[104px]"
    >
      Chờ Phường duyệt
    </span>
  );
}

function EligibilityChecklist({
  transfer,
  hasApprovedRegistration,
}: {
  transfer: SlotTransferRequest;
  hasApprovedRegistration: boolean;
}) {
  const stage =
    transfer.transferStatus === 'PENDING'
      ? { ok: true, text: 'Yêu cầu đang chờ bạn trả lời' }
      : transfer.transferStatus === 'ACCEPTED_BY_RECEIVER'
        ? {
            ok: true,
            text: validIso(transfer.acceptedAt)
              ? `Bạn đã đồng ý ngày ${formatDate(transfer.acceptedAt)}`
              : 'Bạn đã đồng ý',
          }
        : transfer.transferStatus === 'APPROVED'
          ? {
              ok: true,
              text: validIso(transfer.reviewedAt)
                ? `Phường đã duyệt ngày ${formatDate(transfer.reviewedAt)}`
                : 'Phường đã duyệt',
            }
          : null;
  return (
    <section className="rounded-[20px] bg-card p-md shadow-card ring-1 ring-border md:p-lg">
      <h2 className="mb-sm font-sign text-[17px] font-bold text-text">Điều kiện nhận ô</h2>
      <ul className="flex flex-col gap-sm">
        <li className="flex items-start gap-sm text-[16px] text-text">
          <Icon
            name={hasApprovedRegistration ? 'check-circle' : 'close-circle-outline'}
            size={24}
            color="currentColor"
            className={`shrink-0 ${hasApprovedRegistration ? 'text-[#0B5D33] dark:text-[#8BE3B0]' : 'text-[#8F1717] dark:text-[#FF9A90]'}`}
          />
          <span className="min-w-0">
            {hasApprovedRegistration
              ? 'Hồ sơ kinh doanh: Đã duyệt'
              : 'Hồ sơ kinh doanh: Chưa có hồ sơ được duyệt'}
            {hasApprovedRegistration ? null : (
              <>
                {' '}
                <Link
                  to="/vendor/registrations"
                  className="font-semibold text-primary underline-offset-2 hover:underline"
                >
                  Xem hồ sơ
                </Link>
              </>
            )}
          </span>
        </li>
        {stage ? (
          <li className="flex items-start gap-sm text-[16px] text-text">
            <Icon
              name="check-circle"
              size={24}
              color="currentColor"
              className="shrink-0 text-[#0B5D33] dark:text-[#8BE3B0]"
            />
            {stage.text}
          </li>
        ) : null}
      </ul>
    </section>
  );
}

function DeedSkeleton() {
  return (
    <Screen>
      <div role="status" aria-label="Đang tải yêu cầu" className="flex flex-col gap-md">
        <Skeleton className="h-9 w-52" />
        <div className="flex flex-col gap-md rounded-[24px] bg-card p-lg ring-1 ring-border">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    </Screen>
  );
}
