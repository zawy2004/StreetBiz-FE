import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { Card, Divider, ListRow, QrCode } from '@/components/common';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { ErrorState, LoadingState } from '@/components/feedback';
import { sideApi, SideApiError } from '@/core/api/side-api';
import { useAuthStore } from '@/store/auth-store';

export function DigitalPermitScreen() {
  const { id } = useParams<{ id: string }>();
  const userId = useAuthStore((s) => s.user?.id);
  const contractId = Number(id);
  const validId = Number.isFinite(contractId);

  const contract = useQuery({
    queryKey: ['side', userId, 'contract', contractId],
    queryFn: () => sideApi.getContract(contractId),
    enabled: validId,
  });

  const permit = useQuery({
    queryKey: ['side', userId, 'permit', contractId],
    queryFn: () => sideApi.getPermit(contractId),
    enabled: validId,
  });

  if (!validId) return <ErrorState message="Mã hợp đồng không hợp lệ." />;
  if (permit.isPending || contract.isPending) return <LoadingState />;
  if (permit.error)
    return (
      <ErrorState
        message={permit.error instanceof SideApiError ? permit.error.message : permit.error.message}
        onRetry={() => void permit.refetch()}
      />
    );

  return (
    <Screen>
      <AppHeader title="Giấy phép số" back />
      <Card>
        <div className="flex flex-col items-center gap-sm">
          {/* effectiveStatus (vw_PermitValidity), not permit_status: a slot
              already returned still reads permit_status ACTIVE. */}
          <StatusChip code={permit.data.effectiveStatus} />
          <QrCode value={permit.data.qrPayload} />
          <span className="text-code text-text">{permit.data.qrPayload}</span>
        </div>
      </Card>
      <Card padded={false}>
        <div className="px-md">
          <ListRow
            title="Ô cấp phép"
            subtitle={contract.data ? `${contract.data.slotCode} · ${contract.data.zoneName}` : undefined}
          />
          <Divider />
          <ListRow
            title="Hiệu lực"
            subtitle={`${new Date(permit.data.startDate).toLocaleDateString('vi-VN')} – ${new Date(permit.data.endDate).toLocaleDateString('vi-VN')}`}
          />
        </div>
      </Card>
    </Screen>
  );
}
