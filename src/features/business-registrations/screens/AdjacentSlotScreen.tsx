import { Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button, Card, Money } from '@/components/common';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { EmptyState, ErrorState, showToast } from '@/components/feedback';
import { colors, spacing, typography } from '@/theme';
import { useMockDb } from '@/mocks/db';

export function AdjacentSlotScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const registration = useMockDb((s) => s.registrations.find((r) => r.id === id));
  const slots = useMockDb((s) => s.slots);
  const submitRentalApplication = useMockDb((s) => s.submitRentalApplication);

  if (!registration) return <ErrorState message="Không tìm thấy hồ sơ." />;

  // Demo auto-suggestion: nearest available slot on the same street.
  const suggested = slots.find((s) => s.slot_status === 'AVAILABLE');

  const submit = () => {
    if (!suggested) return;
    submitRentalApplication({
      vendorId: registration.vendorId,
      slotIds: [suggested.id],
      application_type: 'STOREFRONT_ADJACENT',
    });
    showToast('Đã gửi đơn thuê ô liền kề');
    router.replace('/vendor/slots/rental-applications');
  };

  return (
    <Screen
      footer={
        suggested ? (
          <StickyActions>
            <Button label="Gửi đơn thuê ô này" onPress={submit} />
          </StickyActions>
        ) : undefined
      }
    >
      <AppHeader title="Ô liền kề mặt tiền" back subtitle={registration.address} />
      {!suggested ? (
        <EmptyState
          icon="map-marker-off-outline"
          title="Chưa có ô liền kề khả dụng"
          description="Phường chưa số hoá ô liền kề tại địa chỉ này."
        />
      ) : (
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ gap: 4 }}>
              <Text style={[typography.headlineSm, { color: colors.text }]}>
                {suggested.slot_code}
              </Text>
              <Text style={[typography.bodyMd, { color: colors.muted }]}>{suggested.street}</Text>
              <Text style={[typography.bodySm, { color: colors.muted }]}>
                {suggested.size_m2} m² · {suggested.time_window}
              </Text>
            </View>
            <StatusChip code={suggested.slot_status} />
          </View>
          <View style={{ marginTop: spacing.sm }}>
            <Money amountVnd={suggested.price_monthly} size="lg" />
            <Text style={[typography.bodySm, { color: colors.muted }]}>mỗi tháng</Text>
          </View>
        </Card>
      )}
    </Screen>
  );
}
