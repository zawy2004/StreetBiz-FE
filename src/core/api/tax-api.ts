import { apiDelete, apiGet, apiGetBlob, apiPost, apiPut } from './client';

/**
 * Mirrors StreetBiz-BE `TaxController` (a household's own tax picture), `WardTaxController` (the
 * ward's household list and cases for the tax office) and `PlatformTaxPoliciesController`.
 * StreetBiz files and collects no tax: every figure is a reference, and `disclaimer` says so.
 * Days are "YYYY-MM-DD" in Vietnamese time; moments are ISO UTC.
 */

/** TaxGroups: revenue group by the policy's thresholds (G1 = under the no-tax threshold). */
export type TaxGroup = 'G1' | 'G2' | 'G3' | 'G4';

/** ThresholdLevels: how close revenue is to the no-tax threshold. */
export type ThresholdLevel = 'SAFE' | 'NEAR' | 'OVER';

export type RevenueChannel = 'CASH' | 'BANK_TRANSFER' | 'EWALLET' | 'OTHER';

export type TaxPeriodType = 'YEAR' | 'QUARTER';

/** TaxPeriodStatuses. */
export type TaxPeriodStatus =
  | 'NOT_YET'
  | 'OPEN'
  | 'DUE_SOON'
  | 'OVERDUE'
  | 'FILED'
  | 'NOT_REQUIRED';

export type TaxEstimateBasis = 'ACTUAL' | 'PROJECTED' | 'CUSTOM';

export type TaxIndustryRateDto = {
  code: string;
  name: string;
  vatRate: number;
  pitRate: number;
  note: string | null;
};

/** The rules in force for a tax year; `inherited` when the year has none of its own yet. */
export type TaxPolicyDto = {
  policyId: number;
  taxYear: number;
  versionNo: number;
  inherited: boolean;
  legalBasis: string;
  revenueThreshold: number;
  eInvoiceThreshold: number;
  group2Ceiling: number;
  group3Ceiling: number;
  pitDeductsThreshold: boolean;
  pitProfitRateG2: number;
  pitProfitRateG3: number;
  pitProfitRateG4: number;
  annualNoticeMonth: number;
  annualNoticeDay: number;
  warnRatio: number;
  note: string | null;
  createdAt: string;
  rates: TaxIndustryRateDto[];
};

export type TaxPolicyVersionDto = { policy: TaxPolicyDto; inForce: boolean };

export type CreateTaxPolicyRequest = Omit<
  TaxPolicyDto,
  'policyId' | 'versionNo' | 'inherited' | 'createdAt'
>;

export type TaxProfileDto = {
  exists: boolean;
  taxCode: string | null;
  industryCode: string;
  industryName: string;
  eInvoiceRegistered: boolean;
  shareRevenueWithWard: boolean;
  consentUpdatedAt: string | null;
};

export type UpdateTaxProfileRequest = {
  taxCode: string | null;
  industryCode: string;
  eInvoiceRegistered: boolean;
  shareRevenueWithWard: boolean;
};

export type RevenueTotalsDto = { online: number; recorded: number; total: number };

export type TaxMonthRevenueDto = { month: number; online: number; recorded: number; total: number };

export type TaxProjectionDto = {
  enough: boolean;
  daysOfData: number;
  dailyRate: number;
  projectedRevenue: number;
  projectedGroup: TaxGroup;
  projectedLevel: ThresholdLevel;
  willCross: boolean;
  crossingDate: string | null;
};

export type TaxObligationDto = {
  code: string;
  title: string;
  detail: string;
  /** "TODO" for something the household does, "INFO" for something it only needs to know. */
  kind: 'TODO' | 'INFO';
  done: boolean | null;
};

export type TaxDeadlineDto = {
  periodType: TaxPeriodType;
  periodNo: number;
  label: string;
  dueDate: string;
  daysLeft: number;
  status: TaxPeriodStatus;
};

export type TaxOverviewDto = {
  taxYear: number;
  today: string;
  yearEnded: boolean;
  policy: TaxPolicyDto;
  revenue: RevenueTotalsDto;
  group: TaxGroup;
  groupDescription: string;
  level: ThresholdLevel;
  thresholdRatio: number;
  remainingToThreshold: number;
  projection: TaxProjectionDto;
  obligations: TaxObligationDto[];
  obligationsOnceOver: TaxObligationDto[];
  nextDeadline: TaxDeadlineDto | null;
  profile: TaxProfileDto;
  months: TaxMonthRevenueDto[];
  disclaimer: string;
};

