import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import { colors, spacing, typography } from '@/theme';

type Props = {
  icon?: ComponentProps<typeof MaterialCommunityIcons>['name'];
  title: string;
  description?: string;
  action?: ReactNode;
};

export function EmptyState({ icon = 'inbox-outline', title, description, action }: Props) {
  return (
    <View style={styles.wrap}>
      <MaterialCommunityIcons name={icon} size={40} color={colors.muted} />
      <Text style={[typography.headlineSm, { color: colors.text, marginTop: spacing.sm }]}>
        {title}
      </Text>
      {description ? (
        <Text
          style={[typography.bodyMd, { color: colors.muted, textAlign: 'center', marginTop: 4 }]}
        >
          {description}
        </Text>
      ) : null}
      {action ? <View style={{ marginTop: spacing.md }}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
});
