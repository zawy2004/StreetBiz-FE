import { ActivityIndicator, View } from 'react-native';

import { colors, spacing } from '@/theme';

export function LoadingState() {
  return (
    <View style={{ paddingVertical: spacing.xl, alignItems: 'center' }}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}