export type RevenueEntryDto = {
  entryId: number;
  date: string;
  amount: number;
  channel: RevenueChannel;
  note: string | null;
  createdAt: string;
  voided: boolean;
  voidReason: string | null;
};

export type RevenueDayDto = {
  date: string;
  online: number;
  onlineOrders: number;
  recorded: number;
  total: number;
  entries: RevenueEntryDto[];
};

export type RevenueLedgerDto = {
  year: number;
  month: number;
  totals: RevenueTotalsDto;
  days: RevenueDayDto[];
};

export type AddRevenueEntryRequest = {
  date: string;
  amount: number;
  channel: RevenueChannel;
  note: string | null;
};

export type TaxEstimateDto = {
  taxYear: number;
  basis: TaxEstimateBasis;
  revenue: number;
  industryCode: string;
  industryName: string;
  group: TaxGroup;
  groupDescription: string;
  taxable: boolean;
  vatRate: number;
  pitRate: number;
  vat: number;
  pitBase: number;
  pitOnRevenue: number;
  totalOnRevenue: number;
  effectiveRate: number;
  costRatio: number | null;
  profit: number | null;
  pitProfitRate: number | null;
  pitOnProfit: number | null;
  totalOnProfit: number | null;
  /** "REVENUE" | "PROFIT" | null — which method owes less, when both were computed. */
  cheaper: string | null;
  pitDeductsThreshold: boolean;
  revenueThreshold: number;
  legalBasis: string;
  disclaimer: string;
};

export type TaxFilingDto = {
  revenueDeclared: number;
  revenueSystem: number;
  filedOn: string;
  authorityReference: string | null;
  receiptUrl: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string | null;
};

export type TaxPeriodDto = {
  periodType: TaxPeriodType;
  periodNo: number;
  label: string;
  start: string;
  end: string;
  dueDate: string;
  status: TaxPeriodStatus;
  required: boolean;
  canFile: boolean;
  systemRevenue: number;
  filing: TaxFilingDto | null;
};

export type TaxDeclarationsDto = {
  taxYear: number;
  today: string;
  group: TaxGroup;
  periods: TaxPeriodDto[];
  disclaimer: string;
};

export type ConfirmTaxFilingRequest = {
  revenueDeclared: number;
  filedOn: string;
  authorityReference: string | null;
  receiptUrl: string | null;
  note: string | null;
};

// ---------------------------------------------------------------------------------- ward

export type TaxGroupCountsDto = { g1: number; g2: number; g3: number; g4: number; noRevenue: number };

export type WardTaxDashboardDto = {
  taxYear: number;
  today: string;
  policy: TaxPolicyDto;
  householdCount: number;
  activeCount: number;
  suspendedCount: number;
  endedCount: number;
  notStartedCount: number;
  withTaxCode: number;
  withoutTaxCode: number;
  sharingRevenue: number;
  groups: TaxGroupCountsDto;
  nearThresholdCount: number;
  overThresholdCount: number;
  noticeFiled: number;
  noticeNotFiled: number;
  noticeDueDate: string;
  pendingReferrals: number;
  reportedReferrals: number;
  disclaimer: string;
};

/** HouseholdStatuses. */
export type HouseholdStatus = 'ACTIVE' | 'SUSPENDED' | 'ENDED' | 'NOT_STARTED';

/** `revenue` and `group` are null unless the household agreed to share them with the ward. */
export type WardTaxHouseholdDto = {
  vendorId: number;
  displayName: string;
  ownerName: string;
  phone: string | null;
  address: string | null;
  businessLine: string | null;
  vendorType: string;
  status: HouseholdStatus;
  slotCodes: string[];
  permitStatus: string | null;
  approvedAt: string;
  lastInspectionAt: string | null;
  lastOrderAt: string | null;
  hasTaxCode: boolean;
  taxCodeMasked: string;
  eInvoiceRegistered: boolean;
  noticeFiled: boolean;
  sharesRevenue: boolean;
  revenue: number | null;
  group: TaxGroup | null;
};

export type WardTaxHouseholdsDto = { taxYear: number; households: WardTaxHouseholdDto[] };

export type TaxReferralStatus = 'PENDING' | 'REPORTED' | 'DISMISSED';

export type TaxReferralDto = {
  referralId: number;
  reasonCode: string;
  reasonLabel: string;
  summary: string;
  vendorId: number | null;
  vendorName: string | null;
  detectedAt: string;
  status: TaxReferralStatus;
  handledAt: string | null;
  handledByName: string | null;
  authorityReference: string | null;
  handlingNote: string | null;
};

