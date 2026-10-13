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
      <div className="flex items-start justify-between gap-sm">
        <span className="pt-0.5 text-body-sm font-medium text-muted">{label}</span>
        {icon ? (
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${toneTint[tone]}`}
          >
            <Icon name={icon} size={20} color={toneColor[tone]} weight="duotone" />
          </span>
        ) : null}
      </div>
      <span className="mt-sm block font-sign text-[34px] font-extrabold leading-none tracking-[-0.01em] font-tabular text-text [font-stretch:92%]">
        {value}
      </span>
      {hint ? <span className="mt-xs block text-body-sm text-muted">{hint}</span> : null}
    </>
  );

  const classes =
    'relative overflow-hidden rounded-[20px] bg-card p-md text-left shadow-card ring-1 ring-border/80';

  return onPress ? (
    <button
      type="button"
      onClick={onPress}
      className={`${classes} block w-full transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-card-hover`}
    >
      {content}
    </button>
  ) : (
    <div className={classes}>{content}</div>
  );
}
