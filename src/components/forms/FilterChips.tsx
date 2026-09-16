export type FilterChipOption<T extends string> = { value: T; label: string; count?: number };

type Props<T extends string> = {
  options: FilterChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function FilterChips<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <div className="flex gap-xs overflow-x-auto py-0.5">
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
              'h-9 shrink-0 truncate rounded-full border px-sm text-label transition-colors',
              active ? 'border-indigo bg-indigo text-white' : 'border-border bg-card text-text',
            ].join(' ')}
          >
            {opt.label}
            {opt.count !== undefined ? ` (${opt.count})` : ''}
          </button>
        );
      })}
    </div>
  );
}