export type TaxReferralRefreshDto = { created: number; autoClosed: number; pending: number };

/** TaxAnnouncementSegments. */
export type TaxAnnouncementSegment = 'ALL' | 'NOT_FILED' | 'NO_TAX_CODE';

export type TaxAnnouncementDto = {
  announcementId: number;
  segment: TaxAnnouncementSegment;
  taxYear: number;
  title: string;
  body: string;
  recipientCount: number;
  createdByName: string | null;
  createdAt: string;
};

export type SendTaxAnnouncementRequest = {
  segment: TaxAnnouncementSegment;
  taxYear: number | null;
  title: string;
  body: string;
};

function queryString(params: Record<string, string | number | undefined>): string {
  const pairs = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`);
  return pairs.length ? `?${pairs.join('&')}` : '';
}

/** A household's own tax picture (`/vendor/tax`). */
export const taxApi = {
  overview: (year?: number) => apiGet<TaxOverviewDto>(`/vendor/tax/overview${queryString({ year })}`),

  ledger: (year: number, month: number) =>
    apiGet<RevenueLedgerDto>(`/vendor/tax/ledger${queryString({ year, month })}`),

  addEntry: (request: AddRevenueEntryRequest) =>
    apiPost<RevenueEntryDto>('/vendor/tax/revenue-entries', request),

  voidEntry: (entryId: number, reason: string | null) =>
    apiPost<RevenueEntryDto>(`/vendor/tax/revenue-entries/${entryId}/void`, { reason }),

  profile: () => apiGet<TaxProfileDto>('/vendor/tax/profile'),

  updateProfile: (request: UpdateTaxProfileRequest) =>
    apiPut<TaxProfileDto>('/vendor/tax/profile', request),

  estimate: (query: {
    year?: number;
    basis?: TaxEstimateBasis;
    revenue?: number;
    costRatio?: number;
  }) => apiGet<TaxEstimateDto>(`/vendor/tax/estimate${queryString(query)}`),

  declarations: (year?: number) =>
    apiGet<TaxDeclarationsDto>(`/vendor/tax/declarations${queryString({ year })}`),

  confirmFiling: (
    year: number,
    periodType: TaxPeriodType,
    periodNo: number,
    request: ConfirmTaxFilingRequest,
  ) =>
    apiPut<TaxPeriodDto>(
      `/vendor/tax/declarations/${year}/${periodType.toLowerCase()}/${periodNo}`,
      request,
    ),

  retractFiling: (year: number, periodType: TaxPeriodType, periodNo: number) =>
    apiDelete<void>(`/vendor/tax/declarations/${year}/${periodType.toLowerCase()}/${periodNo}`),

  /** The year's revenue book as an .xlsx workbook. */
  exportRevenueBook: (year?: number) =>
    apiGetBlob(`/vendor/tax/revenue-book/export${queryString({ year })}`),

  /** The year's revenue summary as a PDF. */
  exportSummary: (year?: number) => apiGetBlob(`/vendor/tax/summary/export${queryString({ year })}`),
};

/** The ward's side (`/ward/tax`). The ward collects no tax and sees revenue only with consent. */
export const wardTaxApi = {
  dashboard: (year?: number) =>
    apiGet<WardTaxDashboardDto>(`/ward/tax/dashboard${queryString({ year })}`),

  households: (year?: number) =>
    apiGet<WardTaxHouseholdsDto>(`/ward/tax/households${queryString({ year })}`),

  referrals: (status?: TaxReferralStatus) =>
    apiGet<TaxReferralDto[]>(`/ward/tax/referrals${queryString({ status })}`),

  refreshReferrals: () => apiPost<TaxReferralRefreshDto>('/ward/tax/referrals/refresh'),

  reportReferral: (referralId: number, reference: string | null, note: string | null) =>
    apiPost<TaxReferralDto>(`/ward/tax/referrals/${referralId}/report`, { reference, note }),

  dismissReferral: (referralId: number, reason: string) =>
    apiPost<TaxReferralDto>(`/ward/tax/referrals/${referralId}/dismiss`, { reason }),

  announcements: () => apiGet<TaxAnnouncementDto[]>('/ward/tax/announcements'),

  sendAnnouncement: (request: SendTaxAnnouncementRequest) =>
    apiPost<TaxAnnouncementDto>('/ward/tax/announcements', request),

  /** The household list and cases for the tax office as an .xlsx workbook. */
  exportWorkbook: (year?: number) => apiGetBlob(`/ward/tax/export${queryString({ year })}`),
};
