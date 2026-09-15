import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { IconButton } from '@/components/common';
import { colors, spacing, typography } from '@/theme';

type Props = {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: ReactNode;
};

export function AppHeader({ title, subtitle, back, right }: Props) {
  const router = useRouter();

  return (
    <View style={styles.row}>
      {back ? (
        <IconButton icon="arrow-left" accessibilityLabel="Quay lại" onPress={() => router.back()} />
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={[typography.headlineLg, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[typography.bodyMd, { color: colors.muted }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
});
