/**
 * StreetBiz "Heritage Tech" palette — kept verbatim from the source design
 * system. Do not change these hex values without checking with the team;
 * see the streetbiz-fe-ui-decisions project memory for the rationale.
 */
export const colors = {
  primary: '#C84B31',
  primaryPressed: '#A6331B',
  onPrimary: '#FFFFFF',

  secondary: '#E09F3E',
  secondaryBg: '#FEB956',
  onSecondary: '#835500',

  tertiary: '#2D7D46',
  onTertiary: '#146935',

  indigo: '#1A2238',
  onIndigo: '#FFFFFF',

  bg: '#F8FAFC',
  card: '#FFFFFF',
  border: '#E2E8F0',
  muted: '#64748B',
  text: '#1A2238',

  error: '#BA1A1A',
  errorBg: '#FFDAD6',

  white: '#FFFFFF',
  black: '#000000',
} as const;

/** 8%-alpha tints of the three status/brand colors, for chip/card backgrounds. */
export const tints = {
  primary: '#C84B3114',
  secondary: '#E09F3E18',
  tertiary: '#2D7D4614',
  indigo: '#1A223814',
  muted: '#64748B14',
} as const;

/** Semantic status roles used by StatusChip and friends. */
export const statusTones = {
  ok: { fg: colors.tertiary, bg: tints.tertiary, border: '#2D7D4633' },
  pending: { fg: colors.onSecondary, bg: tints.secondary, border: '#E09F3E40' },
  danger: { fg: colors.primary, bg: tints.primary, border: '#C84B3133' },
  neutral: { fg: colors.muted, bg: tints.muted, border: colors.border },
} as const;

export type StatusTone = keyof typeof statusTones;
