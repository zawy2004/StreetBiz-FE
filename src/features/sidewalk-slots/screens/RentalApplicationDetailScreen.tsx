import { useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button, Icon, Money } from '@/components/common';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { ConfirmDialog, ErrorState, Skeleton, showToast } from '@/components/feedback';
import { sideApi, SideApiError, type SidewalkSlot } from '@/core/api/side-api';
import { useAuthStore } from '@/store/auth-store';
import { ApplicationNote } from '../components/ApplicationNote';
import { ApplicationSteps } from '../components/ApplicationSteps';
import { SlotBayDrawing } from '../components/SlotBayDrawing';
import { formatAreaSqm, formatHours, formatSize } from '../slot-format';
import { slotDisplayState } from '../slot-stats';
import { DISPLAY_STATE_LABELS } from '../slot-visuals';
import { useWorkspaceStore } from '../workspace-store';

const APPLICATION_METHOD_LABEL: Record<string, string> = {
  AUTO_ADJACENT: 'Ô liền kề mặt tiền',
  MANUAL_SELECTED: 'Ô mở',
};

// SIDE-04: mirrors ApplicationStatuses.Open on the backend -- the only
// statuses a withdraw is still meaningful for.
const WITHDRAWABLE_STATUSES = ['PENDING', 'UNDER_REVIEW', 'MORE_INFORMATION_REQUIRED'];

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('vi-VN');

/** The decision stamp per status: words, ink, whether it is still an empty dashed frame. */
const STAMPS: Record<string, { text: string; ink: string; open: boolean; explain: string }> = {
  PENDING: {
    text: 'Chờ Phường xem xét',
    ink: 'text-muted',
    open: true,
    explain: 'Đơn đã gửi tới Phường, đang chờ xem xét.',
  },
  UNDER_REVIEW: {
    text: 'Đang xem xét',
    ink: 'text-[#6B4100] dark:text-[#FFD27A]',
    open: true,
    explain: 'Phường đang xem xét đơn của bạn.',
  },
  MORE_INFORMATION_REQUIRED: {
    text: 'Cần bổ sung',
    ink: 'text-[#6B4100] dark:text-[#FFD27A]',
    open: true,
    explain: 'Phường cần thêm thông tin, xem ý kiến của Phường.',
  },
  APPROVED: {
    text: 'ĐÃ DUYỆT',
    ink: 'text-[#0B5D33] dark:text-[#8BE3B0]',
    open: false,
    explain: 'Hợp đồng và giấy phép số đã được tạo tự động.',
  },
  REJECTED: {
    text: 'TỪ CHỐI',
    ink: 'text-[#8F1717] dark:text-[#FF9A90]',
    open: false,
    explain: 'Bạn có thể chọn ô khác và nộp đơn mới.',
  },
  WITHDRAWN: {
    text: 'ĐÃ RÚT',
    ink: 'text-[#2B3640] dark:text-[#C5D0DA]',
    open: false,
    explain: 'Bạn đã rút đơn này. Có thể nộp đơn mới.',
  },
};

/**
 * One rental application as the paper form it stands for: a sheet with the
 * painted kerb along its top, the ward's remark, dotted form lines, and the
 * decision stamped in its corner. Beside it, the three stops and the slot.
 */
