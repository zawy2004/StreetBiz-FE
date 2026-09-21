/** 8pt spacing grid. */
export const spacing = {
  '2xs': 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
} as const;

/** Radius grows with the size of the surface: controls < cards < sheets. */
export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  full: 999,
} as const;

/** Minimum touch target height for outdoor / gloved-hand use. */
export const touchHeight = 48;
