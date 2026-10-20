import { useId } from 'react';

import { Button, Icon } from '@/components/common';
import { Skeleton } from '@/components/feedback';
import { VERDICT_TONES } from '@/components/illustrations';
import { StatusChip } from '@/components/status';
import { VENDOR_TYPE, type ApiRegistration } from '@/core/api';
import { statusLabel } from '@/core/constants/status-labels';
import { hkdCode } from '@/features/sidewalk-slots/slot-format';
import { vendorTypeLabel } from '../../labels';
import { RegistrationTrack } from '../RegistrationTrack';
import { DocCheckArt, SlotTopArt } from '../registration-art';

const EDGE = {
  ok: 'bg-tertiary',
  pending: 'bg-secondary',
  danger: 'bg-[#8F1717] dark:bg-[#FF9A90]',
  neutral: 'bg-muted/60',
} as const;

const submittedOn = (iso: string) => new Date(iso).toLocaleDateString('vi-VN');

/**
 * One registration as a stiff folder: a tab carrying the household-business
 * code, a status edge down the left, the name, the journey line, and the ward's
 * words when it sent the file back or turned it down.
 */
export function RegistrationFolderCard({
  registration: r,
  index,
  onOpen,
}: {
  registration: ApiRegistration;
  index: number;
  onOpen: () => void;
}) {
  const { label, tone } = statusLabel(r.registrationStatus);
  const date = submittedOn(r.createdAt);
  const showReason =
    !!r.reviewDecisionReason &&
    (r.registrationStatus === 'MORE_INFORMATION_REQUIRED' || r.registrationStatus === 'REJECTED');
  const reasonTone =
    r.registrationStatus === 'REJECTED' ? VERDICT_TONES.danger : VERDICT_TONES.pending;

  return (
    <div
      className="sb-rise min-w-0"
      style={{ ['--delay' as string]: `${Math.min(index, 5) * 80}ms` }}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={`${r.displayName}, ${label}, nộp ngày ${date}`}
        className="group flex w-full flex-col text-left"
      >
        <span className="ml-md inline-flex h-8 items-center self-start rounded-t-[10px] bg-sunken px-sm font-sign text-[15px] font-bold tracking-[0.03em] text-text ring-1 ring-border [font-stretch:72%] font-tabular">
          {hkdCode(r.registrationId)}
        </span>
        <span className="relative -mt-px flex min-h-[120px] w-full flex-col gap-sm overflow-hidden rounded-[20px] bg-card p-md pl-lg shadow-card ring-1 ring-border transition-[transform,box-shadow] duration-200 [transition-timing-function:var(--ease-out)] group-hover:-translate-y-[3px] group-hover:shadow-card-hover group-active:scale-[.99]">
          <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 ${EDGE[tone]}`} />
          <span className="flex flex-col gap-xs md:flex-row md:items-start md:justify-between md:gap-sm">
            <span
              title={r.displayName}
              className="line-clamp-2 min-w-0 text-[20px] font-[650] leading-[26px] text-text"
            >
              {r.displayName}
            </span>
            <StatusChip code={r.registrationStatus} />
          </span>
          <span className="flex flex-wrap items-center gap-x-sm gap-y-1 text-body-md text-muted">
            <span className="inline-flex items-center gap-1.5">
              <Icon
                name={
                  r.vendorType === VENDOR_TYPE.fixedStorefront
                    ? 'storefront-outline'
                    : 'cart-outline'
                }
                size={16}
                color="currentColor"
              />
              {vendorTypeLabel(r.vendorType)}
            </span>
            <span aria-hidden="true">·</span>
            <span>Nộp ngày {date}</span>
          </span>
          <span className="pt-xs">
            <RegistrationTrack
              status={r.registrationStatus}
              createdAt={r.createdAt}
              reviewedAt={r.reviewedAt}
            />
          </span>
          {showReason ? (
            <span className={`flex flex-col gap-1 rounded-[14px] p-sm ${reasonTone.wash}`}>
              <span className={`text-label ${reasonTone.ink}`}>Phường phản hồi</span>
              <span className="line-clamp-2 text-[15px] italic leading-[22px] text-text">
                “{r.reviewDecisionReason}”
              </span>
              <span className={`inline-flex items-center gap-1 text-label ${reasonTone.ink}`}>
                Xem chi tiết
                <Icon name="chevron-right" size={14} color="currentColor" />
              </span>
            </span>
          ) : null}
        </span>
      </button>
    </div>
  );
}

/** Two folders' outline while the list loads. */
export function FolderSkeleton() {
  return (
    <div role="status" aria-label="Đang tải" className="grid gap-lg xl:grid-cols-2">
      {[0, 1].map((i) => (
        <div key={i} className="flex flex-col">
          <Skeleton className="ml-md h-8 w-24 rounded-b-none rounded-t-[10px]" />
          <div className="flex h-[176px] flex-col gap-sm rounded-[20px] bg-card p-md shadow-card ring-1 ring-border">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="mt-sm h-5 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** "3 hồ sơ" and a chip per status, once there are two or more files. */
export function RegistrationsSummary({ registrations }: { registrations: ApiRegistration[] }) {
  const counts = new Map<string, number>();
  for (const r of registrations)
    counts.set(r.registrationStatus, (counts.get(r.registrationStatus) ?? 0) + 1);
  return (
    <div className="flex min-h-6 flex-wrap items-center gap-x-sm gap-y-xs">
      <p className="flex items-baseline gap-1.5 text-text">
        <span className="font-sign text-[28px] font-extrabold leading-none font-tabular">
          {registrations.length}
        </span>
        <span className="text-body-lg font-semibold">hồ sơ</span>
      </p>
      <ul className="flex flex-wrap gap-xs" aria-label="Số hồ sơ theo trạng thái">
        {[...counts.entries()].map(([code, n]) => {
          const { label, tone } = statusLabel(code);
          const v = VERDICT_TONES[tone];
          return (
            <li
              key={code}
              className={`inline-flex h-7 items-center rounded-full px-2.5 text-[13px] font-bold ${v.wash} ${v.ink}`}
            >
              {n} {label.toLowerCase()}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * BR-08 / BR-16 in one line and two drawings: the business file is approved
 * first, the sidewalk slot is a separate application after that.
 */
export function RegisterThenRentStrip({
  vertical,
  canRent,
  onRent,
}: {
  vertical?: boolean;
  canRent: boolean;
  onRent: () => void;
}) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className={`flex gap-md rounded-[24px] bg-[#FFF3E8] p-md ring-1 ring-brand/20 md:p-lg dark:bg-[#2A2420] ${
        vertical ? 'h-full flex-col justify-center' : 'flex-col md:flex-row md:items-center'
      }`}
    >
      <div aria-hidden="true" className="flex shrink-0 items-center gap-xs">
        <DocCheckArt />
        <span className="w-10 border-t-[3px] border-dashed border-brand/60" />
        <SlotTopArt empty />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h2 id={headingId} className="text-headline-md text-text">
          Hồ sơ trước, ô vỉa hè sau
        </h2>
        <p className="text-body-md text-text/75">
          Hồ sơ kinh doanh được Phường duyệt thì bạn mới nộp đơn thuê ô. Hai việc này xét riêng.
        </p>
      </div>
      {canRent ? (
        <div className={vertical ? '' : 'md:w-auto'}>
          <Button
            label="Thuê ô vỉa hè"
            variant="outline"
            fullWidth={vertical}
            icon={<Icon name="map-marker-radius-outline" size={18} color="currentColor" />}
            onPress={onRent}
          />
        </div>
      ) : null}
    </section>
  );
}
