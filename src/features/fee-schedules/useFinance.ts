import { useMutation, useQuery } from '@tanstack/react-query';

import {
  financeApi,
  type FeeItemDto,
  type InvoiceDetailDto,
  type InvoiceDto,
  type PaymentProvider,
  type PaymentTransactionDto,
  type PenaltyListDto,
  type VendorViolationDto,
} from '@/core/api';
import { isLiveApi } from '@/core/config/env';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';
import { VIOLATION_TYPES } from '@/mocks/seed';
import type { FeeItem, Invoice, Penalty, RentalContract, SidewalkSlot } from '@/mocks/types';

export const FINANCE_KEYS = {
  summary: ['finance', 'summary'] as const,
  fees: (status?: string) => ['finance', 'fees', status ?? 'ALL'] as const,
  penalties: (status?: string) => ['finance', 'penalties', status ?? 'ALL'] as const,
  payments: ['finance', 'payments'] as const,
  violations: ['finance', 'violations'] as const,
  invoices: ['finance', 'invoices'] as const,
  invoice: (invoiceId: number) => ['finance', 'invoices', invoiceId] as const,
};

const idNumber = (id: string) => Number(id.replace(/\D/g, '')) || 0;

function violationLabel(code: string): string {
  return VIOLATION_TYPES.find((v) => v.code === code)?.label ?? code;
}

function slotCodeForContract(
  contractId: string,
  contracts: RentalContract[],
  slots: SidewalkSlot[],
): string {
  const contract = contracts.find((c) => c.id === contractId);
  const slot = contract ? slots.find((s) => s.id === contract.slotId) : undefined;
  return slot?.slot_code ?? '';
}

function fromMockFeeItem(
  f: FeeItem,
  contracts: RentalContract[],
  slots: SidewalkSlot[],
): FeeItemDto {
  return {
    feeItemId: idNumber(f.id),
    contractId: idNumber(f.contractId),
    slotCode: slotCodeForContract(f.contractId, contracts, slots),
    periodLabel: f.period_label,
    dueDate: f.due_date,
    amount: f.amount,
    itemStatus: f.item_status,
    paidAt: f.item_status === 'PAID' ? f.due_date : null,
  };
}

function fromMockPenalty(p: Penalty): PenaltyListDto {
  return {
    penaltyId: idNumber(p.id),
    violationId: p.violationId ? idNumber(p.violationId) : 0,
    violationType: '',
    violationLabel: p.reason,
    slotCode: null,
    amount: p.amount,
    penaltyStatus: p.penalty_status,
    issuedAt: p.issued_at,
    paidAt: p.penalty_status === 'PAID' ? p.issued_at : null,
  };
}

function fromMockInvoice(i: Invoice): InvoiceDto {
  return {
    invoiceId: idNumber(i.id),
    invoiceNumber: i.invoice_number,
    kind: 'RENTAL_FEE',
    amount: i.amount,
    issuedAt: i.issued_at,
    periodLabel: null,
  };
}

function fromMockInvoiceDetail(i: Invoice, feeItem: FeeItem | undefined): InvoiceDetailDto {
  return {
    ...fromMockInvoice(i),
    periodLabel: feeItem?.period_label ?? null,
    slotCode: null,
    violationLabel: null,
    feeItemId: feeItem ? idNumber(feeItem.id) : null,
    penaltyId: null,
    paymentProvider: null,
    paidAt: i.issued_at,
  };
}

