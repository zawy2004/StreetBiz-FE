type Props = { label: string; active: boolean; onPress: () => void };

/** A filter chip that is either on or off; unlike FilterChips, several can be on at once. */
export function ToggleChip({ label, active, onPress }: Props) {
  return (
    <button
      type="button"
      onClick={onPress}
      aria-pressed={active}
      className={[
        'h-9 shrink-0 truncate rounded-full border px-sm text-label transition-colors',
        active ? 'border-indigo bg-indigo text-white' : 'border-border bg-card text-text',
      ].join(' ')}
    >
      {label}
    </button>
  );
}
