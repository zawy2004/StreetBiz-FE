import { useEffect, useRef, type KeyboardEvent } from 'react';

import { Icon, type IconName } from '@/components/common';
import { Skeleton } from '@/components/feedback';
import { VERDICT_TONES } from '@/components/illustrations';
import { StatusChip } from '@/components/status';
import type { FoodSafetyApplication, FoodSafetyStatus } from '@/core/api/food-safety-api';
import { formatDay } from '../../format';
import { formatCount, waitingOn, waitingText, type StationCounts } from '../../view';
import { CountUp } from '../CountUp';
import { DishPhotoStack } from '../DishPhotoStack';
import { FoodSafetySteps } from '../FoodSafetyBits';
import { playOnce } from '../motion';

export type QueueFilter = 'ALL' | FoodSafetyStatus;

type Station = {
  value: QueueFilter;
  label: string;
  /** Ring and wash when selected; the ward's own station is always ringed in brand orange. */
  ring: string;
  /** Border of the station's round mark on the route. */
  node: string;
  wash: string;
  ink: string;
};

// The five filters the server answers, in the baseline order.
const STATIONS: Station[] = [
  {
    value: 'ALL',
    label: 'Tất cả',
    ring: 'ring-primary',
    node: 'border-primary',
    wash: 'bg-tint-primary',
    ink: 'text-primary',
  },
  {
    value: 'SUBMITTED',
    label: 'Chờ phường xét',
    ring: 'ring-brand',
    node: 'border-brand',
    wash: 'bg-[#FFF3E8] dark:bg-brand/15',
    ink: VERDICT_TONES.pending.ink,
  },
  {
    value: 'FORWARDED',
    label: 'Chờ kết quả cục',
    ring: 'ring-[#2B3640] dark:ring-[#C5D0DA]',
    node: 'border-[#2B3640] dark:border-[#C5D0DA]',
    wash: VERDICT_TONES.neutral.wash,
    ink: VERDICT_TONES.neutral.ink,
  },
  {
    value: 'APPROVED',
    label: 'Đã đạt',
    ring: 'ring-tertiary',
    node: 'border-tertiary',
    wash: VERDICT_TONES.ok.wash,
    ink: VERDICT_TONES.ok.ink,
  },
  {
    value: 'REJECTED',
    label: 'Không đạt',
    ring: 'ring-error',
    node: 'border-error',
    wash: VERDICT_TONES.danger.wash,
    ink: VERDICT_TONES.danger.ink,
  },
];

const countOf = (counts: StationCounts | undefined, value: QueueFilter) =>
  counts ? (value === 'ALL' ? counts.total : counts[value]) : undefined;

/**
 * The ward's ATTP route and its filter in one: stations along a line from
 * "waiting for the ward" to the department and the two results, each with
 * how many files stand there. On a phone it folds into a row of chips with
 * counts. One tablist at a time, arrow keys move between stations.
 */
