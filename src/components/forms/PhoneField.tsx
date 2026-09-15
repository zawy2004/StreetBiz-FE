import { StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radius, spacing, touchHeight, typography } from '@/theme';

type Props = {
  value: string;
  onChangeText: (value: string) => void;
  label?: string;
  error?: string;
};

export function PhoneField({ value, onChangeText, label = 'Số điện thoại', error }: Props) {
  return (
    <View style={{ gap: spacing['2xs'] }}>
      <Text style={[typography.label, { color: colors.text }]}>{label}</Text>
      <View style={[styles.row, { borderColor: error ? colors.error : colors.border }]}>
        <Text style={[typography.bodyLg, { color: colors.muted }]}>+84</Text>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType="phone-pad"
          placeholder="912 345 678"
          placeholderTextColor={colors.muted}
          style={[typography.bodyLg, styles.input, { color: colors.text }]}
        />
      </View>
      {error ? <Text style={[typography.bodySm, { color: colors.error }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    height: touchHeight,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  input: {
    flex: 1,
    height: '100%',
  },
});
