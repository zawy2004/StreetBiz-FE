/**
 * Links that look like the shared `Button` (same colours, radius, press),
 * for calls to action that navigate. `lg` is the 56px hero size.
 */
const base =
  'inline-flex shrink-0 items-center justify-center gap-xs font-semibold transition-[background-color,box-shadow,color] duration-150 active:translate-y-px';

const sizes = {
  lg: 'h-14 rounded-[14px] px-lg text-[16px]',
  md: 'h-12 rounded-[12px] px-lg text-[15px]',
} as const;

const variants = {
  primary:
    'bg-primary text-on-primary shadow-[0_12px_24px_-14px_rgb(var(--c-primary)/0.95)] hover:bg-primary-pressed',
  outline: 'bg-card text-text ring-[1.5px] ring-inset ring-text hover:bg-sunken',
} as const;

export function ctaClass(
  variant: keyof typeof variants,
  size: keyof typeof sizes = 'md',
  extra = '',
): string {
  return [base, sizes[size], variants[variant], extra].join(' ');
}

/** An inline text link inside a card: orange, underlined on hover, 44px tall to tap. */
export const textLinkClass =
  'inline-flex min-h-11 w-fit items-center gap-xs rounded-[8px] text-[15px] font-semibold text-primary underline-offset-4 hover:underline';
