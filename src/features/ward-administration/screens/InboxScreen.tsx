import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Card } from '@/components/common';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { FilterChips } from '@/components/forms';
import { EmptyState } from '@/components/feedback';
import { isLiveApi } from '@/core/config/env';
import { useMockDb } from '@/mocks/db';
import { WardCasesScreen } from './WardCasesScreen';

/**
 * The ward's work queue.
 *
 * Against the backend this is WardCasesScreen, which reads the officer's real
 * cases (registrations, proposals, conflicts, transfers) and decides on them
 * through the API. The mock list below is the no-backend demo, and covers the
 * review kinds that have no live queue yet - rental applications, renewals and
 * vendor reports.
 */
export function InboxScreen() {
  return isLiveApi ? <WardCasesScreen /> : <MockInboxScreen />;
}

type Category = 'ALL' | 'RENTAL' | 'RENEWAL' | 'REPORT';

function MockInboxScreen() {
  const navigate = useNavigate();
  const applications = useMockDb((s) => s.applications);
  const renewals = useMockDb((s) => s.renewals);
  const slots = useMockDb((s) => s.slots);
  const reports = useMockDb((s) => s.reports);
  const [category, setCategory] = useState<Category>('ALL');

  const items = useMemo(() => {
    const list = [
      ...applications
        .filter((a) => a.application_status === 'PENDING')
        .map((a) => ({
          key: `APP-${a.id}`,
          category: 'RENTAL' as const,
          title: a.slotIds.map((id) => slots.find((s) => s.id === id)?.slot_code).join(', '),
          subtitle: 'Đơn thuê ô',
          status: a.application_status,
          onPress: () => navigate(`/ward/inbox/rental-applications/${a.id}`),
        })),
      ...renewals
        .filter((r) => r.renewal_status === 'PENDING')
        .map((r) => ({
          key: `REN-${r.id}`,
          category: 'RENEWAL' as const,
          title: `Gia hạn hợp đồng`,
          subtitle: r.contractId,
          status: r.renewal_status,
          onPress: () => navigate(`/ward/inbox/renewals/${r.id}`),
        })),
      ...reports
        .filter((r) => r.report_status === 'PENDING')
        .map((r) => ({
          key: `RPT-${r.id}`,
          category: 'REPORT' as const,
          title: 'Phản ánh vi phạm',
          subtitle: r.reason,
          status: r.report_status,
          onPress: () => navigate(`/ward/inbox/vendor-reports/${r.id}`),
        })),
    ];
    return list;
  }, [applications, renewals, slots, reports, navigate]);

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
          { value: 'RENTAL', label: 'Thuê ô', count: count('RENTAL') },
          { value: 'RENEWAL', label: 'Gia hạn', count: count('RENEWAL') },
          { value: 'REPORT', label: 'Phản ánh', count: count('REPORT') },
        ]}
      />
      {visible.length === 0 ? (
        <EmptyState icon="check-circle-outline" title="Không có việc cần xử lý" />
      ) : (
        visible.map((item) => (
          <Card key={item.key} onPress={item.onPress}>
            <div className="flex flex-row justify-between">
              <div className="flex flex-1 flex-col gap-1">
                <span className="truncate text-headline-sm text-text">{item.title}</span>
                <span className="truncate text-body-sm text-muted">{item.subtitle}</span>
              </div>
              <StatusChip code={item.status} />
            </div>
          </Card>
        ))
      )}
    </Screen>
  );
}
