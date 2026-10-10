import { memo } from 'react';

import { Icon } from '@/components/common';
import type { SidewalkSlot } from '@/core/api/side-api';
import { formatCountdown, formatShortVnd, formatSize, secondsUntil } from '../slot-format';
import { BUSINESS_CATEGORY_LABELS, type SlotDisplayState } from '../slot-stats';
import { CATEGORY_ICONS, PENDING_HATCH, SLOT_TONES } from '../slot-visuals';

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

function footerText(
  slot: SidewalkSlot,
  state: SlotDisplayState,
  mine: boolean,
  nowMs: number,
): string {
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

/**
 * One painted bay of the street plan. The wash, ink and glyph say its state;
 * a hold has a dashed edge, an application under review a faint hatching.
 * The selected bay keeps its colours and glows with an orange outline. A bay
 * with no recorded size gets a dotted inner paint line: its shape is not data.
 */
export const SlotCard = memo(function SlotCard({
  slot,
  state,
  selected,
  mine,
  matchesFilters,
  widthPx,
  nowMs,
  onSelect,
}: Props) {
  const tone = SLOT_TONES[state];
  const size = formatSize(slot.widthMeters, slot.lengthMeters);
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
      style={{ width: widthPx }}
      className={[
        'group relative flex min-h-[124px] shrink-0 flex-col justify-between rounded-[12px] border-2 p-xs text-left',
        'transition-[opacity,transform,box-shadow] duration-200 [transition-timing-function:var(--ease-out)]',
        'hover:-translate-y-0.5 hover:shadow-card-hover active:scale-[0.98] active:duration-100',
        'focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-primary',
        tone.wash,
        tone.ink,
        selected
          ? 'border-solid border-brand shadow-[0_0_0_3px_rgb(var(--c-brand)/0.28),0_12px_24px_-12px_rgb(var(--c-brand)/0.7)]'
          : `${tone.edge} shadow-card`,
        matchesFilters ? 'opacity-100' : 'opacity-[0.35]',
      ].join(' ')}
    >
      {state === 'PENDING' ? (
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 rounded-[10px] ${PENDING_HATCH}`}
        />
      ) : null}
      {size ? null : (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-[5px] rounded-[7px] border-[1.5px] border-dotted border-current opacity-40"
        />
      )}
      {selected ? (
        <>
          <span
            aria-hidden="true"
            className="sb-slot-beacon pointer-events-none absolute -inset-[7px] rounded-[17px] border-2 border-brand"
          />
          {/* A tab on the top edge: inside the header row it would squeeze the code onto two lines at narrow widths. */}
          <span className="absolute -top-2.5 right-1.5 rounded-[5px] bg-card px-1.5 py-px text-badge text-primary shadow-card ring-1 ring-brand/40">
            ĐANG CHỌN
          </span>
        </>
      ) : null}

      <div className="relative flex items-start justify-between gap-1">
        <span className="whitespace-nowrap font-sign text-[17px] font-[750] leading-5 tracking-[0.02em] [font-stretch:72%]">
          #{slot.slotCode}
        </span>
        {slot.businessCategory ? (
          <Icon
            name={CATEGORY_ICONS[slot.businessCategory]}
            size={16}
            color="currentColor"
            className="mt-0.5 shrink-0 opacity-70"
          />
        ) : null}
      </div>

      <div className="relative flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-body-sm font-semibold text-text" title={title}>
          {title}
        </span>
        <span className="truncate text-body-xs opacity-80">{size ?? 'Chưa đo'}</span>
      </div>

      <div className="relative flex items-center justify-between gap-1 pt-1">
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-current opacity-20" />
        <span className="truncate font-sign font-tabular text-[14px] font-bold leading-4 [font-stretch:76%]">
          {footerText(slot, state, mine, nowMs)}
        </span>
        {/* A hold already says so with its dashed edge and words; the clock text needs the room. */}
        {(selected && state === 'AVAILABLE') || state === 'HELD' ? null : (
          <Icon name={tone.icon} size={16} color="currentColor" className="shrink-0" />
        )}
      </div>
    </button>
  );
});
