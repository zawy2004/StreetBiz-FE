import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { Card, QrCode } from '@/components/common';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { ErrorState, LoadingState } from '@/components/feedback';
import { sideApi } from '@/core/api/side-api';
import { ContractTerm } from '@/features/sidewalk-slots/components/ContractTerm';
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
  if (permit.error) return <ErrorState message={permit.error.message} onRetry={() => void permit.refetch()} />;

  // effectiveStatus (vw_PermitValidity), not permit_status: a slot already returned still reads permit_status ACTIVE.
  const valid = permit.data.effectiveStatus === 'VALID';

  return (
    <Screen>
      <div className="mx-auto flex w-full max-w-md flex-col gap-md">
        <AppHeader title="Giấy phép số" back subtitle="Xuất trình khi cán bộ kiểm tra" />

        <Card>
          <div className="flex flex-col items-center gap-sm text-center">
            <StatusChip code={permit.data.effectiveStatus} />
            {contract.data && (
              <div>
                <p className="text-headline-lg text-text">{contract.data.slotCode}</p>
                <p className="text-body-md text-muted">{contract.data.zoneName}</p>
              </div>
            )}
            <div className={valid ? '' : 'opacity-40'}>
              <QrCode value={permit.data.qrPayload} size={220} />
            </div>
            <p className="text-body-sm text-muted">
              {valid ? 'Quét mã QR để kiểm tra giấy phép.' : 'Giấy phép này hiện không có hiệu lực.'}
            </p>
            <span className="break-all text-code text-muted">{permit.data.qrPayload}</span>
          </div>
        </Card>

        <Card>
          <div className="flex flex-col gap-sm">
            <p className="text-headline-sm text-text">Hiệu lực</p>
            <ContractTerm startDate={permit.data.startDate} endDate={permit.data.endDate} today={new Date()} live={valid} />
          </div>
        </Card>
      </div>
    </Screen>
  );
}
