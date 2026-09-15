import { Text, View } from 'react-native';

import { Card } from '@/components/common';
import { TextField } from '@/components/forms';
import { AppHeader, Screen } from '@/components/layout';
import { colors, spacing, typography } from '@/theme';
import { useMockDb } from '@/mocks/db';

export function PenaltyScheduleScreen() {
  const violationTypes = useMockDb((s) => s.violationTypes);
  const updateAmount = useMockDb((s) => s.updatePenaltyAmount);

  return (
    <Screen>
      <AppHeader title="Biểu phí phạt" back subtitle="Áp dụng cho toàn phường" />
      {violationTypes.map((vt) => (
        <Card key={vt.code}>
          <Text style={[typography.headlineSm, { color: colors.text, marginBottom: spacing.sm }]}>
            {vt.label}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <TextField
                value={String(vt.default_amount)}
                onChangeText={(v) => updateAmount(vt.code, Number(v) || 0)}
                keyboardType="numeric"
              />
            </View>
            <Text style={[typography.bodyMd, { color: colors.muted }]}>đ</Text>
          </View>
        </Card>
      ))}
    </Screen>
  );
}
