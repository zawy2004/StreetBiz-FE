import { StatusChip } from '@/components/status';
import type { RentalContract } from '@/core/api/side-api';
import { ContractTerm } from './ContractTerm';

type Props = {
  contract: Pick<RentalContract, 'slotCode' | 'zoneName' | 'startDate' | 'endDate'>;
  /** A live contract shows how far into its term it is; otherwise only the period is shown. */
  live: boolean;
  /** Optional contract status, shown as a chip beside the plate. */
  status?: string;
};

/**
 * Which slot a contract is for and how far into its term it is, for pages that
 * act on the contract: the slot plate (the code alone in its own element), the
 * street, an optional status chip, and the term.
 */
export function ContractSummary({ contract, live, status }: Props) {
  return (
    <div className="flex flex-col gap-sm">
      <div className="flex flex-wrap items-center gap-x-sm gap-y-xs">
        <span className="inline-flex h-11 items-center gap-1 rounded-[9px] bg-card px-sm text-text ring-[2.5px] ring-text/85">
          <span aria-hidden="true" className="text-body-xs font-semibold text-muted">
            Ô
          </span>
          <span className="font-sign text-[24px] font-extrabold leading-none tracking-[0.03em] [font-stretch:70%]">
            {contract.slotCode}
          </span>
        </span>
        <span className="min-w-0 text-body-md font-medium text-text">{contract.zoneName}</span>
        {status ? (
          <span className="ml-auto">
            <StatusChip code={status} />
          </span>
        ) : null}
      </div>
      <ContractTerm
        startDate={contract.startDate}
        endDate={contract.endDate}
        today={new Date()}
        live={live}
      />
    </div>
  );
}
