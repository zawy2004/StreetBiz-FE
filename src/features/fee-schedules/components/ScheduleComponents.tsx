import { Button, Card, formatVnd, Icon, Money } from '@/components/common';
import { StatusChip } from '@/components/status';
import type { ScheduleItemDto, VendorContractFinanceDto } from '@/core/api';
import { colors } from '@/theme';
import { dueBadge, formatDay, paidShare } from '../schedule-progress';

/** A quiet progress bar: the leaf green of "done", growing gently when it changes. */
export function ProgressBar({ value, label }: { value: number; label: string }) {
  const percent = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className="h-2 w-full overflow-hidden rounded-full bg-sunken"
    >
      <div
        className="h-full rounded-full bg-tertiary transition-[width] duration-500 ease-out"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

export function DueBadge({ item }: { item: Parameters<typeof dueBadge>[0] }) {
  const badge = dueBadge(item);
  return <StatusChip label={badge.label} tone={badge.tone} />;
}

/**
 * Whether an instalment deserves a chip at all: paid, late or due within a week. A due date far
 * off is said once, in the line under the title; a grey chip repeating it is noise.
 */
const needsBadge = (item: Parameters<typeof dueBadge>[0]) => dueBadge(item).tone !== 'neutral';

/** Only what is late or due soon gets the solid action; the rest stay quiet until their turn. */
const isUrgent = (item: ScheduleItemDto) => item.daysOverdue != null || (item.daysUntilDue ?? 99) <= 7;

/**
 * One rental contract: how much of its schedule is paid, and what is next. Overdue debt is the
 * only thing called out in red; everything else stays calm.
 */
export function ContractProgressCard({
  contract,
  onOpen,
}: {
  contract: VendorContractFinanceDto;
  onOpen?: () => void;
}) {
  const next = contract.nextDue;
  return (
    <Card onPress={onOpen}>
      <div className="flex items-start justify-between gap-sm">
        <div className="min-w-0">
          <p className="text-headline-sm text-text">Ô {contract.slotCode}</p>
          <p className="truncate text-body-sm text-muted">
            {[contract.zoneName, `${formatDay(contract.startDate)} – ${formatDay(contract.endDate)}`]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        {onOpen ? <Icon name="chevron-right" size={20} color={colors.muted} /> : null}
      </div>

      <div className="mt-sm flex items-baseline justify-between gap-sm text-body-sm text-muted">
        <span>
          Đã nộp {contract.paidCount}/{contract.instalmentCount} kỳ
        </span>
        <span className="tabular-nums">
          {formatVnd(contract.paidAmount)} / {formatVnd(contract.totalAmount)}
        </span>
      </div>
      <div className="mt-2xs">
        <ProgressBar value={paidShare(contract)} label={`Tiến độ đóng phí ô ${contract.slotCode}`} />
      </div>

      {next ? (
        <div className="mt-sm flex items-center justify-between gap-sm border-t border-border pt-sm">
          <div className="min-w-0 flex-1">
            <p className="text-label text-text">Kỳ tiếp theo · {next.periodLabel}</p>
            <div className="mt-2xs">
              {needsBadge(next) ? (
                <DueBadge item={next} />
              ) : (
                <span className="text-body-sm text-muted">Hạn {formatDay(next.dueDate)}</span>
              )}
            </div>
          </div>
          <Money amountVnd={next.amount} className="shrink-0 whitespace-nowrap" />
        </div>
      ) : (
        <p className="mt-sm flex items-center gap-2xs border-t border-border pt-sm text-body-sm text-text">
          <Icon name="check-circle-outline" size={16} color={colors.tertiary} />
          Đã nộp đủ phí của hợp đồng này
        </p>
      )}
    </Card>
  );
}

/**
 * One instalment: what, when, how much, and the one thing to do with it (pay it, or open the
 * invoice it produced).
 */
export function InstalmentRow({
  item,
  slotCode,
  onPay,
  onOpenInvoice,
}: {
  item: ScheduleItemDto;
  slotCode?: string;
  onPay?: () => void;
  onOpenInvoice?: () => void;
}) {
  const paid = item.itemStatus === 'PAID';
  return (
    <div className="flex items-center justify-between gap-sm py-sm">
      <div className="min-w-0">
        <p className="truncate text-headline-sm text-text">{item.periodLabel}</p>
        <p className="mt-2xs text-body-sm text-muted">
          {[slotCode ? `Ô ${slotCode}` : null, paid && item.paidAt
            ? `Đã nộp ${new Date(item.paidAt).toLocaleDateString('vi-VN')}`
            : `Hạn ${formatDay(item.dueDate)}`]
            .filter(Boolean)
            .join(' · ')}
        </p>
        {needsBadge(item) ? (
          <div className="mt-2xs">
            <DueBadge item={item} />
          </div>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-xs">
        <Money amountVnd={item.amount} className="whitespace-nowrap" />
        {!paid && onPay ? (
          <Button
            label="Thanh toán"
            size="sm"
            variant={isUrgent(item) ? 'primary' : 'outline'}
            fullWidth={false}
            onPress={onPay}
          />
        ) : null}
        {paid && item.invoiceId && onOpenInvoice ? (
          <Button label="Hoá đơn" size="sm" variant="outline" fullWidth={false} onPress={onOpenInvoice} />
        ) : null}
      </div>
    </div>
  );
}