export function RentalApplicationDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const focusSlot = useWorkspaceStore((s) => s.focusSlot);
  const applicationId = Number(id);
  const validId = Number.isFinite(applicationId);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);

  const application = useQuery({
    queryKey: ['side', userId, 'application', applicationId],
    queryFn: () => sideApi.getApplication(applicationId),
    enabled: validId,
  });

  const slot = useQuery({
    queryKey: ['side', 'slot', application.data?.slotId],
    queryFn: () => sideApi.getSlot(application.data!.slotId),
    enabled: !!application.data,
  });

  const withdraw = useMutation({
    mutationFn: () => sideApi.withdrawApplication(applicationId),
    onSuccess: (result) => {
      showToast(result.message);
      void queryClient.invalidateQueries({ queryKey: ['side', userId, 'applications'] });
      void queryClient.invalidateQueries({
        queryKey: ['side', userId, 'application', applicationId],
      });
    },
    onError: (error) => {
      showToast(error instanceof SideApiError ? error.message : 'Không rút được đơn.');
    },
    onSettled: () => setConfirmWithdraw(false),
  });

  if (!validId) {
    return (
      <Screen>
        <ErrorState message="Mã đơn không hợp lệ." />
        <div className="flex justify-center">
          <Button
            label="Về danh sách đơn"
            variant="outline"
            fullWidth={false}
            onPress={() => navigate('/vendor/slots/rental-applications')}
          />
        </div>
      </Screen>
    );
  }
  if (application.isPending) return <SheetSkeleton />;
  if (application.error) {
    return (
      <Screen>
        <ErrorState
          message={application.error.message}
          onRetry={() => void application.refetch()}
        />
      </Screen>
    );
  }
  const app = application.data;
  const canWithdraw = WITHDRAWABLE_STATUSES.includes(app.applicationStatus);
  const size = slot.data
    ? [
        formatSize(slot.data.widthMeters, slot.data.lengthMeters),
        formatAreaSqm(slot.data.widthMeters, slot.data.lengthMeters),
      ]
        .filter(Boolean)
        .join(' · ')
    : undefined;
  const stamp = STAMPS[app.applicationStatus];
  const slotFree = slot.data != null && slotDisplayState(slot.data, Date.now()) === 'AVAILABLE';
  const reopen =
    (app.applicationStatus === 'REJECTED' || app.applicationStatus === 'WITHDRAWN') && slotFree;

  return (
    <Screen
      footer={
        canWithdraw ? (
          <StickyActions>
            <div className="flex w-full items-center justify-end gap-md">
              <span className="hidden items-center gap-1 text-body-sm text-muted sm:flex">
                <Icon name="alert-circle-outline" size={16} color="currentColor" />
                Không thể hoàn tác
              </span>
              <div className="w-full sm:w-auto sm:min-w-[200px]">
                <Button
                  label="Rút đơn"
                  variant="outline"
                  loading={withdraw.isPending}
                  onPress={() => setConfirmWithdraw(true)}
                />
              </div>
            </div>
          </StickyActions>
        ) : undefined
      }
    >
      <AppHeader
        title="Chi tiết đơn thuê"
        back
        subtitle={slot.data ? `${slot.data.slotCode} · ${slot.data.zoneName}` : undefined}
      />

      <div className="flex flex-col gap-lg xl:grid xl:grid-cols-[minmax(0,1fr)_352px] xl:items-start">
        {/* The application sheet */}
        <article className="relative overflow-hidden rounded-[20px] bg-card shadow-sheet ring-1 ring-border">
          <div aria-hidden="true" className="sb-kerb sb-kerb-thin" />
          <div className="flex flex-col gap-md p-md md:p-lg">
            <div className="flex flex-col gap-sm">
              <h2 className="font-sign text-[26px] font-bold leading-8 text-text">
                Đơn thuê ô vỉa hè
              </h2>
              <div className="flex flex-wrap items-center justify-between gap-sm">
                <div className="flex min-w-0 flex-wrap items-center gap-sm">
                  {slot.data ? (
                    <span className="inline-flex h-9 items-center gap-1 rounded-[8px] bg-card px-2 text-text ring-2 ring-text/80">
                      <span aria-hidden="true" className="text-body-xs font-semibold text-muted">
                        Ô
                      </span>
                      <span className="font-sign text-[19px] font-[750] tracking-[0.02em] [font-stretch:72%]">
                        {slot.data.slotCode}
                      </span>
                    </span>
                  ) : null}
                  <span className="flex items-baseline gap-1.5">
                    <span className="text-badge text-muted">HÌNH THỨC</span>
                    <span className="text-body-md font-semibold text-text">
                      {APPLICATION_METHOD_LABEL[app.applicationMethod] ?? app.applicationMethod}
                    </span>
                  </span>
                </div>
                <StatusChip code={app.applicationStatus} />
              </div>
              {stamp ? <p className="text-body-lg text-text">{stamp.explain}</p> : null}
            </div>

            <ApplicationNote app={app} />

            <dl className="flex flex-col gap-sm">
              <LeaderRow label="Ngày nộp" value={formatDate(app.createdAt)} />
              <LeaderRow label="Thời hạn thuê" value={`${app.requestedTermDays} ngày`} />
              {app.reviewedAt ? (
                <LeaderRow label="Ngày Phường xem xét" value={formatDate(app.reviewedAt)} />
              ) : null}
              <LeaderRow label="Mã đơn" value={`#${app.applicationId}`} />
            </dl>

            <div className="flex flex-wrap items-end justify-between gap-md">
              <div className="flex flex-wrap gap-sm">
                {app.applicationStatus === 'APPROVED' ? (
                  <Button
                    label="Xem hợp đồng thuê ô"
                    fullWidth={false}
                    icon={<Icon name="file-document-outline" size={18} color="currentColor" />}
                    onPress={() => navigate('/vendor/slots/contracts')}
                  />
                ) : null}
                {reopen && slot.data ? (
                  <Button
                    label="Xem ô trên sơ đồ"
                    variant="outline"
                    fullWidth={false}
                    icon={<Icon name="map-outline" size={18} color="currentColor" />}
                    onPress={() => {
                      focusSlot(slot.data.zoneId, slot.data.slotId);
                      navigate('/vendor/slots');
                    }}
                  />
                ) : null}
              </div>
              {stamp ? (
                <DecisionStamp
                  key={app.applicationStatus}
                  text={stamp.text}
                  date={!stamp.open && app.reviewedAt ? formatDate(app.reviewedAt) : null}
                  ink={stamp.ink}
                  open={stamp.open}
                />
              ) : null}
            </div>
          </div>
        </article>

        <div className="flex flex-col gap-lg">
          <section className="rounded-[20px] bg-card p-md shadow-card ring-1 ring-border md:p-lg">
            <h2 className="mb-md text-headline-sm text-text">Tiến trình</h2>
            <ApplicationSteps
              status={app.applicationStatus}
              createdAt={app.createdAt}
              reviewedAt={app.reviewedAt}
              layout="column"
            />
          </section>

          {slot.data && <SlotCardBlock slot={slot.data} size={size} />}
        </div>
      </div>

      <ConfirmDialog
        visible={confirmWithdraw}
        title="Rút đơn thuê này?"
        description="Đơn sẽ chuyển sang trạng thái đã rút và không thể mở lại. Bạn có thể nộp đơn mới sau."
        confirmLabel="Rút đơn"
        confirmVariant="danger"
        onConfirm={() => withdraw.mutate()}
        onCancel={() => setConfirmWithdraw(false)}
      />
    </Screen>
  );
}

