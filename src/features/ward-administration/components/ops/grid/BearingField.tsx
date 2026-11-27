import { useId } from 'react';

import { Icon, type IconName } from '@/components/common';
import { bearingGap, bearingLabel, foldBearing } from '@/features/sidewalk-slots/slot-3d';

function Nudge({
  label,
  icon,
  onPress,
  disabled,
}: {
  label: string;
  icon?: IconName;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      disabled={disabled}
      className="inline-flex min-h-10 items-center gap-1 rounded-[10px] px-sm text-body-sm font-semibold text-text ring-1 ring-border hover:bg-sunken disabled:cursor-not-allowed disabled:opacity-50"
    >
      {icon && <Icon name={icon} size={16} color="currentColor" />}
      {label}
    </button>
  );
}

/**
 * "Hướng ô": which way the slot's length side runs. The officer slides it, nudges it 15° or 90°,
 * or snaps it back onto the street; on the map the same is done with the slot's turn handle.
 * `value` is what the slot is drawn at now (its own bearing, the draft, or its street's).
 */
export function BearingField({
  value,
  streetBearing,
  own,
  onChange,
}: {
  value: number;
  streetBearing: number | null;
  /** The slot has (or is being given) its own bearing, rather than following the street. */
  own: boolean;
  onChange: (bearing: number) => void;
}) {
  const id = useId();
  const followsStreet = streetBearing != null && bearingGap(value, streetBearing) < 0.5;
  const set = (b: number) => onChange(foldBearing(b));

  return (
    <div className="flex flex-col gap-xs">
      <div className="flex items-center justify-between gap-sm">
        <label htmlFor={id} className="text-label font-semibold text-text">
          Hướng ô
        </label>
        <span className="flex items-center gap-xs font-tabular text-body-md text-text">
          {/* A small compass needle turned to the slot's bearing. */}
          <span
            aria-hidden="true"
            className="relative flex h-7 w-7 items-center justify-center rounded-full ring-1 ring-border"
          >
            <span
              className="block h-5 w-1.5 rounded-full bg-brand"
              style={{ transform: `rotate(${value}deg)` }}
            />
          </span>
          {bearingLabel(value)}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={179}
        step={1}
        value={Math.round(foldBearing(value)) % 180}
        onChange={(e) => set(Number(e.target.value))}
        aria-valuetext={bearingLabel(value)}
        className="w-full accent-brand"
      />
      <div className="flex flex-wrap gap-xs">
        <Nudge label="−15°" icon="rotate-left" onPress={() => set(value - 15)} />
        <Nudge label="+15°" icon="rotate-right" onPress={() => set(value + 15)} />
        <Nudge label="Xoay 90°" onPress={() => set(value + 90)} />
        <Nudge
          label="Theo hướng phố"
          disabled={streetBearing == null || followsStreet}
          onPress={() => streetBearing != null && set(streetBearing)}
        />
      </div>
      <p className="text-body-sm text-muted">
        {streetBearing == null
          ? 'Chưa đủ ô thẳng hàng để tự nhận hướng phố; chỉnh tay hoặc kéo tay cầm tròn trên bản đồ.'
          : followsStreet
            ? own
              ? 'Ô đang nằm dọc theo phố.'
              : 'Ô đang tự nằm dọc theo phố (chưa đặt hướng riêng).'
            : 'Kéo tay cầm tròn trên bản đồ để xoay; khi gần hướng phố, ô sẽ tự khớp theo phố.'}
      </p>
    </div>
  );
}
