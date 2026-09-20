import { useQuery } from '@tanstack/react-query';

import { Button, Card, Icon, Money } from '@/components/common';
import { StatusChip } from '@/components/status';
import { sideApi, type RentalContract } from '@/core/api/side-api';
import { colors } from '@/theme';
import { contractProgress } from '../my-slots-view';
import { Callout } from './Callout';
import { ContractTerm } from './ContractTerm';

type Props = {
  contract: RentalContract;
  /** A live contract shows how far into its term it is; an ended one is dimmed and shows its period only. */
  live: boolean;
  today: Date;
  onOpen: () => void;
  onRenew: () => void;
};

export function ContractCard({ contract, live, today, onOpen, onRenew }: Props) {
  const slot = useQuery({
    queryKey: ['side', 'slot', contract.slotId],
    queryFn: () => sideApi.getSlot(contract.slotId),
    staleTime: 5 * 60_000,
  });
  const progress = contractProgress(contract.startDate, contract.endDate, today);
  const active = contract.contractStatus === 'ACTIVE';

  return (
    <Card>
      <div className={`flex flex-col gap-sm ${live ? '' : 'opacity-80'}`}>
        <div className="flex items-start justify-between gap-sm">
          <div className="min-w-0">
            <p className="text-badge uppercase text-muted">Mã ô</p>
            <p className="text-headline-md text-text">{contract.slotCode}</p>
          </div>
          <div className="shrink-0">
            <StatusChip code={contract.contractStatus} />
          </div>
        </div>

        <p className="flex items-center gap-1 text-body-md text-muted">
          <Icon name="map-marker-outline" size={18} color={colors.muted} />
          {contract.zoneName}
        </p>

        <ContractTerm startDate={contract.startDate} endDate={contract.endDate} today={today} live={live} />

        {slot.data && (
          <div className="flex items-baseline justify-between gap-sm">
            <span className="text-body-sm text-muted">Đơn giá ngày</span>
            <span>
              <Money amountVnd={slot.data.pricePerDay} />
              <span className="ml-1 text-body-sm text-muted">/ ngày</span>
            </span>
          </div>
        )}

        {!live && contract.cancellationReason && (
          <Callout tone="neutral">
            <strong>Lý do huỷ:</strong> {contract.cancellationReason}
          </Callout>
        )}

        {live && active && progress.expiringSoon && (
          <div className="flex items-center justify-between gap-sm rounded-sm bg-tint-secondary p-sm">
            <span className="flex items-center gap-1 text-label uppercase text-on-secondary">
              <Icon name="alert-circle-outline" size={18} />
              Sắp hết hạn
            </span>
            <Button label="Gia hạn" fullWidth={false} onPress={onRenew} />
          </div>
        )}

        <div className="flex justify-end">
          <Button
            label="Xem chi tiết"
            variant="outline"
            fullWidth={false}
            onPress={onOpen}
            icon={<Icon name="arrow-right" size={18} color={colors.indigo} />}
          />
        </div>
      </div>
    </Card>
  );
}
