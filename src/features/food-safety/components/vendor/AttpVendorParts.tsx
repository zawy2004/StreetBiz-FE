import { useEffect, useRef, type ReactNode } from 'react';

import { Button, Icon, type IconName } from '@/components/common';
import { Skeleton } from '@/components/feedback';
import { PermitStamp, VERDICT_TONES } from '@/components/illustrations';
import { StatusChip } from '@/components/status';
import {
  FOOD_SAFETY_EVIDENCE_LABELS,
  type FoodSafetyApplication,
} from '@/core/api/food-safety-api';
import { formatDay } from '../../format';
import { daysLeft, formatCount, validityProgress } from '../../view';
import { DishPhotoStack } from '../DishPhotoStack';
import { FoodSafetySteps } from '../FoodSafetyBits';
import { playOnce } from '../motion';

const OK = VERDICT_TONES.ok;
const PENDING = VERDICT_TONES.pending;
const DANGER = VERDICT_TONES.danger;

const ROUTE: { icon: IconName; label: string }[] = [
  { icon: 'storefront-outline', label: 'Phường' },
  { icon: 'magnify', label: 'Chi cục' },
  { icon: 'shield-check-outline', label: 'Kết quả' },
];

/**
 * The how-it-works band at the top of the vendor's ATTP page: the rule in the
 * vendor's words, the three stops a file makes, and the button to start one.
 */
