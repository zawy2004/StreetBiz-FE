type Props<T extends string> = {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

/**
 * Pill tabs: the chosen one turns ink, like the lit item on a route board. A label is never cut
 * ("Tháng…"): the pills share the row while they fit, and on a narrow phone the row scrolls
 * sideways instead.
 */
export function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <div
      role="tablist"
      className="no-scrollbar flex w-full gap-1 overflow-x-auto rounded-[12px] border border-border bg-card p-1 sm:w-fit"
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
              'h-9 min-w-fit flex-1 whitespace-nowrap rounded-[9px] px-sm text-label transition-colors duration-150 sm:flex-none sm:px-md',
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
