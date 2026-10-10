/**
 * StreetBiz palette — "Phố Việt Đương Đại" (Design System v0).
 *
 * Every token resolves through a CSS custom property (see src/index.css), so the
 * same `colors.primary` paints correctly in both light and dark mode, whether it
 * lands in a Tailwind class or an inline style. The raw hex values live in
 * `palette` for the few consumers that cannot read CSS variables (Leaflet path
 * options, the Goong map markers, the QR code renderer).
 */
const v = (name: string) => `rgb(var(--c-${name}))`;

export const colors = {
  primary: v('primary'),
  brand: v('brand'),
  primaryPressed: v('primary-pressed'),
  onPrimary: v('on-primary'),

  accent: v('accent'),
  onAccent: v('on-accent'),

  sign: v('sign'),
  onSign: v('on-sign'),
  kerb: v('kerb'),

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
  light: { primary: '#CF4A0B', brand: '#FF6A1F', tertiary: '#0B7F43', muted: '#566173', indigo: '#0A5FA8', ink: '#111C2B', accent: '#FFB703', kerb: '#FF6A1F' },
  dark: { primary: '#FF8A4C', brand: '#FF7A33', tertiary: '#4ED18A', muted: '#A7B3C0', indigo: '#7DB6F5', ink: '#EEF2F6', accent: '#FFC233', kerb: '#FF7A33' },
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
