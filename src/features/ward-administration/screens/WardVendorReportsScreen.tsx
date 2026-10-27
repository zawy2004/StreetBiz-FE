import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { Icon, Pagination } from '@/components/common';
import { EmptyState, ErrorState, Skeleton } from '@/components/feedback';
import { FilterChips } from '@/components/forms';
import { VERDICT_TONES } from '@/components/illustrations';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { errorMessage } from '@/core/api';
import {
  wardVendorReportsApi,
  type VendorReportType,
  type WardVendorReportSummary,
} from '@/core/api/ai-api';
import { isLiveApi } from '@/core/config/env';
import { formatDueDay } from '@/features/price-board/price-board-format';
import {
  REPORT_TYPE_ICONS,
  isReportType,
  reportTypeShort,
  resolutionLabel,
} from '@/features/vendor-reports/report-kinds';
import { useMockDb } from '@/mocks/db';
import { formatAgoVi, parseServerDate } from '../components/review/format';
import { REPORT_STATUS_FILTERS, REPORT_TYPE_FILTERS } from '../vendor-report-view';

type StatusFilter = (typeof REPORT_STATUS_FILTERS)[number]['value'] | 'ALL';
type TypeFilter = (typeof REPORT_TYPE_FILTERS)[number]['value'];

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  ...REPORT_STATUS_FILTERS,
  { value: 'ALL', label: 'Tất cả' },
];

const PAGE_SIZE = 20;

/** Demo mode: the in-browser reports, filtered and ordered the way the server does. */
function useMockReports(status: StatusFilter, type: TypeFilter, overdue: boolean) {
  const reports = useMockDb((s) => s.reports);
  const vendors = useMockDb((s) => s.vendors);
  const slots = useMockDb((s) => s.slots);
  const now = Date.now();
  const rows = reports
    .map((r) => {
      const due = parseServerDate(r.due_at)?.getTime();
      const late = r.report_status === 'PENDING' && due != null && due < now;
      return {
        row: {
          reportId: r.id as unknown as number,
          reason: r.reason,
          status: r.report_status,
          createdAt: r.created_at,
          vendorName: vendors.find((v) => v.id === r.vendorId)?.business_name ?? null,
          slotCode: slots.find((s) => s.id === r.slotId)?.slot_code ?? null,
          hasPhoto: Boolean(r.photoUri),
          reportType: r.report_type ?? 'GENERAL',
          dueAt: r.due_at ?? null,
          isOverdue: late,
          resolution: r.resolution ?? null,
        } satisfies WardVendorReportSummary,
        due: due ?? Number.MAX_SAFE_INTEGER,
      };
    })
    .filter(({ row }) => status === 'ALL' || row.status === status)
    .filter(({ row }) => type === 'ALL' || row.reportType === type)
    .filter(({ row }) => !overdue || row.isOverdue)
    .sort((a, b) =>
      a.row.status === 'PENDING' && b.row.status === 'PENDING'
        ? Number(b.row.isOverdue) - Number(a.row.isOverdue) || a.due - b.due
        : a.row.status === 'PENDING'
          ? -1
          : b.row.status === 'PENDING'
            ? 1
            : b.row.createdAt.localeCompare(a.row.createdAt),
    );
  return rows.map(({ row }) => row);
}

/**
 * The citizen reports about vendors in the officer's ward (WARD-19), overdue first, then the
 * nearest due date, then the closed ones (the server's order). Filter by status, by type and
 * to the overdue ones only; each row shows its type, its internal due date and how it closed.
 */
