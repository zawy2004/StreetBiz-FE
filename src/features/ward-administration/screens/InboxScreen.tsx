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
import {
  complianceApi,
  type WardEnrollmentItem,
  type WardRentalApplicationItem,
  type WardRenewalItem,
  type WardRiskQueueItem,
} from '../ward-api';

/**
 * Idea 4 (WARD-09): lets an officer select several Fast-track-eligible renewals from the
 * queue and approve them in one call. Every selected item still runs through
 * DecideRenewalAsync's own preconditions on the backend -- this panel is a shortcut for
 * "click Approve N times with the same reason", never a way to skip a check.
 */
function FastTrackBatchPanel({
  candidates,
  onDone,
}: {
  candidates: WardRenewalItem[];
  onDone: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ successCount: number; failureCount: number } | null>(null);

  useEffect(() => {
    setSelected((prev) => new Set([...prev].filter((id) => candidates.some((c) => c.id === id))));
  }, [candidates]);

  if (candidates.length === 0) return null;

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelected((prev) => (prev.size === candidates.length ? new Set() : new Set(candidates.map((c) => c.id))));

  const submit = async () => {
    if (selected.size === 0 || !reason.trim()) return;
    setSubmitting(true);
    setResult(null);
    try {
      const items = candidates
        .filter((c) => selected.has(c.id))
        .map((c) => ({ renewalId: Number(c.id), expectedStatus: c.status }));
      const res = await complianceApi.batchDecideRenewals(items, 'APPROVE', reason.trim());
      setResult({ successCount: res.successCount, failureCount: res.failureCount });
      setSelected(new Set());
      setReason('');
      onDone();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <div className="flex items-center justify-between gap-sm">
        <div>
          <h2 className="text-headline-sm text-text">[AI] Duyệt nhanh hàng loạt</h2>
          <p className="text-body-sm text-muted">
            Chọn các hồ sơ gia hạn đủ điều kiện xét nhanh để phê duyệt cùng một lý do. Từng hồ sơ vẫn được kiểm tra điều
            kiện riêng như duyệt thủ công.
          </p>
        </div>
        <button
          type="button"
          onClick={toggleAll}
          className="whitespace-nowrap text-body-sm font-semibold text-on-secondary"
        >
          {selected.size === candidates.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
        </button>
      </div>

      <ul className="mt-sm divide-y divide-border">
        {candidates.map((c) => (
          <li key={c.id} className="flex items-center gap-sm py-xs">
            <input
              type="checkbox"
              checked={selected.has(c.id)}
              onChange={() => toggle(c.id)}
              aria-label={`Chọn gia hạn ${c.vendorName} - ô ${c.slotCode}`}
              className="h-4 w-4"
            />
            <span className="min-w-0 flex-1 truncate text-body-sm text-text">
              {c.vendorName} - Gia hạn ô {c.slotCode} · +{c.requestedTermDays} ngày ·{' '}
              {c.totalFee.toLocaleString('vi-VN')} đ
            </span>
          </li>
        ))}
      </ul>

      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Lý do phê duyệt chung (bắt buộc)"
        rows={2}
        className="mt-sm w-full rounded-md border border-border bg-sunken/40 p-sm text-body-sm text-text"
      />

      {result ? (
        <p className="mt-xs text-body-sm text-muted">
          Đã xử lý: {result.successCount} thành công, {result.failureCount} thất bại.
        </p>
      ) : null}

      <div className="mt-sm flex justify-end">
        <button
          type="button"
          disabled={selected.size === 0 || !reason.trim() || submitting}
          onClick={submit}
          className="rounded-md bg-primary px-md py-xs text-body-sm font-semibold text-on-primary disabled:opacity-40"
        >
          {submitting ? 'Đang xử lý...' : `Duyệt ${selected.size || ''} hồ sơ`.trim()}
        </button>
      </div>
    </Card>
  );
}

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
  fastTrack?: boolean;
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
  const [rentalApplications, setRentalApplications] = useState<WardRentalApplicationItem[]>([]);
  const [renewals, setRenewals] = useState<WardRenewalItem[]>([]);
  const [riskQueue, setRiskQueue] = useState<WardRiskQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<'ALL' | 'REG' | 'RENTAL' | 'RENEWAL' | 'FAST_RENEWAL'>('ALL');

  const reload = () => {
    setLoading(true);
    return Promise.allSettled([
      complianceApi.listEnrollments(),
      complianceApi.listRentalApplications('PENDING'),
      complianceApi.listRentalApplications('UNDER_REVIEW'),
      complianceApi.listRentalApplications('MORE_INFORMATION_REQUIRED'),
      complianceApi.listRenewals('PENDING'),
      complianceApi.listRenewals('UNDER_REVIEW'),
      complianceApi.riskQueue(),
    ])
      .then(([enrollRes, pendingAppRes, reviewingAppRes, moreInfoAppRes, pendingRenewalRes, reviewingRenewalRes, riskRes]) => {
        if (enrollRes.status === 'fulfilled') setEnrollments(enrollRes.value);
        const mergedApps = [
          ...(pendingAppRes.status === 'fulfilled' ? pendingAppRes.value : []),
          ...(reviewingAppRes.status === 'fulfilled' ? reviewingAppRes.value : []),
          ...(moreInfoAppRes.status === 'fulfilled' ? moreInfoAppRes.value : []),
        ];
        setRentalApplications([...new Map(mergedApps.map((item) => [item.id, item])).values()]);
        const mergedRenewals = [
          ...(pendingRenewalRes.status === 'fulfilled' ? pendingRenewalRes.value : []),
          ...(reviewingRenewalRes.status === 'fulfilled' ? reviewingRenewalRes.value : []),
        ];
        setRenewals([...new Map(mergedRenewals.map((item) => [item.id, item])).values()]);
        if (riskRes.status === 'fulfilled') setRiskQueue(riskRes.value);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    reload();
  }, []);

  const items: QueueItem[] = useMemo(() => {
    const regItems: QueueItem[] = enrollments.map((r) => {
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
    });

    const rentalAppItems: QueueItem[] = rentalApplications.map((a) => ({
      key: `RENTAL-${a.id}`,
      category: 'RENTAL',
      title: `${a.vendorName} - Xin thuê ô ${a.slotCode}`,
      subtitle: `${a.slotStreet} · +${a.requestedTermDays} ngày · ${a.pricePerDay.toLocaleString('vi-VN')} đ/ngày`,
      status: a.status,
      riskScore: 0,
      riskBreakdown: [],
      onPress: () => navigate(`/ward/inbox/rental-applications/${a.id}`),
    }));

    const renewalItems: QueueItem[] = renewals.map((rn) => {
      const riskBreakdown: string[] = [];
      let riskScore = 0;
      if (rn.violationCount > 0) {
        riskScore += rn.violationCount * 20;
        riskBreakdown.push(`${rn.violationCount} vi phạm trong hợp đồng (+${rn.violationCount * 20}đ)`);
      }
      if (rn.isOverdue) {
        riskScore += 100;
        riskBreakdown.push('Quá hạn xử lý theo NĐ 241/2026 (≤3 ngày làm việc) (+100đ)');
      }
      return {
        key: `REN-${rn.id}`,
        category: 'RENEWAL',
        title: `${rn.vendorName} - Gia hạn ô ${rn.slotCode}`,
        subtitle: `Hợp đồng #${rn.contractId} · +${rn.requestedTermDays} ngày · ${rn.totalFee.toLocaleString('vi-VN')} đ${rn.isFastTrackEligible ? ' · [AI] Xét nhanh' : ''}${rn.isOverdue ? ' · Quá hạn xử lý' : ''}`,
        status: rn.status,
        riskScore,
        fastTrack: rn.isFastTrackEligible,
        riskBreakdown,
        onPress: () => navigate(`/ward/inbox/renewals/${rn.id}`),
      };
    });

    return [...regItems, ...rentalAppItems, ...renewalItems].sort((a, b) => b.riskScore - a.riskScore);
  }, [enrollments, rentalApplications, renewals, riskQueue, navigate]);

  const visible = category === 'ALL'
    ? items
    : category === 'FAST_RENEWAL'
      ? items.filter((i) => i.category === 'RENEWAL' && i.fastTrack)
      : items.filter((i) => i.category === category);
  const regCount = items.filter((i) => i.category === 'REG').length;
  const rentalCount = items.filter((i) => i.category === 'RENTAL').length;
  const renewalCount = items.filter((i) => i.category === 'RENEWAL').length;
  const fastTrackRenewals = renewals.filter((r) => r.isFastTrackEligible);
  const fastRenewalCount = fastTrackRenewals.length;

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

      {category === 'FAST_RENEWAL' ? (
        <FastTrackBatchPanel candidates={fastTrackRenewals} onDone={reload} />
      ) : null}

      <Section title="Hồ sơ đăng ký, cấp phép & gia hạn" description="Hồ sơ cần xem kỹ được xếp lên đầu.">
        <QueueTable
          items={visible}
          loading={loading}
          emptyTitle="Không có hồ sơ cần xử lý"
          toolbar={
            <FilterChips
              value={category}
              onChange={setCategory}
              options={[
                { value: 'ALL', label: 'Tất cả' },
                { value: 'REG', label: 'Đăng ký điểm bán', count: regCount },
                { value: 'RENTAL', label: 'Cấp phép hè phố', count: rentalCount },
                { value: 'RENEWAL', label: 'Gia hạn', count: renewalCount },
                { value: 'FAST_RENEWAL', label: '[AI] Xét nhanh', count: fastRenewalCount },
              ]}
            />
          }
        />
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
