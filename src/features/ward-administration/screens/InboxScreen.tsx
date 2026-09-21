import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Card } from '@/components/common';
import { AppHeader, Screen, Section } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { FilterChips } from '@/components/forms';
import { EmptyState } from '@/components/feedback';
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

function QueueCard({ item }: { item: QueueItem }) {
  return (
    <Card onPress={item.onPress}>
      <div className="flex flex-row justify-between gap-sm">
        <div className="flex flex-1 flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-headline-sm text-text">{item.title}</span>
            {item.riskScore > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-body-xs font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                <span>⚠</span>
                <span>Cần xem kỹ (+{item.riskScore}đ)</span>
              </span>
            ) : null}
          </div>
          <span className="truncate text-body-sm text-muted">{item.subtitle}</span>
          {item.riskBreakdown.length > 0 ? (
            <p className="mt-0.5 text-body-xs text-amber-700 dark:text-amber-400">
              Lý do: {item.riskBreakdown.map((b) => (typeof b === 'string' ? b : `${b.reason} (+${b.points}đ)`)).join(', ')}
            </p>
          ) : null}
        </div>
        <StatusChip code={item.status} />
      </div>
    </Card>
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
    <Screen>
      <AppHeader title="Hộp duyệt" subtitle="Tất cả hồ sơ cần thẩm định & cấp phép" />

      <Card onPress={() => navigate('/ward/inbox/reviews')}>
        <h2 className="text-headline-sm">Hồ sơ vị trí · Dữ liệu Backend (WARD-16/17/18)</h2>
        <p className="text-body-sm text-muted">
          Đề xuất ô, xung đột địa chỉ, chuyển nhượng và kiểm tra ranh giới
        </p>
      </Card>

      <Section title="Hồ sơ đăng ký điểm bán vỉa hè (WARD-04/05/06)">
        {loading ? (
          <div className="py-4 text-center text-body-sm text-muted">Đang đồng bộ hồ sơ từ máy chủ...</div>
        ) : items.length === 0 ? (
          <EmptyState icon="check-circle-outline" title="Không có hồ sơ đăng ký cần xử lý" />
        ) : (
          items.map((item) => <QueueCard key={item.key} item={item} />)
        )}
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
    <Screen>
      <AppHeader title="Hộp duyệt" subtitle="Dữ liệu giả lập (không có Backend)" />
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

      {visible.length === 0 ? (
        <EmptyState icon="check-circle-outline" title="Không có việc cần xử lý" />
      ) : (
        visible.map((item) => <QueueCard key={item.key} item={item} />)
      )}
    </Screen>
  );
}
