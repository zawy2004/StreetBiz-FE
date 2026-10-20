import { useQuery } from '@tanstack/react-query';

import { Button, Icon, Money } from '@/components/common';
import { StatusChip } from '@/components/status';
import { sideApi, type RentalContract } from '@/core/api/side-api';
import { TermRing } from '@/features/rental-contracts/components/TermRing';
import { contractProgress } from '../my-slots-view';
import { Callout } from './Callout';

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('vi-VN');
const DAY_MS = 86_400_000;

type Props = {
  contract: RentalContract;
  /** A live contract shows how far into its term it is; an ended one shows its period only. */
  live: boolean;
  today: Date;
  onOpen: () => void;
  onRenew: () => void;
  /** Live contracts: open the digital permit (the permit page looks it up on the server). */
  onPermit?: () => void;
};

/**
 * One rental contract: a mango calendar tab across the top when it ends within
 * 14 days (with the one "Gia hạn"), the slot code in signage letters, the term
 * ring with the days left, the daily price, and the ways on.
 */
export function ContractCard({ contract, live, today, onOpen, onRenew, onPermit }: Props) {
  const slot = useQuery({
    queryKey: ['side', 'slot', contract.slotId],
    queryFn: () => sideApi.getSlot(contract.slotId),
    staleTime: 5 * 60_000,
  });
  const progress = contractProgress(contract.startDate, contract.endDate, today);
  const active = contract.contractStatus === 'ACTIVE';
  const suspended = contract.contractStatus === 'SUSPENDED';
  const termDays = Math.round(
    (Date.parse(contract.endDate) - Date.parse(contract.startDate)) / DAY_MS,
  );

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-[22px] bg-card shadow-card ring-1 ring-border transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-card-hover">
      {live && active && progress.expiringSoon && (
        <div className="flex min-h-12 items-center justify-between gap-sm bg-[#FFF3D1] py-1 pl-md pr-1.5 text-[#6B4100] dark:bg-[#3A2A08] dark:text-[#FFD27A]">
          <span className="flex items-center gap-1.5 text-label font-bold uppercase tracking-[0.04em]">
            <Icon name="alert-circle-outline" size={18} color="currentColor" weight="fill" />
            Sắp hết hạn
          </span>
          <Button label="Gia hạn" fullWidth={false} onPress={onRenew} />
        </div>
      )}
      {live && suspended && (
        <p className="flex items-start gap-1.5 bg-[#FDEBEA] px-md py-sm text-body-sm font-semibold text-[#8F1717] dark:bg-[#3A1414] dark:text-[#FF9A90]">
          <Icon name="block-helper" size={16} color="currentColor" className="mt-0.5 shrink-0" />
          Đang tạm ngưng: giấy phép không có hiệu lực cho tới khi Phường mở lại
        </p>
      )}

      <div className="flex flex-1 flex-col gap-md p-md md:p-lg">
        <div className="flex items-start justify-between gap-sm">
          <div className="min-w-0">
            <p className="text-badge uppercase text-muted">Mã ô</p>
            <p className="font-sign text-[26px] font-[750] leading-8 tracking-[0.01em] text-text [font-stretch:80%]">
              {contract.slotCode}
            </p>
          </div>
          <StatusChip code={contract.contractStatus} />
        </div>

        <p className="-mt-xs flex items-center gap-1 text-body-md text-muted">
          <Icon name="map-marker-outline" size={18} color="currentColor" />
          {contract.zoneName}
        </p>

        {live ? (
          <div className="flex flex-col gap-1">
            <TermRing startDate={contract.startDate} endDate={contract.endDate} today={today} />
            {Number.isFinite(termDays) && termDays > 0 ? (
              <span className="pl-[88px] text-body-sm text-muted">Kỳ hạn {termDays} ngày</span>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col gap-0.5 rounded-[14px] bg-bg px-sm py-xs text-body-sm ring-1 ring-inset ring-border">
            <span className="font-tabular text-text">
              {formatDate(contract.startDate)} – {formatDate(contract.endDate)}
            </span>
            {contract.cancelledAt ? (
              <span className="text-muted">Kết thúc ngày {formatDate(contract.cancelledAt)}</span>
            ) : null}
          </div>
        )}

        {slot.data ? (
          <div className="flex items-baseline justify-between gap-sm border-t border-dashed border-border pt-sm">
            <span className="text-body-sm text-muted">Đơn giá ngày</span>
            <span>
              <Money amountVnd={slot.data.pricePerDay} className="font-sign font-bold" />
              <span className="ml-1 text-body-sm text-muted">/ ngày</span>
            </span>
          </div>
        ) : (
          <div aria-hidden="true" className="h-[33px] border-t border-dashed border-border" />
        )}

        {!live && contract.cancellationReason && (
          <Callout tone="neutral">
            <strong>Lý do huỷ:</strong> {contract.cancellationReason}
          </Callout>
        )}

        <div className="mt-auto grid grid-cols-2 gap-sm">
          {live && onPermit ? (
            <Button
              label="Giấy phép số"
              variant="outline"
              onPress={onPermit}
              icon={<Icon name="qrcode" size={18} color="currentColor" />}
            />
          ) : (
            <span />
          )}
          <Button
            label="Xem chi tiết"
            variant="outline"
            onPress={onOpen}
            icon={<Icon name="arrow-right" size={18} color="currentColor" />}
          />
        </div>
      </div>
    </article>
  );
}
