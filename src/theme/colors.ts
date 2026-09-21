/**
 * StreetBiz palette — "chợ vỉa hè" (sidewalk market).
 *
 * Every token resolves through a CSS custom property (see src/index.css), so the
 * same `colors.primary` paints correctly in both light and dark mode, whether it
 * lands in a Tailwind class or an inline style. The raw hex values live in
 * `palette` for the few consumers that cannot read CSS variables (Leaflet path
 * options, the QR code renderer).
 */
const v = (name: string) => `rgb(var(--c-${name}))`;

export const colors = {
  primary: v('primary'),
  primaryPressed: v('primary-pressed'),
  onPrimary: v('on-primary'),

  secondary: v('secondary'),
  secondaryBg: v('secondary-bg'),
  onSecondary: v('on-secondary'),

  tertiary: v('tertiary'),
  onTertiary: v('on-tertiary'),

  indigo: v('indigo'),
  onIndigo: v('on-indigo'),

  bg: v('bg'),
  card: v('card'),
  sunken: v('sunken'),
  border: v('border'),
  muted: v('muted'),
  text: v('text'),

  gold: v('secondary'),
  goldLight: v('secondary-bg'),
  goldBorder: 'rgb(var(--c-secondary) / 0.3)',

  error: v('error'),
  errorBg: v('error-bg'),

  white: '#FFFFFF',
  black: '#000000',
} as const;

/**
 * Raw values for renderers that write colours into SVG attributes or canvas,
 * where `var()` does not resolve. Keep in sync with src/index.css.
 */
export const palette = {
  light: { primary: '#E4441F', tertiary: '#0B8A4B', muted: '#676C75', indigo: '#1D2939' },
  dark: { primary: '#F2552F', tertiary: '#3CCB7F', muted: '#9AA2AC', indigo: '#DDE3EC' },
} as const;

/**
 * Same colour at a given opacity. Works on the `rgb(var(--c-x))` tokens above;
 * anything else goes through color-mix.
 */
export function alpha(color: string, opacity: number): string {
  if (color.endsWith('))')) return color.replace(/\)\)$/, `) / ${opacity})`);
  return `color-mix(in srgb, ${color} ${Math.round(opacity * 100)}%, transparent)`;
}

/** Tints of brand and status colors for chip and card backgrounds. */
export const tints = {
  primary: alpha(colors.primary, 0.1),
  secondary: alpha(colors.secondary, 0.14),
  tertiary: alpha(colors.tertiary, 0.12),
  indigo: alpha(colors.indigo, 0.08),
  muted: alpha(colors.muted, 0.1),
  gold: alpha(colors.secondary, 0.14),
} as const;

/** Semantic status roles used by StatusChip and friends. */
export const statusTones = {
  ok: { fg: colors.tertiary, bg: tints.tertiary, border: alpha(colors.tertiary, 0.25) },
  pending: { fg: colors.onSecondary, bg: tints.secondary, border: alpha(colors.secondary, 0.35) },
  danger: { fg: colors.error, bg: alpha(colors.error, 0.1), border: alpha(colors.error, 0.25) },
  neutral: { fg: colors.muted, bg: tints.muted, border: colors.border },
} as const;

export type StatusTone = keyof typeof statusTones;
