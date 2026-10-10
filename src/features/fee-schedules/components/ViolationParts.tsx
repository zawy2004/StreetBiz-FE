import { useId, useState } from 'react';

import { formatVnd, Icon, KerbTag, type IconName } from '@/components/common';
import { StatusChip } from '@/components/status';
import type { VendorViolationDto } from '@/core/api';
import { SOURCE_LABEL, weekRangeLabel, type WeekBucket } from '../finance-view';
import { EASE_OUT, INK, RULE } from './finance-styles';

type BoardProps = {
  days: number;
  latestDate: string;
  weeks: WeekBucket[];
  entered: boolean;
};

/**
 * "Tấm bảng ngày sạch": how long the stall has gone without a new notice, said
 * in words and large figures (never counted up), with the last twelve weeks
 * as tiles. The wash brightens to green after thirty clean days.
 */
export function CleanDaysBoard({ days, latestDate, weeks, entered }: BoardProps) {
  const titleId = useId();
  const wash =
    days >= 30
      ? 'bg-[#E6F6EC] ring-[#0B7F43]/20 dark:bg-[#10301F]'
      : days >= 7
        ? 'bg-[#FFF3E8] ring-[#FF6A1F]/20 dark:bg-[#2A2018]'
        : 'bg-[#FFF3D1] ring-[#FFB703]/40 dark:bg-[#3A2A08]';
  return (
    <section
      aria-labelledby={titleId}
      className={`relative min-h-[200px] overflow-hidden rounded-[28px] ring-1 ${wash}`}
    >
      {days >= 30 ? (
        <CleanSlot className="pointer-events-none absolute -right-2 -top-2 hidden h-[110px] w-[150px] sm:block xl:hidden" />
      ) : null}
      <div className="flex flex-col gap-lg p-md md:p-lg xl:flex-row xl:items-center xl:justify-between">
        <div className="relative min-w-0">
          {days === 0 ? (
            <h2
              id={titleId}
              className="font-sign text-[30px] font-bold leading-tight text-text md:text-[36px]"
            >
              Biên bản mới nhất: hôm nay
            </h2>
          ) : (
            <h2 id={titleId} className="text-text">
              <span className="font-sign text-[56px] font-bold leading-none tabular-nums [font-stretch:88%] md:text-[64px] xl:text-[80px]">
                {days}
              </span>{' '}
              <span className="text-[20px] font-semibold">ngày</span>{' '}
              <span className="mt-1 block text-[17px] font-semibold text-text/80">
                không có biên bản mới
              </span>
            </h2>
          )}
          <p className="mt-1 text-body-md text-text/75">Biên bản gần nhất {latestDate}</p>
        </div>
        <WeekStrip weeks={weeks} entered={entered} />
      </div>
    </section>
  );
}

/** Twelve week tiles, flipped in left to right; weeks with a notice turn last. */
function WeekStrip({ weeks, entered }: { weeks: WeekBucket[]; entered: boolean }) {
  const marked = weeks.filter((w) => w.count > 0).length;
  return (
    <div className="w-full max-w-[420px] xl:w-auto">
      <div
        role="img"
        aria-label={`${weeks.length} tuần gần đây, ${marked > 0 ? `${marked} tuần có biên bản` : 'không tuần nào có biên bản'}`}
        className="grid grid-cols-12 gap-[5px] [perspective:400px] sm:gap-1.5"
      >
        {weeks.map((week, i) => {
          const has = week.count > 0;
          return (
            <span
              key={week.start}
              title={`Tuần ${weekRangeLabel(week)}: ${has ? `${week.count} biên bản` : 'không có biên bản'}`}
              className={`flex aspect-square min-w-0 items-center justify-center rounded-[6px] font-sign text-[12px] font-bold tabular-nums transition-transform duration-300 sm:h-7 sm:w-7 ${has ? 'bg-[#FDEBEA] text-[#8F1717] ring-1 ring-[#B42318]/35 dark:bg-[#3A1414] dark:text-[#FF9A90]' : 'bg-card/80 text-transparent ring-1 ring-[#0B7F43]/20 dark:bg-[#10301F]'}`}
              style={{
                ...EASE_OUT,
                transform: entered ? 'rotateX(0deg)' : 'rotateX(90deg)',
                transitionDelay: `${(has ? weeks.length + i : i) * 40}ms`,
              }}
            >
              {has ? week.count : ''}
            </span>
          );
        })}
      </div>
      <div className="mt-1.5 flex justify-between text-[12px] font-semibold text-text/70">
        <span>12 tuần trước</span>
        <span>Tuần này</span>
      </div>
      <ul className="sr-only">
        {weeks.map((week) => (
          <li key={week.start}>{`Tuần ${weekRangeLabel(week)}: ${week.count} biên bản`}</li>
        ))}
      </ul>
    </div>
  );
}

type Totals = Record<'unpaid' | 'paid' | 'closed', { amount: number; count: number }>;

const TILES: { key: keyof Totals; label: string; ink: string }[] = [
  { key: 'unpaid', label: 'Chưa nộp', ink: INK.danger },
  { key: 'paid', label: 'Đã nộp', ink: INK.ok },
  { key: 'closed', label: 'Đã miễn / huỷ', ink: INK.neutral },
];

