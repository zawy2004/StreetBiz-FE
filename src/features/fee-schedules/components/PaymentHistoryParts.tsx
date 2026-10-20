import { useId, type ReactNode } from 'react';

import { formatVnd, Icon, type IconName } from '@/components/common';
import { StatusChip } from '@/components/status';
import type { PaymentTransactionDto } from '@/core/api';
import { monthLabel, shortMonthLabel } from '../finance-view';
import { EASE_OUT, INK } from './finance-styles';

type MonthTotal = { key: string; total: number; current: boolean };

type BandProps = {
  successTotal: number;
  counts: { success: number; failed: number; pending: number };
  months: MonthTotal[];
  entered: boolean;
};

/**
 * "Sổ quỹ của quán": the money that went through, then six month columns like
 * the running total at the foot of each ledger page. The figure never counts up.
 */
export function PaymentSummaryBand({ successTotal, counts, months, entered }: BandProps) {
  const titleId = useId();
  const withMoney = months.filter((m) => m.total > 0);
  const tally = [
    `${counts.success} thành công`,
    counts.failed > 0 ? `${counts.failed} thất bại` : null,
    counts.pending > 0 ? `${counts.pending} đang chờ` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <section
      aria-labelledby={titleId}
      className="overflow-hidden rounded-[24px] bg-[#FFF3E8] ring-1 ring-[#FF6A1F]/20 dark:bg-[#2A2018]"
    >
      <div aria-hidden="true" className="sb-kerb sb-kerb-thin" />
      <div className="flex min-h-[176px] flex-col gap-md p-md md:flex-row md:items-end md:justify-between md:p-lg">
        <div className="min-w-0">
          <h2 id={titleId} className="text-[15px] font-semibold text-text/80">
            Đã thanh toán thành công
          </h2>
          <p
            className="mt-1 whitespace-nowrap font-sign text-[clamp(32px,10vw,40px)] font-bold leading-none tracking-[-0.01em] tabular-nums text-text transition-opacity duration-200 [font-stretch:88%] md:text-[48px] xl:text-[56px]"
            style={{ opacity: entered ? 1 : 0 }}
          >
            {formatVnd(successTotal)}
          </p>
          <p className="mt-xs text-body-md text-text/80">{tally}</p>
        </div>
        {withMoney.length >= 2 ? (
          <MonthBars months={months} entered={entered} />
        ) : withMoney[0] ? (
          <div className="rounded-[16px] bg-card px-md py-sm ring-1 ring-[#FF6A1F]/20 md:max-w-[280px]">
            <p className="font-sign text-[16px] font-bold tabular-nums text-text">
              {`${monthLabel(withMoney[0].key)}: ${formatVnd(withMoney[0].total)}`}
            </p>
            <p className="mt-1 text-body-sm text-muted">Biểu đồ hiện khi có từ 2 tháng giao dịch</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

/** Six month columns drawn in CSS, with a hidden table carrying the same figures. */
function MonthBars({ months, entered }: { months: MonthTotal[]; entered: boolean }) {
  const max = Math.max(...months.map((m) => m.total), 1);
  const top = months.reduce<MonthTotal | null>(
    (best, m) => (best === null || m.total > best.total ? m : best),
    null,
  );
  return (
    <div className="w-full md:w-auto">
      <div
        role="img"
        aria-label={
          top
            ? `${months.length} tháng gần đây, cao nhất ${monthLabel(top.key).toLowerCase()}: ${formatVnd(top.total)}`
            : `${months.length} tháng gần đây`
        }
        className="flex h-[148px] items-end justify-between gap-xs md:justify-end md:gap-md"
      >
        {months.map((m, i) => {
          const tip = `${monthLabel(m.key)}: ${formatVnd(m.total)}`;
          return (
            <div
              key={m.key}
              title={tip}
              className="group flex h-full w-full max-w-[44px] flex-col items-center justify-end gap-1.5 md:w-7"
            >
              {m.total > 0 ? (
                <span
                  className={`w-full origin-bottom rounded-t-[6px] transition-[transform,filter] duration-[520ms] group-hover:brightness-110 ${m.current ? 'bg-primary' : 'bg-[#FFB38A] dark:bg-[#8A4A28]'} ${entered ? 'scale-y-100' : 'scale-y-0'}`}
                  style={{
                    ...EASE_OUT,
                    height: `${Math.max(8, (m.total / max) * 120)}px`,
                    transitionDelay: `${i * 60}ms`,
                  }}
                />
              ) : (
                <span className="h-0.5 w-full rounded-full bg-border" />
              )}
              <span
                className={`font-sign text-[12px] tabular-nums ${m.current ? 'font-bold text-text' : 'text-muted'}`}
              >
                {shortMonthLabel(m.key)}
              </span>
            </div>
          );
        })}
      </div>
      <table className="sr-only">
        <caption>Số tiền thanh toán thành công theo tháng</caption>
        <tbody>
          {months.map((m) => (
            <tr key={m.key}>
              <th scope="row">{monthLabel(m.key)}</th>
              <td>{formatVnd(m.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const DISC: Record<string, { icon: IconName; className: string }> = {
  SUCCESS: {
    icon: 'check',
    className: 'bg-[#E6F6EC] text-[#0B5D33] dark:bg-[#10301F] dark:text-[#8BE3B0]',
  },
  FAILED: {
    icon: 'close',
    className: 'bg-[#FDEBEA] text-[#8F1717] dark:bg-[#3A1414] dark:text-[#FF9A90]',
  },
  PENDING: {
    icon: 'timer-outline',
    className: 'bg-[#FFF3D1] text-[#6B4100] dark:bg-[#3A2A08] dark:text-[#FFD27A]',
  },
};

const DATE_TIME: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
};

/**
 * One payment attempt. The title and the description line stay one text node
 * each, in the old order ("Phí thuê ô · NVL-01 · ZaloPay · 08:48 22/09/2026").
 * Rows do not open anything, so they do not lift on hover.
 */
export function PaymentRow({
  row,
  description,
}: {
  row: PaymentTransactionDto;
  description: string;
}) {
  const disc = DISC[row.transactionStatus] ?? {
    icon: 'information-outline' as IconName,
    className: 'bg-sunken text-text',
  };
  return (
    <li className="flex gap-sm px-md py-md">
      <span
        aria-hidden="true"
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${disc.className}`}
      >
        <Icon name={disc.icon} size={17} color="currentColor" />
      </span>
      <div className="min-w-0 flex-1 md:flex md:items-start md:justify-between md:gap-md">
        <div className="min-w-0">
          <p className="line-clamp-2 text-[16px] font-semibold leading-6 text-text">
            {row.referenceLabel}
          </p>
          <p className="mt-0.5 line-clamp-2 text-body-md text-muted">{description}</p>
          {row.callbackReceivedAt ? (
            <p className="mt-1 flex items-center gap-1.5 text-[13px] leading-5 text-muted">
              <span className="text-tertiary">
                <Icon name="cloud-check-outline" size={15} color="currentColor" />
              </span>
              {`Ví xác nhận lúc ${new Date(row.callbackReceivedAt).toLocaleString('vi-VN', DATE_TIME)}`}
            </p>
          ) : null}
          {row.transactionStatus === 'PENDING' ? (
            <p className={`mt-xs text-body-sm ${INK.pending}`}>
              Đang chờ ví xác nhận. Nếu bạn đã trả, mở lại khoản đó ở mục Tài chính để kiểm tra.
            </p>
          ) : null}
        </div>
        <div className="mt-xs flex flex-wrap items-center gap-sm md:mt-0 md:flex-col md:items-end md:gap-1.5">
          <span className="whitespace-nowrap font-sign text-[17px] font-bold leading-6 tabular-nums text-text">
            {formatVnd(row.amount)}
          </span>
          <StatusChip code={row.transactionStatus} />
        </div>
      </div>
    </li>
  );
}

/** A month of payments: heading with the month's successful total, rows on one card. */
export function PaymentMonth({
  label,
  successTotal,
  children,
}: {
  label: string;
  successTotal: number;
  children: ReactNode;
}) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-xs">
      <div className="flex flex-wrap items-baseline justify-between gap-x-sm px-1">
        <h2 id={headingId} className="font-sign text-[18px] font-bold leading-6 text-text">
          {label}
        </h2>
        <span className="text-body-md text-[#2B3640] dark:text-[#C5D0DA]">
          Thành công{' '}
          <span className="font-sign font-bold tabular-nums">{formatVnd(successTotal)}</span>
        </span>
      </div>
      <ul className="divide-y divide-border overflow-hidden rounded-[20px] bg-card shadow-card ring-1 ring-border/80">
        {children}
      </ul>
    </section>
  );
}
