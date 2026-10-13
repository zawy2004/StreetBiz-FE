type Props = {
  code: string | null | undefined;
  /** `lg` for the permit pass and signboards (30px), `md` for cards (24px). */
  size?: 'md' | 'lg';
  className?: string;
};

/**
 * The slot code at signboard size, as on the ward's permit pass (W14): condensed
 * signage figures on a light plate with an ink rule, legible at arm's length.
 * The small "Ô" says what the code is; a missing code shows "—".
 */
export function SlotPlate({ code, size = 'md', className = '' }: Props) {
  const big = size === 'lg';
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-[8px] bg-card px-sm leading-none text-text ring-[2.5px] ring-text ${big ? 'h-12' : 'h-10'} ${className}`}
    >
      <span className="font-sans text-[12px] font-semibold uppercase text-muted">Ô</span>
      <span
        className={`font-sign font-extrabold font-tabular tracking-[0.03em] [font-stretch:66%] ${big ? 'text-[30px]' : 'text-[24px]'}`}
      >
        {code || '—'}
      </span>
    </span>
  );
}
