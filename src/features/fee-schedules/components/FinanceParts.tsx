import type { ReactNode } from 'react';

import { Icon } from '@/components/common';
import { Skeleton } from '@/components/feedback';
import { EASE_OUT } from './finance-styles';

/**
 * Small building blocks shared by the vendor finance screens (V25–V31):
 * an entrance flag for CSS transitions, the fee/penalty split bar, tabs that
 * can carry a count, and the paper edges drawn in CSS.
 */

/** Diagonal hatching laid over the penalty share, so it never reads by colour alone. */
const HATCH =
  'repeating-linear-gradient(45deg, rgb(255 255 255 / 0.34) 0 3px, transparent 3px 8px)';

type SplitProps = {
  fee: number;
  penalty: number;
  /** Spoken summary of the two shares, e.g. "Phí thuê ô 6.040.000 đ, tiền phạt 1.000.000 đ". */
  label: string;
  entered: boolean;
};

/** Two shares on one bar: fees in street orange, penalties in red with hatching. */
export function SplitBar({ fee, penalty, label, entered }: SplitProps) {
  const total = fee + penalty;
  const feeShare = total > 0 ? (fee / total) * 100 : 0;
  return (
    <div
      role="img"
      aria-label={label}
      className="h-3.5 w-full overflow-hidden rounded-full bg-[#EEF1F4] dark:bg-sunken"
    >
      <div
        className={`flex h-full w-full origin-left transition-transform delay-[120ms] duration-700 ${entered ? 'scale-x-100' : 'scale-x-0'}`}
        style={EASE_OUT}
      >
        {fee > 0 ? <span className="h-full bg-primary" style={{ width: `${feeShare}%` }} /> : null}
        {penalty > 0 ? (
          <span
            className={`h-full bg-[#B42318] dark:bg-[#E5534B] ${fee > 0 ? 'border-l-2 border-card' : ''}`}
            style={{ width: `${100 - feeShare}%`, backgroundImage: HATCH }}
          />
        ) : null}
      </div>
    </div>
  );
}

/** A legend swatch matching the split bar's shares. */
export function SplitSwatch({ kind }: { kind: 'fee' | 'penalty' }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-3 w-3 shrink-0 rounded-[3px] ${kind === 'fee' ? 'bg-primary' : 'bg-[#B42318] dark:bg-[#E5534B]'}`}
      style={kind === 'penalty' ? { backgroundImage: HATCH } : undefined}
    />
  );
}

export type TabOption<T extends string> = { value: T; label: string; count?: number };

type TabsProps<T extends string> = {
  options: TabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** `segmented` for the page's main tabs, `chips` for a list filter. */
  variant?: 'segmented' | 'chips';
};

/**
 * Tabs that can carry a count. The count is a badge hidden from assistive tech,
 * so each tab keeps exactly its label as its accessible name. Each tab is 48px tall.
 */
export function FinanceTabs<T extends string>({
  options,
  value,
  onChange,
  variant = 'segmented',
}: TabsProps<T>) {
  const segmented = variant === 'segmented';
  return (
    <div
      role="tablist"
      className={
        segmented
          ? 'flex w-full gap-1 rounded-[16px] bg-card p-1 shadow-card ring-1 ring-border sm:w-fit'
          : 'no-scrollbar -mx-1 flex gap-xs overflow-x-auto px-1 py-1'
      }
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={[
              'inline-flex min-h-12 items-center justify-center gap-x-1.5 gap-y-0.5 text-[14px] font-semibold leading-[1.15] transition-[background-color,color,box-shadow] duration-200 sm:text-[15px]',
              segmented
                ? 'flex-1 flex-wrap rounded-[12px] px-sm py-1.5 sm:flex-none sm:px-md'
                : 'shrink-0 rounded-full px-md',
              active
                ? 'bg-primary text-on-primary shadow-[0_8px_18px_-10px_rgb(var(--c-primary)/0.85)]'
                : segmented
                  ? 'text-muted hover:bg-sunken hover:text-text'
                  : 'bg-card text-text shadow-card ring-1 ring-border hover:ring-text/25',
            ].join(' ')}
          >
            {opt.label}
            {opt.count !== undefined ? (
              <span
                aria-hidden="true"
                className={[
                  'min-w-[22px] rounded-full px-1.5 py-0.5 text-center font-sign text-[12px] font-bold tabular-nums leading-4',
                  active ? 'bg-white/25 text-on-primary' : 'bg-sunken text-text',
                ].join(' ')}
              >
                {opt.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/** Loading placeholder that still says "Đang tải…" to screen readers. */
export function LoadingBlock({ children }: { children: ReactNode }) {
  return (
    <div role="status" className="flex flex-col gap-sm">
      <span className="sr-only">Đang tải…</span>
      {children}
    </div>
  );
}

/** Skeleton cards in the shape of the finance list rows. */
export function RowSkeletons({
  count = 3,
  height = 'h-[88px]',
}: {
  count?: number;
  height?: string;
}) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className={`${height} w-full !rounded-[18px]`} />
      ))}
    </>
  );
}

/** A section heading inside a list ("Cần thanh toán", "Tháng 9/2026"…). */
export function ListHeading({
  id,
  children,
  aside,
}: {
  id?: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-sm pt-xs">
      <h2 id={id} className="font-sign text-[18px] font-bold leading-6 text-text">
        {children}
      </h2>
      {aside}
    </div>
  );
}

/** The wallet line every payment slip ends with (kept word for word from the old summary). */
export function WalletChannelLine() {
  return (
    <div className="flex items-center gap-sm">
      <span
        aria-hidden="true"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#E6F6EC] text-[#0B5D33] dark:bg-[#10301F] dark:text-[#8BE3B0]"
      >
        <Icon name="wallet-outline" size={20} color="currentColor" />
      </span>
      <span className="flex-1 text-body-lg text-text">Ví điện tử MoMo / ZaloPay</span>
      <span className="text-tertiary">
        <Icon name="check-circle" size={22} color="currentColor" />
      </span>
    </div>
  );
}

/** A tear line with half-moon notches at both ends, like the stub of a ticket. */
export function TearLine({ entered }: { entered: boolean }) {
  return (
    <div aria-hidden="true" className="relative my-md h-6">
      <span className="absolute -left-3 top-0 h-6 w-6 rounded-full bg-bg" />
      <span className="absolute -right-3 top-0 h-6 w-6 rounded-full bg-bg" />
      <span
        className="absolute inset-x-5 top-1/2 border-t-2 border-dashed border-border transition-[clip-path] delay-200 duration-[600ms]"
        style={{ ...EASE_OUT, clipPath: entered ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)' }}
      />
    </div>
  );
}
