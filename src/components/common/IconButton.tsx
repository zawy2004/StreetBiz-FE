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
};

export function IconButton({
  icon,
  onPress,
  size = 22,
  color = colors.text,
  background = colors.bg,
  accessibilityLabel,
  testID,
}: Props) {
  return (
    <button
      type="button"
      data-testid={testID}
      onClick={onPress}
      aria-label={accessibilityLabel}
      style={{ backgroundColor: background }}
      className="flex h-10 w-10 items-center justify-center rounded-full transition-opacity active:opacity-85"
    >
      <Icon name={icon} size={size} color={color} />
    </button>
  );
}
