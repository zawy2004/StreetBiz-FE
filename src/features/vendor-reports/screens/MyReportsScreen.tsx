import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { Button, formatVnd, Icon, Pagination } from '@/components/common';
import { EmptyState, ErrorState, Skeleton } from '@/components/feedback';
import { VERDICT_TONES } from '@/components/illustrations';
import { Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { formatBoardStamp, formatDueDay } from '@/features/price-board/price-board-format';
import { BuyerPageHeader } from '@/features/vendor-map/components/BuyerPageHeader';
import { CommunityConnection } from '@/features/vendor-map/components/CommunityConnection';
import {
  communityApi,
  CommunityApiError,
  MY_REPORTS_PAGE_SIZE,
  useCommunityCustomer,
  type MyVendorReport,
} from '@/features/vendor-map/community-api';
import { PriceEvidenceBlock } from '../components/PriceEvidenceBlock';
import { REPORT_TYPE_ICONS, reportTypeShort, resolutionLabel, isReportType } from '../report-kinds';

const STATUS: Record<string, { label: string; tone: 'pending' | 'ok' | 'neutral' }> = {
  PENDING: { label: 'Đang chờ phường', tone: 'pending' },
  REVIEWED: { label: 'Đã xử lý', tone: 'ok' },
  DISMISSED: { label: 'Đã đóng', tone: 'neutral' },
};

/**
 * "Phản ánh của tôi" (BUY-07 / WARD-19): every report the buyer sent, with where it stands,
 * the ward's internal handling date, and once closed how: not accepted (with the reason the
 * officer wrote for them), mediated (with any refund) or a biên bản raised. A notification
 * about a result opens this page on that report.
 */
export function MyReportsScreen() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const focusId = Number(params.get('report')) || null;
  const customer = useCommunityCustomer();
  const [page, setPage] = useState(1);
  const reports = useQuery({
    queryKey: ['community', 'my-reports', customer?.id, page],
    queryFn: () => communityApi.myReports(page),
    enabled: Boolean(customer),
    staleTime: 0,
  });

  // A notification opened this page on one report: bring it into view once it is drawn.
  useEffect(() => {
    if (!focusId || !reports.data) return;
    document
      .getElementById(`report-${focusId}`)
      ?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
  }, [focusId, reports.data]);

  return (
    <Screen>
      <BuyerPageHeader
        title="Phản ánh của tôi"
        subtitle="Phường xử lý từng phản ánh và báo kết quả cho bạn."
      />
      {!customer ? (
        <div className="flex max-w-[720px] flex-col gap-md">
          <p className="text-body-md text-text">
            Đăng nhập tài khoản người mua đã gửi phản ánh để xem kết quả.
          </p>
          <CommunityConnection />
        </div>
      ) : reports.isPending ? (
        <div role="status" aria-label="Đang tải phản ánh" className="flex flex-col gap-sm">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[132px] w-full !rounded-[20px]" />
          ))}
        </div>
      ) : reports.isError ? (
        <ErrorState
          message={
            reports.error instanceof CommunityApiError
              ? reports.error.message
              : 'Không tải được phản ánh của bạn.'
          }
          onRetry={() => void reports.refetch()}
        />
      ) : reports.data.length === 0 && page === 1 ? (
        <EmptyState
          icon="flag-outline"
          title="Bạn chưa gửi phản ánh nào"
          description="Quét mã QR ở quầy để kiểm tra giấy phép, bảng giá và gửi phản ánh khi cần."
          action={
            <Button
              label="Quét mã QR"
              fullWidth={false}
              icon={<Icon name="qrcode-scan" size={18} color="currentColor" />}
              onPress={() => navigate('/customer/scan')}
            />
          }
        />
      ) : (
        <>
          <ul className="flex flex-col gap-md">
            {reports.data.map((report) => (
              <li key={report.reportId}>
                <MyReportCard report={report} focused={report.reportId === focusId} />
              </li>
            ))}
          </ul>
          <Pagination
            page={page}
            hasNext={reports.data.length >= MY_REPORTS_PAGE_SIZE}
            busy={reports.isFetching}
            onChange={setPage}
          />
        </>
      )}
    </Screen>
  );
}

