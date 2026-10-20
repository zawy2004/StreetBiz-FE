import { Card, Icon } from '@/components/common';
import type { IconName } from '@/components/common/Icon';
import { colors } from '@/theme';

type Props = {
  icon: IconName;
  title: string;
  subtitle: string;
  onPress: () => void;
  /** "primary" fills the row as the main action; "danger" marks one that ends something. */
  tone?: 'default' | 'primary' | 'danger';
  /** Draws the subtitle in the brand colour, for something waiting on the vendor. */
  attention?: boolean;
};

/** A tappable row with an icon: the way onward from a hub or a detail page. */
export function ActionRow({ icon, title, subtitle, onPress, tone = 'default', attention = false }: Props) {
  const filled = tone === 'primary';
  const iconColor = filled ? colors.onPrimary : tone === 'danger' ? colors.primary : colors.indigo;

  return (
    <Card onPress={onPress} style={filled ? { backgroundColor: colors.primary, borderColor: colors.primary } : undefined}>
      <div className="flex items-center gap-sm">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${filled ? 'bg-white/20' : tone === 'danger' ? 'bg-tint-primary' : 'bg-bg'}`}
        >
          <Icon name={icon} size={22} color={iconColor} />
        </span>
        <div className="min-w-0 flex-1">
          <p className={`text-headline-sm ${filled ? 'text-on-primary' : tone === 'danger' ? 'text-primary' : 'text-text'}`}>
            {title}
          </p>
          <p
            className={`truncate text-body-sm ${filled ? 'text-on-primary opacity-90' : attention ? 'font-semibold text-primary' : 'text-muted'}`}
          >
            {subtitle}
          </p>
        </div>
        <Icon name="chevron-right" size={22} color={filled ? colors.onPrimary : colors.muted} />
      </div>
    </Card>
  );
}
