import { forwardRef } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

import { colors, radius, spacing, touchHeight, typography } from '@/theme';

type Props = TextInputProps & {
  label?: string;
  error?: string;
  helperText?: string;
};

export const TextField = forwardRef<TextInput, Props>(
  ({ label, error, helperText, style, ...rest }, ref) => {
    return (
      <View style={styles.wrap}>
        {label ? <Text style={[typography.label, { color: colors.text }]}>{label}</Text> : null}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.muted}
          style={[
            styles.input,
            typography.bodyLg,
            { color: colors.text, borderColor: error ? colors.error : colors.border },
            style,
          ]}
          {...rest}
        />
        {error ? (
          <Text style={[typography.bodySm, { color: colors.error }]}>{error}</Text>
        ) : helperText ? (
          <Text style={[typography.bodySm, { color: colors.muted }]}>{helperText}</Text>
        ) : null}
      </View>
    );
  },
);
TextField.displayName = 'TextField';

const styles = StyleSheet.create({
  wrap: {
    gap: spacing['2xs'],
  },
  input: {
    height: touchHeight,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.card,
  },
});
