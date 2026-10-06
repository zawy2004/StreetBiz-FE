import { apiGet, apiGetBlob, apiPost } from './client';

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
  /** What the receipt PDF prints; absent from older servers, so optional. */
  wardName?: string | null;
  payerName?: string | null;
  businessName?: string | null;
  providerReference?: string | null;
  decisionNumber?: string | null;
  amountInWords?: string | null;
};

/**
 * One instalment on a contract's schedule. `itemStatus` already reads OVERDUE once the due date
 * has passed unpaid (the server does not wait for its hourly sweep). `daysOverdue` is set while
 * late, `daysUntilDue` while still ahead; both null once paid.
 */
export type ScheduleItemDto = {
  feeItemId: number;
  ordinal: number;
  ofCount: number;
  periodLabel: string;
  dueDate: string;
  amount: number;
  itemStatus: string;
  paidAt: string | null;
  invoiceId: number | null;
  invoiceNumber: string | null;
  daysOverdue: number | null;
  daysUntilDue: number | null;
};

/** A rental contract and how far its fee schedule has been paid. */
export type VendorContractFinanceDto = {
  contractId: number;
  slotCode: string;
  zoneName: string | null;
  wardName: string | null;
  address: string | null;
  startDate: string;
  endDate: string;
  contractStatus: string;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  instalmentCount: number;
  paidCount: number;
  overdueCount: number;
  nextDue: ScheduleItemDto | null;
};

export type ContractScheduleDto = {
  contract: VendorContractFinanceDto;
  items: ScheduleItemDto[];
};

export type FeeItemDetailDto = {
  contract: VendorContractFinanceDto;
  item: ScheduleItemDto;
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

  /** FEE-03: the payment receipt as a PDF (fetched with the bearer token, not linked). */
  invoicePdf: (invoiceId: number) => apiGetBlob(`/vendor/finance/invoices/${invoiceId}/pdf`),

  /** Every contract with a fee schedule and how far it has been paid. */
  contracts: () => apiGet<VendorContractFinanceDto[]>('/vendor/finance/contracts'),

  /** One contract's schedule, instalment by instalment. */
  contractSchedule: (contractId: number) =>
    apiGet<ContractScheduleDto>(`/vendor/finance/contracts/${contractId}/schedule`),

  /** FEE-01: one instalment and its contract, before and after paying it. */
  feeItem: (feeItemId: number) => apiGet<FeeItemDetailDto>(`/vendor/finance/fees/${feeItemId}`),

  /** A year's receipts and instalments as an .xlsx statement. */
  statementXlsx: (year?: number) =>
    apiGetBlob(`/vendor/finance/statement${queryString({ year: year ? String(year) : undefined })}`),
};

/** WARD-14 collections. */
export type WardDebtorDto = {
  contractId: number;
  vendorName: string;
  vendorPhone: string | null;
  businessName: string | null;
  slotCode: string;
  zoneName: string;
  overdueCount: number;
  overdueAmount: number;
  upcomingAmount: number;
  oldestDueDate: string;
  daysOverdue: number;
  lastRemindedAt: string | null;
  remindedToday: boolean;
};

export type ZoneCollectionDto = {
  zoneId: number;
  zoneName: string;
  slotCount: number;
  rentedSlots: number;
  feeCollected: number;
  outstanding: number;
};

/** How punctually the fees falling due in a period were paid. `onTimeRate` is null when nothing fell due. */
export type CollectionPerformanceDto = {
  from: string;
  to: string;
  feeDue: number;
  dueCount: number;
  dueCollected: number;
  paidOnTimeCount: number;
  paidLateCount: number;
  unpaidCount: number;
  onTimeRate: number | null;
  byZone: ZoneCollectionDto[];
};

export type MonthlyCollectionDto = {
  year: number;
  month: number;
  feeCollected: number;
  penaltyCollected: number;
  feeDue: number;
  feeDuePaidOnTime: number;
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

  /** WARD-14 as an .xlsx workbook: the same totals plus the receipts behind them. */
  collectionReportXlsx: (from?: string, to?: string) =>
    apiGetBlob(`/ward/reports/collection/export${queryString({ from, to })}`),

  /** WARD-15. */
  dashboard: () => apiGet<WardDashboardDto>('/ward/dashboard'),

  /** Households with overdue rental fees, most overdue first. */
  debtors: () => apiGet<WardDebtorDto[]>('/ward/reports/debtors'),

  /** In-app reminder to one household; the server allows one per contract per day (409 after). */
  remindDebtor: (contractId: number) =>
    apiPost<{ contractId: number; remindedAt: string }>(`/ward/reports/debtors/${contractId}/remind`),

  /** On-time rate for fees falling due in the period, and figures by zone. */
  performance: (from?: string, to?: string) =>
    apiGet<CollectionPerformanceDto>(`/ward/reports/performance${queryString({ from, to })}`),

  /** Collections month by month. */
  trend: (months = 6) =>
    apiGet<MonthlyCollectionDto[]>(`/ward/reports/trend${queryString({ months: String(months) })}`),
};
