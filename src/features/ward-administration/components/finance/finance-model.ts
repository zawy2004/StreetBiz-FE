import type {
  WardFeeItem,
  WardFinanceContractItem,
  WardPenaltyItem,
} from '../../ward-finance-api';

// Pure figures for the ward's money screen: what the totals are, which contracts a filter keeps,
// and how one contract's instalments split. Kept apart from the markup so they can be tested.

export type ContractFilter = 'ALL' | 'OVERDUE' | 'PENALTY' | 'REFUND';

/** A deposit was paid, the contract is over, and it has not been handed back yet. */
export function awaitsRefund(c: WardFinanceContractItem): boolean {
  return c.depositPaid > 0 && !c.depositRefunded && c.contractStatus !== 'ACTIVE';
}

export type OwedSummary = {
  contracts: number;
  outstanding: number;
  overdueContracts: number;
  unpaidPenalties: number;
  awaitingRefund: number;
};

export function summariseContracts(list: WardFinanceContractItem[]): OwedSummary {
  return {
    contracts: list.length,
    outstanding: list.reduce((sum, c) => sum + c.outstanding, 0),
    overdueContracts: list.filter((c) => c.overdueCount > 0).length,
    unpaidPenalties: list.reduce((sum, c) => sum + c.unpaidPenalties, 0),
    awaitingRefund: list.filter(awaitsRefund).length,
  };
}

/** Lower case, no accents or punctuation, so "le duan" finds "Lê Duẩn". */
export function fold(text: string): string {
  return text
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function matches(c: WardFinanceContractItem, filter: ContractFilter): boolean {
  switch (filter) {
    case 'OVERDUE':
      return c.overdueCount > 0;
    case 'PENALTY':
      return c.unpaidPenalties > 0;
    case 'REFUND':
      return awaitsRefund(c);
    default:
      return true;
  }
}

/** Those worth acting on come first: overdue, then the largest amount owed, then by slot code. */
export function filterContracts(
  list: WardFinanceContractItem[],
  filter: ContractFilter,
  query: string,
): WardFinanceContractItem[] {
  const needle = fold(query);
  return list
    .filter((c) => matches(c, filter))
    .filter(
      (c) =>
        needle === '' ||
        fold(`${c.slotCode} ${c.vendorName} ${c.vendorPhone ?? ''} ${c.zoneName}`).includes(needle),
    )
    .sort(
      (a, b) =>
        Number(b.overdueCount > 0) - Number(a.overdueCount > 0) ||
        b.outstanding - a.outstanding ||
        a.slotCode.localeCompare(b.slotCode),
    );
}

export function countByFilter(list: WardFinanceContractItem[]): Record<ContractFilter, number> {
  return {
    ALL: list.length,
    OVERDUE: list.filter((c) => matches(c, 'OVERDUE')).length,
    PENALTY: list.filter((c) => matches(c, 'PENALTY')).length,
    REFUND: list.filter((c) => matches(c, 'REFUND')).length,
  };
}

export type ContractBreakdown = {
  /** Instalments already collected. */
  paid: number;
  /** Not yet due. */
  pending: number;
  overdue: number;
  /** Fines still unpaid. */
  fines: number;
};

/** The bar under a contract's figure: collected, coming, overdue, and unpaid fines. */
export function breakdownOf(items: WardFeeItem[], penalties: WardPenaltyItem[]): ContractBreakdown {
  const sum = (status: WardFeeItem['status']) =>
    items.filter((i) => i.status === status).reduce((total, i) => total + i.amount, 0);
  return {
    paid: sum('PAID'),
    pending: sum('PENDING'),
    overdue: sum('OVERDUE'),
    fines: penalties.filter((p) => p.status === 'UNPAID').reduce((total, p) => total + p.amount, 0),
  };
}
