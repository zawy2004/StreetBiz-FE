export type FilterChipOption<T extends string> = { value: T; label: string; count?: number };

type Props<T extends string> = {
  options: FilterChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function FilterChips<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <div role="tablist" className="no-scrollbar flex gap-xs overflow-x-auto py-0.5">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            role="tab"
            aria-selected={active}
            className={[
              'inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-md text-label transition-[background-color,box-shadow,color] duration-150',
              active
                ? 'bg-primary font-semibold text-on-primary shadow-[0_8px_18px_-10px_rgb(var(--c-primary)/0.8)]'
                : 'bg-card text-text shadow-card ring-1 ring-border hover:ring-text/25',
            ].join(' ')}
          >
            {opt.label}
            {opt.count !== undefined ? (
              <>
                <span className="sr-only">{` (${opt.count})`}</span>
                <span
                  aria-hidden="true"
                  className={[
                    'min-w-5 rounded-full px-1.5 py-0.5 text-center text-badge font-tabular',
                    active ? 'bg-white/25 text-on-primary' : 'bg-sunken text-muted',
                  ].join(' ')}
                >
                  {opt.count}
                </span>
              </>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
