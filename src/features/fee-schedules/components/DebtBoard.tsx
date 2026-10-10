import { useId } from 'react';

import { formatVnd, Icon } from '@/components/common';
import { Skeleton } from '@/components/feedback';
import type { FinanceSummaryDto } from '@/core/api';
import { SplitBar, SplitSwatch } from './FinanceParts';
import { INK, useEntered } from './finance-styles';

type Props = {
  summary: FinanceSummaryDto | undefined;
  isLoading: boolean;
  isError: boolean;
};

/**
 * "Bảng nợ ở đầu quầy": the one figure a vendor comes for, written large like a
 * hand-painted price board under a painted kerb. The figure never shows "0 đ"
 * while it is loading or failed (it only appears once the server answered) and
 * it never counts up: it is right from its first frame.
 */
export function DebtBoard({ summary, isLoading, isError }: Props) {
  const titleId = useId();
  const loaded = !isLoading && !isError && !!summary;
  const entered = useEntered(loaded);
  const clear = loaded && summary.totalDue === 0;
  const nextDue = summary?.nextDueDate
    ? new Date(summary.nextDueDate).toLocaleDateString('vi-VN')
    : null;

  return (
    <section
      aria-labelledby={titleId}
      className={[
        'relative min-h-[248px] overflow-hidden rounded-[28px] ring-1 transition-colors duration-200 md:min-h-[216px]',
        clear
          ? 'bg-[#E6F6EC] ring-[#0B7F43]/20 dark:bg-[#10301F]'
          : 'bg-[#FFF3E8] ring-[#FF6A1F]/20 dark:bg-[#2A2018]',
      ].join(' ')}
    >
      {/* Re-keyed when the figure lands, so the kerb runs in with it. */}
      <div key={loaded ? 'in' : 'wait'} aria-hidden="true" className="sb-kerb" />
      <DebtGlyph clear={clear} />

      <div className="relative flex flex-col gap-sm p-md md:p-lg">
        <h2 id={titleId} className="text-body-lg font-semibold text-text/80">
          Tổng cần thanh toán
        </h2>

        <div aria-live="polite" className="min-h-[56px]">
          {isLoading ? (
            <>
              <span className="sr-only">…</span>
              <Skeleton className="h-[56px] w-[min(280px,80%)] !rounded-[12px]" />
            </>
          ) : isError || !summary ? (
            <p
              className={`inline-flex items-start gap-xs rounded-[12px] bg-[#EEF1F4] px-sm py-xs text-body-lg dark:bg-[#1D2833] ${INK.neutral}`}
            >
              <Icon
                name="information-outline"
                size={20}
                color="currentColor"
                className="mt-[3px] shrink-0"
              />
              Chưa tải được tổng số tiền cần thanh toán.
            </p>
          ) : (
            <p
              className="whitespace-nowrap font-sign text-[clamp(34px,11vw,44px)] font-bold leading-none tracking-[-0.01em] tabular-nums text-text transition-opacity duration-200 [font-stretch:88%] md:text-[56px] xl:text-[72px]"
              style={{ opacity: entered ? 1 : 0 }}
            >
              {formatVnd(summary.totalDue)}
            </p>
          )}
        </div>

        {loaded && clear ? (
          <p className={`flex items-center gap-xs text-body-lg font-semibold ${INK.ok}`}>
            <Icon name="check-circle" size={20} color="currentColor" />
            Không còn khoản nào cần thanh toán
          </p>
        ) : null}

        {loaded && !clear && summary.feeDue + summary.penaltyDue > 0 ? (
          <div className="flex max-w-[640px] flex-col gap-xs">
            <SplitBar
              fee={summary.feeDue}
              penalty={summary.penaltyDue}
              entered={entered}
              label={`Phí thuê ô ${formatVnd(summary.feeDue)}, tiền phạt ${formatVnd(summary.penaltyDue)}`}
            />
            <div className="flex flex-col gap-1 text-body-md text-text sm:flex-row sm:justify-between">
              <span className="flex items-center gap-xs">
                <SplitSwatch kind="fee" />
                Phí thuê ô
                <span className="font-sign font-bold tabular-nums">
                  {formatVnd(summary.feeDue)}
                </span>
              </span>
              <span className="flex items-center gap-xs">
                <SplitSwatch kind="penalty" />
                Tiền phạt
                <span className="font-sign font-bold tabular-nums">
                  {formatVnd(summary.penaltyDue)}
                </span>
              </span>
            </div>
          </div>
        ) : null}

        {loaded && (summary.overdueCount > 0 || nextDue) ? (
          <div className="flex flex-wrap gap-xs">
            {summary.overdueCount > 0 ? (
              <span
                className={`inline-flex min-h-9 items-center gap-1.5 rounded-full bg-[#FDEBEA] px-sm text-[15px] font-semibold dark:bg-[#3A1414] ${INK.danger}`}
              >
                <Icon name="alert-octagon-outline" size={17} color="currentColor" />
                {`${summary.overdueCount} khoản quá hạn`}
              </span>
            ) : null}
            {nextDue ? (
              <span
                className={`inline-flex min-h-9 items-center gap-1.5 rounded-full bg-[#EEF1F4] px-sm text-[15px] font-semibold dark:bg-[#1D2833] ${INK.neutral}`}
              >
                <Icon name="clock-outline" size={17} color="currentColor" />
                {`Hạn kế tiếp ${nextDue}`}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

/**
 * A stack of coins on a painted slot, drawn in the board's corner; a shield
 * once nothing is owed. Decoration only.
 */
function DebtGlyph({ clear }: { clear: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 96"
      className="pointer-events-none absolute -right-2 top-6 hidden h-[96px] w-[120px] opacity-90 sm:block md:right-md md:top-lg md:h-[120px] md:w-[150px]"
    >
      <rect
        x="6"
        y="52"
        width="108"
        height="38"
        rx="8"
        strokeWidth="2.5"
        strokeDasharray="8 6"
        className={clear ? 'fill-none stroke-[#0B7F43]/45' : 'fill-none stroke-brand/55'}
      />
      {clear ? (
        <path
          d="M60 10 L84 19 V40 C84 56 73 66 60 72 C47 66 36 56 36 40 V19 Z"
          className="fill-[#0B7F43]/15 stroke-[#0B7F43]"
          strokeWidth="3"
          strokeLinejoin="round"
        />
      ) : (
        [0, 1, 2, 3].map((i) => (
          <g key={i}>
            <ellipse cx="60" cy={66 - i * 11} rx="26" ry="8" className="fill-[#FFB703]" />
            <ellipse
              cx="60"
              cy={63 - i * 11}
              rx="26"
              ry="8"
              className="fill-[#FFD166] stroke-[#C98A00]"
              strokeWidth="1.5"
            />
          </g>
        ))
      )}
      {clear ? (
        <path
          d="M49 40 L57 48 L72 32"
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="stroke-[#0B7F43]"
        />
      ) : null}
    </svg>
  );
}
