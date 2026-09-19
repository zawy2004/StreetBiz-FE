import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { Card, Money } from '@/components/common';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { sideApi, SideApiError, type RentalContract } from '@/core/api/side-api';
import { useAuthStore } from '@/store/auth-store';

export function ContractsListScreen() {
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.user?.id);

  const contracts = useQuery({
    queryKey: ['side', userId, 'contracts'],
    queryFn: () => sideApi.listContracts(),
  });

  return (
    <Screen>
      <AppHeader title="Hợp đồng thuê ô" back />
      {contracts.isPending && <LoadingState />}
      {contracts.error && (
        <ErrorState
          message={contracts.error instanceof SideApiError ? contracts.error.message : contracts.error.message}
          onRetry={() => void contracts.refetch()}
        />
      )}
      {contracts.data && contracts.data.length === 0 && (
        <EmptyState icon="file-document-outline" title="Chưa có hợp đồng nào" />
      )}
      {contracts.data?.map((c) => (
        <ContractCard key={c.contractId} contract={c} onPress={() => navigate(`/vendor/slots/contracts/${c.contractId}`)} />
      ))}
    </Screen>
  );
}

function ContractCard({ contract, onPress }: { contract: RentalContract; onPress: () => void }) {
  const slot = useQuery({
    queryKey: ['side', 'slot', contract.slotId],
    queryFn: () => sideApi.getSlot(contract.slotId),
    staleTime: 5 * 60_000,
  });

  return (
    <Card onPress={onPress}>
      <div className="flex justify-between">
        <div className="flex flex-col gap-2xs">
          <span className="text-headline-sm text-text">{contract.slotCode}</span>
          <span className="text-body-sm text-muted">
            Đến {new Date(contract.endDate).toLocaleDateString('vi-VN')}
          </span>
        </div>
        <StatusChip code={contract.contractStatus} />
      </div>
      {slot.data ? (
        <div className="mt-xs">
          <Money amountVnd={slot.data.pricePerDay} />
          <span className="ml-1 text-body-sm text-muted">mỗi ngày</span>
        </div>
      ) : null}
    </Card>
  );
}
