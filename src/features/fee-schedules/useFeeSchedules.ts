import { useQuery } from '@tanstack/react-query';

import { financeApi } from '@/core/api';
import { isLiveApi } from '@/core/config/env';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';
import { buildSchedules, localToday } from './schedule-progress';

export const SCHEDULE_KEYS = {
  contracts: ['finance', 'contracts'] as const,
  schedule: (contractId: number) => ['finance', 'contracts', contractId] as const,
  feeItem: (feeItemId: number) => ['finance', 'fees', 'detail', feeItemId] as const,
};

const idNumber = (id: string) => Number(id.replace(/\D/g, '')) || 0;

/** The demo build's schedules, built from the mock database by the same rules as the server. */
function useMockSchedules() {
  const user = useAuthStore((s) => s.user);
  const feeItems = useMockDb((s) => s.feeItems).filter((f) => f.vendorId === user?.vendorId);
  const invoices = useMockDb((s) => s.invoices);
  const contracts = useMockDb((s) => s.contracts);
  const slots = useMockDb((s) => s.slots);

  return buildSchedules(
    feeItems.map((f) => {
      const invoice = invoices.find((i) => i.feeItemId === f.id);
      return {
        feeItemId: idNumber(f.id),
        contractId: idNumber(f.contractId),
        dueDate: f.due_date,
        amount: f.amount,
        itemStatus: f.item_status,
        paidAt: f.item_status === 'PAID' ? (invoice?.issued_at ?? f.due_date) : null,
        periodLabel: f.period_label,
        invoiceId: invoice ? idNumber(invoice.id) : null,
        invoiceNumber: invoice?.invoice_number ?? null,
      };
    }),
    (contractId) => {
      const contract = contracts.find((c) => idNumber(c.id) === contractId);
      const slot = contract ? slots.find((s) => s.id === contract.slotId) : undefined;
      return {
        slotCode: slot?.slot_code ?? '',
        zoneName: null,
        wardName: null,
        address: null,
        startDate: contract?.start_date ?? '',
        endDate: contract?.end_date ?? '',
        contractStatus: contract?.contract_status ?? 'ACTIVE',
      };
    },
    localToday(),
  );
}

/** FinanceHome: every contract with a fee schedule and its progress. */
export function useVendorContracts() {
  const mock = useMockSchedules();
  const query = useQuery({
    queryKey: SCHEDULE_KEYS.contracts,
    queryFn: financeApi.contracts,
    enabled: isLiveApi,
  });
  if (!isLiveApi) {
    return { contracts: mock.map((s) => s.contract), isLoading: false, isError: false, error: null, refetch: query.refetch };
  }
  return {
    contracts: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/** One contract's schedule, instalment by instalment. */
export function useContractSchedule(contractId: number) {
  const mock = useMockSchedules().find((s) => s.contract.contractId === contractId);
  const query = useQuery({
    queryKey: SCHEDULE_KEYS.schedule(contractId),
    queryFn: () => financeApi.contractSchedule(contractId),
    enabled: isLiveApi && Number.isFinite(contractId),
  });
  if (!isLiveApi) {
    return { schedule: mock, isLoading: false, isError: false, error: null, refetch: query.refetch };
  }
  return {
    schedule: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/** FEE-01: one instalment and its contract (live only; the demo payment screen reads the mock item). */
export function useFeeItemDetail(feeItemId: number) {
  return useQuery({
    queryKey: SCHEDULE_KEYS.feeItem(feeItemId),
    queryFn: () => financeApi.feeItem(feeItemId),
    enabled: isLiveApi && Number.isFinite(feeItemId),
  });
}
