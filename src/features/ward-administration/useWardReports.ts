import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  wardReportApi,
  type CollectionReportDto,
  type ReportSummaryDto,
  type WardDashboardDto,
} from '@/core/api';
import { isLiveApi } from '@/core/config/env';
import { OVERVIEW_REFRESH_MS } from '@/core/config/refresh';
import { useMockDb } from '@/mocks/db';
import { VIOLATION_TYPES } from '@/mocks/seed';

export const WARD_REPORT_KEYS = {
  collectionReport: (from: string, to: string) => ['ward', 'reports', 'collection', from, to] as const,
  dashboard: ['ward', 'dashboard'] as const,
  summary: (from: string, to: string) => ['ward', 'reports', 'summary', from, to] as const,
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

/**
 * AIC-08. Live API only: the sentences are computed on the server from the same rows as the
 * report, so there is nothing honest to show in demo mode.
 */
export function useReportSummary(period: ReportPeriod): {
  summary: ReportSummaryDto | undefined;
  isLoading: boolean;
  isError: boolean;
} {
  const query = useQuery({
    queryKey: WARD_REPORT_KEYS.summary(period.from, period.to),
    queryFn: () => wardReportApi.summary(period.from, period.to),
    enabled: isLiveApi,
  });
  // A body without its list of points is not a summary; leave the card out rather than crash the report.
  const summary = Array.isArray(query.data?.points) ? query.data : undefined;
  return { summary, isLoading: isLiveApi && query.isLoading, isError: isLiveApi && query.isError };
}

/** The dashboard's report figures from the demo reports, counted the way the server does. */
function mockReportFigures(
  reports: { report_status: string; created_at: string; due_at?: string; reviewed_at?: string }[],
  now = Date.now(),
) {
  const open = reports.filter((r) => r.report_status === 'PENDING');
  const closedHours = reports
    .filter((r) => r.reviewed_at && now - Date.parse(r.reviewed_at) <= 30 * 86_400_000)
    .map((r) => (Date.parse(r.reviewed_at!) - Date.parse(r.created_at)) / 3_600_000);
  return {
    openReports: open.length,
    overdueReports: open.filter((r) => r.due_at && Date.parse(r.due_at) < now).length,
    avgResolutionHours30d: closedHours.length
      ? closedHours.reduce((sum, h) => sum + h, 0) / closedHours.length
      : null,
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
  const reports = useMockDb((s) => s.reports);

  const query = useQuery({
    queryKey: WARD_REPORT_KEYS.dashboard,
    queryFn: wardReportApi.dashboard,
    enabled: isLiveApi,
    refetchInterval: OVERVIEW_REFRESH_MS,
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
    ...mockReportFigures(reports),
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
  receivables: ['ward', 'reports', 'receivables'] as const,
  refunds: ['ward', 'reports', 'refunds'] as const,
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

/** Overdue fees by age, what falls due next, and payments owed back (live only). */
export function useReceivables() {
  return useQuery({
    queryKey: WARD_COLLECTION_KEYS.receivables,
    queryFn: wardReportApi.receivables,
    enabled: isLiveApi,
  });
}

/** Payments received twice: owed back first, then refunded (live only). */
export function useWardRefunds() {
  return useQuery({
    queryKey: WARD_COLLECTION_KEYS.refunds,
    queryFn: wardReportApi.refunds,
    enabled: isLiveApi,
  });
}

/** The ward paid a payment back; both the list and the counts above it re-read. */
export function useMarkRefunded() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (transactionId: number) => wardReportApi.markRefunded(transactionId),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: WARD_COLLECTION_KEYS.refunds });
      void queryClient.invalidateQueries({ queryKey: WARD_COLLECTION_KEYS.receivables });
    },
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
