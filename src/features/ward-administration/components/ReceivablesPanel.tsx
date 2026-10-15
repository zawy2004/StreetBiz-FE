import { Button, Card, Divider, formatVnd, Money } from '@/components/common';
import { Section } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { showToast } from '@/components/feedback';
import { errorMessage, type WardRefundDto } from '@/core/api';
import { useMarkRefunded, useReceivables, useWardRefunds } from '../useWardReports';

const day = (iso: string) => new Date(iso).toLocaleDateString('vi-VN');

function RefundRow({ refund, first }: { refund: WardRefundDto; first: boolean }) {
  const mark = useMarkRefunded();
  const waiting = refund.status === 'REFUND_REQUIRED';
  return (
    <div>
      {first ? null : <Divider />}
      <div className="flex items-center justify-between gap-sm py-sm">
        <div className="min-w-0">
          <p className="truncate text-headline-sm text-text">{refund.vendorName}</p>
          <p className="text-body-sm text-muted">
            {refund.label} · {refund.provider} · nhận {day(refund.receivedAt)}
          </p>
          <div className="mt-2xs">
            <StatusChip code={refund.status} />
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-xs">
          <Money amountVnd={refund.amount} className="whitespace-nowrap" />
          {waiting ? (
            <Button
              label="Đã hoàn tiền"
              size="sm"
              variant="outline"
              fullWidth={false}
              loading={mark.isPending}
              onPress={() =>
                mark.mutate(refund.transactionId, {
                  onSuccess: () => showToast('Đã ghi nhận hoàn tiền'),
                  onError: (error) => showToast(errorMessage(error)),
                })
              }
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * What the ward is owed and what it owes: overdue fees by age, and payments received for something
 * already paid. Quiet by design: the age bands are plain numbers, and the refund list only appears
 * when there is something to refund (or something refunded recently).
 */
export function ReceivablesPanel() {
  const receivables = useReceivables();
  const refunds = useWardRefunds();
  const data = receivables.data;
  const rows = refunds.data ?? [];

  return (
    <>
      {data && data.overdueAmount > 0 ? (
        <Section title="Tuổi nợ quá hạn">
          <Card>
            <div className="grid grid-cols-3 gap-sm">
              {data.aging.map((band) => (
                <div key={band.key}>
                  <p className="text-body-xs text-muted">{band.label}</p>
                  <p className="text-headline-sm tabular-nums text-text">{formatVnd(band.amount)}</p>
                  <p className="text-body-xs text-muted">
                    {band.households} hộ · {band.instalments} kỳ
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-sm border-t border-border pt-sm text-body-sm text-muted">
              Sắp đến hạn trong 30 ngày: {data.dueNext30Count} kỳ, {formatVnd(data.dueNext30Amount)}
            </p>
          </Card>
        </Section>
      ) : null}

      {rows.length ? (
        <Section title="Khoản cần hoàn lại">
          <Card padded={false}>
            <div className="px-md">
              {rows.map((refund, index) => (
                <RefundRow key={refund.transactionId} refund={refund} first={index === 0} />
              ))}
            </div>
          </Card>
          <p className="text-body-sm text-muted">
            Hộ kinh doanh đã trả hai lần cho cùng một khoản. Hoàn tiền qua cổng thanh toán hoặc trực tiếp,
            rồi bấm &ldquo;Đã hoàn tiền&rdquo; để ghi lại.
          </p>
        </Section>
      ) : null}
    </>
  );
}
