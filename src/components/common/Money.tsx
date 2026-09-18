import { CSSProperties } from 'react';

import { colors } from '@/theme';
import { formatVnd } from './formatVnd';

type Props = {
  amountVnd: number;
  size?: 'md' | 'lg';
  color?: string;
  style?: CSSProperties;
  className?: string;
};

export function Money({ amountVnd, size = 'md', color = colors.text, style, className }: Props) {
  return (
    <span
      style={{ color, ...style }}
      className={`font-number font-tabular ${size === 'lg' ? 'text-money-lg' : 'text-money'} ${className ?? ''}`}
    >
      {formatVnd(amountVnd)}
    </span>
  );
}
