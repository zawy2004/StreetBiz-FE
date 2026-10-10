import { Fragment, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { AppHeader, Screen } from '@/components/layout';
import { EmptyState, ErrorState, Skeleton } from '@/components/feedback';
import { errorMessage } from '@/core/api';
import { useInvoices } from '../useFinance';
import { groupByMonth, ledgerTotals } from '../finance-view';
import { FinanceTabs, LoadingBlock, RowSkeletons } from '../components/FinanceParts';
import { useEntered } from '../components/finance-styles';
import { InvoiceRow } from '../components/FinanceRows';
import {
  INVOICE_PROMISE,
  LedgerMonth,
  LedgerSpine,
  LedgerSummary,
  LedgerYear,
} from '../components/Ledger';

type KindFilter = 'ALL' | 'RENTAL_FEE' | 'PENALTY';

/**
 * V28 Sổ hoá đơn: the invoices as a receipt book, month by month down a spine,
 * with the book's totals beside it. One GET as before; grouping and the kind
 * filter work on the list already loaded and are not remembered.
 */
export function InvoicesListScreen() {
  const navigate = useNavigate();
  const { invoices, isLoading, isError, error, refetch } = useInvoices();
  const [kind, setKind] = useState<KindFilter>('ALL');
  const ready = !isLoading && !isError && invoices.length > 0;
  const entered = useEntered(ready);

  const totals = ledgerTotals(invoices);
  const penaltyCount = invoices.filter((i) => i.kind === 'PENALTY').length;
  const bothKinds = penaltyCount > 0 && penaltyCount < invoices.length;
  const shown =
    !bothKinds || kind === 'ALL'
      ? invoices
      : invoices.filter((i) => (kind === 'PENALTY' ? i.kind === 'PENALTY' : i.kind !== 'PENALTY'));
  const months = groupByMonth(shown, (i) => i.issuedAt);
  const thisYear = new Date().getFullYear();

  return (
    <Screen>
      <AppHeader title="Hoá đơn" back />
      {isLoading ? (
        <LoadingBlock>
          <Skeleton className="h-[168px] w-full !rounded-[24px]" />
          <Skeleton className="mt-sm h-6 w-40" />
          <RowSkeletons count={2} height="h-[72px]" />
          <Skeleton className="mt-sm h-6 w-40" />
          <RowSkeletons count={2} height="h-[72px]" />
        </LoadingBlock>
      ) : isError ? (
        <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
      ) : invoices.length === 0 ? (
        <EmptyState icon="receipt" title="Chưa có hoá đơn nào" description={INVOICE_PROMISE} />
      ) : (
        <div className="grid gap-lg xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
          <div className="flex min-w-0 flex-col gap-md">
            {bothKinds ? (
              <FinanceTabs
                variant="chips"
                value={kind}
                onChange={setKind}
                options={[
                  { value: 'ALL', label: 'Tất cả' },
                  { value: 'RENTAL_FEE', label: 'Phí thuê ô' },
                  { value: 'PENALTY', label: 'Tiền phạt' },
                ]}
              />
            ) : null}
            <LedgerSpine entered={entered}>
              {months.map((month, index) => {
                const prevYear = months[index - 1]?.year ?? thisYear;
                return (
                  <Fragment key={month.key}>
                    {month.year !== prevYear ? <LedgerYear year={month.year} /> : null}
                    <LedgerMonth
                      label={month.label}
                      total={month.items.reduce((sum, i) => sum + i.amount, 0)}
                      index={index}
                      entered={entered}
                    >
                      {month.items.map((inv) => (
                        <li key={inv.invoiceId} className="scroll-mt-16">
                          <InvoiceRow
                            invoice={inv}
                            onPress={() => navigate(`/vendor/finance/invoices/${inv.invoiceId}`)}
                          />
                        </li>
                      ))}
                    </LedgerMonth>
                  </Fragment>
                );
              })}
            </LedgerSpine>
          </div>
          <div className="order-first xl:sticky xl:top-0 xl:order-none">
            <LedgerSummary
              count={totals.count}
              total={totals.total}
              fee={totals.fee}
              penalty={totals.penalty}
              entered={entered}
            />
          </div>
        </div>
      )}
    </Screen>
  );
}