/** A form line: label, a dotted leader, the value on the right. */
function LeaderRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline gap-xs text-body-md">
      <dt className="flex min-w-0 flex-1 items-baseline gap-xs text-muted after:min-w-[16px] after:flex-1 after:-translate-y-1 after:border-b-2 after:border-dotted after:border-muted/40 after:content-['']">
        {label}
      </dt>
      <dd className="shrink-0 text-right font-tabular font-semibold text-text">{value}</dd>
    </div>
  );
}

/**
 * A rectangular ward stamp, tilted like a real one. An open application gets an
 * empty dashed frame with its stage; a decided one is pressed down once, with its date.
 */
function DecisionStamp({
  text,
  date,
  ink,
  open,
}: {
  text: string;
  date: string | null;
  ink: string;
  open: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className={`ml-auto flex min-h-[64px] min-w-[168px] -rotate-6 flex-col items-center justify-center rounded-[8px] px-md py-xs text-center ${ink} ${
        open
          ? 'border-2 border-dashed border-current opacity-80'
          : 'sb-stamp border-[5px] border-double border-current opacity-[0.92]'
      }`}
    >
      <span className="font-sign text-[18px] font-extrabold uppercase leading-tight tracking-[0.08em]">
        {text}
      </span>
      {date ? (
        <span className="font-sign text-[13px] font-bold tracking-[0.06em]">{date}</span>
      ) : null}
    </div>
  );
}

