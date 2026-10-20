import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, Icon, Spinner } from '@/components/common';
import { AppHeader, Screen, Section } from '@/components/layout';
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
import {
  InboxCounters,
  InboxSignposts,
  PriorityExplainer,
  QueueBoard,
  type BoardItem,
  type Counter,
} from '../components/review/InboxParts';

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
    setSelected((prev) =>
      prev.size === candidates.length ? new Set() : new Set(candidates.map((c) => c.id)),
    );

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

  const totalFee = candidates
    .filter((c) => selected.has(c.id))
    .reduce((sum, c) => sum + c.totalFee, 0);

  return (
    <section
      aria-labelledby="fast-track-title"
      className="sb-pop relative overflow-hidden rounded-[20px] bg-card shadow-sheet ring-1 ring-border"
    >
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[5px] bg-secondary" />
      <div className="flex flex-col gap-md p-md pl-lg md:p-lg md:pl-xl">
        <div className="flex flex-wrap items-start justify-between gap-sm">
          <div className="min-w-0 max-w-[70ch]">
            <h2
              id="fast-track-title"
              className="flex items-center gap-xs font-sign text-[19px] font-bold text-text"
            >
              <Icon
                name="creation"
                size={19}
                color="currentColor"
                weight="fill"
                className="text-on-secondary"
              />
              [AI] Duyệt nhanh hàng loạt
            </h2>
            <p className="mt-1 text-[14px] leading-[22px] text-muted">
              Chọn các hồ sơ gia hạn đủ điều kiện xét nhanh để phê duyệt cùng một lý do. Từng hồ sơ
              vẫn được kiểm tra điều kiện riêng như duyệt thủ công.
            </p>
          </div>
          <button
            type="button"
            onClick={toggleAll}
            className="min-h-11 whitespace-nowrap rounded-full bg-secondary-bg px-md text-body-sm font-semibold text-on-secondary transition-colors hover:bg-secondary/25"
          >
            {selected.size === candidates.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
          </button>
        </div>

        <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-[14px] ring-1 ring-border">
          {candidates.map((c) => (
            <li key={c.id}>
              <label className="flex min-h-12 cursor-pointer items-center gap-sm px-sm py-xs transition-colors hover:bg-sunken/60">
                <input
                  type="checkbox"
                  checked={selected.has(c.id)}
                  onChange={() => toggle(c.id)}
                  aria-label={`Chọn gia hạn ${c.vendorName} - ô ${c.slotCode}`}
                  className="h-5 w-5 shrink-0 accent-[rgb(var(--c-tertiary))]"
                />
                <span className="min-w-0 flex-1 truncate text-[14px] text-text">
                  {c.vendorName} - Gia hạn ô {c.slotCode} · +{c.requestedTermDays} ngày ·{' '}
                  {c.totalFee.toLocaleString('vi-VN')} đ
                </span>
              </label>
            </li>
          ))}
        </ul>

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Lý do phê duyệt chung (bắt buộc)"
          aria-label="Lý do phê duyệt chung (bắt buộc)"
          rows={2}
          className="input-shell w-full rounded-sm border border-border bg-card p-sm text-[16px] leading-6 text-text placeholder:text-muted/80"
        />

        {result ? (
          <p
            role="status"
            className="sb-pop flex items-center gap-xs rounded-[12px] bg-[#E6F6EC] px-sm py-xs text-[14px] font-semibold text-[#0B5D33] dark:bg-[#10301F] dark:text-[#8BE3B0]"
          >
            <Icon name="check-circle" size={18} color="currentColor" />
            Đã xử lý: {result.successCount} thành công, {result.failureCount} thất bại.
          </p>
        ) : null}

        <div className="flex flex-col gap-sm border-t border-border pt-md sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[14px] text-muted">
            Đã chọn{' '}
            <span className="font-sign font-bold text-text font-tabular">
              {selected.size}/{candidates.length}
            </span>{' '}
            · Tổng phí{' '}
            <span className="font-sign font-bold text-text font-tabular">
              {totalFee.toLocaleString('vi-VN')} đ
            </span>
          </p>
          <div className="sm:min-w-[220px]">
            <Button
              variant="approve"
              disabled={selected.size === 0 || !reason.trim() || submitting}
              onPress={submit}
              icon={submitting ? <Spinner size={16} /> : undefined}
              label={submitting ? 'Đang xử lý...' : `Duyệt ${selected.size || ''} hồ sơ`.trim()}
            />
          </div>
        </div>
      </div>
    </section>
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
  /** Display only: shown on the board, never used for ordering. */
  slotCode?: string;
  submittedAt?: string;
  slaDueAt?: string;
  isOverdue?: boolean;
};

const riskReasons = (item: QueueItem) =>
  item.riskBreakdown
    .map((b) => (typeof b === 'string' ? b : `${b.reason} (+${b.points}đ)`))
    .join(', ');

const toBoard = (item: QueueItem): BoardItem => ({
  key: item.key,
  category: item.category,
  title: item.title,
  subtitle: item.subtitle,
  status: item.status,
  riskScore: item.riskScore,
  reasons: item.riskBreakdown.length > 0 ? riskReasons(item) : '',
  slotCode: item.slotCode,
  submittedAt: item.submittedAt,
  slaDueAt: item.slaDueAt,
  isOverdue: item.isOverdue,
  onPress: item.onPress,
});

/** Chips stay in their own horizontal scroller; on desktop they stick while the board scrolls. */
function ChipRail({ children }: { children: ReactNode }) {
  return (
    <div className="min-w-0 max-w-full py-1 md:sticky md:top-0 md:z-10 md:-mx-xs md:bg-bg/85 md:px-xs md:backdrop-blur">
      {children}
    </div>
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
  const [category, setCategory] = useState<'ALL' | 'REG' | 'RENTAL' | 'RENEWAL' | 'FAST_RENEWAL'>(
    'ALL',
  );

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
      .then(
        ([
          enrollRes,
          pendingAppRes,
          reviewingAppRes,
          moreInfoAppRes,
          pendingRenewalRes,
          reviewingRenewalRes,
          riskRes,
        ]) => {
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
        },
      )
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
        submittedAt: r.createdAt,
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
      slotCode: a.slotCode,
      submittedAt: a.createdAt,
    }));

    const renewalItems: QueueItem[] = renewals.map((rn) => {
      const riskBreakdown: string[] = [];
      let riskScore = 0;
      if (rn.violationCount > 0) {
        riskScore += rn.violationCount * 20;
        riskBreakdown.push(
          `${rn.violationCount} vi phạm trong hợp đồng (+${rn.violationCount * 20}đ)`,
        );
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
        slotCode: rn.slotCode,
        submittedAt: rn.createdAt,
        slaDueAt: rn.slaDueAt,
        isOverdue: rn.isOverdue,
      };
    });

    return [...regItems, ...rentalAppItems, ...renewalItems].sort(
      (a, b) => b.riskScore - a.riskScore,
    );
  }, [enrollments, rentalApplications, renewals, riskQueue, navigate]);

  const visible =
    category === 'ALL'
      ? items
      : category === 'FAST_RENEWAL'
        ? items.filter((i) => i.category === 'RENEWAL' && i.fastTrack)
        : items.filter((i) => i.category === category);
  const regCount = items.filter((i) => i.category === 'REG').length;
  const rentalCount = items.filter((i) => i.category === 'RENTAL').length;
  const renewalCount = items.filter((i) => i.category === 'RENEWAL').length;
  const fastTrackRenewals = renewals.filter((r) => r.isFastTrackEligible);
  const fastRenewalCount = fastTrackRenewals.length;

  const counters: Counter[] = [
    { label: 'Đang chờ', value: items.length, tone: 'ink' },
    { label: 'Cần xem kỹ', value: items.filter((i) => i.riskScore > 0).length, tone: 'pending' },
    {
      label: 'Quá hạn xử lý',
      value: renewals.filter((r) => r.isOverdue).length,
      tone: 'danger',
      icon: 'timer-outline',
    },
    { label: '[AI] Xét nhanh', value: fastRenewalCount, tone: 'ai', icon: 'creation' },
  ];

  return (
    <Screen width="wide">
      <AppHeader title="Hộp duyệt" subtitle="Tất cả hồ sơ cần thẩm định & cấp phép" />

      <div className="grid items-start gap-md xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-lg">
        <InboxCounters counters={counters} loading={loading} />
        {isLiveApi ? (
          <InboxSignposts
            onSlots={() => navigate('/ward/inbox/reviews')}
            onFoodSafety={() => navigate('/ward/inbox/food-safety')}
          />
        ) : null}
      </div>

      <Section
        title="Hồ sơ đăng ký, cấp phép & gia hạn"
        description="Hồ sơ cần xem kỹ được xếp lên đầu."
        action={<PriorityExplainer live />}
      >
        <ChipRail>
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
        </ChipRail>

        {category === 'FAST_RENEWAL' ? (
          <FastTrackBatchPanel candidates={fastTrackRenewals} onDone={reload} />
        ) : null}

        <QueueBoard
          items={visible.map(toBoard)}
          loading={loading}
          emptyTitle="Không có hồ sơ cần xử lý"
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
              ? [
                  'Điểm bán từng có 1 biên bản nhắc nhở lấn chiếm hè phố (+40đ)',
                  'Tuyến đường trọng điểm trật tự đô thị (+20đ)',
                ]
              : [],
            onPress: () => navigate(`/ward/inbox/registrations/${r.id}`),
            submittedAt: r.submitted_at,
          };
        }),
      ...applications
        .filter((a) => a.application_status === 'PENDING')
        .map((a) => {
          const codes = a.slotIds.map((id) => slots.find((s) => s.id === id)?.slot_code);
          return {
            key: `APP-${a.id}`,
            category: 'RENTAL',
            title: codes.join(', ') || 'Đề nghị cấp phép',
            subtitle: 'Giấy phép sử dụng tạm thời hè phố (WARD-07/08)',
            status: a.application_status,
            riskScore: 0,
            riskBreakdown: [],
            onPress: () => navigate(`/ward/inbox/rental-applications/${a.id}`),
            slotCode: codes.length === 1 ? codes[0] : undefined,
            submittedAt: a.submitted_at,
          };
        }),
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
          submittedAt: r.requested_at,
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
          submittedAt: r.created_at,
        })),
    ];

    // Prioritize high-risk items at the top of the queue per Section 7.4
    return list.sort((a, b) => b.riskScore - a.riskScore);
  }, [registrations, applications, renewals, slots, reports, navigate]);

  const visible = category === 'ALL' ? items : items.filter((i) => i.category === category);
  const count = (c: Exclude<Category, 'ALL'>) => items.filter((i) => i.category === c).length;

  const counters: Counter[] = [
    { label: 'Đang chờ', value: items.length, tone: 'ink' },
    { label: 'Cần xem kỹ', value: items.filter((i) => i.riskScore > 0).length, tone: 'pending' },
    { label: 'Gia hạn', value: count('RENEWAL'), tone: 'ink', icon: 'history' },
    { label: 'Phản ánh', value: count('REPORT'), tone: 'danger', icon: 'flag-outline' },
  ];

  return (
    <Screen width="wide">
      <AppHeader title="Hộp duyệt" subtitle="Dữ liệu giả lập (không có Backend)" />
      <InboxCounters counters={counters} />
      <div className="flex flex-col gap-sm">
        <div className="flex flex-col gap-xs md:flex-row md:items-center md:justify-between">
          <ChipRail>
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
          </ChipRail>
          <PriorityExplainer live={false} />
        </div>
        <QueueBoard items={visible.map(toBoard)} emptyTitle="Không có việc cần xử lý" />
      </div>
    </Screen>
  );
}
