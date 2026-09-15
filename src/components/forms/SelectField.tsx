import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { colors, radius, spacing, touchHeight, typography } from '@/theme';

export type SelectOption<T extends string> = { value: T; label: string; description?: string };

type Props<T extends string> = {
  label?: string;
  value?: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  layout?: 'inline' | 'cards';
};

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  layout = 'cards',
}: Props<T>) {
  return (
    <View style={{ gap: spacing.xs }}>
      {label ? <Text style={[typography.label, { color: colors.text }]}>{label}</Text> : null}
      <View style={layout === 'cards' ? styles.cards : styles.inline}>
        {options.map((opt) => {
          const selected = opt.value === value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => onChange(opt.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={[
                layout === 'cards' ? styles.card : styles.pill,
                {
                  borderColor: selected ? colors.primary : colors.border,
                  backgroundColor: selected ? '#C84B3114' : colors.card,
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    typography.headlineSm,
                    { color: selected ? colors.primary : colors.text },
                  ]}
                >
                  {opt.label}
                </Text>
                {opt.description ? (
                  <Text style={[typography.bodySm, { color: colors.muted, marginTop: 2 }]}>
                    {opt.description}
                  </Text>
                ) : null}
              </View>
              {selected ? (
                <MaterialCommunityIcons name="check-circle" size={20} color={colors.primary} />
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cards: { gap: spacing.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  inline: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  pill: {
    height: touchHeight,
    borderWidth: 1.5,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    flexDirection: 'row',
  },
});
