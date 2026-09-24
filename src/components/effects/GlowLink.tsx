import type { ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';

type Props = Omit<LinkProps, 'className' | 'children'> & {
  children: ReactNode;
  /** `glow` is the one primary call to action; `glass` sits beside it on dark heroes. */
  variant?: 'glow' | 'glass';
  size?: 'md' | 'lg';
  className?: string;
};

/**
 * Pill call-to-action link. The `glow` variant combines two ThreeUI Community
 * (MIT) patterns in plain CSS: Lumen CTA's gradient pill with a ring glyph and
 * inner highlight, and Spinning Border button's rotating conic edge. Styles
 * live in index.css under `.sb-glow` / `.sb-glass`.
 */
export function GlowLink({
  children,
  variant = 'glow',
  size = 'md',
  className = '',
  ...link
}: Props) {
  const sizing = size === 'lg' ? 'h-14 px-8 text-[16px]' : 'h-11 px-6 text-[14.5px]';

  if (variant === 'glass') {
    return (
      <Link
        {...link}
        className={`sb-glass inline-flex items-center justify-center gap-2.5 rounded-full font-semibold ${sizing} ${className}`}
      >
        {children}
      </Link>
    );
  }

  return (
    <Link {...link} className={`sb-glow group inline-flex rounded-full ${className}`}>
      <span aria-hidden="true" className="sb-glow__edge" />
      <span
        className={`sb-glow__fill inline-flex items-center justify-center gap-2.5 rounded-full font-semibold ${sizing}`}
      >
        {children}
        <i aria-hidden="true" className="sb-glow__ring" />
      </span>
    </Link>
  );
}
