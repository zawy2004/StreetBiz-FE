import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { Card } from '@/components/common';
import { AppHeader, Screen, Section } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { sideApi, SideApiError, type SlotTransferRequest } from '@/core/api/side-api';
import { useAuthStore } from '@/store/auth-store';

export function TransfersListScreen() {
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.user?.id);

  const incoming = useQuery({
    queryKey: ['side', userId, 'transfers', 'incoming'],
    queryFn: () => sideApi.listTransfers('incoming'),
  });
  const outgoing = useQuery({
    queryKey: ['side', userId, 'transfers', 'outgoing'],
    queryFn: () => sideApi.listTransfers('outgoing'),
  });

  const actionableIncoming = incoming.data?.filter((t) => t.transferStatus === 'PENDING') ?? [];

  return (
    <Screen>
      <AppHeader title="Chuyển nhượng ô" back />

      <Section title="Yêu cầu gửi đến bạn">
        {incoming.isPending && <LoadingState />}
        {incoming.error && (
          <ErrorState
            message={incoming.error instanceof SideApiError ? incoming.error.message : incoming.error.message}
            onRetry={() => void incoming.refetch()}
          />
        )}
        {incoming.data && actionableIncoming.length === 0 && (
          <EmptyState icon="swap-horizontal" title="Không có yêu cầu nào" />
        )}
        {actionableIncoming.map((t) => (
          <Card key={t.transferId} onPress={() => navigate(`/vendor/slots/transfers/${t.transferId}/accept`)}>
            <TransferLabel transfer={t} />
            <p className="text-body-sm text-muted">Nhấn để xem &amp; chấp nhận</p>
          </Card>
        ))}
      </Section>

      <Section title="Yêu cầu đã gửi">
        {outgoing.isPending && <LoadingState />}
        {outgoing.error && (
          <ErrorState
            message={outgoing.error instanceof SideApiError ? outgoing.error.message : outgoing.error.message}
            onRetry={() => void outgoing.refetch()}
          />
        )}
        {outgoing.data && outgoing.data.length === 0 && (
          <EmptyState icon="swap-horizontal" title="Chưa gửi yêu cầu nào" />
        )}
        {outgoing.data?.map((t) => (
          <Card key={t.transferId}>
            <div className="flex justify-between">
              <TransferLabel transfer={t} />
              <StatusChip code={t.transferStatus} />
            </div>
          </Card>
        ))}
      </Section>
    </Screen>
  );
}

function TransferLabel({ transfer }: { transfer: SlotTransferRequest }) {
  const contract = useQuery({
    queryKey: ['side', 'contract', transfer.contractId],
    queryFn: () => sideApi.getContract(transfer.contractId),
    staleTime: 5 * 60_000,
  });

  return (
    <span className="text-headline-sm text-text">
      {contract.data?.slotCode ?? `Hợp đồng #${transfer.contractId}`}
    </span>
  );
}
