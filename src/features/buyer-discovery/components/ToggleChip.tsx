type Props = { label: string; active: boolean; onPress: () => void };

/** A filter chip that is either on or off; unlike FilterChips, several can be on at once. */
export function ToggleChip({ label, active, onPress }: Props) {
  return (
    <button
      type="button"
      onClick={onPress}
      aria-pressed={active}
      className={[
        'h-9 shrink-0 truncate rounded-full border px-md text-label transition-colors',
        active ? 'border-primary bg-tint-primary font-semibold text-primary' : 'border-border bg-card text-text hover:border-muted/50',
      ].join(' ')}
    >
      {label}
    </button>
  );
}
