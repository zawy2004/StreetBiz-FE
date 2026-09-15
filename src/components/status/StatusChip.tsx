import { StyleSheet, Text, View } from 'react-native';

import { statusLabel } from '@/core/constants/status-labels';
import { radius, spacing, statusTones, typography, type StatusTone } from '@/theme';

type Props =
  | { code: string; label?: undefined; tone?: undefined }
  | { code?: undefined; label: string; tone: StatusTone };

export function StatusChip(props: Props) {
  const resolved =
    'tone' in props && props.tone
      ? { label: props.label, tone: props.tone }
      : statusLabel(props.code!);
  const { label, tone } = resolved;
  const colorsForTone = statusTones[tone];

  return (
    <View
      style={[
        styles.chip,
        { backgroundColor: colorsForTone.bg, borderColor: colorsForTone.border },
      ]}
    >
      <Text style={[typography.badge, { color: colorsForTone.fg }]} numberOfLines={1}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    height: 24,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