/** The penalty money by where it stands, unpaid first. */
export function PenaltyTotals({ totals }: { totals: Totals }) {
  return (
    <div className="grid grid-cols-2 gap-sm sm:grid-cols-3">
      {TILES.map((tile, i) => {
        const { amount, count } = totals[tile.key];
        return (
          <div
            key={tile.key}
            className={`rounded-[18px] bg-card p-md shadow-card ring-1 ring-border/80 ${i === 0 ? 'col-span-2 sm:col-span-1' : ''}`}
          >
            <p className={`text-body-md font-semibold ${tile.ink}`}>{tile.label}</p>
            <p
              className={`mt-1 font-sign text-[24px] font-bold leading-8 tabular-nums ${count > 0 ? (i === 0 ? INK.danger : 'text-text') : 'text-muted'}`}
            >
              {formatVnd(amount)}
            </p>
            <p className="text-body-sm text-muted">
              {count > 0 ? `${count} biên bản` : 'không có'}
            </p>
          </div>
        );
      })}
    </div>
  );
}

const SOURCE_ICON: Record<string, IconName> = {
  ON_SITE: 'clipboard-text-outline',
  CUSTOMER_REPORT: 'account-group-outline',
};

/** Descriptions longer than this fold to four lines with "Xem thêm". */
const LONG_DESCRIPTION = 220;

/**
 * One notice as a sheet with a status margin (the same paper as the V27
 * notice): slot plate, where it came from, when; what for and what was seen;
 * the fine and where it stands.
 */
export function ViolationSheet({ violation }: { violation: VendorViolationDto }) {
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const rule =
    violation.penaltyStatus === 'UNPAID'
      ? RULE.danger
      : violation.penaltyStatus === 'PAID'
        ? RULE.ok
        : violation.penaltyStatus
          ? RULE.neutral
          : RULE.none;
  const source = SOURCE_LABEL[violation.source];
  const long = (violation.description?.length ?? 0) > LONG_DESCRIPTION;

  return (
    <article
      aria-labelledby={titleId}
      className="relative overflow-hidden rounded-[18px] bg-card shadow-card ring-1 ring-border/80"
    >
      <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1.5 ${rule}`} />
      <div className="flex flex-col gap-xs py-md pl-lg pr-md">
        <p className="flex flex-wrap items-center gap-x-sm gap-y-1 text-body-md text-muted">
          {violation.slotCode ? <KerbTag code={violation.slotCode} /> : null}
          {source ? (
            <span className="flex items-center gap-1 font-semibold text-text/80">
              <Icon
                name={SOURCE_ICON[violation.source] ?? 'information-outline'}
                size={16}
                color="currentColor"
              />
              {source}
            </span>
          ) : null}
          <span className="tabular-nums">
            {new Date(violation.recordedAt).toLocaleString('vi-VN')}
          </span>
        </p>
        <div className="flex flex-col gap-xs md:flex-row md:items-start md:justify-between md:gap-md">
          <div className="min-w-0">
            <h3 id={titleId} className="font-sign text-[18px] font-semibold leading-6 text-text">
              {violation.violationLabel}
            </h3>
            {violation.description ? (
              <>
                <p
                  className={`mt-1 text-body-lg text-text/80 ${long && !open ? 'line-clamp-4' : ''}`}
                >
                  {violation.description}
                </p>
                {long ? (
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpen((v) => !v)}
                    className="-ml-xs mt-1 min-h-12 rounded-[10px] px-xs text-[15px] font-semibold text-primary hover:bg-tint-primary"
                  >
                    {open ? 'Thu gọn' : 'Xem thêm'}
                  </button>
                ) : null}
              </>
            ) : null}
          </div>
          {violation.penaltyAmount !== null || violation.penaltyStatus ? (
            <div className="flex flex-wrap items-center gap-sm md:flex-col md:items-end md:gap-1.5">
              {violation.penaltyAmount !== null ? (
                <span className="whitespace-nowrap font-sign text-[18px] font-bold leading-6 tabular-nums text-text">
                  {formatVnd(violation.penaltyAmount)}
                </span>
              ) : null}
              {violation.penaltyStatus ? <StatusChip code={violation.penaltyStatus} /> : null}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

/** A tidy slot from above with a green shield: the "clean pavement" picture. */
export function CleanSlot({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 150 110" className={className}>
      {Array.from({ length: 7 }, (_, i) => (
        <rect
          key={i}
          x={4 + i * 20.5}
          y="92"
          width="20.5"
          height="7"
          className={i % 2 ? 'fill-kerb-paint' : 'fill-kerb'}
        />
      ))}
      <rect
        x="14"
        y="18"
        width="122"
        height="64"
        rx="10"
        strokeWidth="2.5"
        strokeDasharray="9 6"
        className="fill-[#0B7F43]/[0.06] stroke-[#0B7F43]/50"
      />
      <path
        d="M75 26 L97 34 V52 C97 66 87 74 75 79 C63 74 53 66 53 52 V34 Z"
        strokeWidth="3"
        strokeLinejoin="round"
        className="fill-[#E6F6EC] stroke-[#0B7F43] dark:fill-[#10301F]"
      />
      <path
        d="M65 52 L72 59 L86 45"
        fill="none"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-[#0B7F43]"
      />
    </svg>
  );
}