/** Only PAID items have an actual payment attempt behind them in the real schema. */
function mockPaymentHistory(
  feeItems: FeeItem[],
  penalties: Penalty[],
  contracts: RentalContract[],
  slots: SidewalkSlot[],
): PaymentTransactionDto[] {
  const feeRows: PaymentTransactionDto[] = feeItems
    .filter((f) => f.item_status === 'PAID')
    .map((f) => ({
      transactionId: idNumber(f.id),
      purpose: 'RENTAL_FEE',
      provider: 'MOMO',
      amount: f.amount,
      transactionStatus: 'SUCCESS',
      referenceLabel: f.period_label,
      slotCode: slotCodeForContract(f.contractId, contracts, slots) || null,
      createdAt: f.due_date,
      callbackReceivedAt: f.due_date,
    }));
  const penaltyRows: PaymentTransactionDto[] = penalties
    .filter((p) => p.penalty_status === 'PAID')
    .map((p) => ({
      transactionId: idNumber(p.id),
      purpose: 'PENALTY',
      provider: 'MOMO',
      amount: p.amount,
      transactionStatus: 'SUCCESS',
      referenceLabel: p.reason,
      slotCode: null,
      createdAt: p.issued_at,
      callbackReceivedAt: p.issued_at,
    }));
  return [...feeRows, ...penaltyRows].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function fromMockViolation(
  v: { id: string; violation_type: string; note: string; recorded_at: string; reportedBy: 'WARD' | 'CUSTOMER' },
  penalties: Penalty[],
): VendorViolationDto {
  const penalty = penalties.find((p) => p.violationId === v.id);
  return {
    violationId: idNumber(v.id),
    violationType: v.violation_type,
    violationLabel: violationLabel(v.violation_type),
    description: v.note,
    evidenceUrl: null,
    source: v.reportedBy === 'WARD' ? 'ON_SITE' : 'CUSTOMER_REPORT',
    recordedAt: v.recorded_at,
    slotCode: null,
    penaltyAmount: penalty?.amount ?? null,
    penaltyStatus: penalty?.penalty_status ?? null,
  };
}

function useMockVendorScope() {
  const user = useAuthStore((s) => s.user);
  const feeItems = useMockDb((s) => s.feeItems).filter((f) => f.vendorId === user?.vendorId);
  const penalties = useMockDb((s) => s.penalties).filter((p) => p.vendorId === user?.vendorId);
  const invoices = useMockDb((s) => s.invoices).filter((i) => i.vendorId === user?.vendorId);
  const violations = useMockDb((s) => s.violations).filter((v) => v.vendorId === user?.vendorId);
  const contracts = useMockDb((s) => s.contracts);
  const slots = useMockDb((s) => s.slots);
  return { feeItems, penalties, invoices, violations, contracts, slots };
}

/** FinanceHome's top summary card. */
export function useFinanceSummary() {
  const mock = useMockVendorScope();
  const query = useQuery({
    queryKey: FINANCE_KEYS.summary,
    queryFn: financeApi.summary,
    enabled: isLiveApi,
  });

  const outstandingFees = mock.feeItems.filter((f) => f.item_status !== 'PAID');
  const outstandingPenalties = mock.penalties.filter((p) => p.penalty_status !== 'PAID');
  const feeDue = outstandingFees.reduce((sum, f) => sum + f.amount, 0);
  const penaltyDue = outstandingPenalties.reduce((sum, p) => sum + p.amount, 0);
  // Same rule as the backend: the next date still to come, so an OVERDUE item does not count.
  const nextDueDate =
    mock.feeItems
      .filter((f) => f.item_status === 'PENDING')
      .map((f) => f.due_date)
      .sort()[0] ?? null;
  const mockSummary = {
    feeDue,
    penaltyDue,
    totalDue: feeDue + penaltyDue,
    overdueCount: mock.feeItems.filter((f) => f.item_status === 'OVERDUE').length,
    nextDueDate,
  };

  return {
    summary: isLiveApi ? query.data : mockSummary,
    isLoading: isLiveApi && query.isLoading,
    isError: isLiveApi && query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/** FinanceHome's "Phí thuê ô" tab / FEE-01's checkout source. */
export function useFeeItems(status?: string) {
  const mock = useMockVendorScope();
  const query = useQuery({
    queryKey: FINANCE_KEYS.fees(status),
    queryFn: () => financeApi.fees(status),
    enabled: isLiveApi,
  });
  const mockItems = mock.feeItems
    .filter((f) => !status || f.item_status === status)
    .map((f) => fromMockFeeItem(f, mock.contracts, mock.slots));

  return {
    feeItems: isLiveApi ? (query.data ?? []) : mockItems,
    isLoading: isLiveApi && query.isLoading,
    isError: isLiveApi && query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/** FinanceHome's "Biên bản phạt" tab / FEE-04's checkout source. */
export function usePenalties(status?: string) {
  const mock = useMockVendorScope();
  const query = useQuery({
    queryKey: FINANCE_KEYS.penalties(status),
    queryFn: () => financeApi.penalties(status),
    enabled: isLiveApi,
  });
  const mockItems = mock.penalties
    .filter((p) => !status || p.penalty_status === status)
    .map(fromMockPenalty);

  return {
    penalties: isLiveApi ? (query.data ?? []) : mockItems,
    isLoading: isLiveApi && query.isLoading,
    isError: isLiveApi && query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/** FEE-05: the caller's fee/penalty payment attempts, most recent first. */
export function usePaymentHistory() {
  const mock = useMockVendorScope();
  const query = useQuery({
    queryKey: FINANCE_KEYS.payments,
    queryFn: financeApi.payments,
    enabled: isLiveApi,
  });

  return {
    payments: isLiveApi
      ? (query.data ?? [])
      : mockPaymentHistory(mock.feeItems, mock.penalties, mock.contracts, mock.slots),
    isLoading: isLiveApi && query.isLoading,
    isError: isLiveApi && query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/** FEE-05: violations recorded against the caller, most recent first. */
export function useVendorViolations() {
  const mock = useMockVendorScope();
  const query = useQuery({
    queryKey: FINANCE_KEYS.violations,
    queryFn: financeApi.violations,
    enabled: isLiveApi,
  });
  const mockItems = [...mock.violations]
    .sort((a, b) => b.recorded_at.localeCompare(a.recorded_at))
    .map((v) => fromMockViolation(v, mock.penalties));

  return {
    violations: isLiveApi ? (query.data ?? []) : mockItems,
    isLoading: isLiveApi && query.isLoading,
    isError: isLiveApi && query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/** FEE-03: the caller's invoices, most recent first. */
export function useInvoices() {
  const mock = useMockVendorScope();
  const query = useQuery({
    queryKey: FINANCE_KEYS.invoices,
    queryFn: financeApi.invoices,
    enabled: isLiveApi,
  });
  const mockItems = [...mock.invoices]
    .sort((a, b) => b.issued_at.localeCompare(a.issued_at))
    .map(fromMockInvoice);

  return {
    invoices: isLiveApi ? (query.data ?? []) : mockItems,
    isLoading: isLiveApi && query.isLoading,
    isError: isLiveApi && query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/** FEE-03: one invoice's full detail. */
export function useInvoiceDetail(invoiceId: number) {
  const mock = useMockVendorScope();
  const query = useQuery({
    queryKey: FINANCE_KEYS.invoice(invoiceId),
    queryFn: () => financeApi.invoice(invoiceId),
    enabled: isLiveApi && Number.isFinite(invoiceId),
  });

  if (!isLiveApi) {
    const invoice = mock.invoices.find((i) => idNumber(i.id) === invoiceId);
    const feeItem = invoice ? mock.feeItems.find((f) => f.id === invoice.feeItemId) : undefined;
    return {
      invoice: invoice ? fromMockInvoiceDetail(invoice, feeItem) : undefined,
      isLoading: false,
      isError: false,
      error: null,
      refetch: query.refetch,
    };
  }

  return {
    invoice: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/** FEE-01: only meaningful against the live API — mock payment stays instant and local to the screen. */
export function usePayFeeCheckout() {
  return useMutation({
    mutationFn: ({
      feeItemId,
      provider,
      idempotencyKey,
    }: {
      feeItemId: number;
      provider: PaymentProvider;
      idempotencyKey: string;
    }) => financeApi.payFeeCheckout(feeItemId, provider, idempotencyKey),
  });
}

/** FEE-04: only meaningful against the live API — mock payment stays instant and local to the screen. */
export function usePayPenaltyCheckout() {
  return useMutation({
    mutationFn: ({
      penaltyId,
      provider,
      idempotencyKey,
    }: {
      penaltyId: number;
      provider: PaymentProvider;
      idempotencyKey: string;
    }) => financeApi.payPenaltyCheckout(penaltyId, provider, idempotencyKey),
  });
}
