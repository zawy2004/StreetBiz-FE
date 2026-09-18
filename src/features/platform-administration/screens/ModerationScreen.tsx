import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { Card } from '@/components/common';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { SegmentedControl } from '@/components/forms';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { PlatformConnection } from '../components/PlatformConnection';
import { platformApi, PlatformApiError } from '../platform-api';

type Tab = 'CONTENT' | 'COMPLAINTS';

const CONTENT_LABEL: Record<string, string> = {
  STOREFRONT: 'Gian hàng',
  MENU_ITEM: 'Món ăn',
  REVIEW: 'Đánh giá',
};

const COMPLAINT_LABEL: Record<string, string> = {
  COMPLAINT: 'Khiếu nại',
  REFUND_REQUEST: 'Yêu cầu hoàn tiền',
};

export function ModerationScreen() {
  return (
    <PlatformConnection>
      <ModerationContent />
    </PlatformConnection>
  );
}

function ModerationContent() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('CONTENT');
  const reports = useQuery({
    queryKey: ['platform', 'reported-content'],
    queryFn: () => platformApi.reportedContent(),
    enabled: tab === 'CONTENT',
  });
  const complaints = useQuery({
    queryKey: ['platform', 'order-complaints'],
    queryFn: () => platformApi.complaints(),
    enabled: tab === 'COMPLAINTS',
  });
  const active = tab === 'CONTENT' ? reports : complaints;

  return (
    <Screen>
      <AppHeader title="Kiểm duyệt" subtitle="ADM-03 · ADM-04 · ADM-05" />
      <SegmentedControl
        value={tab}
        onChange={setTab}
        options={[
          { value: 'CONTENT', label: 'Nội dung bị báo cáo' },
          { value: 'COMPLAINTS', label: 'Khiếu nại đơn hàng' },
        ]}
      />

      {active.isPending ? <LoadingState /> : null}
      {active.isError ? (
        <ErrorState
          message={
            active.error instanceof PlatformApiError
              ? active.error.message
              : 'Không tải được hàng đợi kiểm duyệt.'
          }
          onRetry={() => active.refetch()}
        />
      ) : null}

      {tab === 'CONTENT' && reports.data ? (
        reports.data.items.length === 0 ? (
          <EmptyState icon="flag-outline" title="Không có nội dung bị báo cáo" />
        ) : (
          reports.data.items.map((report) => (
            <Card
              key={report.reportId}
              onPress={() => navigate(`/platform/moderation/content/${report.reportId}`)}
            >
              <div className="flex items-start justify-between gap-sm">
                <div className="min-w-0 flex-1">
                  <span className="text-body-sm text-muted">
                    {CONTENT_LABEL[report.contentType] ?? report.contentType}
                  </span>
                  <span className="block truncate text-headline-sm text-text">
                    {report.contentTitle}
                  </span>
                </div>
                <StatusChip code={report.status} />
              </div>
              <p className="mt-1 line-clamp-2 text-body-md text-muted">{report.reason}</p>
            </Card>
          ))
        )
      ) : null}

      {tab === 'COMPLAINTS' && complaints.data ? (
        complaints.data.items.length === 0 ? (
          <EmptyState icon="chat-alert-outline" title="Không có khiếu nại nào" />
        ) : (
          complaints.data.items.map((complaint) => (
            <Card
              key={complaint.complaintId}
              onPress={() => navigate(`/platform/moderation/complaints/${complaint.complaintId}`)}
            >
              <div className="flex items-start justify-between gap-sm">
                <div className="min-w-0 flex-1">
                  <span className="text-body-sm text-muted">{complaint.orderCode}</span>
                  <span className="block truncate text-headline-sm text-text">
                    {COMPLAINT_LABEL[complaint.complaintType] ?? complaint.complaintType}
                  </span>
                </div>
                <StatusChip code={complaint.status} />
              </div>
              <p className="mt-1 line-clamp-2 text-body-md text-muted">{complaint.description}</p>
            </Card>
          ))
        )
      ) : null}
    </Screen>
  );
}
