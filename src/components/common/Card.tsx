import { ReactNode } from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';

import { cardShadow, colors, radius, spacing } from '@/theme';

type Props = {
  children: ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  padded?: boolean;
  testID?: string;
};

export function Card({ children, onPress, style, padded = true, testID }: Props) {
  const content = <View style={[styles.card, padded && styles.padded, style]}>{children}</View>;

  if (onPress) {
    return (
      <Pressable
        testID={testID}
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View testID={testID} style={undefined}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...cardShadow,
  },
  padded: {
    padding: spacing.md,
  },
});
