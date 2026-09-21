/**
 * StreetBiz "Indochine Modern" palette — Di sản phố thị hiện đại.
 * Kết hợp giữa sắc đỏ đất nung, vàng hoàng cúc, xanh rêu trầm trên nền giấy dó ấm áp.
 */
export const colors = {
  primary: '#B84A39',
  primaryPressed: '#963526',
  onPrimary: '#FFFFFF',

  secondary: '#D99B26',
  secondaryBg: '#FDF6E9',
  onSecondary: '#784E07',

  tertiary: '#235347',
  onTertiary: '#112E27',

  indigo: '#1C232E',
  onIndigo: '#FDFBF7',

  bg: '#FBF9F5',
  card: '#FFFFFF',
  border: '#E8E2D5',
  muted: '#6D7580',
  text: '#181F28',

  gold: '#D99B26',
  goldLight: '#F7EEDB',
  goldBorder: '#D99B2633',

  error: '#BA1A1A',
  errorBg: '#FCEBEA',

  white: '#FFFFFF',
  black: '#000000',
} as const;

/** Tints of brand and status colors for chip and card backgrounds. */
export const tints = {
  primary: '#B84A3914',
  secondary: '#D99B2618',
  tertiary: '#23534718',
  indigo: '#1C232E14',
  muted: '#6D758014',
  gold: '#D99B2618',
} as const;

/** Semantic status roles used by StatusChip and friends. */
export const statusTones = {
  ok: { fg: colors.tertiary, bg: tints.tertiary, border: '#23534733' },
  pending: { fg: colors.onSecondary, bg: tints.secondary, border: '#D99B2640' },
  danger: { fg: colors.primary, bg: tints.primary, border: '#B84A3933' },
  neutral: { fg: colors.muted, bg: tints.muted, border: colors.border },
} as const;

export type StatusTone = keyof typeof statusTones;
