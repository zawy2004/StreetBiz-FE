import { TextStyle } from 'react-native';

export const fontFamily = {
  body: 'BeVietnamPro_400Regular',
  bodyMedium: 'BeVietnamPro_500Medium',
  bodySemiBold: 'BeVietnamPro_600SemiBold',
  bodyBold: 'BeVietnamPro_700Bold',
  number: 'PlusJakartaSans_600SemiBold',
  numberBold: 'PlusJakartaSans_700Bold',
} as const;

type Variant = TextStyle & { fontFamily: string };

/** Type scale. Keep titles short — see simplification rules in memory. */
export const typography: Record<string, Variant> = {
  displayLg: { fontFamily: fontFamily.bodyBold, fontSize: 32, lineHeight: 40 },
  headlineLg: { fontFamily: fontFamily.bodySemiBold, fontSize: 22, lineHeight: 28 },
  headlineMd: { fontFamily: fontFamily.bodySemiBold, fontSize: 18, lineHeight: 24 },
  headlineSm: { fontFamily: fontFamily.bodySemiBold, fontSize: 16, lineHeight: 22 },
  bodyLg: { fontFamily: fontFamily.body, fontSize: 16, lineHeight: 24 },
  bodyMd: { fontFamily: fontFamily.body, fontSize: 14, lineHeight: 20 },
  bodySm: { fontFamily: fontFamily.body, fontSize: 12, lineHeight: 16 },
  label: { fontFamily: fontFamily.bodyMedium, fontSize: 13, lineHeight: 18 },
  badge: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.4,
  },
  money: { fontFamily: fontFamily.numberBold, fontSize: 18, lineHeight: 24 },
  moneyLg: { fontFamily: fontFamily.numberBold, fontSize: 28, lineHeight: 34 },
  code: { fontFamily: fontFamily.number, fontSize: 13, lineHeight: 18, letterSpacing: 0.5 },
};
