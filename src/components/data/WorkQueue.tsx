import { Button, Icon, type IconName } from '@/components/common';
import { statusTones, type StatusTone } from '@/theme';

export type WorkItem = {
  key: string;
  icon: IconName;
  /** `danger` when it is overdue or blocking, `pending` when waiting, `neutral` when clear. */
  tone: StatusTone;
  label: string;
  /** The figure that matters, already formatted ("3", "750.000 đ"). */
  value: string;
  hint?: string;
  action?: { label: string; onPress: () => void };
};

type Props = {
  items: WorkItem[];
  /** Which item gets the screen's one filled (chili) button; the rest are outline. */
  primaryKey?: string;
};

/**
 * A desk worklist: what is waiting on the officer or administrator, as dense
 * rows with the figure and the way in side by side. Clear items stay in place,
 * muted, so the list never reshuffles under the reader.
 */
export function WorkQueue({ items, primaryKey }: Props) {
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-md border border-border bg-card shadow-card">
      {items.map((item) => {
        const tone = statusTones[item.tone];
        return (
          <li key={item.key} className="flex flex-wrap items-center gap-x-md gap-y-xs px-md py-sm">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm"
              style={{ backgroundColor: tone.bg }}
            >
              <Icon name={item.icon} size={22} color={tone.fg} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-body-md text-muted">{item.label}</p>
              <p className="flex flex-wrap items-baseline gap-x-xs">
                <span className="font-tabular text-display-md text-text">{item.value}</span>
                {item.hint ? <span className="text-body-sm text-muted">{item.hint}</span> : null}
              </p>
            </div>
            {item.action ? (
              <Button
                label={item.action.label}
                size="sm"
                fullWidth={false}
                variant={item.key === primaryKey ? 'primary' : 'outline'}
                onPress={item.action.onPress}
              />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

type MeterProps = {
  label: string;
  /** Filled part and whole, e.g. rented slots out of all slots. */
  part: number;
  whole: number;
  /** Text after the ratio, e.g. "ô đang thuê". */
  unit: string;
};

/** A ratio as a bar with its real numbers next to it, never a bare percentage. */
export function RatioMeter({ label, part, whole, unit }: MeterProps) {
  const percent = whole > 0 ? Math.round((part / whole) * 100) : 0;
  return (
    <div className="flex flex-col gap-xs">
      <div className="flex items-baseline justify-between gap-sm">
        <span className="text-body-md text-muted">{label}</span>
        <span className="font-tabular text-headline-md text-text">{percent}%</span>
      </div>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={whole}
        aria-valuenow={part}
        className="h-2.5 overflow-hidden rounded-full bg-sunken"
      >
        <div className="h-full rounded-full bg-tertiary" style={{ width: `${percent}%` }} />
      </div>
      <span className="font-tabular text-body-sm text-muted">
        {part}/{whole} {unit}
      </span>
    </div>
  );
}
