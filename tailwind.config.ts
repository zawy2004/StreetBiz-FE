import type { Config } from 'tailwindcss';
import { colors, tints } from './src/theme/colors';
import { spacing, radius } from './src/theme/spacing';
import { typography, fontFamily } from './src/theme/typography';
import { cardShadow, cardHoverShadow, sheetShadow } from './src/theme/shadows';

function px(value: number) {
  return `${value}px`;
}

function kebabCase(name: string) {
  return name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

const fontSize = Object.fromEntries(
  Object.entries(typography).map(([name, variant]) => [
    kebabCase(name),
    [
      px(variant.fontSize),
      {
        lineHeight: px(variant.lineHeight),
        fontWeight: String(variant.fontWeight),
        ...(variant.letterSpacing !== undefined
          ? { letterSpacing: px(variant.letterSpacing) }
          : {}),
      },
    ],
  ]),
) as Record<string, [string, Record<string, string>]>;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: colors.primary,
        'primary-pressed': colors.primaryPressed,
        'on-primary': colors.onPrimary,
        secondary: colors.secondary,
        'secondary-bg': colors.secondaryBg,
        'on-secondary': colors.onSecondary,
        tertiary: colors.tertiary,
        'on-tertiary': colors.onTertiary,
        indigo: colors.indigo,
        'on-indigo': colors.onIndigo,
        bg: colors.bg,
        card: colors.card,
        border: colors.border,
        muted: colors.muted,
        text: colors.text,
        gold: colors.gold,
        'gold-light': colors.goldLight,
        'gold-border': colors.goldBorder,
        error: colors.error,
        'error-bg': colors.errorBg,
        'tint-primary': tints.primary,
        'tint-secondary': tints.secondary,
        'tint-tertiary': tints.tertiary,
        'tint-indigo': tints.indigo,
        'tint-muted': tints.muted,
        'tint-gold': tints.gold,
      },
      spacing: Object.fromEntries(Object.entries(spacing).map(([k, v]) => [k, px(v)])),
      borderRadius: {
        sm: px(radius.sm),
        md: px(radius.md),
        lg: px(radius.lg),
        full: px(radius.full),
      },
      boxShadow: {
        card: cardShadow,
        'card-hover': cardHoverShadow,
        sheet: sheetShadow,
      },
      fontFamily: {
        sans: [fontFamily.body],
        serif: [fontFamily.display],
        display: [fontFamily.display],
        number: [fontFamily.number],
      },
      fontSize,
    },
  },
  plugins: [],
} satisfies Config;
