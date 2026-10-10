import { useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { Button, Icon, Money } from '@/components/common';
import { AppHeader, Screen } from '@/components/layout';
import { FilterChips } from '@/components/forms';
import { StatusChip } from '@/components/status';
import { EmptyState, ErrorState, Skeleton } from '@/components/feedback';
import { VERDICT_TONES } from '@/components/illustrations';
import { sideApi, type RentalApplication } from '@/core/api/side-api';
import { useAuthStore } from '@/store/auth-store';
import { ApplicationNote } from '../components/ApplicationNote';
import { ApplicationSteps } from '../components/ApplicationSteps';
import { MySlotsTabs } from '../components/MySlotsTabs';
import {
  APPLICATION_FILTERS,
  applicationGroup,
  countApplications,
  filterApplications,
  needsMoreInformation,
  type ApplicationFilter,
} from '../my-slots-view';

const APPLICATION_METHOD_LABEL: Record<string, string> = {
  AUTO_ADJACENT: 'Ô liền kề mặt tiền',
  MANUAL_SELECTED: 'Ô mở',
};

// Ticket stub colour by group: pale wash, deep ink of the same hue (>= 7:1).
const STUB_TONE = {
  OPEN: VERDICT_TONES.pending,
  APPROVED: VERDICT_TONES.ok,
  CLOSED: VERDICT_TONES.neutral,
} as const;

/**
 * The vendor's rental applications as a stack of filing tickets: each one a
 * stub with the slot plate and status, a perforation, then the three stops
 * the application goes through and what the ward said.
 */
export function RentalApplicationsScreen() {
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.user?.id);
  const [filter, setFilter] = useState<ApplicationFilter>('ALL');

  const applications = useQuery({
    queryKey: ['side', userId, 'applications'],
    queryFn: () => sideApi.listApplications(),
  });

  // The API lists oldest first; a vendor wants the latest application on top.
  const newestFirst = applications.data?.slice().reverse() ?? [];
  const counts = countApplications(newestFirst);
  const visible = filterApplications(newestFirst, filter);

  return (
    <Screen>
      <MySlotsTabs />
      <AppHeader title="Đơn thuê ô" subtitle="Hồ sơ đăng ký thuê ô vỉa hè của bạn" back />
      {applications.isPending && <TicketsSkeleton />}
      {applications.error && (
        <ErrorState
          message={applications.error.message}
          onRetry={() => void applications.refetch()}
        />
      )}
      {applications.data && applications.data.length === 0 && (
        <EmptyState
          icon="file-document-outline"
          title="Chưa có đơn thuê nào"
          description="Chọn một ô còn trống trên bản đồ để nộp đơn thuê."
          action={
            <Button
              label="Chọn ô để thuê"
              fullWidth={false}
              onPress={() => navigate('/vendor/slots')}
            />
          }
        />
      )}
      {applications.data && applications.data.length > 0 && (
        <>
          <div className="flex flex-col gap-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-x-md gap-y-1">
              <p className="flex flex-wrap items-center gap-x-sm gap-y-1 text-body-md text-text">
                <span className="font-semibold">{counts.ALL} đơn:</span>
                <SummaryDot className="bg-accent" text={`${counts.OPEN} đang chờ Phường`} />
                <SummaryDot className="bg-tertiary" text={`${counts.APPROVED} đã duyệt`} />
                <SummaryDot className="bg-muted" text={`${counts.CLOSED} từ chối hoặc đã rút`} />
              </p>
              <span className="flex items-center gap-1 text-body-sm text-muted">
                <Icon name="sort" size={15} color="currentColor" />
                Mới nhất trước
              </span>
            </div>
            <FilterChips
              value={filter}
              onChange={setFilter}
              options={APPLICATION_FILTERS.map((f) => ({ ...f, count: counts[f.value] }))}
            />
          </div>
          {visible.length === 0 && (
            <EmptyState
              icon="file-document-outline"
              title="Không có đơn nào trong mục này"
              compact
            />
          )}
          <div className="grid gap-md md:grid-cols-2">
            {visible.map((app, i) => (
              <div
                key={app.applicationId}
                className={i < 6 ? 'sb-rise' : undefined}
                style={i < 6 ? ({ '--delay': `${i * 60}ms` } as CSSProperties) : undefined}
              >
                <ApplicationTicket
                  app={app}
                  onOpen={() => navigate(`/vendor/slots/rental-applications/${app.applicationId}`)}
                  onContracts={() => navigate('/vendor/slots/contracts')}
                />
              </div>
            ))}
            {filter === 'ALL' && visible.length > 0 && visible.length <= 2 ? (
              <NextStepsCard onPick={() => navigate('/vendor/slots')} />
            ) : null}
          </div>
        </>
      )}
    </Screen>
  );
}

