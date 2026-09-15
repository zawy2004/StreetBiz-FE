import { Image, StyleSheet, Text, View } from 'react-native';

import { colors, radius, typography } from '@/theme';

type Props = {
  uri?: string;
  name: string;
  size?: number;
};

export function Avatar({ uri, name, size = 40 }: Props) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[styles.base, { width: size, height: size, borderRadius: size / 2 }]}
      />
    );
  }

  return (
    <View
      style={[styles.base, styles.fallback, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <Text style={[typography.headlineSm, { color: colors.onIndigo }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
  fallback: {
    backgroundColor: colors.indigo,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
});
