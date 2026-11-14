import { Icon, IconName } from './Icon';
import { colors } from '@/theme';

type Props = {
  icon: IconName;
  onPress?: () => void;
  size?: number;
  color?: string;
  background?: string;
  accessibilityLabel: string;
  testID?: string;
  disabled?: boolean;
  /**
   * A short visible word beside the icon (from the sm breakpoint up). An icon alone is a guess
   * for anything less universal than a bell or a back arrow.
   */
  label?: string;
};

export function IconButton({
  icon,
  onPress,
  size = 22,
  color = colors.text,
  background,
  accessibilityLabel,
  testID,
  disabled,
  label,
}: Props) {
  return (
    <button
      type="button"
      data-testid={testID}
      onClick={onPress}
      disabled={disabled}
      aria-label={accessibilityLabel}
      title={accessibilityLabel}
      style={background ? { backgroundColor: background } : undefined}
      className={[
        'flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        label ? 'min-w-11 sm:px-sm' : 'w-11',
        background ? 'hover:opacity-90' : 'bg-card ring-1 ring-border hover:bg-sunken',
      ].join(' ')}
    >
      <Icon name={icon} size={size} color={color} />
      {label ? (
        <span aria-hidden="true" className="hidden text-label font-semibold text-text sm:inline">
          {label}
        </span>
      ) : null}
    </button>
  );
}
