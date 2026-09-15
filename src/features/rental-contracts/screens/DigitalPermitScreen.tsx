import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { Card, Divider, ListRow, QrCode } from '@/components/common';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { ErrorState } from '@/components/feedback';
import { colors, spacing, typography } from '@/theme';
import { useMockDb } from '@/mocks/db';

export function DigitalPermitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const contract = useMockDb((s) => s.contracts.find((c) => c.id === id));
  const slot = useMockDb((s) => s.slots.find((sl) => sl.id === contract?.slotId));
  const permit = useMockDb((s) => s.permits.find((p) => p.contractId === id));

  if (!contract || !permit) return <ErrorState message="Không tìm thấy giấy phép." />;

  return (
    <Screen>
      <AppHeader title="Giấy phép số" back />
      <Card>
        <View style={{ alignItems: 'center', gap: spacing.sm }}>
          <StatusChip code={permit.permit_status} />
          <QrCode value={permit.permit_code} />
          <Text style={[typography.code, { color: colors.text }]}>{permit.permit_code}</Text>
        </View>
      </Card>
      <Card padded={false}>
        <View style={{ paddingHorizontal: spacing.md }}>
          <ListRow title="Ô cấp phép" subtitle={`${slot?.slot_code} · ${slot?.street}`} />
          <Divider />
          <ListRow title="Diện tích" subtitle={`${slot?.size_m2} m²`} />
          <Divider />
          <ListRow title="Khung giờ" subtitle={slot?.time_window} />
          <Divider />
          <ListRow
            title="Hiệu lực đến"
            subtitle={new Date(permit.expires_at).toLocaleDateString('vi-VN')}
          />
        </View>
      </Card>
    </Screen>
  );
}
