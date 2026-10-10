import { useState } from 'react';

import { AppHeader, Screen } from '@/components/layout';
import { EmptyState, ErrorState, Skeleton } from '@/components/feedback';
import { errorMessage, type PaymentTransactionDto } from '@/core/api';
import { usePaymentHistory } from '../useFinance';
import {
  groupByMonth,
  monthTotals,
  paymentStats,
  PROVIDER_LABEL,
  PURPOSE_LABEL,
} from '../finance-view';
import { FinanceTabs, LoadingBlock, RowSkeletons } from '../components/FinanceParts';
import { useEntered } from '../components/finance-styles';
import { PaymentMonth, PaymentRow, PaymentSummaryBand } from '../components/PaymentHistoryParts';

/** "Phí thuê ô · NVL-01 · MoMo · 14:05 20/09/2026" */
function describe(row: PaymentTransactionDto): string {
  return [
    PURPOSE_LABEL[row.purpose] ?? row.purpose,
    row.slotCode,
    PROVIDER_LABEL[row.provider] ?? row.provider,
    new Date(row.createdAt).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
  ]
    .filter(Boolean)
    .join(' · ');
}

type StatusFilter = 'ALL' | 'SUCCESS' | 'OTHER';

/**
 * V30 Lịch sử thanh toán: what went through (total and six month columns),
 * then every attempt month by month with its status disc and, when the wallet
 * called back, when it confirmed. One GET as before; the filter is local.
 */
export function PaymentHistoryScreen() {
  const { payments, isLoading, isError, error, refetch } = usePaymentHistory();
  const [filter, setFilter] = useState<StatusFilter>('ALL');
  const entered = useEntered(!isLoading && !isError && payments.length > 0);

  const stats = paymentStats(payments);
  const hasTrouble = stats.failed + stats.pending + stats.other > 0;
  const shown =
    !hasTrouble || filter === 'ALL'
      ? payments
      : payments.filter((p) =>
          filter === 'SUCCESS'
            ? p.transactionStatus === 'SUCCESS'
            : p.transactionStatus !== 'SUCCESS',
        );
  const months = groupByMonth(shown, (p) => p.createdAt);

  return (
    <Screen>
      <AppHeader title="Lịch sử thanh toán" back />
      {isLoading ? (
        <LoadingBlock>
          <Skeleton className="h-[184px] w-full !rounded-[24px]" />
          <Skeleton className="mt-sm h-6 w-40" />
          <RowSkeletons count={3} />
        </LoadingBlock>
      ) : isError ? (
        <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
      ) : payments.length === 0 ? (
        <EmptyState
          icon="history"
          title="Chưa có giao dịch nào"
          description="Khoản phí và biên bản bạn trả qua ví sẽ hiện ở đây."
        />
      ) : (
        <>
          <PaymentSummaryBand
            successTotal={stats.successTotal}
            counts={stats}
            months={monthTotals(payments)}
            entered={entered}
          />
          {hasTrouble ? (
            <FinanceTabs
              variant="chips"
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'ALL', label: 'Tất cả' },
                { value: 'SUCCESS', label: 'Thành công' },
                { value: 'OTHER', label: 'Chưa thành công' },
              ]}
            />
          ) : null}
          {months.length === 0 ? (
            <EmptyState compact icon="history" title="Không có giao dịch nào ở mục này" />
          ) : null}
          {months.map((month) => (
            <PaymentMonth
              key={month.key}
              label={month.label}
              successTotal={month.items
                .filter((p) => p.transactionStatus === 'SUCCESS')
                .reduce((sum, p) => sum + p.amount, 0)}
            >
              {month.items.map((row) => (
                <PaymentRow key={row.transactionId} row={row} description={describe(row)} />
              ))}
            </PaymentMonth>
          ))}
        </>
      )}
    </Screen>
  );
}
