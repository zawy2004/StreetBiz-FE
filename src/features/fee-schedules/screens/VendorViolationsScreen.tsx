import { Card, Money } from '@/components/common';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { errorMessage } from '@/core/api';
import { useVendorViolations } from '../useFinance';

export function VendorViolationsScreen() {
  const { violations, isLoading, isError, error, refetch } = useVendorViolations();

  return (
    <Screen>
      <AppHeader title="Lịch sử vi phạm" back />
      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
      ) : violations.length === 0 ? (
        <EmptyState icon="shield-check-outline" title="Không có vi phạm nào" />
      ) : (
        violations.map((v) => (
          <Card key={v.violationId}>
            <div className="flex items-start justify-between gap-sm">
              <span className="text-headline-sm text-text">{v.violationLabel}</span>
              {v.penaltyAmount !== null ? <Money amountVnd={v.penaltyAmount} /> : null}
            </div>
            {v.description ? (
              <p className="mt-2xs text-body-md text-muted">{v.description}</p>
            ) : null}
            <div className="mt-xs flex items-center justify-between">
              <span className="text-body-sm text-muted">
                {[v.slotCode ? `Ô ${v.slotCode}` : null, new Date(v.recordedAt).toLocaleString('vi-VN')]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
              {v.penaltyStatus ? <StatusChip code={v.penaltyStatus} /> : null}
            </div>
          </Card>
        ))
      )}
    </Screen>
  );
}
