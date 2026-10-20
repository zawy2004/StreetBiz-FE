/**
 * Three faces, each with one job (Design System v0):
 * - Be Vietnam Pro: the interface, drawn for Vietnamese so stacked diacritics
 *   (ặ, ỗ, ừ) sit cleanly at every size.
 * - Archivo: signage — slot codes, figures, operational headings; its width axis
 *   goes condensed for codes and wide for titles.
 * - Newsreader: editorial — dish names and buyer headings.
 * Headings that follow the role read `var(--font-heading)` (Tailwind `font-heading`).
 */
const ui = '"Be Vietnam Pro", "Be Vietnam Pro Fallback", system-ui, -apple-system, "Segoe UI", sans-serif';
const sign = '"Archivo", "Be Vietnam Pro", system-ui, sans-serif';
const editorial = '"Newsreader", "Newsreader Fallback", Georgia, "Times New Roman", serif';

export const fontFamily = {
  display: sign,
  body: ui,
  number: sign,
  sign,
  editorial,
} as const;

type Variant = {
  fontFamily: string;
  fontWeight: 400 | 500 | 600 | 650 | 700 | 750 | 800;
  fontSize: number;
  lineHeight: number;
  letterSpacing?: number;
};

export const typography: Record<string, Variant> = {
  displayXl: { fontFamily: sign, fontWeight: 700, fontSize: 52, lineHeight: 56, letterSpacing: -1.4 },
  displayLg: { fontFamily: sign, fontWeight: 700, fontSize: 40, lineHeight: 44, letterSpacing: -0.9 },
  displayMd: { fontFamily: sign, fontWeight: 700, fontSize: 28, lineHeight: 34, letterSpacing: -0.5 },
  headlineLg: { fontFamily: ui, fontWeight: 700, fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
  headlineMd: { fontFamily: ui, fontWeight: 650, fontSize: 18, lineHeight: 24, letterSpacing: -0.15 },
  headlineSm: { fontFamily: ui, fontWeight: 600, fontSize: 15, lineHeight: 22 },
  bodyLg: { fontFamily: ui, fontWeight: 400, fontSize: 16, lineHeight: 26 },
  bodyMd: { fontFamily: ui, fontWeight: 400, fontSize: 14, lineHeight: 22 },
  bodySm: { fontFamily: ui, fontWeight: 400, fontSize: 13, lineHeight: 19 },
  bodyXs: { fontFamily: ui, fontWeight: 400, fontSize: 12, lineHeight: 17 },
  label: { fontFamily: ui, fontWeight: 600, fontSize: 13, lineHeight: 18 },
  badge: { fontFamily: ui, fontWeight: 700, fontSize: 11.5, lineHeight: 14, letterSpacing: 0.4 },
  money: { fontFamily: sign, fontWeight: 700, fontSize: 17, lineHeight: 24, letterSpacing: -0.2 },
  moneyLg: { fontFamily: sign, fontWeight: 750, fontSize: 30, lineHeight: 36, letterSpacing: -0.6 },
  code: { fontFamily: sign, fontWeight: 650, fontSize: 13, lineHeight: 18, letterSpacing: 0.3 },
};
