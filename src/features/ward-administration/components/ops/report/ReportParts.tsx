import { formatVnd, Icon, KerbTag, Money } from '@/components/common';
import { EmptyState, Skeleton } from '@/components/feedback';
import { StatusChip } from '@/components/status';
import type { CollectionReportDto } from '@/core/api';
import { useCountUp, useGrown } from '../count-up';
import { shares, topLabels } from './report-model';

type Report = CollectionReportDto;
type Violation = Report['recentViolations'][number];

/** Fee green and fine orange: each at least 3:1 on white, and always named in words beside it. */
const FEE = 'bg-tertiary';
const FINE = 'bg-primary';

/**
 * The period's takings as one big figure (fees + fines), the split as a bar,
 * and the two baseline figures under it. The figure counts to its value and the
 * bar grows whenever a period's report lands.
 */
export function CollectedHero({ report }: { report: Report }) {
  const total = report.feeCollected + report.penaltyCollected;
  const shown = useCountUp(total, 600);
  const grown = useGrown();
  const [feePct, finePct] = shares(report.feeCollected, report.penaltyCollected);
  const big = total >= 1_000_000_000;

  return (
    <section
      aria-label="Đã thu trong kỳ"
      className="flex min-w-0 flex-col gap-md overflow-hidden rounded-[24px] bg-card p-md shadow-card ring-1 ring-border md:p-lg"
    >
      <div className="flex flex-col gap-1">
        <p className="flex items-center gap-1.5 text-body-md font-medium text-muted">
          <Icon name="cash-multiple" size={18} color="currentColor" className="text-tertiary" />
          Đã thu trong kỳ
        </p>
        <p
          className={`whitespace-nowrap font-sign font-extrabold leading-none tracking-[-0.02em] text-text [font-stretch:86%] ${big ? 'text-[34px] md:text-[52px]' : 'text-[44px] md:text-[64px]'}`}
        >
          <span aria-hidden="true" className="font-tabular">
            {shown.toLocaleString('vi-VN')}
            <span className="ml-1 text-[0.44em] font-bold text-muted">đ</span>
          </span>
          <span className="sr-only">{formatVnd(total)}</span>
        </p>
        {total === 0 ? (
          <p className="text-body-md text-muted">Chưa có khoản thu nào trong kỳ này</p>
        ) : null}
      </div>

      {total > 0 ? (
        <div
          role="img"
          aria-label={`Phí ${feePct}%, phạt ${finePct}%`}
          className="flex h-3 w-full gap-[3px] overflow-hidden rounded-full bg-sunken"
        >
          <span
            className={`h-full rounded-full transition-[flex-grow] duration-700 ease-[cubic-bezier(.2,.8,.2,1)] ${FEE}`}
            style={{ flexGrow: grown ? report.feeCollected : 0, flexBasis: 0 }}
          />
          <span
            className={`h-full rounded-full transition-[flex-grow] duration-700 ease-[cubic-bezier(.2,.8,.2,1)] ${FINE}`}
            style={{ flexGrow: grown ? report.penaltyCollected : 0, flexBasis: 0 }}
          />
        </div>
      ) : (
        <div
          aria-hidden="true"
          className="h-3 w-full rounded-full border-2 border-dashed border-border"
        />
      )}

      <dl className="grid gap-sm sm:grid-cols-2">
        <div className="flex flex-col gap-0.5">
          <dt className="flex items-center gap-xs text-body-sm text-muted">
            <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${FEE}`} />
            <span>Phí đã thu</span>
            {total > 0 ? <span className="font-tabular">· {feePct}%</span> : null}
          </dt>
          <dd>
            <Money amountVnd={report.feeCollected} size="lg" />
          </dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="flex items-center gap-xs text-body-sm text-muted">
            <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${FINE}`} />
            <span>Phạt đã thu</span>
            {total > 0 ? <span className="font-tabular">· {finePct}%</span> : null}
          </dt>
          <dd>
            <Money amountVnd={report.penaltyCollected} size="lg" />
          </dd>
        </div>
      </dl>
    </section>
  );
}

/**
 * What is still owed, as of right now (not for the period): a sunken block
 * with a clock, a stacked column (bar under 1280px) of not-yet-due fees,
 * overdue fees and unpaid fines, and the baseline figures in words.
 */
