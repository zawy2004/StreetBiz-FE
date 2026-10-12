import type { ReactNode } from 'react';

import { formatVnd, Icon, KerbTag, Money } from '@/components/common';
import type { IconName } from '@/components/common';
import { EmptyState, Skeleton } from '@/components/feedback';
import { StatusChip } from '@/components/status';
import type {
  WardFinanceContractDetail,
  WardFinanceContractItem,
} from '../../ward-finance-api';
import { formatDateVn } from '../../ward-config-api';
import { useCountUp, useGrown } from '../ops/count-up';
import { awaitsRefund, breakdownOf, type OwedSummary } from './finance-model';

// The money screens use the same pieces as the collection report: one large figure, a sunken
// side card, ledgers with dotted rules, slot plates. Nothing here decides anything; it only draws.

const PENDING_DOT = 'bg-[#C98A04]';
const OVERDUE_DOT = 'bg-[#B42318]';
const FINE_DOT = 'bg-[repeating-linear-gradient(135deg,#8F1717_0_5px,#B4473F_5px_8px)]';
const PAID_DOT = 'bg-tertiary';

/** The figure the collection report leads with, reused so the two screens read alike. */
function BigFigure({ value, caption, icon }: { value: number; caption: string; icon: IconName }) {
  const shown = useCountUp(value, 600);
  const big = value >= 1_000_000_000;
  return (
    <div className="flex flex-col gap-1">
      <p className="flex items-center gap-1.5 text-body-md font-medium text-muted">
        <Icon name={icon} size={18} color="currentColor" className="text-primary" />
        {caption}
      </p>
      <p
        className={`whitespace-nowrap font-sign font-extrabold leading-none tracking-[-0.02em] text-text [font-stretch:86%] ${big ? 'text-[34px] md:text-[52px]' : 'text-[44px] md:text-[64px]'}`}
      >
        <span aria-hidden="true" className="font-tabular">
          {shown.toLocaleString('vi-VN')}
          <span className="ml-1 text-[0.44em] font-bold text-muted">đ</span>
        </span>
        <span className="sr-only">{formatVnd(value)}</span>
      </p>
    </div>
  );
}

