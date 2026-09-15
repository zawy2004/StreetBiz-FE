import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { Card, Divider, ListRow } from '@/components/common';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { ErrorState } from '@/components/feedback';
import { colors, spacing, typography } from '@/theme';
import { useMockDb } from '@/mocks/db';

export function RentalApplicationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const application = useMockDb((s) => s.applications.find((a) => a.id === id));
  const slots = useMockDb((s) => s.slots);

  if (!application) return <ErrorState message="Không tìm thấy đơn." />;

  return (
    <Screen>
      <AppHeader title="Chi tiết đơn thuê" back />
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={[typography.headlineSm, { color: colors.text }]}>
            {application.application_type === 'STOREFRONT_ADJACENT' ? 'Ô liền kề mặt tiền' : 'Ô mở'}
          </Text>
          <StatusChip code={application.application_status} />
        </View>
        <Text style={[typography.bodySm, { color: colors.muted, marginTop: 4 }]}>
          Nộp ngày {new Date(application.submitted_at).toLocaleDateString('vi-VN')}
        </Text>
      </Card>
      <Card padded={false}>
        <View style={{ paddingHorizontal: spacing.md }}>
          {application.slotIds.map((slotId, i) => {
            const slot = slots.find((s) => s.id === slotId);
            if (!slot) return null;
            return (
              <View key={slotId}>
                {i > 0 ? <Divider /> : null}
                <ListRow title={slot.slot_code} subtitle={`${slot.street} · ${slot.size_m2} m²`} />
              </View>
            );
          })}
        </View>
      </Card>
    </Screen>
  );
}
