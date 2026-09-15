import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button, Card } from '@/components/common';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { colors, spacing, statusTones, typography } from '@/theme';
import { useMockDb } from '@/mocks/db';

export function SlotOccupancyScreen() {
  const router = useRouter();
  const slots = useMockDb((s) => s.slots).filter((s) => s.proposal_review_status !== 'PENDING');

  return (
    <Screen>
      <AppHeader
        title="Lưới ô vỉa hè"
        right={
          <Button
            label="Cấu hình"
            variant="outline"
            fullWidth={false}
            onPress={() => router.push('/ward/slots/editor')}
          />
        }
      />
      {slots.map((slot) => {
        const tone =
          statusTones[
            slot.slot_status === 'AVAILABLE'
              ? 'ok'
              : slot.slot_status === 'RENTED'
                ? 'neutral'
                : 'pending'
          ];
        return (
          <Card key={slot.id} style={{ padding: 0, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row' }}>
              <View style={{ width: 6, backgroundColor: tone.fg }} />
              <View
                style={{
                  flex: 1,
                  padding: spacing.md,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                }}
              >
                <View>
                  <Text style={[typography.headlineSm, { color: colors.text }]}>
                    {slot.slot_code}
                  </Text>
                  <Text style={[typography.bodySm, { color: colors.muted }]}>{slot.street}</Text>
                </View>
                <StatusChip code={slot.slot_status} />
              </View>
            </View>
          </Card>
        );
      })}
    </Screen>
  );
}
