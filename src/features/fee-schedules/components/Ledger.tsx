import { useId, type ReactNode } from 'react';

import { formatVnd, Icon } from '@/components/common';
import { SplitBar, SplitSwatch } from './FinanceParts';
import { EASE_OUT } from './finance-styles';

/** The line every invoice screen says: an invoice only exists once the wallet confirmed. */
export const INVOICE_PROMISE =
  'Hoá đơn được xuất tự động sau khi ví xác nhận thanh toán với hệ thống.';

type SummaryProps = {
  count: number;
  total: number;
  fee: number;
  penalty: number;
  entered: boolean;
};

/**
 * "Tổng quan sổ": how many invoices, what they add up to, how that splits
 * between slot fees and penalties, and why a payment made a minute ago may not
 * have its invoice yet. A band on top below 1280px, a sticky card beside the
 * ledger above it.
 */
export function LedgerSummary({ count, total, fee, penalty, entered }: SummaryProps) {
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      className="overflow-hidden rounded-[24px] bg-[#FFF3E8] ring-1 ring-[#FF6A1F]/20 dark:bg-[#2A2018]"
    >
      <div aria-hidden="true" className="sb-kerb sb-kerb-thin" />
      <div className="flex flex-col gap-md p-md md:p-lg xl:flex-col">
        <div className="flex flex-col gap-md sm:flex-row sm:items-end sm:justify-between xl:flex-col xl:items-stretch">
          <h2 id={titleId} className="flex items-baseline gap-xs text-text">
            <span className="font-sign text-[44px] font-bold leading-none tabular-nums [font-stretch:88%]">
              {count}
            </span>
            <span className="text-[18px] font-semibold">hoá đơn</span>
          </h2>
          <p className="flex flex-col sm:items-end xl:items-start">
            <span className="text-body-sm text-muted">Tổng giá trị</span>
            <span className="font-sign text-[24px] font-bold leading-8 tabular-nums text-text">
              {formatVnd(total)}
            </span>
          </p>
        </div>
        {total > 0 ? (
          <div className="flex flex-col gap-xs">
            <SplitBar
              fee={fee}
              penalty={penalty}
              entered={entered}
              label={`Phí thuê ô ${formatVnd(fee)}, tiền phạt ${formatVnd(penalty)}`}
            />
            <div className="flex flex-wrap justify-between gap-x-md gap-y-1 text-body-sm text-text">
              <span className="flex items-center gap-1.5">
                <SplitSwatch kind="fee" />
                Phí thuê ô{' '}
                <span className="font-sign font-bold tabular-nums">{formatVnd(fee)}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <SplitSwatch kind="penalty" />
                Tiền phạt{' '}
                <span className="font-sign font-bold tabular-nums">{formatVnd(penalty)}</span>
              </span>
            </div>
          </div>
        ) : null}
        <p className="flex items-start gap-xs border-t border-[#FF6A1F]/20 pt-sm text-body-sm text-text/80">
          <span className="mt-0.5 shrink-0 text-tertiary">
            <Icon name="cloud-check-outline" size={18} color="currentColor" />
          </span>
          {INVOICE_PROMISE}
        </p>
      </div>
    </section>
  );
}

/**
 * The ledger's spine: one 2px line down the left of the whole list, drawn from
 * the top when the list lands; each month hangs a dot on it.
 */
export function LedgerSpine({ entered, children }: { entered: boolean; children: ReactNode }) {
  return (
    <div className="relative pl-lg">
      <span
        aria-hidden="true"
        className={`absolute bottom-md left-[7px] top-sm w-0.5 origin-top rounded-full bg-border transition-transform duration-700 ${entered ? 'scale-y-100' : 'scale-y-0'}`}
        style={EASE_OUT}
      />
      <div className="flex flex-col gap-lg">{children}</div>
    </div>
  );
}

/** A month of the ledger: its heading (sticky while you scroll through it) and month total. */
export function LedgerMonth({
  label,
  total,
  index,
  entered,
  children,
}: {
  label: string;
  total: number;
  index: number;
  entered: boolean;
  children: ReactNode;
}) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="relative flex flex-col gap-sm">
      <div className="sticky top-0 z-10 -ml-lg flex items-center gap-sm bg-bg/95 py-xs pl-0 lg:bg-bg/80 lg:backdrop-blur">
        <span
          aria-hidden="true"
          className={`relative ml-[2px] h-3 w-3 shrink-0 rounded-full bg-brand ring-4 ring-bg ${entered ? (index < 6 ? 'sb-pop' : '') : 'opacity-0'}`}
          style={{ animationDelay: `${Math.min(index, 5) * 110}ms` }}
        />
        <h2
          id={headingId}
          className="ml-xs flex-1 font-sign text-[18px] font-bold leading-6 text-text"
        >
          {label}
        </h2>
        <span className="font-sign text-[16px] font-bold tabular-nums text-[#2B3640] dark:text-[#C5D0DA]">
          {formatVnd(total)}
        </span>
      </div>
      <ul className="flex flex-col gap-sm">{children}</ul>
    </section>
  );
}

/** A large year mark between months of an earlier year. */
export function LedgerYear({ year }: { year: number }) {
  return (
    <p
      aria-hidden="true"
      className="-ml-lg font-sign text-[32px] font-bold leading-none text-muted/60 [font-stretch:80%]"
    >
      {year}
    </p>
  );
}
