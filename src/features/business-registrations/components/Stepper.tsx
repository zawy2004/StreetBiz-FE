import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/theme';

type Props = {
  step: number;
  total: number;
  label: string;
};

export function Stepper({ step, total, label }: Props) {
  return (
    <View style={{ gap: spacing['2xs'] }}>
      <View style={styles.track}>
        {Array.from({ length: total }, (_, i) => (
          <View
            key={i}
            style={[styles.segment, i < step ? { backgroundColor: colors.primary } : null]}
          />
        ))}
      </View>
      <Text style={[typography.bodySm, { color: colors.muted }]}>
        Bước {step}/{total} · {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', gap: 4 },
  segment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
});
