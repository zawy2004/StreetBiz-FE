import { Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button, Card, Divider, ListRow, Money } from '@/components/common';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { ErrorState, showToast } from '@/components/feedback';
import { colors, spacing, typography } from '@/theme';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';

export function SlotDetailScreen() {
  const { slotId } = useLocalSearchParams<{ slotId: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const slot = useMockDb((s) => s.slots.find((sl) => sl.id === slotId));
  const submitRentalApplication = useMockDb((s) => s.submitRentalApplication);

  if (!slot) return <ErrorState message="Không tìm thấy ô." />;

  const apply = () => {
    if (!user?.vendorId) return;
    submitRentalApplication({
      vendorId: user.vendorId,
      slotIds: [slot.id],
      application_type: 'OPEN_SLOT',
    });
    showToast('Đã gửi đơn thuê ô');
    router.push('/vendor/slots/rental-applications');
  };

  return (
    <Screen
      footer={
        slot.slot_status === 'AVAILABLE' ? (
          <StickyActions>
            <Button label="Nộp đơn thuê ô này" onPress={apply} />
          </StickyActions>
        ) : undefined
      }
    >
      <AppHeader title={slot.slot_code} back subtitle={slot.street} />
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Money amountVnd={slot.price_monthly} size="lg" />
          <StatusChip code={slot.slot_status} />
        </View>
        <Text style={[typography.bodySm, { color: colors.muted }]}>mỗi tháng</Text>
      </Card>
      <Card padded={false}>
        <View style={{ paddingHorizontal: spacing.md }}>
          <ListRow title="Diện tích" subtitle={`${slot.size_m2} m²`} />
          <Divider />
          <ListRow title="Khung giờ hoạt động" subtitle={slot.time_window} />
          <Divider />
          <ListRow title="Tuyến đường" subtitle={slot.street} />
        </View>
      </Card>
    </Screen>
  );
}
