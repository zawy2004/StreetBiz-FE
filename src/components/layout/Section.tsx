import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/theme';

type Props = {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
};

export function Section({ title, action, children }: Props) {
  return (
    <View style={{ gap: spacing.sm }}>
      {title ? (
        <View style={styles.header}>
          <Text style={[typography.headlineSm, { color: colors.text }]}>{title}</Text>
          {action}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
