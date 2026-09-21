import type { Config } from 'tailwindcss';
import { spacing, radius } from './src/theme/spacing';
import { typography, fontFamily } from './src/theme/typography';
import { cardShadow, cardHoverShadow, sheetShadow } from './src/theme/shadows';

/** A colour token that keeps Tailwind's /opacity modifier working. */
function tw(name: string) {
  return `rgb(var(--c-${name}) / <alpha-value>)`;
}

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
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: tw('primary'),
        'primary-pressed': tw('primary-pressed'),
        'on-primary': tw('on-primary'),
        secondary: tw('secondary'),
        'secondary-bg': tw('secondary-bg'),
        'on-secondary': tw('on-secondary'),
        tertiary: tw('tertiary'),
        'on-tertiary': tw('on-tertiary'),
        indigo: tw('indigo'),
        'on-indigo': tw('on-indigo'),
        bg: tw('bg'),
        card: tw('card'),
        sunken: tw('sunken'),
        border: tw('border'),
        muted: tw('muted'),
        text: tw('text'),
        gold: tw('secondary'),
        'gold-light': tw('secondary-bg'),
        'gold-border': 'rgb(var(--c-secondary) / 0.3)',
        error: tw('error'),
        'error-bg': tw('error-bg'),
        'tint-primary': 'rgb(var(--c-primary) / 0.1)',
        'tint-secondary': 'rgb(var(--c-secondary) / 0.14)',
        'tint-tertiary': 'rgb(var(--c-tertiary) / 0.12)',
        'tint-indigo': 'rgb(var(--c-indigo) / 0.08)',
        'tint-muted': 'rgb(var(--c-muted) / 0.1)',
        'tint-gold': 'rgb(var(--c-secondary) / 0.14)',
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
