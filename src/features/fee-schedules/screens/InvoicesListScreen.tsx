import { useNavigate } from 'react-router-dom';

import { AppHeader, Screen } from '@/components/layout';
import { ErrorState, LoadingState } from '@/components/feedback';
import { errorMessage } from '@/core/api';
import { InvoiceList } from '../components/InvoiceList';
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
      ) : (
        <InvoiceList invoices={invoices} onOpen={(id) => navigate(`/vendor/finance/invoices/${id}`)} />
      )}
    </Screen>
  );
}
