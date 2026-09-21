import { Icon } from '@/components/common';
import type { BusinessCategory } from '@/core/api/side-api';
import { colors } from '@/theme';
import {
  BUSINESS_CATEGORY_LABELS,
  NO_FILTERS,
  SHIFT_LABELS,
  hasActiveFilters,
  type Shift,
  type SlotDisplayState,
  type SlotFilters,
} from '../slot-stats';
import { DISPLAY_STATE_LABELS, SLOT_SELECTED_COLOR, slotDisplayColor } from '../slot-visuals';

type Props = {
  filters: SlotFilters;
  onChange: (filters: SlotFilters) => void;
  /** How many slots match, shown next to the clear button. */
  matchCount: number;
};

const STATES = Object.keys(DISPLAY_STATE_LABELS) as SlotDisplayState[];
const CATEGORIES = Object.keys(BUSINESS_CATEGORY_LABELS) as BusinessCategory[];
const SHIFTS = Object.keys(SHIFT_LABELS) as Shift[];

const LEGEND: { label: string; color: string }[] = [
  { label: 'Đang chọn', color: SLOT_SELECTED_COLOR },
  { label: 'Còn trống', color: slotDisplayColor('AVAILABLE') },
  { label: 'Có đơn / giữ chỗ', color: slotDisplayColor('PENDING') },
  { label: 'Đã thuê', color: slotDisplayColor('ACTIVE') },
  { label: 'Tạm ngưng', color: slotDisplayColor('SUSPENDED') },
];

/** Quick filters (all of them filter for real) and the colour legend. */
export function SlotFilterBar({ filters, onChange, matchCount }: Props) {
  return (
    <div className="flex flex-col gap-xs">
      <div className="flex flex-wrap items-center gap-xs">
        <Icon name="filter-variant" size={18} color={colors.muted} />

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
          <>
            <button type="button" className="text-label font-semibold text-primary" onClick={() => onChange(NO_FILTERS)}>
              Xoá lọc
            </button>
            <span className="text-body-sm text-muted">{matchCount} ô khớp</span>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-md text-body-sm text-muted">
        {LEGEND.map((item) => (
          <span key={item.label} className="flex items-center gap-1">
            <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// A native <select> keeps keyboard and screen-reader behaviour for free; it is
// only dressed as a chip, indigo once a value is chosen.
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
    <label
      className={[
        'relative inline-flex h-9 items-center rounded-full border px-sm text-label',
        active ? 'border-indigo bg-indigo text-on-indigo' : 'border-border bg-card text-text',
      ].join(' ')}
    >
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value as T | 'ALL')}
        className="cursor-pointer appearance-none bg-transparent pr-4 outline-none"
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
        color={active ? colors.onIndigo : colors.muted}
        className="pointer-events-none absolute right-2"
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
      className={[
        'inline-flex h-9 items-center gap-1 rounded-full border px-sm text-label',
        on ? 'border-indigo bg-indigo text-on-indigo' : 'border-border bg-card text-text',
      ].join(' ')}
    >
      <Icon name={icon} size={16} color={on ? colors.onIndigo : colors.muted} />
      {label}
    </button>
  );
}
