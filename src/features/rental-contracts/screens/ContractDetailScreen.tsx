import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { Button, Card, Money } from '@/components/common';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { ErrorState, LoadingState } from '@/components/feedback';
import { sideApi, SideApiError } from '@/core/api/side-api';
import { useAuthStore } from '@/store/auth-store';

export function ContractDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.user?.id);
  const contractId = Number(id);
  const validId = Number.isFinite(contractId);

  const contract = useQuery({
    queryKey: ['side', userId, 'contract', contractId],
    queryFn: () => sideApi.getContract(contractId),
    enabled: validId,
  });

  const slot = useQuery({
    queryKey: ['side', 'slot', contract.data?.slotId],
    queryFn: () => sideApi.getSlot(contract.data!.slotId),
    enabled: !!contract.data,
  });

  if (!validId) return <ErrorState message="Mã hợp đồng không hợp lệ." />;
  if (contract.isPending) return <LoadingState />;
  if (contract.error)
    return (
      <ErrorState
        message={contract.error instanceof SideApiError ? contract.error.message : contract.error.message}
        onRetry={() => void contract.refetch()}
      />
    );
  const data = contract.data;
  const isActive = data.contractStatus === 'ACTIVE';

  return (
    <Screen>
      <AppHeader title={data.slotCode} back subtitle={data.zoneName} />
      <Card>
        <div className="flex justify-between">
          {slot.data ? <Money amountVnd={slot.data.pricePerDay} size="lg" /> : <span />}
          <StatusChip code={data.contractStatus} />
        </div>
        <p className="text-body-sm text-muted">
          {new Date(data.startDate).toLocaleDateString('vi-VN')} —{' '}
          {new Date(data.endDate).toLocaleDateString('vi-VN')}
        </p>
        {data.cancellationReason ? (
          <p className="mt-1 text-body-sm text-muted">Lý do huỷ: {data.cancellationReason}</p>
        ) : null}
      </Card>

      {isActive ? (
        <div className="flex flex-wrap gap-sm">
          <div className="min-w-[150px] flex-grow">
            <Button
              label="Xem giấy phép QR"
              onPress={() => navigate(`/vendor/slots/contracts/${data.contractId}/permit`)}
            />
          </div>
          <div className="min-w-[150px] flex-grow">
            <Button
              label="Gia hạn"
              variant="outline"
              onPress={() => navigate(`/vendor/slots/contracts/${data.contractId}/renewal`)}
            />
          </div>
          <div className="min-w-[150px] flex-grow">
            <Button
              label="Chuyển nhượng"
              variant="outline"
              onPress={() => navigate(`/vendor/slots/contracts/${data.contractId}/transfer`)}
            />
          </div>
          <div className="min-w-[150px] flex-grow">
            <Button
              label="Trả ô"
              variant="ghost"
              onPress={() => navigate(`/vendor/slots/contracts/${data.contractId}/return`)}
            />
          </div>
        </div>
      ) : null}
    </Screen>
  );
}