export function AttpRouteFilter({
  value,
  onChange,
  counts,
  wide,
}: {
  value: QueueFilter;
  onChange: (value: QueueFilter) => void;
  /** Undefined until the "all" list is known (or when it failed): shown as "–". */
  counts: StationCounts | undefined;
  wide: boolean;
}) {
  const board = useRef<HTMLDivElement>(null);
  const drawn = useRef(false);

  // The route draws itself left to right once, when its numbers first arrive.
  useEffect(() => {
    if (!counts || drawn.current) return;
    drawn.current = true;
    board.current?.querySelectorAll('[data-route]').forEach((segment, index) =>
      playOnce(segment, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], {
        duration: 100,
        delay: index * 100,
      }),
    );
  }, [counts]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = STATIONS.findIndex((s) => s.value === value);
    const target =
      event.key === 'ArrowRight'
        ? (index + 1) % STATIONS.length
        : event.key === 'ArrowLeft'
          ? (index - 1 + STATIONS.length) % STATIONS.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? STATIONS.length - 1
              : -1;
    const next = STATIONS[target];
    if (!next) return;
    event.preventDefault();
    onChange(next.value);
    event.currentTarget.querySelector<HTMLButtonElement>(`[data-station="${next.value}"]`)?.focus();
  };

  const tabName = (station: Station) => {
    const count = countOf(counts, station.value);
    return count === undefined ? station.label : `${station.label}, ${count} hồ sơ`;
  };

  const extra = (
    <>
      Chờ người bán bổ sung: {counts ? counts.MORE_INFORMATION_REQUIRED : '–'} · Đã rút:{' '}
      {counts ? counts.WITHDRAWN : '–'}
    </>
  );

  if (!wide) {
    return (
      <div className="flex flex-col gap-xs">
        <div
          role="tablist"
          aria-label="Lọc hồ sơ ATTP"
          onKeyDown={onKeyDown}
          className="no-scrollbar -mx-md flex gap-xs overflow-x-auto px-md py-0.5"
        >
          {STATIONS.map((station) => {
            const selected = station.value === value;
            const count = countOf(counts, station.value);
            return (
              <button
                key={station.value}
                type="button"
                role="tab"
                data-station={station.value}
                aria-selected={selected}
                aria-label={tabName(station)}
                tabIndex={selected ? 0 : -1}
                onClick={() => onChange(station.value)}
                className={[
                  'inline-flex h-11 shrink-0 items-center gap-xs rounded-full px-md text-label transition-colors',
                  selected
                    ? `font-bold ring-2 ${station.ring} ${station.wash} ${station.ink}`
                    : 'bg-card text-text shadow-card ring-1 ring-border',
                ].join(' ')}
              >
                {station.label}
                <span className="font-sign text-[17px] font-bold tabular-nums">
                  {count === undefined ? '–' : count}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-body-sm text-muted">{extra}</p>
      </div>
    );
  }

  const [all, ...route] = STATIONS;
  const tab = (station: Station, index: number) => {
    const selected = station.value === value;
    const count = countOf(counts, station.value);
    const isAll = station.value === 'ALL';
    return (
      <button
        key={station.value}
        type="button"
        role="tab"
        data-station={station.value}
        aria-selected={selected}
        aria-label={tabName(station)}
        tabIndex={selected ? 0 : -1}
        onClick={() => onChange(station.value)}
        className={[
          'group relative flex min-w-0 flex-col items-center gap-1 rounded-[18px] px-xs pb-xs pt-1 text-center transition-colors',
          selected ? station.wash : 'hover:bg-sunken',
        ].join(' ')}
      >
        {/* The route: half a line into each station and half out, drawn under the mark. */}
        {!isAll && index > 0 ? (
          <span
            aria-hidden="true"
            data-route
            className="absolute left-0 right-1/2 top-[59px] h-[5px] origin-left bg-border"
          />
        ) : null}
        {!isAll && index < route.length - 1 ? (
          <span
            aria-hidden="true"
            data-route
            className="absolute left-1/2 right-0 top-[59px] h-[5px] origin-left bg-border"
          />
        ) : null}
        <span
          className={[
            'font-sign text-[32px] font-bold leading-[40px] tabular-nums [font-stretch:88%] xl:text-[40px]',
            isAll ? 'text-text' : count ? station.ink : 'text-muted',
          ].join(' ')}
        >
          {count === undefined ? (
            '–'
          ) : (
            <CountUp value={count} format={(n) => formatCount(n)} duration={400} />
          )}
        </span>
        {isAll ? (
          <span
            className={`flex h-7 items-center rounded-full px-sm text-label ${selected ? 'bg-primary font-bold text-on-primary' : 'bg-sunken text-text'}`}
          >
            hồ sơ
          </span>
        ) : (
          <span
            key={selected ? 'on' : 'off'}
            className={[
              'relative z-10 size-7 rounded-full bg-card',
              selected ? 'sb-pop border-[6px]' : 'border-[3px] group-hover:border-4',
              station.node,
            ].join(' ')}
          />
        )}
        <span
          className={`text-body-sm leading-tight ${selected ? 'font-bold text-text' : 'font-medium text-text/80'}`}
        >
          {station.label}
        </span>
      </button>
    );
  };

  return (
    <div className="rounded-[24px] bg-card p-md shadow-card ring-1 ring-border lg:p-lg">
      <div
        ref={board}
        role="tablist"
        aria-label="Lọc hồ sơ ATTP"
        onKeyDown={onKeyDown}
        className="grid min-h-[116px] grid-cols-[minmax(92px,auto)_minmax(0,1fr)] items-start gap-x-md"
      >
        {tab(all!, 0)}
        <div className="grid grid-cols-4">{route.map((station, index) => tab(station, index))}</div>
      </div>
      <p className="mt-xs text-body-sm text-muted">{extra}</p>
    </div>
  );
}

/** "Phường cần xét · 6 ngày": who holds the file now. Only the ward's own work is tinted. */
export function WaitingOnLabel({
  application,
  now,
}: {
  application: FoodSafetyApplication;
  now: number;
}) {
  const text = waitingText(application, now);
  if (!text) return null;
  const ward = waitingOn(application, now).who === 'WARD';
  const tone = ward ? VERDICT_TONES.pending : VERDICT_TONES.neutral;
  return (
    <span
      className={`inline-flex w-fit max-w-full items-center gap-1.5 rounded-full px-sm py-1 text-[16px] font-semibold leading-tight md:text-[15px] ${tone.wash} ${tone.ink}`}
    >
      <Icon
        name={ward ? 'clipboard-text-outline' : 'clock-outline'}
        size={16}
        color="currentColor"
        className="shrink-0"
      />
      <span className="min-w-0 truncate">{text}</span>
    </span>
  );
}

/** What a finished file came to, so it need not be opened to see if the certificate is still good. */
function ResultLine({ application }: { application: FoodSafetyApplication }) {
  if (application.status !== 'APPROVED') return null;
  const tone = application.isExpired ? VERDICT_TONES.danger : VERDICT_TONES.ok;
  return (
    <span className={`text-body-md font-semibold ${tone.ink}`}>
      {application.isExpired
        ? `Hết hạn ${formatDay(application.expiresOn)}`
        : `Giấy số ${application.certificateNumber} · đến ${formatDay(application.expiresOn)}`}
    </span>
  );
}

/**
 * One file in the ward's queue, read in a glance: number and stall, who holds
 * it and for how long, the vendor and the dishes, then status and route. The
 * whole row opens the file.
 */
export function AttpFileRow({
  application,
  now,
  onOpen,
}: {
  application: FoodSafetyApplication;
  now: number;
  onOpen: () => void;
}) {
  const waiting = waitingText(application, now);
  const dishNames = application.dishes.map((d) => d.name).join(', ');
  return (
    <li className="group relative rounded-[18px] bg-card shadow-card ring-1 ring-border transition-colors hover:bg-sunken/50">
      <div className="flex flex-col gap-sm p-md lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(240px,300px)_20px] lg:items-center lg:gap-md">
        <div className="flex min-w-0 flex-col gap-xs">
          <div className="flex min-w-0 flex-wrap items-center gap-x-sm gap-y-xs">
            <span className="font-sign text-[17px] font-bold tabular-nums text-text">
              #{application.applicationId}
            </span>
            <span
              title={application.storefrontName}
              className="min-w-0 max-w-full truncate text-[17px] font-semibold text-text"
            >
              {application.storefrontName}
            </span>
            <span className="lg:hidden">
              {application.isExpired ? (
                <StatusChip code="EXPIRED" />
              ) : (
                <StatusChip code={application.status} />
              )}
            </span>
          </div>
          {waiting ? (
            <WaitingOnLabel application={application} now={now} />
          ) : (
            <ResultLine application={application} />
          )}
          <p className="text-body-md text-muted">
            {application.vendorName} · nộp {formatDay(application.submittedAt)}
          </p>
          <div className="flex min-w-0 items-center gap-sm">
            <DishPhotoStack dishes={application.dishes} max={3} size={32} realOnly />
            <span className="min-w-0 truncate text-body-md text-text" title={dishNames}>
              {dishNames}
            </span>
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-sm">
          <span className="hidden lg:block">
            {application.isExpired ? (
              <StatusChip code="EXPIRED" />
            ) : (
              <StatusChip code={application.status} />
            )}
          </span>
          <FoodSafetySteps application={application} />
        </div>
        <span
          aria-hidden="true"
          className="hidden text-muted transition-transform duration-150 group-hover:translate-x-0.5 lg:block"
        >
          <Icon name="chevron-right" size={20} color="currentColor" />
        </span>
      </div>
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Hồ sơ #${application.applicationId}, ${application.storefrontName}${waiting ? `, ${waiting}` : ''}`}
        className="absolute inset-0 rounded-[18px] active:scale-[0.995]"
      />
    </li>
  );
}

const PROCESS: { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'clipboard-text-outline',
    title: 'Phường kiểm giấy tờ',
    text: 'Đủ thì chuyển Chi cục, thiếu thì yêu cầu người bán bổ sung.',
  },
  {
    icon: 'magnify',
    title: 'Chi cục kiểm tra thực tế',
    text: 'Chi cục ATTP đến quầy kiểm tra và gửi kết quả về phường.',
  },
  {
    icon: 'shield-check-outline',
    title: 'Phường nhập kết quả',
    text: 'Đạt thì món được bán; không đạt thì người bán thấy lý do.',
  },
];

/** How an ATTP file is handled, for officers new to the queue. Static text. */
export function AttpProcessPanel() {
  return (
    <div className="flex flex-col gap-md">
      <ol className="flex flex-col">
        {PROCESS.map((step, index) => (
          <li key={step.title} className="relative flex gap-sm pb-md last:pb-0">
            {index < PROCESS.length - 1 ? (
              <span
                aria-hidden="true"
                className="absolute bottom-0 left-[19px] top-10 border-l-2 border-dashed border-brand/40"
              />
            ) : null}
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#FFF3E8] text-primary dark:bg-brand/15">
              <Icon name={step.icon} size={22} color="currentColor" weight="duotone" />
            </span>
            <span className="flex min-w-0 flex-col gap-0.5 pt-1">
              <span className="text-body-md font-semibold text-text">{step.title}</span>
              <span className="text-body-sm text-muted">{step.text}</span>
            </span>
          </li>
        ))}
      </ol>
      <p className="rounded-[12px] bg-sunken px-sm py-xs text-body-sm text-text/80">
        Người bán được báo ngay sau mỗi bước.
      </p>
    </div>
  );
}

/** Nothing in this view: an empty clipboard on a pavement slot, with a small green tick. */
export function AttpQueueEmpty({
  filtered,
  onShowAll,
}: {
  filtered: boolean;
  onShowAll: () => void;
}) {
  return (
    <div className="flex flex-col items-center rounded-[24px] bg-card px-lg py-2xl text-center ring-1 ring-border">
      <div aria-hidden="true" className="relative h-[112px] w-[156px]">
        <svg viewBox="0 0 156 112" className="absolute inset-0 h-full w-full">
          <rect
            x="4"
            y="8"
            width="148"
            height="88"
            rx="16"
            style={{
              fill: 'rgb(var(--c-brand) / 0.07)',
              stroke: 'rgb(var(--c-brand) / 0.55)',
              strokeWidth: 2.5,
              strokeDasharray: '10 7',
            }}
          />
          {Array.from({ length: 7 }, (_, i) => (
            <rect
              key={i}
              x={4 + i * 22}
              y="102"
              width="22"
              height="6"
              rx="1"
              style={{ fill: i % 2 ? 'rgb(var(--c-kerb-paint))' : 'rgb(var(--c-kerb))' }}
            />
          ))}
        </svg>
        <span className="absolute left-1/2 top-[22px] flex size-14 -translate-x-1/2 items-center justify-center rounded-[14px] bg-card text-primary shadow-card">
          <Icon name="clipboard-text-outline" size={30} color="currentColor" weight="duotone" />
        </span>
        <span
          className={`absolute right-[44px] top-[62px] flex size-7 items-center justify-center rounded-full ring-2 ring-card ${VERDICT_TONES.ok.wash} ${VERDICT_TONES.ok.ink}`}
        >
          <Icon name="check" size={14} color="currentColor" />
        </span>
      </div>
      <p className="mt-md font-heading text-[19px] font-bold text-text">Không có hồ sơ ATTP</p>
      {filtered ? (
        <>
          <p className="mt-1 text-body-md text-muted">Thử chọn &quot;Tất cả&quot;.</p>
          <button
            type="button"
            onClick={onShowAll}
            className="mt-sm inline-flex h-12 items-center rounded-[12px] px-md text-[15px] font-semibold text-primary hover:bg-tint-primary"
          >
            Xem tất cả hồ sơ
          </button>
        </>
      ) : null}
    </div>
  );
}

/** The queue loading: rows the height of real ones. */
export function AttpQueueSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <ul aria-busy="true" className="flex flex-col gap-sm">
      <li className="sr-only">Đang tải…</li>
      {Array.from({ length: rows }, (_, key) => (
        <li
          key={key}
          className="flex min-h-[148px] flex-col gap-sm rounded-[18px] bg-card p-md ring-1 ring-border lg:min-h-[88px] lg:flex-row lg:items-center"
        >
          <div className="flex flex-1 flex-col gap-xs">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <Skeleton className="h-6 w-full lg:w-[260px]" />
        </li>
      ))}
    </ul>
  );
}
