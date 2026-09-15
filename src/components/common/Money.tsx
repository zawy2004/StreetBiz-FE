import { Text, TextStyle } from 'react-native';

import { colors, typography } from '@/theme';

type Props = {
  amountVnd: number;
  size?: 'md' | 'lg';
  color?: string;
  style?: TextStyle;
};

export function formatVnd(amount: number): string {
  return `${amount.toLocaleString('vi-VN')} đ`;
}

export function Money({ amountVnd, size = 'md', color = colors.text, style }: Props) {
  return (
    <Text style={[size === 'lg' ? typography.moneyLg : typography.money, { color }, style]}>
      {formatVnd(amountVnd)}
    </Text>
  );
}
