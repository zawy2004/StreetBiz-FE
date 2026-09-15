import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme';

type Props = {
  children: ReactNode;
};

/** Bottom-pinned action bar for the single primary (and optional secondary) action. */
export function StickyActions({ children }: Props) {
  return (
    <SafeAreaView edges={['bottom']} style={styles.wrap}>
      <View style={styles.row}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
});
