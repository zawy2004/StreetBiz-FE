import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Card } from '@/components/common';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { FilterChips } from '@/components/forms';
import { EmptyState } from '@/components/feedback';
import { colors, typography } from '@/theme';
import { useMockDb } from '@/mocks/db';

type Category =
  'ALL' | 'REG' | 'RENTAL' | 'RENEWAL' | 'PROPOSAL' | 'TRANSFER' | 'ADDRESS' | 'REPORT';

export function InboxScreen() {
  const router = useRouter();
  const registrations = useMockDb((s) => s.registrations);
  const applications = useMockDb((s) => s.applications);
  const renewals = useMockDb((s) => s.renewals);
  const slots = useMockDb((s) => s.slots);
  const transfers = useMockDb((s) => s.transfers);
  const addressChanges = useMockDb((s) => s.addressChanges);
  const reports = useMockDb((s) => s.reports);
  const [category, setCategory] = useState<Category>('ALL');

  const items = useMemo(() => {
    const list = [
      ...registrations
        .filter((r) => r.registration_status === 'UNDER_REVIEW')
        .map((r) => ({
          key: `REG-${r.id}`,
          category: 'REG' as const,
          title: r.business_name,
          subtitle: `Đăng ký · ${r.fast_track ? 'Ưu tiên xét nhanh' : 'Chờ duyệt'}`,
          status: r.registration_status,
          onPress: () => router.push(`/ward/inbox/registrations/${r.id}`),
        })),
      ...applications
        .filter((a) => a.application_status === 'PENDING')
        .map((a) => ({
          key: `APP-${a.id}`,
          category: 'RENTAL' as const,
          title: a.slotIds.map((id) => slots.find((s) => s.id === id)?.slot_code).join(', '),
          subtitle: 'Đơn thuê ô',
          status: a.application_status,
          onPress: () => router.push(`/ward/inbox/rental-applications/${a.id}`),
        })),
      ...renewals
        .filter((r) => r.renewal_status === 'PENDING')
        .map((r) => ({
          key: `REN-${r.id}`,
          category: 'RENEWAL' as const,
          title: `Gia hạn hợp đồng`,
          subtitle: r.contractId,
          status: r.renewal_status,
          onPress: () => router.push(`/ward/inbox/renewals/${r.id}`),
        })),
      ...slots
        .filter((s) => s.proposal_review_status === 'PENDING')
        .map((s) => ({
          key: `PROP-${s.id}`,
          category: 'PROPOSAL' as const,
          title: s.street,
          subtitle: 'Đề xuất ô mới',
          status: 'PENDING',
          onPress: () => router.push(`/ward/inbox/slot-proposals/${s.id}`),
        })),
      ...transfers
        .filter((t) => t.transfer_status === 'UNDER_REVIEW')
        .map((t) => ({
          key: `TRF-${t.id}`,
          category: 'TRANSFER' as const,
          title: 'Chuyển nhượng ô',
          subtitle: t.contractId,
          status: t.transfer_status,
          onPress: () => router.push(`/ward/inbox/slot-transfers/${t.id}`),
        })),
      ...addressChanges
        .filter((a) => a.change_status === 'PENDING')
        .map((a) => ({
          key: `ADDR-${a.id}`,
          category: 'ADDRESS' as const,
          title: 'Đổi địa chỉ kinh doanh',
          subtitle: a.new_address,
          status: a.change_status,
          onPress: () => router.push(`/ward/inbox/address-conflicts/${a.id}`),
        })),
      ...reports
        .filter((r) => r.report_status === 'PENDING')
        .map((r) => ({
          key: `RPT-${r.id}`,
          category: 'REPORT' as const,
          title: 'Phản ánh vi phạm',
          subtitle: r.reason,
          status: r.report_status,
          onPress: () => router.push(`/ward/inbox/vendor-reports/${r.id}`),
        })),
    ];
    return list;
  }, [registrations, applications, renewals, slots, transfers, addressChanges, reports, router]);

  const visible = category === 'ALL' ? items : items.filter((i) => i.category === category);
  const count = (c: Exclude<Category, 'ALL'>) => items.filter((i) => i.category === c).length;

  return (
    <Screen>
      <AppHeader title="Hộp duyệt" subtitle="Tất cả việc cần xử lý" />
      <FilterChips
        value={category}
        onChange={setCategory}
        options={[
          { value: 'ALL', label: 'Tất cả' },
          { value: 'REG', label: 'Đăng ký', count: count('REG') },
          { value: 'RENTAL', label: 'Thuê ô', count: count('RENTAL') },
          { value: 'RENEWAL', label: 'Gia hạn', count: count('RENEWAL') },
          { value: 'PROPOSAL', label: 'Đề xuất ô', count: count('PROPOSAL') },
          { value: 'TRANSFER', label: 'Chuyển nhượng', count: count('TRANSFER') },
          { value: 'ADDRESS', label: 'Đổi địa chỉ', count: count('ADDRESS') },
          { value: 'REPORT', label: 'Phản ánh', count: count('REPORT') },
        ]}
      />
      {visible.length === 0 ? (
        <EmptyState icon="check-circle-outline" title="Không có việc cần xử lý" />
      ) : (
        visible.map((item) => (
          <Card key={item.key} onPress={item.onPress}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[typography.headlineSm, { color: colors.text }]} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={[typography.bodySm, { color: colors.muted }]} numberOfLines={1}>
                  {item.subtitle}
                </Text>
              </View>
              <StatusChip code={item.status} />
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}