function SummaryDot({ className, text }: { className: string; text: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${className}`} />
      {text}
    </span>
  );
}

function ApplicationTicket({
  app,
  onOpen,
  onContracts,
}: {
  app: RentalApplication;
  onOpen: () => void;
  onContracts: () => void;
}) {
  const slot = useQuery({
    queryKey: ['side', 'slot', app.slotId],
    queryFn: () => sideApi.getSlot(app.slotId),
    staleTime: 5 * 60_000,
  });
  const attention = needsMoreInformation(app.applicationStatus);
  const approved = app.applicationStatus === 'APPROVED';
  const group = applicationGroup(app.applicationStatus);
  const stub =
    app.applicationStatus === 'REJECTED'
      ? VERDICT_TONES.danger
      : group
        ? STUB_TONE[group]
        : VERDICT_TONES.neutral;
  const codeId = `application-${app.applicationId}-code`;

  return (
    <article
      aria-labelledby={codeId}
      className="relative h-full overflow-hidden rounded-[22px] bg-card shadow-card ring-1 ring-border transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-card-hover"
    >
      {attention ? (
        <span aria-hidden="true" className="absolute inset-y-0 left-0 z-10 w-1 bg-brand" />
      ) : null}

      {/* Stub */}
      <div
        className={`flex min-h-[72px] items-center justify-between gap-sm px-md py-sm ${stub.wash}`}
      >
        <div className="flex min-w-0 items-center gap-sm">
          <span className="inline-flex h-10 shrink-0 items-center gap-1 rounded-[8px] bg-card px-2 text-text shadow-card ring-2 ring-text/80">
            <span aria-hidden="true" className="text-body-xs font-semibold text-muted">
              Ô
            </span>
            <span
              id={codeId}
              className="font-sign text-[22px] font-[750] leading-[26px] tracking-[0.02em] [font-stretch:72%]"
            >
              {slot.data?.slotCode ?? `Ô #${app.slotId}`}
            </span>
          </span>
          <span className={`min-w-0 truncate text-body-sm font-semibold ${stub.ink}`}>
            {APPLICATION_METHOD_LABEL[app.applicationMethod] ?? app.applicationMethod}
          </span>
        </div>
        <StatusChip code={app.applicationStatus} />
      </div>

      {/* Perforation with two notches */}
      <div aria-hidden="true" className="relative h-0">
        <span className="absolute -left-2.5 -top-2.5 h-5 w-5 rounded-full bg-bg ring-1 ring-border" />
        <span className="absolute -right-2.5 -top-2.5 h-5 w-5 rounded-full bg-bg ring-1 ring-border" />
        <span className="absolute inset-x-md top-0 border-t-2 border-dashed border-border" />
      </div>

      <div className="flex flex-col gap-md p-md pt-lg">
        <ApplicationSteps
          status={app.applicationStatus}
          createdAt={app.createdAt}
          reviewedAt={app.reviewedAt}
          sentLabel
        />

        <dl className="flex flex-col gap-1.5 text-body-sm">
          <div className="flex items-baseline justify-between gap-sm">
            <dt className="text-muted">Đơn giá</dt>
            <dd className="text-right">
              {slot.data ? (
                <>
                  <Money amountVnd={slot.data.pricePerDay} className="font-sign font-bold" />
                  <span className="ml-1 text-muted">/ ngày</span>
                </>
              ) : (
                <Skeleton className="h-5 w-24" />
              )}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-sm">
            <dt className="text-muted">Thời hạn thuê</dt>
            <dd className="font-semibold text-text">{`${app.requestedTermDays} ngày`}</dd>
          </div>
          {slot.data?.zoneName ? (
            <div className="flex items-baseline justify-between gap-sm">
              <dt className="text-muted">Tuyến phố</dt>
              <dd className="truncate text-right font-semibold text-text">{slot.data.zoneName}</dd>
            </div>
          ) : null}
        </dl>

        <ApplicationNote app={app} clamp />

        {approved ? (
          <div className="flex flex-wrap items-center justify-between gap-xs rounded-[14px] bg-bg px-sm py-xs ring-1 ring-inset ring-border">
            <span className="flex items-center gap-1.5 text-body-sm text-text">
              <Icon name="qrcode" size={18} color="currentColor" className="text-tertiary" />
              Hợp đồng và giấy phép QR đã được tạo tự động
            </span>
            <button
              type="button"
              onClick={onContracts}
              className="inline-flex h-10 items-center gap-1 rounded-[10px] px-sm text-label font-semibold text-primary hover:bg-tint-primary"
            >
              Xem hợp đồng
              <Icon name="chevron-right" size={16} color="currentColor" />
            </button>
          </div>
        ) : null}

        <div className="flex flex-col gap-sm border-t border-dashed border-border pt-sm sm:flex-row sm:items-center sm:justify-between">
          <span className="font-tabular text-body-sm text-muted">Mã đơn #{app.applicationId}</span>
          <div className="w-full sm:w-auto">
            <Button
              label="Xem chi tiết"
              variant={attention ? 'primary' : 'outline'}
              fullWidth
              onPress={onOpen}
              icon={<Icon name="arrow-right" size={18} color="currentColor" />}
            />
          </div>
        </div>
      </div>
    </article>
  );
}

