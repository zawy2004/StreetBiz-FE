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
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        background ? 'hover:opacity-90' : 'bg-sunken hover:bg-border',
      ].join(' ')}
    >
      <Icon name={icon} size={size} color={color} />
    </button>
  );
}