export function DebtColumn({ report }: { report: Report }) {
  const grown = useGrown();
  const parts = [
    { key: 'pending', value: report.feePending, cls: 'bg-[#C98A04]', label: 'Phí chưa đến hạn' },
    { key: 'overdue', value: report.feeOverdue, cls: 'bg-[#B42318]', label: 'Phí quá hạn' },
    {
      key: 'fine',
      value: report.penaltyPending,
      cls: 'bg-[repeating-linear-gradient(135deg,#8F1717_0_5px,#B4473F_5px_8px)]',
      label: 'Phạt chưa nộp',
    },
  ];
  const owed = parts.reduce((sum, p) => sum + p.value, 0);
  const spoken = owed
    ? parts
        .filter((p) => p.value > 0)
        .map((p) => `${p.label} ${formatVnd(p.value)}`)
        .join(', ')
    : 'Không còn khoản nợ';

  return (
    <section
      aria-labelledby="debt-now"
      className="flex min-w-0 flex-col gap-md rounded-[24px] bg-sunken p-md ring-1 ring-border md:p-lg"
    >
      <h2 id="debt-now" className="flex items-center gap-1.5 text-body-md font-semibold text-text">
        <Icon name="clock-outline" size={18} color="currentColor" className="text-primary" />
        Tính đến thời điểm hiện tại
      </h2>

      <div className="flex gap-md xl:items-stretch">
        {/* Column from 1280px, bar below: the same three parts. */}
        <div
          role="img"
          aria-label={spoken}
          className="hidden w-10 shrink-0 flex-col-reverse gap-[3px] overflow-hidden rounded-[10px] bg-card ring-1 ring-border xl:flex"
        >
          {parts
            .filter((p) => p.value > 0)
            .map((p) => (
              <span
                key={p.key}
                title={`${p.label}: ${formatVnd(p.value)}`}
                className={`w-full transition-[flex-grow] duration-700 ${p.cls}`}
                style={{ flexGrow: grown ? p.value : 0, flexBasis: 0 }}
              />
            ))}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-sm">
          <div
            role="img"
            aria-label={spoken}
            className="flex h-3 w-full gap-[3px] overflow-hidden rounded-full bg-card ring-1 ring-border xl:hidden"
          >
            {parts
              .filter((p) => p.value > 0)
              .map((p) => (
                <span
                  key={p.key}
                  className={`h-full transition-[flex-grow] duration-700 ${p.cls}`}
                  style={{ flexGrow: grown ? p.value : 0, flexBasis: 0 }}
                />
              ))}
          </div>

          <div className="flex flex-col gap-0.5">
            <p className="text-body-sm text-muted">Phí còn nợ</p>
            <Money amountVnd={report.feePending + report.feeOverdue} />
            <p className="flex items-center gap-xs text-body-sm text-muted">
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-[#C98A04]" />
              chưa đến hạn {formatVnd(report.feePending)}
            </p>
            {report.feeOverdue > 0 ? (
              <p className="mt-2xs flex w-fit items-center gap-xs rounded-[8px] bg-[#FDEBEA] px-xs py-0.5 text-body-sm font-semibold text-[#8F1717] dark:bg-[#3A1414] dark:text-[#FF9A90]">
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-[#B42318]" />
                Quá hạn: {formatVnd(report.feeOverdue)}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-0.5 border-t border-border pt-sm">
            <p className="flex items-center gap-xs text-body-sm text-muted">
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 rounded-full bg-[repeating-linear-gradient(135deg,#8F1717_0_3px,#B4473F_3px_5px)]"
              />
              Phạt còn nợ
            </p>
            <Money amountVnd={report.penaltyPending} />
          </div>
        </div>
      </div>
    </section>
  );
}

/** A small receipt with a torn, zig-zag foot. */
function ReceiptGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 40" className="h-10 w-8 shrink-0">
      <path
        d="M3 2 H29 V35 L25.5 38 L22 35 L18.5 38 L15 35 L11.5 38 L8 35 L4.5 38 L3 36.5 Z"
        className="fill-card stroke-primary"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M8 10 H24 M8 16 H24 M8 22 H18"
        className="stroke-muted/60"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="22" cy="27" r="3" className="fill-tertiary" />
    </svg>
  );
}

/** Invoices issued in the period, set large, with the baseline note about the debt figure. */
export function InvoiceLine({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-sm">
      <ReceiptGlyph />
      <p className="text-body-md text-muted">
        <span className="mr-1.5 font-sign text-[28px] font-extrabold leading-none text-text [font-stretch:86%]">
          {count}
        </span>
        hoá đơn đã phát hành trong kỳ · Số nợ tính đến thời điểm hiện tại
      </p>
    </div>
  );
}

/** "10 ngày, đã qua 10/31 ngày của tháng": how long the period is, and how far into the month. */
export function PeriodRuler({
  days,
  monthProgress,
}: {
  days: number;
  monthProgress: { done: number; total: number } | null;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-sm gap-y-1 text-body-sm text-muted">
      <span className="font-semibold text-text">{days} ngày</span>
      {monthProgress ? (
        <>
          <span className="flex items-center gap-xs">
            đã qua {monthProgress.done}/{monthProgress.total} ngày của tháng
          </span>
          <span aria-hidden="true" className="h-1.5 w-24 overflow-hidden rounded-full bg-sunken">
            <span
              className="block h-full rounded-full bg-brand"
              style={{ width: `${(monthProgress.done / monthProgress.total) * 100}%` }}
            />
          </span>
        </>
      ) : null}
    </div>
  );
}

/**
 * Recent violations as receipt lines: date, what, who and where (slot plate),
 * the fine on the right with its payment state. Dotted rules between lines.
 */
export function ViolationLedger({ items }: { items: Violation[] }) {
  if (items.length === 0)
    return (
      <div className="rounded-[24px] bg-card shadow-card ring-1 ring-border">
        <EmptyState icon="shield-check-outline" title="Không có vi phạm gần đây" />
      </div>
    );
  return (
    <ol className="overflow-hidden rounded-[24px] bg-card px-md shadow-card ring-1 ring-border md:px-lg">
      {items.map((v) => {
        const day = new Date(v.recordedAt).toLocaleDateString('vi-VN');
        return (
          <li
            key={`${v.violationId}-${v.recordedAt}`}
            className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-md gap-y-1 border-b border-dotted border-border py-sm last:border-b-0 sm:grid-cols-[88px_minmax(0,1fr)_auto]"
          >
            <time
              dateTime={v.recordedAt}
              className="col-span-2 font-sign text-[15px] font-bold text-muted [font-stretch:90%] sm:col-span-1 sm:pt-0.5"
            >
              {day}
            </time>
            <div className="flex min-w-0 flex-col gap-1">
              <p className="line-clamp-2 text-headline-sm text-text">{v.violationLabel}</p>
              {v.vendorName || v.slotCode ? (
                <p className="flex min-w-0 flex-wrap items-center gap-xs text-body-sm text-muted">
                  {v.vendorName ? (
                    <span className="min-w-0 max-w-full truncate" title={v.vendorName}>
                      {v.vendorName}
                    </span>
                  ) : null}
                  {v.slotCode ? <KerbTag code={v.slotCode} /> : null}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col items-end gap-1 text-right">
              {v.penaltyAmount !== null ? <Money amountVnd={v.penaltyAmount} /> : null}
              {v.penaltyStatus ? <StatusChip code={v.penaltyStatus} /> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Which violations come up most in the recent list, as bars (shown from 2 violations). */
export function TopViolations({ items }: { items: Violation[] }) {
  const top = topLabels(items, 5);
  const peak = Math.max(...top.map((t) => t.count), 1);
  return (
    <ul className="flex flex-col gap-sm rounded-[24px] bg-card p-md shadow-card ring-1 ring-border md:p-lg">
      {top.map((t) => (
        <li key={t.label} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-sm">
            <span className="line-clamp-2 text-body-md text-text">{t.label}</span>
            <span className="shrink-0 font-sign text-[18px] font-bold text-text">{t.count}</span>
          </div>
          <div aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-sunken">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent to-brand"
              style={{ width: `${(t.count / peak) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Loading a period: the figure, the bar, the debt block and four ledger lines, in place. */
export function ReportSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-lg">
      <span className="sr-only">Đang tải…</span>
      <div className="grid gap-md xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex flex-col gap-md rounded-[24px] bg-card p-md shadow-card ring-1 ring-border md:p-lg">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-[52px] w-3/4 md:h-[64px]" />
          <Skeleton className="h-3 w-full rounded-full" />
          <div className="grid gap-sm sm:grid-cols-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
        <div className="flex flex-col gap-sm rounded-[24px] bg-sunken p-md ring-1 ring-border md:p-lg">
          <Skeleton className="h-5 w-52" />
          <Skeleton className="h-3 w-full rounded-full" />
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-10 w-1/2" />
        </div>
      </div>
      <div className="flex flex-col gap-sm rounded-[24px] bg-card p-md shadow-card ring-1 ring-border">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}
