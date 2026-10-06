import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { wardReportApi, type CollectionReportDto, type WardDashboardDto } from '@/core/api';
import { isLiveApi } from '@/core/config/env';
import { useMockDb } from '@/mocks/db';
import { VIOLATION_TYPES } from '@/mocks/seed';

export const WARD_REPORT_KEYS = {
  collectionReport: (from: string, to: string) => ['ward', 'reports', 'collection', from, to] as const,
  dashboard: ['ward', 'dashboard'] as const,
};

/** Inclusive calendar-day range, "YYYY-MM-DD" in the viewer's (Vietnamese) local time. */
export type ReportPeriod = { from: string; to: string };

function violationLabel(code: string): string {
  return VIOLATION_TYPES.find((v) => v.code === code)?.label ?? code;
}

/** WARD-14. The mock seed has no dated history, so demo mode shows the same totals for any period. */
export function useCollectionReport(period: ReportPeriod) {
  const feeItems = useMockDb((s) => s.feeItems);
  const penalties = useMockDb((s) => s.penalties);
  const violations = useMockDb((s) => s.violations);
  const invoices = useMockDb((s) => s.invoices);

  const query = useQuery({
    queryKey: WARD_REPORT_KEYS.collectionReport(period.from, period.to),
    queryFn: () => wardReportApi.collectionReport(period.from, period.to),
    enabled: isLiveApi,
  });

  const mockReport: CollectionReportDto = {
    from: period.from,
    to: period.to,
    feeCollected: feeItems
      .filter((f) => f.item_status === 'PAID')
      .reduce((sum, f) => sum + f.amount, 0),
    feePending: feeItems
      .filter((f) => f.item_status === 'PENDING')
      .reduce((sum, f) => sum + f.amount, 0),
    feeOverdue: feeItems
      .filter((f) => f.item_status === 'OVERDUE')
      .reduce((sum, f) => sum + f.amount, 0),
    penaltyCollected: penalties
      .filter((p) => p.penalty_status === 'PAID')
      .reduce((sum, p) => sum + p.amount, 0),
    penaltyPending: penalties
      .filter((p) => p.penalty_status !== 'PAID')
      .reduce((sum, p) => sum + p.amount, 0),
    invoiceCount: invoices.length,
    recentViolations: [...violations]
      .sort((a, b) => b.recorded_at.localeCompare(a.recorded_at))
      .slice(0, 10)
      .map((v) => ({
        violationId: 0,
        violationType: v.violation_type,
        violationLabel: violationLabel(v.violation_type),
        vendorName: null,
        slotCode: null,
        penaltyAmount: null,
        penaltyStatus: null,
        recordedAt: v.recorded_at,
      })),
  };

  return {
    report: isLiveApi ? query.data : mockReport,
    isLoading: isLiveApi && query.isLoading,
    isError: isLiveApi && query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/** WARD-15. */
export function useWardDashboard() {
  const slots = useMockDb((s) => s.slots);
  const registrations = useMockDb((s) => s.registrations);
  const applications = useMockDb((s) => s.applications);
  const contracts = useMockDb((s) => s.contracts);
  const feeItems = useMockDb((s) => s.feeItems);
  const penalties = useMockDb((s) => s.penalties);
  const violations = useMockDb((s) => s.violations);

  const query = useQuery({
    queryKey: WARD_REPORT_KEYS.dashboard,
    queryFn: wardReportApi.dashboard,
    enabled: isLiveApi,
  });

  const rented = slots.filter((s) => s.slot_status === 'RENTED').length;
  const revenue =
    feeItems.filter((f) => f.item_status === 'PAID').reduce((sum, f) => sum + f.amount, 0) +
    penalties.filter((p) => p.penalty_status === 'PAID').reduce((sum, p) => sum + p.amount, 0);
  const outstandingDebt =
    feeItems.filter((f) => f.item_status !== 'PAID').reduce((sum, f) => sum + f.amount, 0) +
    penalties.filter((p) => p.penalty_status !== 'PAID').reduce((sum, p) => sum + p.amount, 0);

  const mockDashboard: WardDashboardDto = {
    slotTotal: slots.length,
    slotRented: rented,
    occupancyPercent: slots.length ? Math.round((rented / slots.length) * 100) : 0,
    pendingRegistrations: registrations.filter((r) => r.registration_status === 'UNDER_REVIEW')
      .length,
    pendingApplications: applications.filter((a) => a.application_status === 'PENDING').length,
    activeContracts: contracts.filter((c) => c.contract_status === 'ACTIVE').length,
    revenueCollected: revenue,
    outstandingDebt,
    openViolations: violations.length,
  };

  return {
    dashboard: isLiveApi ? query.data : mockDashboard,
    isLoading: isLiveApi && query.isLoading,
    isError: isLiveApi && query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export const WARD_COLLECTION_KEYS = {
  performance: (from: string, to: string) => ['ward', 'reports', 'performance', from, to] as const,
  trend: (months: number) => ['ward', 'reports', 'trend', months] as const,
  debtors: ['ward', 'reports', 'debtors'] as const,
};

/**
 * WARD-14 collections: on-time rate and zones for the period. Live only: the demo database keeps
 * no payment dates, so it cannot say what was on time.
 */
export function useCollectionPerformance(period: ReportPeriod) {
  return useQuery({
    queryKey: WARD_COLLECTION_KEYS.performance(period.from, period.to),
    queryFn: () => wardReportApi.performance(period.from, period.to),
    enabled: isLiveApi,
    // Keep the last figures on screen while another period loads: no flash, no layout jump.
    placeholderData: keepPreviousData,
  });
}

/** Collections month by month (live only, like the on-time rate). */
export function useCollectionTrend(months = 6) {
  return useQuery({
    queryKey: WARD_COLLECTION_KEYS.trend(months),
    queryFn: () => wardReportApi.trend(months),
    enabled: isLiveApi,
  });
}

/** Households with overdue fees (live only). */
export function useWardDebtors() {
  return useQuery({
    queryKey: WARD_COLLECTION_KEYS.debtors,
    queryFn: wardReportApi.debtors,
    enabled: isLiveApi,
  });
}

/** One reminder per household per day; the list re-reads so "đã nhắc" shows at once. */
export function useRemindDebtor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (contractId: number) => wardReportApi.remindDebtor(contractId),
    onSettled: () => queryClient.invalidateQueries({ queryKey: WARD_COLLECTION_KEYS.debtors }),
  });
}
