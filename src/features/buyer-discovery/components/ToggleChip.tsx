type Props = { label: string; active: boolean; onPress: () => void };

/** A filter chip that is either on or off; unlike FilterChips, several can be on at once. On = brand orange. */
export function ToggleChip({ label, active, onPress }: Props) {
  return (
    <button
      type="button"
      onClick={onPress}
      aria-pressed={active}
      className={[
        'h-11 shrink-0 truncate rounded-full px-md text-label transition-[background-color,box-shadow,color] duration-150',
        active
          ? 'bg-primary font-semibold text-on-primary shadow-[0_8px_20px_-8px_rgb(var(--c-primary)/0.7)]'
          : 'bg-card text-text shadow-card ring-1 ring-border hover:ring-text/25',
      ].join(' ')}
    >
      {label}
    </button>
  );
}
