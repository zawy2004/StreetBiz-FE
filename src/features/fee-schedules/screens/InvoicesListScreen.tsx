import { useNavigate } from 'react-router-dom';

import { Card, Money } from '@/components/common';
import { AppHeader, Screen } from '@/components/layout';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { errorMessage } from '@/core/api';
import { useInvoices } from '../useFinance';

export function InvoicesListScreen() {
  const navigate = useNavigate();
  const { invoices, isLoading, isError, error, refetch } = useInvoices();

  return (
    <Screen>
      <AppHeader title="Hoá đơn" back />
      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
      ) : invoices.length === 0 ? (
        <EmptyState icon="receipt" title="Chưa có hoá đơn nào" />
      ) : (
        invoices.map((inv) => (
          <Card
            key={inv.invoiceId}
            onPress={() => navigate(`/vendor/finance/invoices/${inv.invoiceId}`)}
          >
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-2xs">
                <span className="text-headline-sm text-text">{inv.invoiceNumber}</span>
                <span className="text-body-sm text-muted">
                  {new Date(inv.issuedAt).toLocaleDateString('vi-VN')}
                </span>
              </div>
              <Money amountVnd={inv.amount} />
            </div>
          </Card>
        ))
      )}
    </Screen>
  );
}
