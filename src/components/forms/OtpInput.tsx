import { createRef, useMemo } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { colors, radius, typography } from '@/theme';

type Props = {
  length?: number;
  value: string;
  onChangeText: (value: string) => void;
};

export function OtpInput({ length = 6, value, onChangeText }: Props) {
  const refs = useMemo(() => Array.from({ length }, () => createRef<TextInput>()), [length]);

  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  const setDigit = (index: number, digit: string) => {
    const clean = digit.replace(/[^0-9]/g, '').slice(-1);
    const next = digits.slice();
    next[index] = clean;
    onChangeText(next.join(''));
    if (clean && index < length - 1) {
      refs[index + 1]?.current?.focus();
    }
  };

  return (
    <View style={styles.row}>
      {digits.map((digit, index) => (
        <TextInput
          key={index}
          ref={refs[index]}
          value={digit}
          onChangeText={(t) => setDigit(index, t)}
          onKeyPress={({ nativeEvent }) => {
            if (nativeEvent.key === 'Backspace' && !digit && index > 0) {
              refs[index - 1]?.current?.focus();
            }
          }}
          keyboardType="number-pad"
          maxLength={1}
          style={[typography.headlineLg, styles.box, { color: colors.text }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  box: {
    width: 48,
    height: 56,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    textAlign: 'center',
    backgroundColor: colors.card,
  },
});
