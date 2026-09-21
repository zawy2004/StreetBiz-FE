import { ReactNode, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Card, Icon } from '@/components/common';
import { DataTable, type Column } from '@/components/data';
import { colors } from '@/theme';
import { AppHeader, Screen, Section } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { FilterChips } from '@/components/forms';
import { isLiveApi } from '@/core/config/env';
import { useMockDb } from '@/mocks/db';
import { complianceApi, type WardEnrollmentItem, type WardRiskQueueItem } from '../ward-api';

/**
 * The ward's work queue.
 *
 * Against the backend, slot-side cases (proposals, conflicts, transfers) go through
 * WardCasesScreen, which reads the officer's real cases and decides on them through the
 * API. Business-registration review is a separate section here rather than a WardCasesScreen
 * kind: it goes through WardComplianceController's dedicated /ward/enrollments endpoints,
 * which enforce the BR-41 identity-verification gate (an officer must confirm they compared
 * the applicant against their physical CCCD before APPROVE succeeds) -- a gate the generic
 * case-decision endpoint has no way to enforce.
 *
 * The mock list below is the no-backend demo, and covers every review kind (registrations
 * included) since there is no gate to bypass without a real backend behind it.
 */
export function InboxScreen() {
  return isLiveApi ? <LiveInboxScreen /> : <MockInboxScreen />;
}

type QueueItem = {
  key: string;
  category: string;
  title: string;
  subtitle: string;
  status: string;
  riskScore: number;
  riskBreakdown: (string | { reason: string; points: number })[];
  onPress: () => void;
};

const CATEGORY_LABELS: Record<string, string> = {
  REG: 'Đăng ký điểm bán',
  RENTAL: 'Cấp phép hè phố',
  RENEWAL: 'Gia hạn',
  REPORT: 'Phản ánh',
};

const riskReasons = (item: QueueItem) =>
  item.riskBreakdown.map((b) => (typeof b === 'string' ? b : `${b.reason} (+${b.points}đ)`)).join(', ');

const QUEUE_COLUMNS: Column<QueueItem>[] = [
  {
    key: 'title',
    header: 'Hồ sơ',
    render: (item) => (
      <div className="min-w-0">
        <p className="truncate font-semibold text-text">{item.title}</p>
        <p className="truncate text-body-sm font-normal text-muted">{item.subtitle}</p>
        {item.riskBreakdown.length > 0 ? (
          <p className="mt-0.5 text-body-xs font-normal text-on-secondary">Lý do: {riskReasons(item)}</p>
        ) : null}
      </div>
    ),
  },
  {
    key: 'category',
    header: 'Loại',
    width: '170px',
    hideOnMobile: true,
    render: (item) => <span className="text-body-sm text-muted">{CATEGORY_LABELS[item.category] ?? item.category}</span>,
  },
  {
    key: 'risk',
    header: 'Mức ưu tiên',
    width: '190px',
    render: (item) =>
      item.riskScore > 0 ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-tint-secondary px-2 py-0.5 text-body-xs font-semibold text-on-secondary">
          Cần xem kỹ (+{item.riskScore}đ)
        </span>
      ) : (
        <span className="text-body-sm text-muted">Bình thường</span>
      ),
  },
  { key: 'status', header: 'Trạng thái', width: '150px', render: (item) => <StatusChip code={item.status} /> },
];

type QueueTableProps = { items: QueueItem[]; loading?: boolean; emptyTitle: string; toolbar?: ReactNode };

function QueueTable({ items, loading, emptyTitle, toolbar }: QueueTableProps) {
  return (
    <DataTable
      caption="Hồ sơ cần xử lý"
      rows={items}
      columns={QUEUE_COLUMNS}
      rowKey={(item) => item.key}
      rowLabel={(item) => `Mở hồ sơ ${item.title}`}
      onRowClick={(item) => item.onPress()}
      loading={loading}
      toolbar={toolbar}
      empty={{
        icon: 'check-circle-outline',
        title: emptyTitle,
        description: 'Hồ sơ mới sẽ hiện ở đây ngay khi được nộp.',
      }}
    />
  );
}

/** Live: registration review queue, sourced from the same /ward/enrollments the officer
 * decides through (RegistrationReviewScreen), plus a link into WardCasesScreen for the
 * slot-side kinds. */
