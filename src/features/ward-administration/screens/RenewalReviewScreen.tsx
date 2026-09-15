import { Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button, Card } from '@/components/common';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { ErrorState, showToast } from '@/components/feedback';
import { colors, typography } from '@/theme';
import { useMockDb } from '@/mocks/db';

export function RenewalReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const renewal = useMockDb((s) => s.renewals.find((r) => r.id === id));
  const contract = useMockDb((s) => s.contracts.find((c) => c.id === renewal?.contractId));
  const slot = useMockDb((s) => s.slots.find((sl) => sl.id === contract?.slotId));
  const approveRenewal = useMockDb((s) => s.approveRenewal);

  if (!renewal) return <ErrorState message="Không tìm thấy yêu cầu gia hạn." />;

  return (
    <Screen
      footer={
        <StickyActions>
          <Button
            label="Duyệt gia hạn"
            variant="approve"
            onPress={() => {
              approveRenewal(renewal.id);
              showToast('Đã duyệt gia hạn');
              router.back();
            }}
          />
        </StickyActions>
      }
    >
      <AppHeader title="Duyệt gia hạn hợp đồng" back subtitle={slot?.slot_code} />
      <Card>
        <Text style={[typography.bodyMd, { color: colors.muted }]}>Hết hạn hiện tại</Text>
        <Text style={[typography.headlineSm, { color: colors.text }]}>
          {contract ? new Date(contract.end_date).toLocaleDateString('vi-VN') : '—'}
        </Text>
        <View style={{ height: 8 }} />
        <Text style={[typography.bodyMd, { color: colors.muted }]}>Hết hạn mới đề nghị</Text>
        <Text style={[typography.headlineSm, { color: colors.primary }]}>
          {new Date(renewal.new_end_date).toLocaleDateString('vi-VN')}
        </Text>
      </Card>
    </Screen>
  );
}