/** Beside one or two tickets: what happens after applying, and a way to pick another slot. */
function NextStepsCard({ onPick }: { onPick: () => void }) {
  const steps = ['Phường xem xét đơn', 'Phường duyệt', 'Hợp đồng và giấy phép QR tự động'];
  return (
    <aside className="flex h-full flex-col justify-between gap-md rounded-[22px] border-2 border-dashed border-brand/40 bg-[#FFF3E8] p-md dark:bg-[#2A2420] md:p-lg">
      <div className="flex flex-col gap-sm">
        <p className="font-sign text-[20px] font-bold text-text">Sau khi nộp</p>
        <ul className="flex flex-col gap-xs">
          {steps.map((s, i) => (
            <li key={s} className="flex items-center gap-sm text-body-md text-text">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-card font-sign text-[14px] font-bold text-primary shadow-card">
                {i + 1}
              </span>
              {s}
            </li>
          ))}
        </ul>
      </div>
      <Button
        label="Chọn thêm ô"
        variant="outline"
        fullWidth={false}
        icon={<Icon name="map-outline" size={18} color="currentColor" />}
        onPress={onPick}
      />
    </aside>
  );
}

/** First load: the summary line, the chips and two tickets in their real shape. */
function TicketsSkeleton() {
  return (
    <div role="status" aria-label="Đang tải đơn thuê" className="flex flex-col gap-md">
      <Skeleton className="h-5 w-80 max-w-full" />
      <div className="flex gap-xs">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-10 w-24 rounded-full" />
        ))}
      </div>
      <div className="grid gap-md md:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="overflow-hidden rounded-[22px] bg-card ring-1 ring-border">
            <Skeleton className="h-[72px] w-full rounded-none" />
            <div className="flex flex-col gap-sm p-md">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