export function WardVendorReportsScreen() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialType = params.get('type');
  const [status, setStatus] = useState<StatusFilter>(
    (STATUS_OPTIONS.find((o) => o.value === params.get('status'))?.value as StatusFilter) ??
      'PENDING',
  );
  const [type, setType] = useState<TypeFilter>(isReportType(initialType) ? initialType : 'ALL');
  const [overdue, setOverdue] = useState(params.get('overdue') === 'true');
  const [page, setPage] = useState(1);
  const filter = {
    ...(type !== 'ALL' ? { type: type as VendorReportType } : {}),
    ...(overdue ? { overdue: true } : {}),
  };
  const reports = useQuery({
    queryKey: ['ward', 'vendor-reports', status, type, overdue, page],
    queryFn: () => wardVendorReportsApi.list(status === 'ALL' ? undefined : status, page, filter),
    enabled: isLiveApi,
    retry: false,
    placeholderData: keepPreviousData,
  });
  const mockRows = useMockReports(status, type, overdue);
  const rows = isLiveApi ? reports.data : mockRows;

  const reset =
    <T,>(set: (value: T) => void) =>
    (value: T) => {
      set(value);
      setPage(1);
    };

  return (
    <Screen>
      <AppHeader
        title="Phản ánh về hộ bán hàng"
        subtitle="Người dân phản ánh trong phường của bạn; cán bộ xem và đóng từng phản ánh"
        back
      />
      <div className="flex flex-col gap-xs">
        <FilterChips value={status} onChange={reset(setStatus)} options={STATUS_OPTIONS} />
        <div className="flex flex-col gap-xs md:flex-row md:items-center md:justify-between">
          <FilterChips
            value={type}
            onChange={reset(setType)}
            options={REPORT_TYPE_FILTERS.map((option) => ({ ...option }))}
          />
          <button
            type="button"
            aria-pressed={overdue}
            onClick={() => reset(setOverdue)(!overdue)}
            className={[
              'inline-flex h-10 w-fit shrink-0 items-center gap-1.5 rounded-full px-md text-label transition-colors',
              overdue
                ? `${VERDICT_TONES.danger.wash} ${VERDICT_TONES.danger.ink} font-semibold ring-1 ring-error/40`
                : 'bg-card text-text shadow-card ring-1 ring-border hover:ring-text/25',
            ].join(' ')}
          >
            <Icon name="timer-outline" size={16} color="currentColor" />
            Chỉ quá hạn
          </button>
        </div>
      </div>
      {isLiveApi && reports.isPending ? (
        <div role="status" aria-label="Đang tải phản ánh" className="flex flex-col gap-sm">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[88px] w-full !rounded-[16px]" />
          ))}
        </div>
      ) : isLiveApi && reports.isError ? (
        <ErrorState message={errorMessage(reports.error)} onRetry={() => reports.refetch()} />
      ) : !rows || rows.length === 0 ? (
        <EmptyState
          icon="check-circle-outline"
          title="Không có phản ánh nào"
          description={
            overdue ? 'Không có phản ánh nào quá hạn xử lý.' : 'Chưa có phản ánh ở trạng thái này.'
          }
        />
      ) : (
        <>
          <ul className="flex flex-col gap-sm">
            {rows.map((report) => (
              <li key={report.reportId}>
                <ReportRow
                  report={report}
                  onOpen={() => navigate(`/ward/inbox/vendor-reports/${report.reportId}`)}
                />
              </li>
            ))}
          </ul>
          {isLiveApi ? (
            <Pagination
              page={page}
              hasNext={rows.length >= PAGE_SIZE}
              busy={reports.isFetching}
              onChange={setPage}
            />
          ) : null}
        </>
      )}
    </Screen>
  );
}

function ReportRow({ report, onOpen }: { report: WardVendorReportSummary; onOpen: () => void }) {
  const type = isReportType(report.reportType) ? report.reportType : 'GENERAL';
  const due = report.status === 'PENDING' ? formatDueDay(report.dueAt) : null;
  const outcome = resolutionLabel(report.resolution);
  const danger = VERDICT_TONES.danger;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`flex min-h-[88px] w-full items-center gap-sm rounded-[16px] bg-card p-md text-left shadow-card transition-shadow hover:shadow-card-hover ${report.isOverdue ? 'ring-2 ring-error/50' : 'ring-1 ring-border'}`}
    >
      <span
        aria-hidden="true"
        className={`hidden h-11 w-11 shrink-0 items-center justify-center rounded-[10px] sm:flex ${type === 'GENERAL' ? 'bg-sunken text-text' : 'bg-tint-primary text-primary'}`}
      >
        <Icon name={REPORT_TYPE_ICONS[type]} size={22} color="currentColor" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-body-sm font-semibold text-primary">
          {reportTypeShort(type)}
        </span>
        <span className="block truncate text-[16px] font-semibold text-text">
          {report.vendorName ?? 'Chưa xác định hộ kinh doanh'}
        </span>
        <span className="mt-0.5 line-clamp-2 text-body-md text-muted">{report.reason}</span>
        <span className="mt-1 flex flex-wrap items-center gap-x-sm gap-y-0.5 text-body-sm text-muted">
          {report.slotCode ? <span>Ô {report.slotCode}</span> : null}
          {report.hasPhoto ? (
            <span className="inline-flex items-center gap-1">
              <Icon name="camera-plus-outline" size={14} color="currentColor" /> Có ảnh
            </span>
          ) : null}
          <span>{formatAgoVi(report.createdAt) ?? ''}</span>
          {due ? <span className="font-medium text-text/80">Hạn xử lý {due}</span> : null}
          {report.isOverdue ? (
            <span
              className={`inline-flex items-center gap-1 rounded-[6px] px-1.5 py-0.5 text-body-xs font-bold ${danger.wash} ${danger.ink}`}
            >
              <Icon name="timer-outline" size={13} color="currentColor" />
              Quá hạn
            </span>
          ) : null}
        </span>
      </span>
      {outcome ? (
        <StatusChip label={outcome.label} tone={outcome.tone} />
      ) : (
        <StatusChip code={report.status} />
      )}
      <Icon name="chevron-right" size={20} color="currentColor" className="shrink-0 text-muted" />
    </button>
  );
}