function LiveInboxScreen() {
  const navigate = useNavigate();
  const [enrollments, setEnrollments] = useState<WardEnrollmentItem[]>([]);
  const [riskQueue, setRiskQueue] = useState<WardRiskQueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([complianceApi.listEnrollments(), complianceApi.riskQueue()])
      .then(([enrollRes, riskRes]) => {
        if (enrollRes.status === 'fulfilled') setEnrollments(enrollRes.value);
        if (riskRes.status === 'fulfilled') setRiskQueue(riskRes.value);
      })
      .finally(() => setLoading(false));
  }, []);

  const items: QueueItem[] = useMemo(
    () =>
      enrollments
        .map((r) => {
          const risk = riskQueue.find((q) => q.registrationId === r.id);
          return {
            key: `REG-${r.id}`,
            category: 'REG',
            title: r.displayName || r.ownerName || `Hồ sơ #${r.id}`,
            subtitle: `Đăng ký điểm bán · ${r.vendorType === 'FIXED_STOREFRONT' ? 'Cửa hàng cố định' : 'Hàng rong lưu động'}${r.fastTrack ? ' · Ưu tiên xét nhanh' : ''}`,
            status: r.status,
            riskScore: risk?.score ?? 0,
            riskBreakdown: risk?.breakdown ?? [],
            onPress: () => navigate(`/ward/inbox/registrations/${r.id}`),
          };
        })
        .sort((a, b) => b.riskScore - a.riskScore),
    [enrollments, riskQueue, navigate],
  );

  return (
    <Screen width="wide">
      <AppHeader title="Hộp duyệt" subtitle="Tất cả hồ sơ cần thẩm định & cấp phép" />

      <Card onPress={() => navigate('/ward/inbox/reviews')}>
        <div className="flex items-center justify-between gap-sm">
          <div className="min-w-0">
            <h2 className="text-headline-sm text-text">Hồ sơ vị trí</h2>
            <p className="text-body-sm text-muted">Đề xuất ô, xung đột địa chỉ, chuyển nhượng và kiểm tra ranh giới</p>
          </div>
          <Icon name="chevron-right" size={20} color={colors.muted} />
        </div>
      </Card>

      <Section title="Hồ sơ đăng ký điểm bán vỉa hè" description="Hồ sơ cần xem kỹ được xếp lên đầu.">
        <QueueTable items={items} loading={loading} emptyTitle="Không có hồ sơ đăng ký cần xử lý" />
      </Section>
    </Screen>
  );
}

type Category = 'ALL' | 'REG' | 'RENTAL' | 'RENEWAL' | 'REPORT';

function MockInboxScreen() {
  const navigate = useNavigate();
  const registrations = useMockDb((s) => s.registrations);
  const applications = useMockDb((s) => s.applications);
  const renewals = useMockDb((s) => s.renewals);
  const slots = useMockDb((s) => s.slots);
  const reports = useMockDb((s) => s.reports);
  const [category, setCategory] = useState<Category>('ALL');

  const items: QueueItem[] = useMemo(() => {
    const list: QueueItem[] = [
      ...registrations
        .filter((r) => r.registration_status === 'UNDER_REVIEW')
        .map((r) => {
          // In mock mode, provide a sample risk score for testing
          const isDemoHighRisk = r.id === 'REG-002';
          return {
            key: `REG-${r.id}`,
            category: 'REG',
            title: r.business_name,
            subtitle: `Đăng ký điểm bán · ${r.fast_track ? 'Ưu tiên xét nhanh' : 'Chờ thẩm định'}`,
            status: r.registration_status,
            riskScore: isDemoHighRisk ? 60 : 0,
            riskBreakdown: isDemoHighRisk
              ? ['Điểm bán từng có 1 biên bản nhắc nhở lấn chiếm hè phố (+40đ)', 'Tuyến đường trọng điểm trật tự đô thị (+20đ)']
              : [],
            onPress: () => navigate(`/ward/inbox/registrations/${r.id}`),
          };
        }),
      ...applications
        .filter((a) => a.application_status === 'PENDING')
        .map((a) => ({
          key: `APP-${a.id}`,
          category: 'RENTAL',
          title: a.slotIds.map((id) => slots.find((s) => s.id === id)?.slot_code).join(', ') || 'Đề nghị cấp phép',
          subtitle: 'Giấy phép sử dụng tạm thời hè phố (WARD-07/08)',
          status: a.application_status,
          riskScore: 0,
          riskBreakdown: [],
          onPress: () => navigate(`/ward/inbox/rental-applications/${a.id}`),
        })),
      ...renewals
        .filter((r) => r.renewal_status === 'PENDING')
        .map((r) => ({
          key: `REN-${r.id}`,
          category: 'RENEWAL',
          title: 'Gia hạn giấy phép sử dụng hè phố',
          subtitle: `Hợp đồng #${r.contractId}`,
          status: r.renewal_status,
          riskScore: 0,
          riskBreakdown: [],
          onPress: () => navigate(`/ward/inbox/renewals/${r.id}`),
        })),
      ...reports
        .filter((r) => r.report_status === 'PENDING')
        .map((r) => ({
          key: `RPT-${r.id}`,
          category: 'REPORT',
          title: 'Phản ánh vi phạm hiện trường',
          subtitle: r.reason,
          status: r.report_status,
          riskScore: 0,
          riskBreakdown: [],
          onPress: () => navigate(`/ward/inbox/vendor-reports/${r.id}`),
        })),
    ];

    // Prioritize high-risk items at the top of the queue per Section 7.4
    return list.sort((a, b) => b.riskScore - a.riskScore);
  }, [registrations, applications, renewals, slots, reports, navigate]);

  const visible = category === 'ALL' ? items : items.filter((i) => i.category === category);
  const count = (c: Exclude<Category, 'ALL'>) => items.filter((i) => i.category === c).length;

  return (
    <Screen width="wide">
      <AppHeader title="Hộp duyệt" subtitle="Dữ liệu giả lập (không có Backend)" />
      <QueueTable
        items={visible}
        emptyTitle="Không có việc cần xử lý"
        toolbar={
          <FilterChips
            value={category}
            onChange={setCategory}
            options={[
              { value: 'ALL', label: 'Tất cả' },
              { value: 'REG', label: 'Điểm bán', count: count('REG') },
              { value: 'RENTAL', label: 'Cấp phép hè phố', count: count('RENTAL') },
              { value: 'RENEWAL', label: 'Gia hạn', count: count('RENEWAL') },
              { value: 'REPORT', label: 'Phản ánh', count: count('REPORT') },
            ]}
          />
        }
      />
    </Screen>
  );
}
