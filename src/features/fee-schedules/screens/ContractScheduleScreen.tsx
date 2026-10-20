import { useNavigate, useParams } from 'react-router-dom';

import { Card, Divider } from '@/components/common';
import { ErrorState, LoadingState } from '@/components/feedback';
import { AppHeader, Screen, Section } from '@/components/layout';
import { errorMessage } from '@/core/api';
import { ContractProgressCard, InstalmentRow } from '../components/ScheduleComponents';
import { useContractSchedule } from '../useFeeSchedules';

/**
 * One rental contract's fee schedule: every instalment in order, what is paid (with its invoice),
 * what is due next, and what is late. Answers "how much have I paid on this slot, and how much is
 * left?" in one place.
 */
export function ContractScheduleScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { schedule, isLoading, isError, error, refetch } = useContractSchedule(Number(id));

  if (isLoading) {
    return (
      <Screen>
        <AppHeader title="Lịch phí" back />
        <LoadingState />
      </Screen>
    );
  }
  if (isError || !schedule) {
    return (
      <Screen>
        <AppHeader title="Lịch phí" back />
        <ErrorState
          message={isError ? errorMessage(error) : 'Không tìm thấy hợp đồng thuê.'}
          onRetry={() => refetch()}
        />
      </Screen>
    );
  }

  const { contract, items } = schedule;
  return (
    <Screen>
      <AppHeader
        title={`Lịch phí ô ${contract.slotCode}`}
        subtitle={contract.wardName ?? undefined}
        back
      />
      <ContractProgressCard contract={contract} />
      {contract.address ? (
        <p className="px-2xs text-body-sm text-muted">
          {contract.address}
        </p>
      ) : null}
      <Section title={`${items.length} kỳ phí`}>
        <Card padded={false}>
          <ol aria-label="Các kỳ phí" className="px-md">
            {items.map((item, index) => (
              <li key={item.feeItemId}>
                {index ? <Divider /> : null}
                <InstalmentRow
                  item={item}
                  onPay={() => navigate(`/vendor/finance/fees/${item.feeItemId}/payment`)}
                  onOpenInvoice={
                    item.invoiceId ? () => navigate(`/vendor/finance/invoices/${item.invoiceId}`) : undefined
                  }
                />
              </li>
            ))}
          </ol>
        </Card>
      </Section>
    </Screen>
  );
}