export function FoodSafetyGuideBand({ onApply }: { onApply: () => void }) {
  return (
    <section
      aria-label="Cách xin giấy ATTP"
      className="relative overflow-hidden rounded-[24px] bg-[#FFF3E8] p-md ring-1 ring-brand/15 dark:bg-brand/10 md:p-lg"
    >
      <div className="flex flex-col gap-md xl:flex-row xl:items-center xl:justify-between xl:gap-xl">
        <div className="flex min-w-0 max-w-[62ch] flex-col gap-xs">
          <p className="text-body-lg font-medium text-text">
            Món thuộc nhóm rủi ro cao (món nước, cơm - bún - phở, bánh mì - xôi, hải sản) chỉ được
            bán khi có giấy ATTP.
          </p>
          <p className="text-body-md text-text/70">
            Hồ sơ gửi phường → phường chuyển Chi cục ATTP kiểm tra → phường cập nhật kết quả cho
            bạn.
          </p>
        </div>
        <div className="flex flex-col gap-md sm:flex-row sm:items-center sm:justify-between xl:flex-col xl:items-end">
          <ol aria-hidden="true" className="flex items-start">
            {ROUTE.map((stop, index) => (
              <li key={stop.label} className="flex items-start">
                {index > 0 ? (
                  <span className="mt-[21px] h-0 w-8 border-t-[2.5px] border-dashed border-brand/60 sm:w-10" />
                ) : null}
                <span className="flex w-14 flex-col items-center gap-1">
                  <span
                    className={`flex size-11 items-center justify-center rounded-full ring-[2.5px] ${index === 0 ? 'bg-brand text-white ring-brand' : 'bg-card text-primary ring-brand/50'}`}
                  >
                    <Icon name={stop.icon} size={20} color="currentColor" weight="duotone" />
                  </span>
                  <span className="text-body-xs font-semibold text-text">{stop.label}</span>
                </span>
              </li>
            ))}
          </ol>
          <div className="w-full sm:w-auto">
            <Button
              label="Nộp hồ sơ ATTP"
              icon={<Icon name="plus" size={18} color="currentColor" />}
              onPress={onApply}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

/** A reason from the ward or the department, in words a vendor can act on. */
function ReasonLine({ children }: { children: ReactNode }) {
  return (
    <p
      className={`flex items-start gap-xs rounded-[12px] px-sm py-xs text-body-lg ${DANGER.wash} ${DANGER.ink}`}
    >
      <Icon
        name="alert-circle-outline"
        size={20}
        color="currentColor"
        className="mt-[3px] shrink-0"
      />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

/**
 * How much of a certificate's life is used up, with a mark for today and the
 * days left in words (≥ 7:1 on its wash). The bar fills once, on the first
 * certificate of the page.
 */
export function ValidityBar({
  application,
  animate,
  now,
}: {
  application: FoodSafetyApplication;
  animate: boolean;
  now: number;
}) {
  const { issuedOn, expiresOn, isExpired } = application;
  const fill = useRef<HTMLSpanElement>(null);
  const progress = isExpired ? 1 : (validityProgress(issuedOn, expiresOn, now) ?? 0);
  const left = daysLeft(expiresOn, now);
  const soon = !isExpired && left !== null && left < 60;
  const tone = isExpired ? DANGER : soon ? PENDING : OK;
  const words = isExpired
    ? `Đã hết hạn ngày ${formatDay(expiresOn)}`
    : left !== null
      ? `Còn ${formatCount(Math.max(0, left))} ngày`
      : '';

  useEffect(() => {
    if (animate)
      playOnce(fill.current, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], {
        duration: 700,
        delay: 200,
      });
  }, [animate]);

  return (
    <div className="flex flex-col gap-xs">
      <div
        role="progressbar"
        aria-label="Thời hạn giấy chứng nhận"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        aria-valuetext={`${words}${expiresOn && !isExpired ? `, hết hạn ${formatDay(expiresOn)}` : ''}`}
        className="relative h-2.5 rounded-full bg-[#EEF1F4] dark:bg-sunken"
      >
        <span
          ref={fill}
          className={`absolute inset-y-0 left-0 origin-left rounded-full ${isExpired ? 'bg-error' : 'bg-tertiary'}`}
          style={{ width: `${progress * 100}%` }}
        />
        {!isExpired ? (
          <span
            aria-hidden="true"
            className="absolute -top-[5px] h-5 w-[3px] -translate-x-1/2 rounded-full bg-brand shadow-[0_0_0_2px_rgb(var(--c-card))]"
            style={{ left: `${progress * 100}%` }}
          />
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-sm text-body-xs tabular-nums text-muted">
        <span>{formatDay(issuedOn)}</span>
        <span>{formatDay(expiresOn)}</span>
      </div>
      {words ? (
        <p
          className={`w-fit rounded-[8px] px-xs py-[2px] font-sign text-[17px] font-bold [font-stretch:92%] ${tone.wash} ${tone.ink}`}
        >
          {words}
        </p>
      ) : null}
    </div>
  );
}

function Chip({ application }: { application: FoodSafetyApplication }) {
  return application.isExpired ? (
    <StatusChip code="EXPIRED" />
  ) : (
    <StatusChip code={application.status} />
  );
}

type CardProps = {
  application: FoodSafetyApplication;
  /** The stall the vendor came from (`?storefrontId`): marked, never filtered. */
  highlighted: boolean;
  /** First certificate on the page: its stamp comes down and its bar fills. */
  featured: boolean;
  /** Lay a certificate out across (alone in its row) or stacked (in a 2-up grid). */
  wide: boolean;
  now: number;
  onResubmit: () => void;
  onWithdraw: () => void;
};

/**
 * One ATTP file. A file still on its way shows its route with dates; an
 * approved one is drawn as the certificate itself — a framed sheet with the
 * StreetBiz stamp, the certificate number large and the time left on it.
 */
export function ApplicationCard({
  application,
  highlighted,
  featured,
  wide,
  now,
  onResubmit,
  onWithdraw,
}: CardProps) {
  const approved = application.status === 'APPROVED';
  const titleId = `attp-file-${application.applicationId}`;
  const frame = application.isExpired ? 'border-[#8F1717]/55' : 'border-[#0B7F43]/60';

  const dishes = (
    <div className="flex items-center gap-sm">
      <DishPhotoStack dishes={application.dishes} />
      <p className="line-clamp-2 min-w-0 font-editorial text-[17px] font-medium leading-snug text-text">
        {application.dishes.map((d) => d.name).join(', ')}
      </p>
    </div>
  );

  const meta = (
    <p className="text-body-md text-muted">
      Nộp ngày {formatDay(application.submittedAt)}
      {application.evidence.length ? (
        <span
          title={application.evidence
            .map((e) => FOOD_SAFETY_EVIDENCE_LABELS[e.evidenceType])
            .join(', ')}
        >
          {' '}
          · {application.evidence.length} giấy tờ đã nộp
        </span>
      ) : null}
    </p>
  );

  const reasons = (
    <>
      {application.status === 'FORWARDED' && application.departmentName ? (
        <p
          className={`flex items-center gap-xs rounded-[12px] px-sm py-xs text-body-lg ${PENDING.wash} ${PENDING.ink}`}
        >
          <Icon name="clock-outline" size={18} color="currentColor" className="shrink-0" />
          Đang chờ {application.departmentName} kiểm tra.
        </p>
      ) : null}
      {application.reviewReason &&
      ['MORE_INFORMATION_REQUIRED', 'REJECTED'].includes(application.status) &&
      !application.forwardedAt ? (
        <ReasonLine>Phường: {application.reviewReason}</ReasonLine>
      ) : null}
      {application.resultReason && application.status === 'REJECTED' ? (
        <ReasonLine>Kết quả kiểm tra: {application.resultReason}</ReasonLine>
      ) : null}
    </>
  );

  const actions =
    application.actions.length > 0 ? (
      <div className="flex flex-col gap-sm sm:flex-row sm:flex-wrap sm:items-center">
        {application.actions.includes('RESUBMIT') ? (
          <div className="sm:w-auto">
            <Button label="Bổ sung hồ sơ" onPress={onResubmit} />
          </div>
        ) : null}
        {application.actions.includes('WITHDRAW') ? (
          <button
            type="button"
            onClick={onWithdraw}
            className="inline-flex h-12 items-center justify-center rounded-[12px] px-md text-[15px] font-semibold text-error transition-colors hover:bg-error/10"
          >
            Rút hồ sơ
          </button>
        ) : null}
      </div>
    ) : null;

  const header = (
    <div className="flex flex-wrap items-start justify-between gap-xs">
      <div className="flex min-w-0 flex-col gap-1">
        {highlighted ? (
          <span className="w-fit rounded-full bg-tint-primary px-xs py-[2px] text-body-xs font-semibold text-primary">
            Gian hàng vừa mở
          </span>
        ) : null}
        <h3
          id={titleId}
          className="font-sign text-[18px] font-semibold leading-[24px] text-text [font-stretch:92%]"
        >
          Hồ sơ #{application.applicationId} · {application.storefrontName}
        </h3>
      </div>
      <Chip application={application} />
    </div>
  );

  const ring = highlighted ? 'ring-2 ring-brand/55' : 'ring-1 ring-border';

  if (approved) {
    return (
      <article
        aria-labelledby={titleId}
        className={`relative overflow-hidden rounded-[20px] bg-card shadow-card ${ring}`}
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute inset-[6px] rounded-[15px] border ${frame}`}
        />
        <div className="relative flex flex-col gap-md p-md md:p-lg">
          {header}
          <div
            className={`grid gap-md ${wide ? 'md:grid-cols-[220px_minmax(0,1fr)] md:items-start md:gap-lg' : ''}`}
          >
            <div className="flex items-center gap-sm">
              <PermitStamp
                icon="shield-check-outline"
                inkClass={application.isExpired ? DANGER.ink : OK.ink}
                strokeClass={application.isExpired ? DANGER.stroke : OK.stroke}
                ringText="AN TOÀN THỰC PHẨM ★ STREETBIZ ★"
                className={`size-[76px] shrink-0 rounded-full ${application.isExpired ? DANGER.wash : OK.wash} ${featured ? '' : '!animate-none -rotate-[9deg]'}`}
              />
              <div className="min-w-0">
                <p className="text-body-sm text-muted">Giấy số</p>
                <p className="break-all font-sign text-[24px] font-semibold leading-tight tracking-[0.02em] text-text tabular-nums">
                  {application.certificateNumber}
                </p>
              </div>
            </div>
            <div className="flex min-w-0 flex-col gap-sm">
              <p className={`text-body-md font-medium ${OK.ink}`}>
                Giấy số {application.certificateNumber} · hiệu lực {formatDay(application.issuedOn)}{' '}
                – {formatDay(application.expiresOn)}
              </p>
              <ValidityBar application={application} animate={featured} now={now} />
            </div>
          </div>
          <div className="flex flex-col gap-sm border-t border-dashed border-border pt-md">
            {dishes}
            {meta}
            {reasons}
            {actions}
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      aria-labelledby={titleId}
      className={`flex flex-col gap-md rounded-[20px] bg-card p-md shadow-card md:p-lg ${ring}`}
    >
      {header}
      {application.status !== 'WITHDRAWN' ? (
        <div className="max-w-[520px]">
          <FoodSafetySteps application={application} showDates size="md" />
        </div>
      ) : null}
      {dishes}
      {meta}
      {reasons}
      {actions}
    </article>
  );
}

/** No file yet: a bowl steaming in an empty pavement slot, waiting for its certificate. */
export function AttpEmpty() {
  return (
    <div className="flex flex-col items-center px-lg py-2xl text-center">
      <div aria-hidden="true" className="relative h-[136px] w-[184px]">
        <svg viewBox="0 0 184 136" className="absolute inset-0 h-full w-full">
          <rect
            x="4"
            y="24"
            width="176"
            height="96"
            rx="18"
            style={{
              fill: 'rgb(var(--c-brand) / 0.08)',
              stroke: 'rgb(var(--c-brand) / 0.6)',
              strokeWidth: 2.5,
              strokeDasharray: '10 7',
            }}
          />
          {Array.from({ length: 8 }, (_, i) => (
            <rect
              key={i}
              x={4 + i * 22}
              y="126"
              width="22"
              height="6"
              rx="1"
              style={{ fill: i % 2 ? 'rgb(var(--c-kerb-paint))' : 'rgb(var(--c-kerb))' }}
            />
          ))}
        </svg>
        <svg
          viewBox="0 0 120 80"
          className="sb-steam absolute left-1/2 top-0 h-14 w-24 -translate-x-1/2"
        >
          {[
            'M38 78 C 26 60, 50 48, 38 26 S 44 8, 40 2',
            'M60 78 C 48 60, 72 48, 60 26 S 66 8, 62 2',
            'M82 78 C 70 60, 94 48, 82 26 S 88 8, 84 2',
          ].map((d) => (
            <path
              key={d}
              d={d}
              fill="none"
              stroke="rgb(var(--c-brand) / 0.45)"
              strokeWidth="5"
              strokeLinecap="round"
            />
          ))}
        </svg>
        <span className="absolute left-1/2 top-[52px] flex size-16 -translate-x-1/2 items-center justify-center rounded-full bg-card text-primary shadow-card">
          <Icon name="noodles" size={32} color="currentColor" weight="duotone" />
        </span>
        <span
          className={`absolute right-[38px] top-[88px] flex size-8 items-center justify-center rounded-full ring-2 ring-card ${OK.wash} ${OK.ink}`}
        >
          <Icon name="shield-check-outline" size={18} color="currentColor" weight="fill" />
        </span>
      </div>
      <p className="mt-md font-heading text-[19px] font-bold text-text">Chưa có hồ sơ ATTP</p>
      <p className="mt-1 max-w-[46ch] text-body-md text-muted">
        Chọn những món cần giấy, đính kèm giấy tờ và gửi phường bằng nút &quot;Nộp hồ sơ ATTP&quot;
        ở trên.
      </p>
    </div>
  );
}

/** First load: the guide band and two files with their grey stations, so nothing jumps. */
export function AttpListSkeleton() {
  return (
    <div
      aria-busy="true"
      className="mx-auto flex w-full max-w-[1040px] flex-col gap-md p-md md:px-lg lg:px-xl lg:py-lg"
    >
      <span className="sr-only">Đang tải…</span>
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-4 w-72" />
      <Skeleton className="h-[148px] w-full rounded-[24px]" />
      {[0, 1].map((key) => (
        <div
          key={key}
          className="flex flex-col gap-md rounded-[20px] bg-card p-lg ring-1 ring-border"
        >
          <Skeleton className="h-6 w-2/3" />
          <div className="flex items-center gap-xs">
            {[0, 1, 2].map((dot) => (
              <span key={dot} className="flex flex-1 items-center gap-xs last:flex-none">
                <Skeleton className="size-7 rounded-full" />
                {dot < 2 ? <Skeleton className="h-1 flex-1" /> : null}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-sm">
            <Skeleton className="size-11 rounded-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
