import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { Icon } from '@/components/common';
import { EmptyState, ErrorState, Skeleton } from '@/components/feedback';
import { FilterChips } from '@/components/forms';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { errorMessage } from '@/core/api';
import { wardVendorReportsApi } from '@/core/api/ai-api';
import { isLiveApi } from '@/core/config/env';
import { formatAgoVi } from '../components/review/format';
import { REPORT_STATUS_FILTERS } from '../vendor-report-view';

type StatusFilter = (typeof REPORT_STATUS_FILTERS)[number]['value'];

/** The citizen reports about vendors in the officer's ward, oldest worry first within each status. */
export function WardVendorReportsScreen() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<StatusFilter>('PENDING');
  const reports = useQuery({
    queryKey: ['ward', 'vendor-reports', status],
    queryFn: () => wardVendorReportsApi.list(status),
    enabled: isLiveApi,
    retry: false,
  });

  return (
    <Screen>
      <AppHeader
        title="Phản ánh về hộ bán hàng"
        subtitle="Người dân báo vi phạm trong phường của bạn"
        back
      />
      <FilterChips
        value={status}
        onChange={setStatus}
        options={REPORT_STATUS_FILTERS.map((option) => ({ ...option }))}
      />
      {!isLiveApi ? (
        <EmptyState
          icon="magnify"
          title="Chưa kết nối máy chủ"
          description="Danh sách phản ánh thật chỉ có khi ứng dụng chạy với máy chủ."
        />
      ) : reports.isPending ? (
        <div role="status" aria-label="Đang tải phản ánh" className="flex flex-col gap-sm">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[88px] w-full !rounded-[16px]" />
          ))}
        </div>
      ) : reports.isError ? (
        <ErrorState message={errorMessage(reports.error)} onRetry={() => reports.refetch()} />
      ) : reports.data.length === 0 ? (
        <EmptyState
          icon="check-circle-outline"
          title="Không có phản ánh nào"
          description="Chưa có phản ánh ở trạng thái này."
        />
      ) : (
        <ul className="flex flex-col gap-sm">
          {reports.data.map((report) => (
            <li key={report.reportId}>
              <button
                type="button"
                onClick={() => navigate(`/ward/inbox/vendor-reports/${report.reportId}`)}
                className="flex min-h-[88px] w-full items-center gap-sm rounded-[16px] bg-card p-md text-left shadow-card ring-1 ring-border transition-shadow hover:shadow-card-hover"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[16px] font-semibold text-text">
                    {report.vendorName ?? 'Chưa xác định hộ kinh doanh'}
                  </span>
                  <span className="mt-0.5 line-clamp-2 text-body-md text-muted">
                    {report.reason}
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-sm gap-y-0.5 text-body-sm text-muted">
                    {report.slotCode ? <span>Ô {report.slotCode}</span> : null}
                    {report.hasPhoto ? (
                      <span className="inline-flex items-center gap-1">
                        <Icon name="camera-plus-outline" size={14} color="currentColor" /> Có ảnh
                      </span>
                    ) : null}
                    <span>{formatAgoVi(report.createdAt) ?? ''}</span>
                  </span>
                </span>
                <StatusChip code={report.status} />
                <Icon name="chevron-right" size={20} color="currentColor" className="shrink-0 text-muted" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Screen>
  );
}
