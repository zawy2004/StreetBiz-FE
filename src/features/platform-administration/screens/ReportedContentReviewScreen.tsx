import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';

import { Button, Card, Divider, ListRow } from '@/components/common';
import { ConfirmDialog, ErrorState, LoadingState, showToast } from '@/components/feedback';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { PlatformConnection } from '../components/PlatformConnection';
import { platformApi, PlatformApiError } from '../platform-api';

const CONTENT_LABEL: Record<string, string> = {
  STOREFRONT: 'Gian hàng',
  MENU_ITEM: 'Món ăn',
  REVIEW: 'Đánh giá',
};

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

  if (report.isPending) return <LoadingState />;
  if (report.isError || !report.data) {
    return (
      <ErrorState
        message={
          report.error instanceof PlatformApiError
            ? report.error.message
            : 'Không tìm thấy báo cáo nội dung.'
        }
        onRetry={() => report.refetch()}
      />
    );
  }

  const data = report.data;
  return (
    <Screen>
      <AppHeader title="Xem xét nội dung" back subtitle={`Báo cáo #${data.reportId}`} />
      <Card>
        <div className="flex items-start justify-between gap-sm">
          <div>
            <span className="text-body-sm text-muted">
              {CONTENT_LABEL[data.contentType] ?? data.contentType} #{data.contentId}
            </span>
            <h2 className="text-headline-md text-text">{data.contentTitle}</h2>
          </div>
          <StatusChip code={data.status} />
        </div>
        {data.contentBody ? (
          <p className="mt-sm text-body-md text-muted">{data.contentBody}</p>
        ) : null}
        <div className="mt-sm">
          <StatusChip code={data.contentStatus} />
        </div>
      </Card>
      <Card padded={false}>
        <div className="px-md">
          <ListRow title="Người báo cáo" subtitle={data.reporterName} />
          <Divider />
          <ListRow title="Lý do" subtitle={data.reason} />
          <Divider />
          <ListRow
            title="Thời điểm báo cáo"
            subtitle={new Date(data.createdAt).toLocaleString('vi-VN')}
          />
          {data.reviewedAt ? (
            <>
              <Divider />
              <ListRow
                title="Đã xử lý"
                subtitle={`${data.reviewedByName ?? 'Platform Admin'} · ${new Date(
                  data.reviewedAt,
                ).toLocaleString('vi-VN')}`}
              />
            </>
          ) : null}
        </div>
      </Card>
      {decide.error instanceof PlatformApiError ? (
        <p role="alert" className="text-body-md text-error">
          {decide.error.message}
        </p>
      ) : null}
      {data.status === 'PENDING' ? (
        <div className="flex gap-sm">
          <div className="flex-1">
            <Button
              label="Bỏ qua báo cáo"
              variant="outline"
              disabled={decide.isPending}
              onPress={() => setConfirmation('dismiss')}
            />
          </div>
          <div className="flex-1">
            <Button
              label="Ẩn nội dung"
              variant="danger"
              disabled={!data.contentExists || decide.isPending}
              onPress={() => setConfirmation('hide')}
            />
          </div>
        </div>
      ) : null}
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
