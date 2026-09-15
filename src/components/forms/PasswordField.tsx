import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { colors, radius, spacing, touchHeight, typography } from '@/theme';

type Props = {
  value: string;
  onChangeText: (value: string) => void;
  label?: string;
  error?: string;
  placeholder?: string;
};

export function PasswordField({
  value,
  onChangeText,
  label = 'Mật khẩu',
  error,
  placeholder,
}: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={{ gap: spacing['2xs'] }}>
      <Text style={[typography.label, { color: colors.text }]}>{label}</Text>
      <View style={[styles.row, { borderColor: error ? colors.error : colors.border }]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!visible}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          style={[typography.bodyLg, styles.input, { color: colors.text }]}
        />
        <Pressable
          onPress={() => setVisible((v) => !v)}
          accessibilityLabel={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          hitSlop={8}
        >
          <MaterialCommunityIcons
            name={visible ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={colors.muted}
          />
        </Pressable>
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