function SlotCardBlock({ slot, size }: { slot: SidewalkSlot; size: string | undefined }) {
  const state = slotDisplayState(slot, Date.now());
  return (
    <section className="flex flex-col gap-md rounded-[20px] bg-card p-md shadow-card ring-1 ring-border md:p-lg">
      <h2 className="text-headline-sm text-text">Ô đăng ký thuê</h2>
      {slot.imageUrl ? (
        <img
          src={slot.imageUrl}
          alt={`Ô ${slot.slotCode}`}
          loading="lazy"
          width={320}
          height={240}
          className="aspect-[4/3] w-full rounded-[14px] object-cover ring-1 ring-border"
        />
      ) : (
        <SlotBayDrawing slot={slot} state={state} variant="mini" className="max-w-[240px]" />
      )}
      <p className="flex items-baseline gap-1">
        <Money amountVnd={slot.pricePerDay} size="lg" className="font-sign font-bold" />
        <span className="text-body-sm text-muted">/ ngày</span>
      </p>
      <dl className="flex flex-col gap-1.5 text-body-sm">
        <SlotFact label="Mã ô" value={slot.slotCode} />
        <SlotFact label="Tuyến phố" value={slot.zoneName} />
        {size ? <SlotFact label="Kích thước" value={size} /> : null}
        <SlotFact label="Giờ bán" value={formatHours(slot.availableFrom, slot.availableTo)} />
      </dl>
      <div className="flex flex-wrap gap-xs" aria-label="Hạ tầng">
        <AmenityChip icon="flash-outline" label="Điện" on={!!slot.hasPower} />
        <AmenityChip icon="water-outline" label="Nước" on={!!slot.hasWater} />
        <AmenityChip icon="trash-can-outline" label="Thùng rác" on={!!slot.hasTrashBin} />
      </div>
      <p className="text-body-sm text-muted">
        Ô này hiện: <span className="font-semibold text-text">{DISPLAY_STATE_LABELS[state]}</span>
      </p>
    </section>
  );
}

function SlotFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-sm">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-semibold text-text">{value}</dd>
    </div>
  );
}

function AmenityChip({
  icon,
  label,
  on,
}: {
  icon: 'flash-outline' | 'water-outline' | 'trash-can-outline';
  label: string;
  on: boolean;
}) {
  return (
    <span
      className={`inline-flex h-8 items-center gap-1 rounded-full px-sm text-body-sm ${
        on
          ? 'bg-[#E6F6EC] font-semibold text-[#0B5D33] dark:bg-[#10301F] dark:text-[#8BE3B0]'
          : 'text-muted line-through ring-1 ring-inset ring-border'
      }`}
    >
      <Icon name={icon} size={15} color="currentColor" />
      {label}
    </span>
  );
}

function SheetSkeleton() {
  return (
    <Screen>
      <div role="status" aria-label="Đang tải đơn thuê" className="flex flex-col gap-md">
        <Skeleton className="h-9 w-56" />
        <div className="flex flex-col gap-lg xl:grid xl:grid-cols-[minmax(0,1fr)_352px]">
          <div className="flex flex-col gap-sm rounded-[20px] bg-card p-lg ring-1 ring-border">
            <Skeleton className="h-8 w-52" />
            <Skeleton className="h-9 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="ml-auto h-16 w-44" />
          </div>
          <div className="flex flex-col gap-lg">
            <Skeleton className="h-44 w-full rounded-[20px]" />
            <Skeleton className="h-64 w-full rounded-[20px]" />
          </div>
        </div>
      </div>
    </Screen>
  );
}
