type Props<T extends string> = {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

/** Pill tabs: the chosen one turns ink, like the lit item on a route board. */
export function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <div
      role="tablist"
      className="flex w-full gap-1 rounded-[12px] border border-border bg-card p-1 sm:w-fit"
    >
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
              'h-9 flex-1 truncate rounded-[9px] px-md text-label transition-colors duration-150 sm:flex-none',
              active
                ? 'bg-primary font-semibold text-on-primary shadow-card'
                : 'text-muted hover:bg-sunken hover:text-text',
            ].join(' ')}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
