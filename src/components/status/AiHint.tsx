import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { colors, radius, spacing, tints, typography } from '@/theme';

type Props = {
  title: string;
  children?: ReactNode;
};

/**
 * Labelled AI-suggestion card. Advisory only — must never be the only path
 * to an approval/rejection/penalty action (see phase-boundary.md).
 */
export function AiHint({ title, children }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="creation" size={16} color={colors.tertiary} />
        <Text style={[typography.badge, { color: colors.onTertiary }]}>AI GỢI Ý</Text>
      </View>
      <Text style={[typography.headlineSm, { color: colors.text, marginTop: spacing['2xs'] }]}>
        {title}
      </Text>
      {children ? (
        <Text style={[typography.bodyMd, { color: colors.muted, marginTop: 2 }]}>{children}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: tints.tertiary,
    borderWidth: 1,
    borderColor: '#2D7D4633',
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
