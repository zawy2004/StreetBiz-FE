import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';

import { Button } from '@/components/common';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { ErrorState, Skeleton, showToast } from '@/components/feedback';
import { ApiError, errorMessage } from '@/core/api';
import {
  wardVendorReportsApi,
  type ResolveVendorReportRequest,
  type WardVendorReport,
} from '@/core/api/ai-api';
import { vendorRegistrationApi } from '@/core/api/vendor-registration-api';
import { PriceEvidenceBlock } from '@/features/vendor-reports/components/PriceEvidenceBlock';
import { SUGGESTED_VIOLATION_LABELS } from '@/features/vendor-reports/report-kinds';
import { CitizenReportSlip, ReportPhoto } from '../components/review/ReportParts';
import { VendorReportAssistPanel } from '../components/review/VendorReportAssistPanel';
import {
  VendorReportFacts,
  VendorReportOutcomeCard,
  VendorReportResolvePanel,
} from '../components/review/VendorReportDecision';
import { violationFormPath } from '../vendor-report-view';

/** The citizen's photo sits behind the evidence endpoint (a bearer token), so it is fetched and shown as an object URL. */
function useEvidencePhoto(fileUrl: string | null): string | undefined {
  const [photo, setPhoto] = useState<string>();
  useEffect(() => {
    if (!fileUrl) {
      setPhoto(undefined);
      return;
    }
    let url: string | undefined;
    let cancelled = false;
    vendorRegistrationApi
      .downloadEvidenceFile(fileUrl)
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setPhoto(url);
      })
      .catch(() => {
        if (!cancelled) setPhoto(undefined);
      });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [fileUrl]);
  return photo;
}

/**
 * AIB-01 + WARD-19 for the ward officer: one citizen report with the system's notes beside it
 * (permit check, what the photo shows, the price evidence of an overcharge), and the three
 * ways to close it. The notes are advice; the officer decides, and nothing closes on its own.
 */
export function LiveVendorReportReviewScreen() {
  const { id } = useParams<{ id: string }>();
  const reportId = Number(id);
  const navigate = useNavigate();
  const cache = useQueryClient();
  const report = useQuery({
    queryKey: ['ward', 'vendor-report', reportId],
    queryFn: () => wardVendorReportsApi.get(reportId),
    enabled: Number.isInteger(reportId) && reportId > 0,
    retry: false,
  });
  const run = useMutation({
    mutationFn: () => wardVendorReportsApi.assist(reportId),
    onSuccess: (fresh: WardVendorReport) => {
      cache.setQueryData(['ward', 'vendor-report', reportId], fresh);
    },
  });
  const resolve = useMutation({
    mutationFn: (request: ResolveVendorReportRequest) =>
      wardVendorReportsApi.resolve(reportId, request),
    onSuccess: async (fresh) => {
      cache.setQueryData(['ward', 'vendor-report', reportId], fresh);
      await cache.invalidateQueries({ queryKey: ['ward', 'vendor-reports'] });
      void cache.invalidateQueries({ queryKey: ['ward', 'dashboard'] });
      showToast(
        fresh.outcome?.resolution === 'DISMISSED' ? 'Đã bác phản ánh' : 'Đã ghi nhận hòa giải',
      );
    },
  });
  const photo = useEvidencePhoto(report.data?.evidenceUrl ?? null);

  if (report.isPending && report.fetchStatus !== 'idle') {
    return (
      <Screen>
        <div role="status" aria-label="Đang tải phản ánh" className="flex flex-col gap-md">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-40 w-full" />
        </div>
      </Screen>
    );
  }

  if (report.isError || !report.data) {
    return (
      <Screen>
        <ErrorState
          message={report.isError ? errorMessage(report.error) : 'Không tìm thấy phản ánh.'}
          onRetry={report.isError ? () => report.refetch() : undefined}
        />
        <div className="flex justify-center">
          <Button
            label="Quay lại"
            variant="outline"
            fullWidth={false}
            onPress={() => navigate('/ward/inbox/vendor-reports')}
          />
        </div>
      </Screen>
    );
  }

  const data = report.data;
  const pending = data.status === 'PENDING';
  const suggested = data.suggestedViolationType
    ? (SUGGESTED_VIOLATION_LABELS[data.suggestedViolationType] ?? data.suggestedViolationType)
    : null;
  const resolveError = resolve.error
    ? {
        message: errorMessage(resolve.error),
        conflict: resolve.error instanceof ApiError && resolve.error.status === 409,
      }
    : null;

  return (
    <Screen width="wide">
      <AppHeader
        title="Phản ánh về quầy"
        back
        subtitle={data.vendorName ?? 'Chưa xác định hộ kinh doanh'}
        right={<StatusChip code={data.status} />}
      />
      <div className="grid items-start gap-md lg:grid-cols-2 xl:grid-cols-12 xl:gap-lg">
        <div className="flex flex-col gap-md xl:col-span-7">
          <CitizenReportSlip reason={data.reason} createdAt={data.createdAt} />
          {data.priceEvidence ? <PriceEvidenceBlock evidence={data.priceEvidence} /> : null}
          <VendorReportAssistPanel
            assist={data.assist}
            hasPhoto={Boolean(data.evidenceUrl)}
            running={run.isPending}
            error={run.isError ? errorMessage(run.error) : null}
            onRun={() => run.mutate()}
          />
        </div>
        <div className="flex flex-col gap-md xl:col-span-5">
          <VendorReportFacts
            reportType={data.reportType}
            status={data.status}
            dueAt={data.dueAt}
            isOverdue={data.isOverdue}
            reportsAgainstVendor90Days={data.reportsAgainstVendor90Days}
          />
          {pending ? (
            <VendorReportResolvePanel
              chargedAmount={data.priceEvidence?.chargedAmount ?? null}
              suggestedViolation={suggested}
              submitting={resolve.isPending}
              error={resolveError}
              onResolve={(outcome, note, refundAmount) =>
                resolve.mutate({
                  expectedStatus: data.status,
                  outcome,
                  note,
                  refundAmount: outcome === 'MEDIATED' ? refundAmount : null,
                })
              }
              onRecordViolation={() => navigate(violationFormPath(data))}
              onReload={() => {
                resolve.reset();
                void report.refetch();
              }}
            />
          ) : data.outcome ? (
            <VendorReportOutcomeCard outcome={data.outcome} violationId={data.violationId} />
          ) : null}
          <ReportPhoto uri={photo} vendorName={data.vendorName ?? undefined} />
          {data.slotCode || data.aiExtractedLocation ? (
            <dl className="rounded-[16px] bg-card p-md text-body-md ring-1 ring-border">
              {data.slotCode ? (
                <div>
                  <dt className="text-body-sm text-muted">Ô được nêu trong phản ánh</dt>
                  <dd className="font-semibold text-text">{data.slotCode}</dd>
                </div>
              ) : null}
              {data.aiExtractedLocation ? (
                <div className={data.slotCode ? 'mt-xs' : undefined}>
                  <dt className="text-body-sm text-muted">Nơi nhận ra từ ảnh (gợi ý)</dt>
                  <dd className="text-text">{data.aiExtractedLocation}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </div>
      </div>
    </Screen>
  );
}
