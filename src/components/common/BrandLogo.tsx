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
  const sq = (x: number, y: number, w: number, h: number, r = 0, key?: string) => (
    <rect key={key ?? `${x}-${y}`} x={x} y={y} width={w} height={h} rx={r} fill={colors.indigo} />
  );

  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">
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
      <circle cx={60} cy={60} r={28} fill={colors.primary} />
    </svg>
  );
}
