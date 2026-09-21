import { Icon, type IconName } from '@/components/common';
import { colors } from '@/theme';

type Tone = 'primary' | 'tertiary' | 'secondary' | 'indigo';

type Props = {
  label: string;
  value: string;
  /** One line under the value: what the number is out of, or what changed. */
  hint?: string;
  icon?: IconName;
  tone?: Tone;
  onPress?: () => void;
};

const toneColor: Record<Tone, string> = {
  primary: colors.primary,
  tertiary: colors.tertiary,
  secondary: colors.onSecondary,
  indigo: colors.indigo,
};

const toneTint: Record<Tone, string> = {
  primary: 'bg-tint-primary',
  tertiary: 'bg-tint-tertiary',
  secondary: 'bg-tint-secondary',
  indigo: 'bg-tint-indigo',
};

/** A single figure on a dashboard. Clickable when it leads to the list behind it. */
export function StatCard({ label, value, hint, icon, tone = 'indigo', onPress }: Props) {
  const content = (
    <>
      <div className="flex items-center justify-between gap-sm">
        <span className="text-body-sm text-muted">{label}</span>
        {icon ? (
          <span className={`flex h-8 w-8 items-center justify-center rounded-sm ${toneTint[tone]}`}>
            <Icon name={icon} size={18} color={toneColor[tone]} />
          </span>
        ) : null}
      </div>
      <span className="mt-xs block text-display-md font-tabular text-text">{value}</span>
      {hint ? <span className="mt-0.5 block text-body-sm text-muted">{hint}</span> : null}
    </>
  );

  const classes = 'rounded-md border border-border bg-card p-md text-left shadow-card';

  return onPress ? (
    <button
      type="button"
      onClick={onPress}
      className={`${classes} block w-full transition-[border-color,box-shadow] hover:border-muted/40 hover:shadow-card-hover`}
    >
      {content}
    </button>
  ) : (
    <div className={classes}>{content}</div>
  );
}