function MyReportCard({ report, focused }: { report: MyVendorReport; focused: boolean }) {
  const status = STATUS[report.status] ?? { label: report.status, tone: 'neutral' as const };
  const outcome = resolutionLabel(report.resolution);
  const due = formatDueDay(report.dueAt);
  const sentAt = formatBoardStamp(report.createdAt);
  const reviewedAt = formatBoardStamp(report.reviewedAt);
  const type = isReportType(report.reportType) ? report.reportType : 'GENERAL';
  const overdue = VERDICT_TONES.danger;
  const resultTone = VERDICT_TONES[outcome?.tone ?? 'neutral'];

  return (
    <article
      id={`report-${report.reportId}`}
      aria-label={`Phản ánh #${report.reportId}`}
      className={`flex scroll-mt-md flex-col gap-sm rounded-[24px] bg-card p-md shadow-card md:p-lg ${focused ? 'ring-2 ring-brand' : 'ring-1 ring-border'}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-sm">
        <div className="flex min-w-0 items-start gap-sm">
          <span
            aria-hidden="true"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-tint-primary text-primary"
          >
            <Icon name={REPORT_TYPE_ICONS[type]} size={22} color="currentColor" />
          </span>
          <div className="min-w-0">
            <p className="text-body-sm font-semibold text-primary">{reportTypeShort(type)}</p>
            <h2 className="text-[18px] font-semibold leading-snug text-text">
              {report.vendorName ?? 'Quầy được phản ánh'}
              {report.slotCode ? (
                <span className="font-normal text-muted"> · Ô {report.slotCode}</span>
              ) : null}
            </h2>
            <p className="text-body-sm text-muted">
              #{report.reportId}
              {sentAt ? ` · Gửi lúc ${sentAt}` : ''}
            </p>
          </div>
        </div>
        <StatusChip label={status.label} tone={status.tone} />
      </div>

      <p className="text-body-md text-text/85">{report.reason}</p>

      {report.priceEvidence ? <PriceEvidenceBlock evidence={report.priceEvidence} /> : null}

      {report.status === 'PENDING' ? (
        <p className="flex flex-wrap items-center gap-xs text-body-md text-text">
          <Icon name="timer-outline" size={18} color="currentColor" className="text-muted" />
          {due ? <span>Hạn xử lý: hết ngày {due}</span> : <span>Phường đang xem xét</span>}
          {report.isOverdue ? (
            <span
              className={`inline-flex items-center gap-1 rounded-[6px] px-1.5 py-0.5 text-body-xs font-bold ${overdue.wash} ${overdue.ink}`}
            >
              Quá hạn
            </span>
          ) : null}
        </p>
      ) : outcome ? (
        <div className={`flex flex-col gap-1 rounded-[16px] px-md py-sm ${resultTone.wash}`}>
          <p className={`flex items-center gap-xs text-body-md font-semibold ${resultTone.ink}`}>
            <Icon
              name={report.resolution === 'DISMISSED' ? 'close-circle-outline' : 'check-circle'}
              size={18}
              color="currentColor"
            />
            Kết quả: {outcome.label}
            {reviewedAt ? <span className="font-normal"> · {reviewedAt}</span> : null}
          </p>
          {report.resolutionNote ? (
            <p className="text-body-md text-text">
              {report.resolution === 'DISMISSED' ? 'Lý do: ' : 'Ghi chú của phường: '}
              {report.resolutionNote}
            </p>
          ) : null}
          {report.refundAmount ? (
            <p className="text-body-md font-semibold text-text">
              Người bán hoàn lại: {formatVnd(report.refundAmount)}
            </p>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
