import { Icon } from '@/components/common';
import type { RentalContract } from '@/core/api/side-api';
import { colors } from '@/theme';
import { ContractTerm } from './ContractTerm';

type Props = {
  contract: Pick<RentalContract, 'slotCode' | 'zoneName' | 'startDate' | 'endDate'>;
  /** A live contract shows how far into its term it is; otherwise only the period is shown. */
  live: boolean;
};

/** Which slot a contract is for and how far into its term it is, for pages that act on the contract. */
export function ContractSummary({ contract, live }: Props) {
  return (
    <div className="flex flex-col gap-sm">
      <div className="flex items-center gap-sm rounded-sm bg-bg p-sm">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card">
          <Icon name="map-marker-outline" size={22} color={colors.indigo} />
        </span>
        <div className="min-w-0">
          <p className="text-headline-sm text-text">{contract.slotCode}</p>
          <p className="truncate text-body-sm text-muted">{contract.zoneName}</p>
        </div>
      </div>
      <ContractTerm startDate={contract.startDate} endDate={contract.endDate} today={new Date()} live={live} />
    </div>
  );
}
