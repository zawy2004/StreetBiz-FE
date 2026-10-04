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
              // 44px for a thumb on phones, the compact 36px where there is a pointer.
              'inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-md text-label transition-colors lg:h-9',
              active
                ? 'border-primary bg-tint-primary font-semibold text-primary-ink'
                : 'border-border bg-card text-text hover:border-muted/50',
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
                    active ? 'bg-primary-solid text-on-primary' : 'bg-sunken text-muted',
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
