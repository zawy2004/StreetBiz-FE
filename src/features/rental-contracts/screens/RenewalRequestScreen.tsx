import { Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button, Card } from '@/components/common';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { ErrorState, showToast } from '@/components/feedback';
import { colors, spacing, typography } from '@/theme';
import { useMockDb } from '@/mocks/db';

const RENEW_MONTHS = 3;

export function RenewalRequestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const contract = useMockDb((s) => s.contracts.find((c) => c.id === id));
  const requestRenewal = useMockDb((s) => s.requestRenewal);

  if (!contract) return <ErrorState message="Không tìm thấy hợp đồng." />;

  const currentEnd = new Date(contract.end_date);
  const newEnd = new Date(currentEnd);
  newEnd.setMonth(newEnd.getMonth() + RENEW_MONTHS);

  const submit = () => {
    requestRenewal(contract.id, newEnd.toISOString());
    showToast('Đã gửi yêu cầu gia hạn');
    router.back();
  };

  return (
    <Screen
      footer={
        <StickyActions>
          <Button label="Gửi yêu cầu gia hạn" onPress={submit} />
        </StickyActions>
      }
    >
      <AppHeader title="Gia hạn hợp đồng" back />
      <Card>
        <Text style={[typography.bodyMd, { color: colors.muted }]}>Hết hạn hiện tại</Text>
        <Text style={[typography.headlineSm, { color: colors.text, marginBottom: spacing.sm }]}>
          {currentEnd.toLocaleDateString('vi-VN')}
        </Text>
        <Text style={[typography.bodyMd, { color: colors.muted }]}>
          Gia hạn thêm {RENEW_MONTHS} tháng, hết hạn mới
        </Text>
        <Text style={[typography.headlineSm, { color: colors.primary }]}>
          {newEnd.toLocaleDateString('vi-VN')}
        </Text>
      </Card>
    </Screen>
  );
}
