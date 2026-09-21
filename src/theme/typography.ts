/**
 * One family throughout: Be Vietnam Pro was drawn for Vietnamese, so stacked
 * diacritics (ặ, ỗ, ừ) sit cleanly at every size. Hierarchy comes from weight
 * and tracking, not from mixing typefaces.
 */
const family = '"Be Vietnam Pro", system-ui, -apple-system, "Segoe UI", sans-serif';

export const fontFamily = {
  display: family,
  body: family,
  number: family,
} as const;

type Variant = {
  fontFamily: string;
  fontWeight: 400 | 500 | 600 | 700 | 800;
  fontSize: number;
  lineHeight: number;
  letterSpacing?: number;
};

export const typography: Record<string, Variant> = {
  displayLg: { fontFamily: family, fontWeight: 800, fontSize: 32, lineHeight: 38, letterSpacing: -0.9 },
  displayMd: { fontFamily: family, fontWeight: 800, fontSize: 24, lineHeight: 30, letterSpacing: -0.5 },
  headlineLg: { fontFamily: family, fontWeight: 700, fontSize: 20, lineHeight: 28, letterSpacing: -0.3 },
  headlineMd: { fontFamily: family, fontWeight: 700, fontSize: 17, lineHeight: 24, letterSpacing: -0.15 },
  headlineSm: { fontFamily: family, fontWeight: 600, fontSize: 15, lineHeight: 22 },
  bodyLg: { fontFamily: family, fontWeight: 400, fontSize: 16, lineHeight: 24 },
  bodyMd: { fontFamily: family, fontWeight: 400, fontSize: 14, lineHeight: 21 },
  bodySm: { fontFamily: family, fontWeight: 400, fontSize: 12.5, lineHeight: 18 },
  bodyXs: { fontFamily: family, fontWeight: 400, fontSize: 11.5, lineHeight: 16 },
  label: { fontFamily: family, fontWeight: 500, fontSize: 13, lineHeight: 18 },
  badge: { fontFamily: family, fontWeight: 600, fontSize: 11.5, lineHeight: 14, letterSpacing: 0.1 },
  money: { fontFamily: family, fontWeight: 700, fontSize: 17, lineHeight: 24, letterSpacing: -0.2 },
  moneyLg: { fontFamily: family, fontWeight: 800, fontSize: 28, lineHeight: 34, letterSpacing: -0.6 },
  code: { fontFamily: family, fontWeight: 600, fontSize: 13, lineHeight: 18, letterSpacing: 0.2 },
};
