import { apiGet, apiPost } from './client';

/**
 * Mirrors StreetBiz-BE `FinanceController` (SYS-03..06, FEE-01..05) and
 * `WardReviewsController`'s report endpoints (WARD-14/15). Value sets come
 * from `Application/Common/Security/FinanceConstants.cs`.
 */

export type PaymentProvider = 'MOMO' | 'ZALOPAY';

/** FeeScheduleItems.item_status (DB CHECK). */
export const FEE_ITEM_STATUS = {
  pending: 'PENDING',
  paid: 'PAID',
  overdue: 'OVERDUE',
} as const;

/** Penalties.penalty_status (DB CHECK). */
export const PENALTY_STATUS = {
  unpaid: 'UNPAID',
  paid: 'PAID',
  waived: 'WAIVED',
  cancelled: 'CANCELLED',
} as const;

export type FeeItemDto = {
  feeItemId: number;
  contractId: number;
  slotCode: string;
  periodLabel: string;
  dueDate: string;
  amount: number;
  itemStatus: string;
  paidAt: string | null;
};

export type PenaltyListDto = {
  penaltyId: number;
  violationId: number;
  violationType: string;
  violationLabel: string;
  slotCode: string | null;
  amount: number;
  penaltyStatus: string;
  issuedAt: string;
  paidAt: string | null;
};

export type FinanceSummaryDto = {
  feeDue: number;
  penaltyDue: number;
  totalDue: number;
  overdueCount: number;
  nextDueDate: string | null;
};

export type PaymentTransactionDto = {
  transactionId: number;
  purpose: string;
  provider: string;
  amount: number;
  transactionStatus: string;
  /** The instalment's period label for a fee, the violation label for a penalty. */
  referenceLabel: string;
  slotCode: string | null;
  createdAt: string;
  callbackReceivedAt: string | null;
};

export type VendorViolationDto = {
  violationId: number;
  violationType: string;
  violationLabel: string;
  description: string | null;
  evidenceUrl: string | null;
  source: string;
  recordedAt: string;
  slotCode: string | null;
  penaltyAmount: number | null;
  penaltyStatus: string | null;
};

export type InvoiceDto = {
  invoiceId: number;
  invoiceNumber: string;
  kind: string;
  amount: number;
  issuedAt: string;
  periodLabel: string | null;
};

export type InvoiceDetailDto = InvoiceDto & {
  slotCode: string | null;
  violationLabel: string | null;
  feeItemId: number | null;
  penaltyId: number | null;
  paymentProvider: string | null;
  paidAt: string | null;
};

export type FinanceCheckoutDto = {
  transactionId: number;
  purpose: string;
  referenceId: number;
  provider: string;
  amount: number;
  paymentUrl: string;
};

function queryString(params: Record<string, string | undefined>): string {
  const pairs = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`);
  return pairs.length ? `?${pairs.join('&')}` : '';
}

export const financeApi = {
  /** FinanceHome's top summary card. */
  summary: () => apiGet<FinanceSummaryDto>('/vendor/finance/summary'),

  /** FinanceHome's "Phí thuê ô" tab, optionally filtered by status. */
  fees: (status?: string) => apiGet<FeeItemDto[]>(`/vendor/finance/fees${queryString({ status })}`),

  /** FEE-01. */
  payFeeCheckout: (feeItemId: number, provider: PaymentProvider, idempotencyKey: string) =>
    apiPost<FinanceCheckoutDto>(
      `/vendor/finance/fees/${feeItemId}/checkout`,
      { provider },
      { headers: { 'Idempotency-Key': idempotencyKey } },
    ),

  /** FinanceHome's "Biên bản phạt" tab, optionally filtered by status. */
  penalties: (status?: string) =>
    apiGet<PenaltyListDto[]>(`/vendor/finance/penalties${queryString({ status })}`),

  /** FEE-04. */
  payPenaltyCheckout: (penaltyId: number, provider: PaymentProvider, idempotencyKey: string) =>
    apiPost<FinanceCheckoutDto>(
      `/vendor/finance/penalties/${penaltyId}/checkout`,
      { provider },
      { headers: { 'Idempotency-Key': idempotencyKey } },
    ),

  /**
   * Development-only stand-in for a real signed callback (mirrors Commerce's
   * `POST /orders/{id}/payment/sandbox-confirm`). 404s outside Development or
   * when `Payments:SandboxEnabled` is off, so a production build never calls it.
   */
  sandboxConfirmPayment: (transactionId: number) =>
    apiPost<{ outcome: string; callbackEventId: number | null }>(
      `/vendor/finance/payments/${transactionId}/sandbox-confirm`,
    ),

  /** Back from MoMo: the backend asks MoMo for the real state and applies it. */
  syncPayment: (transactionId: number) =>
    apiPost<{ transactionId: number; status: 'PENDING' | 'SUCCESS' | 'FAILED' }>(
      `/vendor/finance/payments/${transactionId}/sync`,
    ),

  /** FEE-05: the caller's fee/penalty payment attempts, most recent first. */
  payments: () => apiGet<PaymentTransactionDto[]>('/vendor/finance/payments'),

  /** FEE-05: violations recorded against the caller, most recent first. */
  violations: () => apiGet<VendorViolationDto[]>('/vendor/finance/violations'),

  /** FEE-03: the caller's invoices, most recent first. */
  invoices: () => apiGet<InvoiceDto[]>('/vendor/finance/invoices'),

  /** FEE-03: one invoice's full detail. */
  invoice: (invoiceId: number) => apiGet<InvoiceDetailDto>(`/vendor/finance/invoices/${invoiceId}`),
};

/** WARD-14. */
export type RecentViolationDto = {
  violationId: number;
  violationType: string;
  violationLabel: string;
  vendorName: string | null;
  slotCode: string | null;
  penaltyAmount: number | null;
  penaltyStatus: string | null;
  recordedAt: string;
};

export type CollectionReportDto = {
  from: string;
  to: string;
  feeCollected: number;
  feePending: number;
  feeOverdue: number;
  penaltyCollected: number;
  penaltyPending: number;
  invoiceCount: number;
  recentViolations: RecentViolationDto[];
};

/** WARD-15. */
export type WardDashboardDto = {
  slotTotal: number;
  slotRented: number;
  occupancyPercent: number;
  pendingRegistrations: number;
  pendingApplications: number;
  activeContracts: number;
  revenueCollected: number;
  outstandingDebt: number;
  openViolations: number;
};

export const wardReportApi = {
  /** WARD-14. Defaults (no `from`/`to`) mirror the backend's own default: the 1st of the current month through today. */
  collectionReport: (from?: string, to?: string) =>
    apiGet<CollectionReportDto>(`/ward/reports/collection${queryString({ from, to })}`),

  /** WARD-15. */
  dashboard: () => apiGet<WardDashboardDto>('/ward/dashboard'),
};
