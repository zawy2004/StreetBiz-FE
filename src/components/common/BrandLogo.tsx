import Svg, { Circle, Rect } from 'react-native-svg';

import { colors } from '@/theme';

type Props = {
  size?: number;
};

/**
 * StreetBiz mark — a grid of sidewalk-slot squares wrapping a market stall
 * dot, recolored from the original blue/orange to the app palette (indigo
 * squares, terracotta dot). See streetbiz-fe-ui-decisions memory.
 */
export function BrandLogo({ size = 32 }: Props) {
  const s = size / 120;
  const sq = (x: number, y: number, w: number, h: number, r = 0) => (
    <Rect
      key={`${x}-${y}`}
      x={x * s}
      y={y * s}
      width={w * s}
      height={h * s}
      rx={r * s}
      fill={colors.indigo}
    />
  );

  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      {sq(4, 4, 22, 22, 4)}
      {sq(30, 4, 22, 22, 4)}
      {sq(4, 30, 22, 22, 4)}
      {sq(4, 56, 22, 22, 4)}
      {sq(4, 82, 22, 22, 4)}
      {sq(30, 82, 22, 22, 4)}
      {sq(56, 82, 22, 22, 4)}
      {sq(82, 82, 22, 22, 4)}
      {sq(82, 56, 22, 22, 4)}
      {sq(82, 30, 22, 22, 4)}
      <Circle cx={60} cy={60} r={28} fill={colors.primary} />
    </Svg>
  );
}
