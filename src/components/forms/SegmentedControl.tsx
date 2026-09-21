type Props<T extends string> = {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

export function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <div role="tablist" className="flex w-full gap-1 rounded-sm bg-sunken p-1 sm:w-fit">
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
              'h-9 flex-1 truncate rounded-[6px] px-md text-label transition-colors sm:flex-none',
              active ? 'bg-card font-semibold text-text shadow-card' : 'text-muted hover:text-text',
            ].join(' ')}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
