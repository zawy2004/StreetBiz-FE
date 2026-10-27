import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  taxApi,
  wardTaxApi,
  type AddRevenueEntryRequest,
  type ConfirmTaxFilingRequest,
  type SendTaxAnnouncementRequest,
  type TaxPeriodType,
  type TaxReferralStatus,
  type UpdateTaxProfileRequest,
} from '@/core/api';
import { isLiveApi } from '@/core/config/env';

/**
 * Household tax is a server feature (the mock database has no revenue book), so every query is
 * switched off in demo mode and the screens say so instead of showing made-up figures.
 */
export const TAX_KEYS = {
  all: ['tax'] as const,
  overview: (year?: number) => ['tax', 'overview', year ?? 'current'] as const,
  ledger: (year: number, month: number) => ['tax', 'ledger', year, month] as const,
  profile: ['tax', 'profile'] as const,
  estimate: (query: object) => ['tax', 'estimate', query] as const,
  declarations: (year?: number) => ['tax', 'declarations', year ?? 'current'] as const,
};

export const WARD_TAX_KEYS = {
  all: ['ward', 'tax'] as const,
  dashboard: (year?: number) => ['ward', 'tax', 'dashboard', year ?? 'current'] as const,
  households: (year?: number) => ['ward', 'tax', 'households', year ?? 'current'] as const,
  referrals: (status?: TaxReferralStatus) => ['ward', 'tax', 'referrals', status ?? 'all'] as const,
  announcements: ['ward', 'tax', 'announcements'] as const,
};

// ---------------------------------------------------------------------------- household

export function useTaxOverview(year?: number) {
  return useQuery({
    queryKey: TAX_KEYS.overview(year),
    queryFn: () => taxApi.overview(year),
    enabled: isLiveApi,
  });
}

export function useRevenueLedger(year: number, month: number) {
  return useQuery({
    queryKey: TAX_KEYS.ledger(year, month),
    queryFn: () => taxApi.ledger(year, month),
    enabled: isLiveApi,
  });
}

export function useTaxProfile() {
  return useQuery({ queryKey: TAX_KEYS.profile, queryFn: taxApi.profile, enabled: isLiveApi });
}

export type TaxEstimateQuery = {
  year?: number;
  /** A custom figure is asked for by giving `revenue`; the server then reports basis CUSTOM. */
  basis: 'ACTUAL' | 'PROJECTED';
  revenue?: number;
  costRatio?: number;
};

export function useTaxEstimate(query: TaxEstimateQuery, enabled = true) {
  return useQuery({
    queryKey: TAX_KEYS.estimate(query),
    queryFn: () => taxApi.estimate(query),
    enabled: isLiveApi && enabled,
  });
}

export function useTaxDeclarations(year?: number) {
  return useQuery({
    queryKey: TAX_KEYS.declarations(year),
    queryFn: () => taxApi.declarations(year),
    enabled: isLiveApi,
  });
}

/** Anything that changes the book, the profile or a filing changes every figure on the tax screens. */
function useRefreshTax() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: TAX_KEYS.all });
}

export function useAddRevenueEntry() {
  const refresh = useRefreshTax();
  return useMutation({
    mutationFn: (request: AddRevenueEntryRequest) => taxApi.addEntry(request),
    onSuccess: refresh,
  });
}

export function useVoidRevenueEntry() {
  const refresh = useRefreshTax();
  return useMutation({
    mutationFn: (input: { entryId: number; reason: string | null }) =>
      taxApi.voidEntry(input.entryId, input.reason),
    onSuccess: refresh,
  });
}

export function useUpdateTaxProfile() {
  const refresh = useRefreshTax();
  return useMutation({
    mutationFn: (request: UpdateTaxProfileRequest) => taxApi.updateProfile(request),
    onSuccess: refresh,
  });
}

export function useConfirmTaxFiling() {
  const refresh = useRefreshTax();
  return useMutation({
    mutationFn: (input: {
      year: number;
      periodType: TaxPeriodType;
      periodNo: number;
      request: ConfirmTaxFilingRequest;
    }) => taxApi.confirmFiling(input.year, input.periodType, input.periodNo, input.request),
    onSuccess: refresh,
  });
}

export function useRetractTaxFiling() {
  const refresh = useRefreshTax();
  return useMutation({
    mutationFn: (input: { year: number; periodType: TaxPeriodType; periodNo: number }) =>
      taxApi.retractFiling(input.year, input.periodType, input.periodNo),
    onSuccess: refresh,
  });
}

// ---------------------------------------------------------------------------------- ward

export function useWardTaxDashboard(year?: number) {
  return useQuery({
    queryKey: WARD_TAX_KEYS.dashboard(year),
    queryFn: () => wardTaxApi.dashboard(year),
    enabled: isLiveApi,
  });
}

export function useWardTaxHouseholds(year?: number) {
  return useQuery({
    queryKey: WARD_TAX_KEYS.households(year),
    queryFn: () => wardTaxApi.households(year),
    enabled: isLiveApi,
  });
}

export function useTaxReferrals(status?: TaxReferralStatus) {
  return useQuery({
    queryKey: WARD_TAX_KEYS.referrals(status),
    queryFn: () => wardTaxApi.referrals(status),
    enabled: isLiveApi,
  });
}

export function useTaxAnnouncements() {
  return useQuery({
    queryKey: WARD_TAX_KEYS.announcements,
    queryFn: wardTaxApi.announcements,
    enabled: isLiveApi,
  });
}

function useRefreshWardTax() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: WARD_TAX_KEYS.all });
}

export function useRefreshTaxReferrals() {
  const refresh = useRefreshWardTax();
  return useMutation({ mutationFn: wardTaxApi.refreshReferrals, onSuccess: refresh });
}

export function useReportTaxReferral() {
  const refresh = useRefreshWardTax();
  return useMutation({
    mutationFn: (input: { referralId: number; reference: string | null; note: string | null }) =>
      wardTaxApi.reportReferral(input.referralId, input.reference, input.note),
    onSuccess: refresh,
  });
}

export function useDismissTaxReferral() {
  const refresh = useRefreshWardTax();
  return useMutation({
    mutationFn: (input: { referralId: number; reason: string }) =>
      wardTaxApi.dismissReferral(input.referralId, input.reason),
    onSuccess: refresh,
  });
}

export function useSendTaxAnnouncement() {
  const refresh = useRefreshWardTax();
  return useMutation({
    mutationFn: (request: SendTaxAnnouncementRequest) => wardTaxApi.sendAnnouncement(request),
    onSuccess: refresh,
  });
}
