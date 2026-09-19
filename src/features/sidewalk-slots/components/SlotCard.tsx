import { Icon } from '@/components/common';
import type { SidewalkSlot } from '@/core/api/side-api';
import { colors } from '@/theme';
import { formatShortVnd, formatSize, secondsUntil, formatCountdown } from '../slot-format';
import { BUSINESS_CATEGORY_LABELS, type SlotDisplayState } from '../slot-stats';
import {
  CATEGORY_ICONS,
  SLOT_SELECTED_COLOR,
  slotDisplayColor,
  slotDisplayTint,
} from '../slot-visuals';

type Props = {
  slot: SidewalkSlot;
  state: SlotDisplayState;
  selected: boolean;
  /** The caller holds this slot themselves. */
  mine: boolean;
  /** False dims the card: it does not match the active filters. */
  matchesFilters: boolean;
  widthPx: number;
  nowMs: number;
  onSelect: (slot: SidewalkSlot) => void;
};

function footerText(slot: SidewalkSlot, state: SlotDisplayState, mine: boolean, nowMs: number): string {
  switch (state) {
    case 'AVAILABLE':
      return `${formatShortVnd(slot.pricePerDay)}/ngày`;
    case 'HELD': {
      const left = formatCountdown(secondsUntil(slot.holdExpiresAt!, nowMs));
      return mine ? `Bạn giữ chỗ: ${left}` : `Giữ chỗ: ${left}`;
    }
    case 'PENDING':
      return 'ĐANG XỬ LÝ';
    case 'ACTIVE':
      return 'ĐÃ CHO THUÊ';
    case 'SUSPENDED':
      return 'TẠM NGƯNG';
  }
}

/** One slot of the corridor plan. Colour is by display state; the selected card is indigo. */
export function SlotCard({ slot, state, selected, mine, matchesFilters, widthPx, nowMs, onSelect }: Props) {
  const accent = slotDisplayColor(state);
  const onDark = selected;
  const textColor = onDark ? colors.white : colors.text;
  const mutedColor = onDark ? 'rgba(255,255,255,0.78)' : colors.muted;
  const title =
    state === 'ACTIVE'
      ? (slot.tenantName ?? 'Đã cho thuê')
      : slot.businessCategory
        ? BUSINESS_CATEGORY_LABELS[slot.businessCategory]
        : 'Chưa phân ngành';

  return (
    <button
      type="button"
      data-testid={`slot-card-${slot.slotCode}`}
      aria-pressed={selected}
      onClick={() => onSelect(slot)}
      style={{
        width: widthPx,
        backgroundColor: selected ? SLOT_SELECTED_COLOR : slotDisplayTint(state),
        borderColor: selected ? SLOT_SELECTED_COLOR : `${accent}66`,
        opacity: matchesFilters ? 1 : 0.35,
      }}
      className="relative flex min-h-[124px] shrink-0 flex-col justify-between rounded-md border p-xs text-left transition-opacity hover:opacity-100"
    >
      {/* A tab on the card's top edge: inside the header row it would squeeze the code onto two lines at narrow card widths. */}
      {selected && (
        <span
          className="absolute -top-2 right-1 rounded-sm bg-white px-1 text-badge shadow-card"
          style={{ color: SLOT_SELECTED_COLOR }}
        >
          ĐANG CHỌN
        </span>
      )}
      <div className="flex items-start justify-between gap-1">
        <span className="whitespace-nowrap text-headline-sm font-bold" style={{ color: onDark ? colors.white : accent }}>
          #{slot.slotCode}
        </span>
        {slot.businessCategory && (
          <Icon name={CATEGORY_ICONS[slot.businessCategory]} size={16} color={mutedColor} />
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-body-sm font-semibold" style={{ color: textColor }}>
          {title}
        </span>
        <span className="truncate text-body-sm" style={{ color: mutedColor }}>
          {formatSize(slot.widthMeters, slot.lengthMeters) ?? 'Chưa đo'}
        </span>
      </div>

      <div className="flex items-center justify-between gap-1 border-t pt-1" style={{ borderColor: `${mutedColor}55` }}>
        <span className="truncate text-badge" style={{ color: onDark ? colors.white : accent }}>
          {footerText(slot, state, mine, nowMs)}
        </span>
        {state === 'AVAILABLE' && !selected && <Icon name="plus-circle-outline" size={16} color={accent} />}
        {state === 'HELD' && <Icon name="timer-outline" size={16} color={onDark ? colors.white : accent} />}
      </div>
    </button>
  );
}
