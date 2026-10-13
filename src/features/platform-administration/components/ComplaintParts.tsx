import type { ReactNode } from 'react';

import { Icon, Money } from '@/components/common';
import { Skeleton } from '@/components/feedback';
import { colors } from '@/theme';
import { useCountUp, useEntered } from './admin-motion';

export type ReceiptLine = { key: string; label: string; note?: string | null; amount: number };

/**
 * The money on the counter: a paper receipt with a zig-zag bottom edge. Each
 * line is a figure already on the complaint; the last one, in large orange
 * figures, is the most that can still be refunded (computed by the screen,
 * passed in as is). It "prints" down once when the page opens.
 */
export function RefundReceipt({
  orderCode,
  provider,
  lines,
  maximum,
  invalid,
  children,
}: {
  orderCode: string;
  provider: string | null;
  lines: ReceiptLine[];
  /** Only for refund requests. */
  maximum?: number;
  /** The typed amount is not acceptable: the last line gets a red edge. */
  invalid?: boolean;
  children?: ReactNode;
}) {
  const printed = useEntered(true);
  const counted = useCountUp(maximum ?? 0, maximum !== undefined);

  return (
    <section aria-label="Biên lai hoàn tiền" className="flex flex-col gap-md">
      <div
        style={{
          clipPath: printed ? 'inset(0 0 0 0)' : 'inset(0 0 100% 0)',
          transform: printed ? 'translateY(0)' : 'translateY(-24px)',
        }}
        className="transition-[clip-path,transform] duration-[460ms] [transition-timing-function:var(--ease-out)]"
      >
        <div className="rounded-t-[14px] bg-card shadow-sheet ring-1 ring-border/80">
          <div className="flex items-center justify-between gap-sm border-b border-dashed border-border px-md py-sm">
            <span className="flex min-w-0 items-center gap-xs">
              <Icon
                name="receipt-text-outline"
                size={18}
                color="currentColor"
                className="shrink-0 text-primary"
              />
              <span className="truncate font-sign text-[16px] font-semibold tracking-[0.02em] text-text">
                {orderCode}
              </span>
            </span>
            {provider ? (
              <span className="shrink-0 rounded-full bg-sunken px-2 py-0.5 text-body-xs font-semibold text-text">
                {provider}
              </span>
            ) : null}
          </div>

          {lines.length === 0 ? (
            <p className="px-md py-md text-body-md text-muted">
              Đơn này không có thông tin thanh toán.
            </p>
          ) : (
            <dl className="flex flex-col gap-xs px-md py-sm">
              {lines.map((line) => (
                <div key={line.key} className="flex items-baseline justify-between gap-sm">
                  <dt className="min-w-0 text-body-md text-text">
                    {line.label}
                    {line.note ? (
                      <span className="block text-body-xs text-muted">{line.note}</span>
                    ) : null}
                  </dt>
                  <dd className="shrink-0 text-right">
                    <Money
                      amountVnd={line.amount}
                      className="font-sign font-medium !text-[15px] md:!text-[17px]"
                    />
                  </dd>
                </div>
              ))}
            </dl>
          )}

          {maximum !== undefined ? (
            <div
              className={`mx-md mb-sm flex flex-wrap items-end justify-between gap-x-sm gap-y-1 rounded-[10px] border-t-2 border-dotted border-border px-0 pt-sm transition-shadow ${invalid ? 'shadow-[0_0_0_2px_rgb(var(--c-error)/0.4)] px-sm' : ''}`}
            >
              <span className="text-label text-text">Còn hoàn được tối đa</span>
              <span className="font-sign text-[26px] font-semibold leading-8 font-tabular md:text-[30px] md:leading-9">
                <Money
                  amountVnd={counted}
                  color={colors.primary}
                  className="![font-size:inherit] ![line-height:inherit]"
                />
              </span>
            </div>
          ) : (
            <div className="h-xs" />
          )}
        </div>
        {/* Torn edge: a row of small triangles in the paper colour. */}
        <div
          aria-hidden="true"
          className="h-3 w-full bg-card [mask-image:linear-gradient(135deg,#000_50%,transparent_50%),linear-gradient(225deg,#000_50%,transparent_50%)] [mask-position:0_0,0_0] [mask-repeat:repeat-x] [mask-size:12px_12px] [filter:drop-shadow(0_2px_1px_rgb(17_28_43/0.08))]"
        />
      </div>
      {children}
    </section>
  );
}

/** What the sticky bar will send, in one sentence, updated as the amount is typed. */
export function DecisionSummary({ text }: { text: string }) {
  return (
    <p
      aria-live="polite"
      title={text}
      className="min-w-0 truncate text-[15px] leading-[22px] text-text"
    >
      {text}
    </p>
  );
}

/** "Kết quả xử lý" in the tone of the outcome: green wash when resolved, neutral when rejected. */
export function ResolutionCard({
  status,
  notes,
  byline,
}: {
  status: string;
  notes: string;
  byline?: string | null;
}) {
  const resolved = status === 'RESOLVED';
  return (
    <section
      aria-label="Kết quả xử lý"
      className={`sb-pop rounded-[16px] border-l-4 px-md py-sm ${
        resolved
          ? 'border-l-tertiary bg-[#E6F6EC] text-[#0B5D33] dark:bg-[#10301F] dark:text-[#8BE3B0]'
          : 'border-l-muted bg-[#EEF1F4] text-[#2B3640] dark:bg-[#1D2833] dark:text-[#C5D0DA]'
      }`}
    >
      <span className="text-label">Kết quả xử lý</span>
      <p className="mt-1 whitespace-pre-line text-body-md">{notes}</p>
      {byline ? <p className="mt-1 text-body-sm opacity-90">{byline}</p> : null}
    </section>
  );
}

/** The complaint page's shape while it loads. */
export function ComplaintSkeleton() {
  return (
    <div
      role="status"
      aria-label="Đang tải khiếu nại"
      className="mx-auto flex w-full max-w-[1320px] flex-col gap-md p-md md:px-lg lg:px-xl lg:py-lg"
    >
      <div className="flex items-center gap-sm">
        <Skeleton className="h-11 w-11 rounded-full" />
        <Skeleton className="h-8 w-56" />
      </div>
      <div className="grid gap-lg xl:grid-cols-[minmax(0,1fr)_448px]">
        <div className="flex flex-col gap-sm rounded-[20px] bg-card p-md ring-1 ring-border">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="mt-sm h-[104px] w-full rounded-[10px]" />
        </div>
        <div className="flex flex-col gap-sm rounded-[14px] bg-card p-md ring-1 ring-border">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex justify-between gap-md">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
