import { Icon } from '@/components/common';
import type { BusinessCategory } from '@/core/api/side-api';
import {
  BUSINESS_CATEGORY_LABELS,
  NO_FILTERS,
  SHIFT_LABELS,
  hasActiveFilters,
  type Shift,
  type SlotDisplayState,
  type SlotFilters,
} from '../slot-stats';
import { DISPLAY_STATE_LABELS } from '../slot-visuals';

type Props = {
  filters: SlotFilters;
  onChange: (filters: SlotFilters) => void;
  /** How many slots match, shown next to the clear button. */
  matchCount: number;
};

const STATES = Object.keys(DISPLAY_STATE_LABELS) as SlotDisplayState[];
const CATEGORIES = Object.keys(BUSINESS_CATEGORY_LABELS) as BusinessCategory[];
const SHIFTS = Object.keys(SHIFT_LABELS) as Shift[];

const CHIP =
  'relative inline-flex h-12 shrink-0 items-center gap-1.5 rounded-full px-md text-label transition-[background-color,box-shadow,color] duration-150 md:h-10 focus-within:outline focus-within:outline-[3px] focus-within:outline-offset-2 focus-within:outline-primary';
const CHIP_ON =
  'bg-primary font-semibold text-on-primary shadow-[0_8px_18px_-10px_rgb(var(--c-primary)/0.8)]';
const CHIP_OFF = 'bg-card text-text shadow-card ring-1 ring-border hover:ring-text/25';

/**
 * Quick filters, one row that scrolls sideways when tight. Every one filters
 * for real: a slot that does not match dims on the plan, it is never hidden.
 * The colour legend lives in the occupancy bar above the plan.
 */
export function SlotFilterBar({ filters, onChange, matchCount }: Props) {
  return (
    <div className="no-scrollbar -mx-md flex items-center gap-xs overflow-x-auto px-md py-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
      <Icon name="filter-variant" size={18} color="currentColor" className="shrink-0 text-muted" />

      <ChipSelect
        label="Trạng thái"
        value={filters.state}
        options={STATES.map((s) => ({ value: s, label: DISPLAY_STATE_LABELS[s] }))}
        onChange={(state) => onChange({ ...filters, state })}
      />
      <ChipSelect
        label="Ngành hàng"
        value={filters.category}
        options={CATEGORIES.map((c) => ({ value: c, label: BUSINESS_CATEGORY_LABELS[c] }))}
        onChange={(category) => onChange({ ...filters, category })}
      />
      <ChipSelect
        label="Ca"
        value={filters.shift}
        options={SHIFTS.map((s) => ({ value: s, label: SHIFT_LABELS[s] }))}
        onChange={(shift) => onChange({ ...filters, shift })}
      />
      <ChipToggle
        icon="flash-outline"
        label="Có điện"
        on={filters.power}
        onToggle={() => onChange({ ...filters, power: !filters.power })}
      />
      <ChipToggle
        icon="water-outline"
        label="Có nước"
        on={filters.water}
        onToggle={() => onChange({ ...filters, water: !filters.water })}
      />

      {hasActiveFilters(filters) && (
        <span className="flex shrink-0 items-center gap-xs pl-1">
          <button
            type="button"
            className="h-12 rounded-full px-sm text-label font-semibold text-primary hover:bg-tint-primary md:h-10"
            onClick={() => onChange(NO_FILTERS)}
          >
            Xoá lọc
          </button>
          <span className="whitespace-nowrap font-tabular text-body-sm text-muted">
            {matchCount} ô khớp
          </span>
        </span>
      )}
    </div>
  );
}

// A native <select> keeps keyboard and screen-reader behaviour for free; it is
// only dressed as a chip, filled once a value is chosen.
function ChipSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T | 'ALL';
  options: { value: T; label: string }[];
  onChange: (value: T | 'ALL') => void;
}) {
  const active = value !== 'ALL';
  return (
    <label className={`${CHIP} ${active ? CHIP_ON : CHIP_OFF}`}>
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value as T | 'ALL')}
        className="cursor-pointer appearance-none bg-transparent pr-5 outline-none"
      >
        <option value="ALL" className="text-text">
          {label}
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value} className="text-text">
            {o.label}
          </option>
        ))}
      </select>
      <Icon
        name="chevron-down"
        size={16}
        color="currentColor"
        className={`pointer-events-none absolute right-3 ${active ? '' : 'text-muted'}`}
      />
    </label>
  );
}

function ChipToggle({
  icon,
  label,
  on,
  onToggle,
}: {
  icon: 'flash-outline' | 'water-outline';
  label: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onToggle}
      className={`${CHIP} ${on ? CHIP_ON : CHIP_OFF}`}
    >
      <Icon
        name={icon}
        size={16}
        color="currentColor"
        weight={on ? 'fill' : 'regular'}
        className={on ? '' : 'text-muted'}
      />
      {label}
    </button>
  );
}