function Stat({ dot, label, children }: { dot: string; label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="flex items-center gap-xs text-body-sm text-muted">
        <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot}`} />
        {label}
      </dt>
      <dd>{children}</dd>
    </div>
  );
}

function Count({ value }: { value: number }) {
  return (
    <span className="font-sign text-[28px] font-extrabold leading-none text-text [font-stretch:86%]">
      {value}
    </span>
  );
}

/** Ward-wide: what is still owed, and the three things that need someone to act. */
export function WardOwedHero({ summary }: { summary: OwedSummary }) {
  return (
    <section
      aria-label="Còn phải thu toàn phường"
      className="flex min-w-0 flex-col gap-md overflow-hidden rounded-[24px] bg-card p-md shadow-card ring-1 ring-border md:p-lg"
    >
      <BigFigure value={summary.outstanding} caption="Còn phải thu toàn phường" icon="cash-multiple" />
      <p className="-mt-xs text-body-md text-muted">
        {summary.contracts} hợp đồng thuê ô · gồm kỳ phí chưa nộp và tiền phạt chưa nộp
      </p>
      <dl className="grid gap-sm border-t border-border pt-md sm:grid-cols-3">
        <Stat dot={OVERDUE_DOT} label="Hợp đồng có kỳ quá hạn">
          <Count value={summary.overdueContracts} />
        </Stat>
        <Stat dot={FINE_DOT} label="Tiền phạt chưa nộp">
          <Money amountVnd={summary.unpaidPenalties} size="lg" />
        </Stat>
        <Stat dot={PENDING_DOT} label="Chờ hoàn cọc">
          <Count value={summary.awaitingRefund} />
        </Stat>
      </dl>
    </section>
  );
}

/** One contract per line: the slot plate, the household, what is wrong with it, and what is owed. */
export function ContractLedger({
  items,
  onOpen,
}: {
  items: WardFinanceContractItem[];
  onOpen: (contractId: number) => void;
}) {
  return (
    <ol className="overflow-hidden rounded-[24px] bg-card px-md shadow-card ring-1 ring-border md:px-lg">
      {items.map((c) => (
        <li key={c.contractId} className="border-b border-dotted border-border last:border-b-0">
          <button
            type="button"
            onClick={() => onOpen(c.contractId)}
            className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-md gap-y-xs rounded-[12px] py-sm text-left transition-colors hover:bg-sunken/60"
          >
            <span className="flex min-w-0 flex-col gap-1">
              <span className="flex min-w-0 flex-wrap items-center gap-xs">
                <KerbTag code={c.slotCode} />
                <span className="min-w-0 truncate text-headline-sm text-text" title={c.vendorName}>
                  {c.vendorName}
                </span>
              </span>
              <span className="text-body-sm text-muted">
                {c.zoneName} · đến {formatDateVn(c.endDate)}
                {c.vendorPhone ? ` · ${c.vendorPhone}` : ''}
              </span>
              <span className="flex flex-wrap items-center gap-xs">
                {c.overdueCount > 0 ? (
                  <StatusChip label={`${c.overdueCount} kỳ quá hạn`} tone="danger" />
                ) : null}
                {c.unpaidPenalties > 0 ? (
                  <StatusChip label={`Phạt ${formatVnd(c.unpaidPenalties)}`} tone="pending" />
                ) : null}
                {awaitsRefund(c) ? <StatusChip label="Chờ hoàn cọc" tone="pending" /> : null}
                {c.overdueCount === 0 && c.unpaidPenalties === 0 && c.outstanding === 0 ? (
                  <StatusChip label="Đã thu đủ" tone="ok" />
                ) : null}
              </span>
            </span>
            <span className="flex items-center gap-xs">
              <Money amountVnd={c.outstanding} size="lg" />
              <Icon name="chevron-right" size={20} color="currentColor" className="text-muted" />
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}

/** One contract: who, where and until when, what is left, and where the money stands. */
export function ContractHero({ detail }: { detail: WardFinanceContractDetail }) {
  const grown = useGrown();
  const parts = breakdownOf(detail.items, detail.penalties);
  const segments = [
    { key: 'paid', value: parts.paid, cls: PAID_DOT, label: 'Đã thu' },
    { key: 'pending', value: parts.pending, cls: PENDING_DOT, label: 'Chưa đến hạn' },
    { key: 'overdue', value: parts.overdue, cls: OVERDUE_DOT, label: 'Quá hạn' },
    { key: 'fines', value: parts.fines, cls: FINE_DOT, label: 'Phạt chưa nộp' },
  ];
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const spoken = segments
    .filter((s) => s.value > 0)
    .map((s) => `${s.label} ${formatVnd(s.value)}`)
    .join(', ');

  return (
    <section
      aria-label="Tình hình thu phí của hợp đồng"
      className="flex min-w-0 flex-col gap-md overflow-hidden rounded-[24px] bg-card p-md shadow-card ring-1 ring-border md:p-lg"
    >
      <div className="flex flex-wrap items-center gap-xs">
        <KerbTag code={detail.slotCode} />
        <h2 className="min-w-0 truncate text-headline-md text-text" title={detail.vendorName}>
          {detail.vendorName}
        </h2>
      </div>
      <p className="-mt-xs text-body-sm text-muted">
        {detail.zoneName} · {formatDateVn(detail.startDate)} – {formatDateVn(detail.endDate)}
        {detail.vendorPhone ? ` · ${detail.vendorPhone}` : ''}
      </p>

      <BigFigure value={detail.outstanding} caption="Còn phải thu" icon="cash-multiple" />

      {total > 0 ? (
        <div
          role="img"
          aria-label={spoken}
          className="flex h-3 w-full gap-[3px] overflow-hidden rounded-full bg-sunken"
        >
          {segments
            .filter((s) => s.value > 0)
            .map((s) => (
              <span
                key={s.key}
                title={`${s.label}: ${formatVnd(s.value)}`}
                className={`h-full rounded-full transition-[flex-grow] duration-700 ease-[cubic-bezier(.2,.8,.2,1)] ${s.cls}`}
                style={{ flexGrow: grown ? s.value : 0, flexBasis: 0 }}
              />
            ))}
        </div>
      ) : (
        <div aria-hidden="true" className="h-3 w-full rounded-full border-2 border-dashed border-border" />
      )}

      <dl className="grid grid-cols-2 gap-sm md:grid-cols-4">
        {segments.map((s) => (
          <Stat key={s.key} dot={s.cls} label={s.label}>
            <Money amountVnd={s.value} />
          </Stat>
        ))}
      </dl>
    </section>
  );
}

/** A ruled ledger: dotted lines between receipt-like rows, in the report's own card. */
export function Ledger({ children }: { children: ReactNode }) {
  return (
    <ol className="overflow-hidden rounded-[24px] bg-card px-md shadow-card ring-1 ring-border md:px-lg">
      {children}
    </ol>
  );
}

export function LedgerEmpty({ icon, title }: { icon: IconName; title: string }) {
  return (
    <div className="rounded-[24px] bg-card shadow-card ring-1 ring-border">
      <EmptyState icon={icon} title={title} compact />
    </div>
  );
}

/**
 * One instalment or fine: the date on the left, what it is, the amount and state on the right,
 * and, full width underneath, the actions and whichever panel the officer opened.
 */
export function LedgerRow({
  lead,
  title,
  notes,
  amount,
  status,
  children,
}: {
  lead: string;
  title: string;
  notes?: ReactNode;
  amount: number;
  status: ReactNode;
  children?: ReactNode;
}) {
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-md gap-y-1 border-b border-dotted border-border py-sm last:border-b-0 sm:grid-cols-[88px_minmax(0,1fr)_auto]">
      <span className="col-span-2 font-sign text-[15px] font-bold text-muted [font-stretch:90%] sm:col-span-1 sm:pt-0.5">
        {lead}
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-headline-sm text-text">{title}</p>
        {notes}
      </div>
      <div className="flex flex-col items-end gap-1 text-right">
        <Money amountVnd={amount} />
        {status}
      </div>
      {children ? <div className="col-span-full flex flex-col gap-xs">{children}</div> : null}
    </li>
  );
}

/** Loading, in the shape of what is coming: the figure card and four ledger lines. */
export function FinanceSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-lg">
      <span className="sr-only">Đang tải…</span>
      <div className="flex flex-col gap-md rounded-[24px] bg-card p-md shadow-card ring-1 ring-border md:p-lg">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-[52px] w-3/4 md:h-[64px]" />
        <div className="grid gap-sm sm:grid-cols-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
      <div className="flex flex-col gap-sm rounded-[24px] bg-card p-md shadow-card ring-1 ring-border">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    </div>
  );
}
