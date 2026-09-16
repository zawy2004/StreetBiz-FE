export const fontFamily = {
  body: '"Be Vietnam Pro", system-ui, sans-serif',
  number: '"Plus Jakarta Sans", system-ui, sans-serif',
} as const;

type Variant = {
  fontFamily: string;
  fontWeight: 400 | 500 | 600 | 700;
  fontSize: number;
  lineHeight: number;
  letterSpacing?: number;
};

/** Type scale. Keep titles short — see simplification rules in memory. */
export const typography: Record<string, Variant> = {
  displayLg: { fontFamily: fontFamily.body, fontWeight: 700, fontSize: 32, lineHeight: 40 },
  headlineLg: { fontFamily: fontFamily.body, fontWeight: 600, fontSize: 22, lineHeight: 28 },
  headlineMd: { fontFamily: fontFamily.body, fontWeight: 600, fontSize: 18, lineHeight: 24 },
  headlineSm: { fontFamily: fontFamily.body, fontWeight: 600, fontSize: 16, lineHeight: 22 },
  bodyLg: { fontFamily: fontFamily.body, fontWeight: 400, fontSize: 16, lineHeight: 24 },
  bodyMd: { fontFamily: fontFamily.body, fontWeight: 400, fontSize: 14, lineHeight: 20 },
  bodySm: { fontFamily: fontFamily.body, fontWeight: 400, fontSize: 12, lineHeight: 16 },
  label: { fontFamily: fontFamily.body, fontWeight: 500, fontSize: 13, lineHeight: 18 },
  badge: {
    fontFamily: fontFamily.body,
    fontWeight: 700,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.4,
  },
  money: { fontFamily: fontFamily.number, fontWeight: 700, fontSize: 18, lineHeight: 24 },
  moneyLg: { fontFamily: fontFamily.number, fontWeight: 700, fontSize: 28, lineHeight: 34 },
  code: { fontFamily: fontFamily.number, fontWeight: 600, fontSize: 13, lineHeight: 18, letterSpacing: 0.5 },
};
