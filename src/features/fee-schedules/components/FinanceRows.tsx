import type { ReactNode } from 'react';

import { formatVnd, Icon, KerbTag } from '@/components/common';
import { StatusChip } from '@/components/status';
import type { FeeItemDto, InvoiceDto, PenaltyListDto } from '@/core/api';
import { invoiceKindLine, type Urgency } from '../finance-view';
import { INK, RULE } from './finance-styles';

type ShellProps = {
  onPress?: () => void;
  rule: string;
  children: ReactNode;
};

/**
 * A finance list row: a status rule down the left edge, the content, and a
 * chevron when it opens something. Only rows that open something are buttons
 * and only they lift on hover.
 */
function RowShell({ onPress, rule, children }: ShellProps) {
  const body = (
    <>
      <span aria-hidden="true" className={`w-1.5 shrink-0 ${rule}`} />
      <span className="flex min-w-0 flex-1 flex-col gap-xs px-md py-sm md:py-md">{children}</span>
      {onPress ? (
        <span
          aria-hidden="true"
          className="flex w-10 shrink-0 items-center justify-center text-muted transition-transform duration-200 group-hover:translate-x-1"
        >
          <Icon name="chevron-right" size={20} color="currentColor" />
        </span>
      ) : null}
    </>
  );
  const base =
    'flex min-h-[76px] w-full overflow-hidden rounded-[18px] bg-card text-left shadow-card ring-1 ring-border/80';
  if (!onPress) return <div className={base}>{body}</div>;
  return (
    <button
      type="button"
      onClick={onPress}
      className={`group ${base} transition-[box-shadow,transform] duration-200 [transition-timing-function:var(--ease-out)] hover:-translate-y-0.5 hover:shadow-card-hover active:translate-y-0 active:scale-[.99]`}
    >
      {body}
    </button>
  );
}

const amountClass =
  'whitespace-nowrap font-sign text-[18px] font-bold leading-6 tabular-nums text-text';

/** One fee instalment: slot plate, period, amount; due date, how urgent, status. */
export function FeeRow({
  fee,
  urgency,
  onPress,
}: {
  fee: FeeItemDto;
  urgency: Urgency | null;
  onPress?: () => void;
}) {
  const rule =
    fee.itemStatus === 'OVERDUE'
      ? RULE.danger
      : fee.itemStatus === 'PENDING'
        ? RULE.pending
        : fee.itemStatus === 'PAID'
          ? RULE.ok
          : RULE.none;
  return (
    <RowShell onPress={onPress} rule={rule}>
      <span className="flex items-start justify-between gap-sm">
        <span className="flex min-w-0 flex-wrap items-center gap-x-sm gap-y-1">
          {fee.slotCode ? <KerbTag code={fee.slotCode} /> : null}
          <span className="min-w-0 font-sign text-[18px] font-semibold leading-6 text-text">
            {fee.periodLabel}
          </span>
        </span>
        <span className={amountClass}>{formatVnd(fee.amount)}</span>
      </span>
      <span className="flex flex-wrap items-center justify-between gap-x-sm gap-y-xs">
        <span className="text-body-lg text-text/80">
          <span>Hạn {new Date(fee.dueDate).toLocaleDateString('vi-VN')}</span>
          {urgency ? (
            <span className={`font-bold ${INK[urgency.tone]}`}> · {urgency.text}</span>
          ) : null}
        </span>
        <StatusChip code={fee.itemStatus} />
      </span>
    </RowShell>
  );
}

/** One penalty notice: what it was for, where, when, how much, where it stands. */
export function PenaltyRow({
  penalty,
  onPress,
}: {
  penalty: PenaltyListDto;
  onPress?: () => void;
}) {
  const rule =
    penalty.penaltyStatus === 'UNPAID'
      ? RULE.danger
      : penalty.penaltyStatus === 'PAID'
        ? RULE.ok
        : RULE.neutral;
  return (
    <RowShell onPress={onPress} rule={rule}>
      <span className="flex items-start justify-between gap-sm">
        <span className="line-clamp-2 min-w-0 font-sign text-[17px] font-semibold leading-6 text-text">
          {penalty.violationLabel}
        </span>
        <span className={amountClass}>{formatVnd(penalty.amount)}</span>
      </span>
      <span className="flex flex-wrap items-center justify-between gap-x-sm gap-y-xs">
        <span className="flex flex-wrap items-center gap-x-sm gap-y-1 text-body-md text-muted">
          {penalty.slotCode ? <KerbTag code={penalty.slotCode} /> : null}
          <span className="flex items-center gap-1">
            <Icon name="gavel" size={15} color="currentColor" />
            {new Date(penalty.issuedAt).toLocaleDateString('vi-VN')}
          </span>
        </span>
        <StatusChip code={penalty.penaltyStatus} />
      </span>
    </RowShell>
  );
}

/**
 * One invoice as the stub of a receipt book: a perforated left edge, the
 * serial number, what it was for and when, the amount. Shared by V25 and V28.
 */
export function InvoiceRow({ invoice, onPress }: { invoice: InvoiceDto; onPress: () => void }) {
  return (
    <button
      type="button"
      onClick={onPress}
      className="group relative flex min-h-[76px] w-full items-center overflow-hidden rounded-[16px] bg-card text-left shadow-card ring-1 ring-border/80 transition-[background-color,box-shadow,transform] duration-200 [transition-timing-function:var(--ease-out)] hover:bg-sunken/60 hover:shadow-card-hover active:scale-[.99]"
    >
      <span aria-hidden="true" className="relative flex w-6 shrink-0 self-stretch justify-center">
        <span
          className="h-full w-1"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgb(var(--c-border)) 1.6px, transparent 2.1px)',
            backgroundSize: '4px 9px',
            backgroundRepeat: 'repeat-y',
          }}
        />
        <span className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rounded-full bg-bg ring-1 ring-border/80" />
        <span className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rounded-full bg-bg ring-1 ring-border/80" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1 py-sm pl-xs pr-sm">
        <span className="flex items-baseline justify-between gap-sm">
          <span
            title={invoice.invoiceNumber}
            className="min-w-0 truncate font-sign text-[17px] font-semibold leading-6 tracking-[0.02em] tabular-nums text-text"
          >
            {invoice.invoiceNumber}
          </span>
          <span className={amountClass}>{formatVnd(invoice.amount)}</span>
        </span>
        <span className="flex flex-wrap items-center gap-x-sm gap-y-0.5 text-body-md text-muted">
          <span className="min-w-0">{invoiceKindLine(invoice)}</span>
          <span>{new Date(invoice.issuedAt).toLocaleDateString('vi-VN')}</span>
        </span>
      </span>
      <span
        aria-hidden="true"
        className="flex w-9 shrink-0 items-center justify-center text-muted transition-transform duration-200 group-hover:translate-x-1"
      >
        <Icon name="chevron-right" size={20} color="currentColor" />
      </span>
    </button>
  );
}
