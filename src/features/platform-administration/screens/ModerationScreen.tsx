import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { Money, type IconName } from '@/components/common';
import { EmptyState, ErrorState } from '@/components/feedback';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { useMediaQuery } from '@/hooks/useBreakpoint';
import { PlatformConnection } from '../components/PlatformConnection';
import { formatDay, prefersReducedMotion, waitSince, waitText } from '../components/admin-format';
import {
  QueueGroup,
  QueueSkeleton,
  QueueSummary,
  QueueTabs,
  QueueTicket,
  StatusCountChips,
  type Ticket,
} from '../components/QueueParts';
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

const CONTENT_ICON: Record<string, IconName> = {
  STOREFRONT: 'storefront-outline',
  MENU_ITEM: 'silverware-fork-knife',
  REVIEW: 'comment-outline',
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

  // Display only: a status chip narrows the list in memory (per tab, not saved anywhere).
  const [statusFilter, setStatusFilter] = useState<{ tab: Tab; status: string }>();
  const filter = statusFilter?.tab === tab ? statusFilter.status : undefined;
  const wide = useMediaQuery('(min-width: 1280px)');
  const [animate] = useState(() => !prefersReducedMotion());
  const now = Date.now();

  let tickets: Ticket[] = [];
  if (tab === 'CONTENT' && reports.data) {
    tickets = reports.data.items.map((report) => ({
      key: report.reportId,
      icon: CONTENT_ICON[report.contentType] ?? 'flag-outline',
      kind: CONTENT_LABEL[report.contentType] ?? report.contentType,
      title: report.contentTitle,
      status: report.status,
      body: report.reason,
      meta: (
        <>
          <span>
            <span className="text-muted">Người báo cáo: </span>
            {report.reporterName}
          </span>
          {!report.contentExists ? <StatusChip label="Không còn tồn tại" tone="danger" /> : null}
        </>
      ),
      needsAction: report.status === 'PENDING',
      wait: waitText(report.createdAt, now),
      waitDays: waitSince(report.createdAt, now)?.days ?? 0,
      createdAtMs: new Date(report.createdAt).getTime() || 0,
      doneOn: formatDay(report.reviewedAt),
      onPress: () => navigate(`/platform/moderation/content/${report.reportId}`),
    }));
  } else if (tab === 'COMPLAINTS' && complaints.data) {
    tickets = complaints.data.items.map((complaint) => ({
      key: complaint.complaintId,
      icon: 'receipt-text-outline',
      kind: complaint.orderCode,
      title: COMPLAINT_LABEL[complaint.complaintType] ?? complaint.complaintType,
      status: complaint.status,
      body: complaint.description,
      meta: (
        <>
          <span className="font-medium">{complaint.storefrontName}</span>
          <span className="text-muted">{complaint.customerName}</span>
          {complaint.requestedRefundAmount != null ? (
            <span className="flex items-center gap-1">
              <span className="text-muted">Yêu cầu hoàn</span>
              <Money
                amountVnd={complaint.requestedRefundAmount}
                className="!text-body-sm font-sign font-medium"
              />
            </span>
          ) : null}
        </>
      ),
      needsAction: complaint.status === 'OPEN' || complaint.status === 'UNDER_REVIEW',
      wait: waitText(complaint.createdAt, now),
      waitDays: waitSince(complaint.createdAt, now)?.days ?? 0,
      createdAtMs: new Date(complaint.createdAt).getTime() || 0,
      doneOn: formatDay(complaint.resolvedAt),
      onPress: () => navigate(`/platform/moderation/complaints/${complaint.complaintId}`),
    }));
  }

  const page = tab === 'CONTENT' ? reports.data : complaints.data;
  const statusCounts = Object.entries(
    tickets.reduce<Record<string, number>>((acc, t) => {
      acc[t.status] = (acc[t.status] ?? 0) + 1;
      return acc;
    }, {}),
  );
  const shown = filter ? tickets.filter((t) => t.status === filter) : tickets;
  const openTickets = shown.filter((t) => t.needsAction);
  const doneTickets = shown.filter((t) => !t.needsAction);
  const allOpen = tickets.filter((t) => t.needsAction);
  const longest = [...allOpen].sort((a, b) => a.createdAtMs - b.createdAtMs)[0];

  const summary = page ? (
    <QueueSummary
      open={allOpen.length}
      done={tickets.length - allOpen.length}
      longest={longest?.wait ?? null}
      shown={page.items.length}
      total={page.totalCount}
      layout={wide ? 'column' : 'band'}
    />
  ) : null;

  const renderTickets = (list: Ticket[], offset: number) => (
    <ul className="flex flex-col gap-sm">
      {list.map((ticket, i) => (
        <QueueTicket
          key={ticket.key}
          ticket={ticket}
          animate={animate && offset + i < 8}
          style={
            animate
              ? { animationDelay: `${Math.min(offset + i, 8) * 40}ms`, animationDuration: '220ms' }
              : undefined
          }
        />
      ))}
    </ul>
  );

  let body = null;
  if (active.isPending) body = <QueueSkeleton />;
  else if (active.isError) {
    body = (
      <ErrorState
        message={
          active.error instanceof PlatformApiError
            ? active.error.message
            : 'Không tải được hàng đợi kiểm duyệt.'
        }
        onRetry={() => active.refetch()}
      />
    );
  } else if (page && page.items.length === 0) {
    body =
      tab === 'CONTENT' ? (
        <EmptyState
          icon="flag-outline"
          title="Không có nội dung bị báo cáo"
          description="Báo cáo mới từ người mua sẽ hiện ở đây."
        />
      ) : (
        <EmptyState
          icon="chat-alert-outline"
          title="Không có khiếu nại nào"
          description="Khiếu nại đơn hàng mới sẽ hiện ở đây."
        />
      );
  } else if (page) {
    body = (
      <div key={`${tab}-${filter ?? 'all'}`} className="flex flex-col gap-lg">
        <QueueGroup title="Cần xử lý" count={openTickets.length}>
          {openTickets.length > 0 ? (
            renderTickets(openTickets, 0)
          ) : (
            <p className="rounded-[14px] bg-[#E6F6EC] px-md py-sm text-body-md font-medium text-[#0B5D33] dark:bg-[#10301F] dark:text-[#8BE3B0]">
              Đã xử lý hết. Không có mục nào đang chờ.
            </p>
          )}
        </QueueGroup>
        {doneTickets.length > 0 ? (
          <QueueGroup title="Đã xử lý" count={doneTickets.length}>
            {renderTickets(doneTickets, openTickets.length)}
          </QueueGroup>
        ) : null}
      </div>
    );
  }

  return (
    <Screen width="wide">
      <AppHeader title="Kiểm duyệt" subtitle="ADM-03 · ADM-04 · ADM-05" />
      <QueueTabs
        value={tab}
        onChange={setTab}
        options={[
          { value: 'CONTENT', label: 'Nội dung bị báo cáo', count: reports.data?.totalCount },
          { value: 'COMPLAINTS', label: 'Khiếu nại đơn hàng', count: complaints.data?.totalCount },
        ]}
      />
      {page && page.items.length > 0 ? (
        <StatusCountChips
          counts={statusCounts}
          active={filter}
          onToggle={(status) => setStatusFilter(filter === status ? undefined : { tab, status })}
        />
      ) : null}

      {wide && summary && page && page.items.length > 0 ? (
        <div className="grid items-start gap-lg xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">{body}</div>
          {summary}
        </div>
      ) : (
        <>
          {page && page.items.length > 0 ? summary : null}
          {body}
        </>
      )}
    </Screen>
  );
}
