import { useId, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';

import { Icon } from '@/components/common';
import { ConfirmDialog, showToast } from '@/components/feedback';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { useMediaQuery } from '@/hooks/useBreakpoint';
import { DetailLoadError, PanelButton, PanelCard, Timeline } from '../components/AdminParts';
import { formatDay, prefersReducedMotion, waitText } from '../components/admin-format';
import { PlatformConnection } from '../components/PlatformConnection';
import { DecisionStamp, EvidenceFrame, ReviewSkeleton } from '../components/ReviewParts';
import { platformApi, PlatformApiError } from '../platform-api';

const CONTENT_LABEL: Record<string, string> = {
  STOREFRONT: 'Gian hàng',
  MENU_ITEM: 'Món ăn',
  REVIEW: 'Đánh giá',
};

const DISMISS_CONSEQUENCE = 'Báo cáo sẽ được đóng mà không thay đổi nội dung.';
const HIDE_CONSEQUENCE =
  'Nội dung sẽ không còn được hiển thị công khai và các báo cáo trùng sẽ được đóng.';

export function ReportedContentReviewScreen() {
  return (
    <PlatformConnection>
      <ReportedContentReviewContent />
    </PlatformConnection>
  );
}

function ReportedContentReviewContent() {
  const { reportId } = useParams<{ reportId: string }>();
  const queryClient = useQueryClient();
  const [confirmation, setConfirmation] = useState<'dismiss' | 'hide'>();
  const report = useQuery({
    queryKey: ['platform', 'reported-content', reportId],
    queryFn: () => platformApi.reportedContentDetail(reportId!),
    enabled: Boolean(reportId),
  });
  const decide = useMutation({
    mutationFn: (decision: 'dismiss' | 'hide') =>
      platformApi.decideReportedContent(reportId!, decision, report.data!.status),
    onSuccess: async (_, decision) => {
      setConfirmation(undefined);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['platform', 'reported-content'] }),
        queryClient.invalidateQueries({
          queryKey: ['platform', 'reported-content', reportId],
        }),
      ]);
      showToast(decision === 'hide' ? 'Đã ẩn nội dung vi phạm' : 'Đã bỏ qua báo cáo');
    },
  });

  // Display only: phone layout, which decision's consequence to show on the phone bar,
  // and whether the decision landed while this page was open (then the stamp comes down).
  const wide = useMediaQuery('(min-width: 768px)');
  const [focused, setFocused] = useState<'dismiss' | 'hide'>('dismiss');
  const dismissId = useId();
  const hideId = useId();
  const firstStatus = useRef<string>(undefined);
  if (report.data && firstStatus.current === undefined) firstStatus.current = report.data.status;

  if (report.isPending) return <ReviewSkeleton label="Đang tải báo cáo" />;
  if (report.isError || !report.data) {
    return (
      <Screen>
        <DetailLoadError
          message={
            report.error instanceof PlatformApiError
              ? report.error.message
              : 'Không tìm thấy báo cáo nội dung.'
          }
          onRetry={() => report.refetch()}
        />
      </Screen>
    );
  }

  const data = report.data;
  const pending = data.status === 'PENDING';
  const reviewedDay = formatDay(data.reviewedAt);
  const stampAnimates = firstStatus.current === 'PENDING' && !pending && !prefersReducedMotion();
  const hideDisabled = !data.contentExists || decide.isPending;

  const errorLine =
    decide.error instanceof PlatformApiError ? (
      <p
        role="alert"
        className="sb-pop flex items-start gap-xs rounded-[12px] bg-[#FDEBEA] px-sm py-xs text-body-md font-medium text-[#8F1717] dark:bg-[#3A1414] dark:text-[#FF9A90]"
      >
        <Icon
          name="alert-circle-outline"
          size={18}
          color="currentColor"
          className="mt-0.5 shrink-0"
        />
        {decide.error.message}
      </p>
    ) : null;

  const dismissButton = (
    <PanelButton
      label="Bỏ qua báo cáo"
      variant="outline"
      disabled={decide.isPending}
      describedBy={dismissId}
      onFocus={() => setFocused('dismiss')}
      onPress={() => setConfirmation('dismiss')}
      className="w-full"
    />
  );
  const hideButton = (
    <PanelButton
      label="Ẩn nội dung"
      variant="danger"
      disabled={hideDisabled}
      describedBy={hideId}
      onFocus={() => setFocused('hide')}
      onPress={() => setConfirmation('hide')}
      icon={
        !data.contentExists ? (
          <Icon name="lock-outline" size={17} color="currentColor" />
        ) : undefined
      }
      className="w-full"
    />
  );
  const hideReason = !data.contentExists ? ' Nội dung không còn tồn tại.' : '';

  const footer =
    pending && !wide ? (
      <StickyActions>
        <div className="flex w-full flex-col gap-xs">
          {errorLine}
          <p className="truncate text-body-sm text-muted" aria-live="polite">
            {focused === 'hide' ? `${HIDE_CONSEQUENCE}${hideReason}` : DISMISS_CONSEQUENCE}
          </p>
          <span id={dismissId} className="sr-only">
            {DISMISS_CONSEQUENCE}
          </span>
          <span id={hideId} className="sr-only">
            {HIDE_CONSEQUENCE}
            {hideReason}
          </span>
          <div className="flex w-full gap-sm">
            <div className="flex-1">{dismissButton}</div>
            <div className="flex-1">{hideButton}</div>
          </div>
        </div>
      </StickyActions>
    ) : undefined;

  return (
    <Screen width="wide" footer={footer}>
      <AppHeader
        title="Xem xét nội dung"
        back
        subtitle={`Báo cáo #${data.reportId}`}
        right={<StatusChip code={data.status} />}
      />

      <div className="grid items-start gap-lg xl:grid-cols-[minmax(0,1fr)_368px]">
        <div className="flex min-w-0 flex-col gap-md">
          <EvidenceFrame
            contentType={data.contentType}
            heading={`${CONTENT_LABEL[data.contentType] ?? data.contentType} #${data.contentId}`}
            title={data.contentTitle}
            body={data.contentBody}
            contentStatus={data.contentStatus}
            exists={data.contentExists}
            stamp={
              !pending ? (
                <DecisionStamp status={data.status} day={reviewedDay} animate={stampAnimates} />
              ) : undefined
            }
          />

          <div className="flex items-start gap-sm rounded-[14px] bg-[#FFF3D1] px-md py-sm text-[#6B4100] dark:bg-[#3A2A08] dark:text-[#FFD27A]">
            <Icon
              name="flag-outline"
              size={20}
              color="currentColor"
              weight="fill"
              className="mt-0.5 shrink-0"
            />
            <div className="min-w-0">
              <p className="text-label">Lý do</p>
              <p className="mt-0.5 break-words text-body-md font-medium">{data.reason}</p>
            </div>
          </div>

          <PanelCard className="p-md md:p-lg" label="Diễn biến báo cáo">
            <Timeline
              label="Diễn biến báo cáo"
              steps={[
                {
                  key: 'reported',
                  title: 'Thời điểm báo cáo',
                  detail: (
                    <>
                      <span className="block font-sign text-text font-tabular">
                        {new Date(data.createdAt).toLocaleString('vi-VN')}
                      </span>
                      <span className="block">
                        Người báo cáo: <span className="text-text">{data.reporterName}</span>
                      </span>
                    </>
                  ),
                },
                data.reviewedAt
                  ? {
                      key: 'reviewed',
                      title: 'Đã xử lý',
                      detail: `${data.reviewedByName ?? 'Platform Admin'} · ${new Date(
                        data.reviewedAt,
                      ).toLocaleString('vi-VN')}`,
                    }
                  : pending
                    ? {
                        key: 'waiting',
                        title: `Đang chờ quyết định${waitText(data.createdAt) ? `, chờ ${waitText(data.createdAt)}` : ''}`,
                        waiting: true,
                      }
                    : { key: 'reviewed', title: 'Đã xử lý' },
              ]}
            />
          </PanelCard>
        </div>

        {pending && wide ? (
          <PanelCard
            label="Quyết định"
            className="flex flex-col gap-md p-md md:p-lg xl:sticky xl:top-0"
          >
            <p className="font-sign text-[18px] font-bold text-text">Quyết định</p>
            <div className="grid gap-md md:grid-cols-2 xl:grid-cols-1">
              <div className="flex flex-col gap-xs">
                {dismissButton}
                <p id={dismissId} className="text-body-sm text-muted">
                  {DISMISS_CONSEQUENCE}
                </p>
              </div>
              <div className="flex flex-col gap-xs">
                {hideButton}
                <p id={hideId} className="text-body-sm text-muted">
                  {HIDE_CONSEQUENCE}
                  {!data.contentExists ? (
                    <span className="mt-1 flex items-center gap-1 font-medium text-error">
                      <Icon name="lock-outline" size={14} color="currentColor" />
                      Nội dung không còn tồn tại
                    </span>
                  ) : null}
                </p>
              </div>
            </div>
            {errorLine}
          </PanelCard>
        ) : !pending ? (
          <PanelCard label="Kết quả" className="flex flex-col gap-xs p-md md:p-lg">
            <p className="flex items-center gap-xs text-label text-text">
              <Icon
                name="check-circle-outline"
                size={18}
                color="currentColor"
                className="text-tertiary"
              />
              Báo cáo đã được xử lý
            </p>
            <StatusChip code={data.status} />
            {errorLine}
          </PanelCard>
        ) : null}
      </div>

      <ConfirmDialog
        visible={Boolean(confirmation)}
        title={confirmation === 'hide' ? 'Ẩn nội dung vi phạm?' : 'Bỏ qua báo cáo?'}
        description={
          confirmation === 'hide'
            ? 'Nội dung sẽ không còn được hiển thị công khai và các báo cáo trùng sẽ được đóng.'
            : 'Báo cáo sẽ được đóng mà không thay đổi nội dung.'
        }
        confirmLabel={confirmation === 'hide' ? 'Ẩn nội dung' : 'Bỏ qua'}
        confirmVariant={confirmation === 'hide' ? 'danger' : 'primary'}
        onCancel={() => setConfirmation(undefined)}
        onConfirm={() => confirmation && decide.mutate(confirmation)}
      />
    </Screen>
  );
}
