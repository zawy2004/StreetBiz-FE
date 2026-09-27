import { Card, Divider, ListRow, Money } from '@/components/common';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { errorMessage, type PaymentTransactionDto } from '@/core/api';
import { usePaymentHistory } from '../useFinance';

const PURPOSE_LABEL: Record<string, string> = {
  RENTAL_FEE: 'Phí thuê ô',
  PENALTY: 'Biên bản phạt',
};

const PROVIDER_LABEL: Record<string, string> = {
  MOMO: 'MoMo',
  ZALOPAY: 'ZaloPay',
};

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

export function PaymentHistoryScreen() {
  const { payments, isLoading, isError, error, refetch } = usePaymentHistory();

  return (
    <Screen>
      <AppHeader title="Lịch sử thanh toán" back />
      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
      ) : payments.length === 0 ? (
        <EmptyState icon="history" title="Chưa có giao dịch nào" />
      ) : (
        <Card padded={false}>
          <div className="px-md">
            {payments.map((row, i) => (
              <div key={row.transactionId}>
                {i > 0 ? <Divider /> : null}
                <ListRow
                  title={row.referenceLabel}
                  subtitle={describe(row)}
                  trailing={
                    <div className="flex flex-col items-end gap-2xs">
                      <Money amountVnd={row.amount} />
                      <StatusChip code={row.transactionStatus} />
                    </div>
                  }
                />
              </div>
            ))}
          </div>
        </Card>
      )}
    </Screen>
  );
}
