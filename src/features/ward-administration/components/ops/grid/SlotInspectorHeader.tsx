import type { ReactNode } from 'react';

import { Icon, type IconName } from '@/components/common';
import { VERDICT_TONES } from '@/components/illustrations';
import { StatusChip } from '@/components/status';
import { slotStatusLabels, type WardSlot } from '../../../ward-config-api';

const WASH: Record<WardSlot['status'], string> = {
  AVAILABLE: VERDICT_TONES.ok.wash,
  PENDING_APPLICATION: VERDICT_TONES.pending.wash,
  ACTIVE: VERDICT_TONES.neutral.wash,
  SUSPENDED: VERDICT_TONES.neutral.wash,
};

function Facility({ on, icon, label }: { on: boolean; icon: IconName; label: string }) {
  return (
    <li
      className={`flex h-8 items-center gap-1 rounded-full px-2.5 text-body-sm font-medium ${
        on ? 'bg-card text-text shadow-card' : 'text-muted line-through decoration-muted/60'
      }`}
    >
      <Icon
        name={icon}
        size={16}
        color="currentColor"
        weight={on ? 'fill' : 'regular'}
        className={on ? 'text-tertiary' : undefined}
      />
      {label}
      <span className="sr-only">{on ? ' (có)' : ' (không có)'}</span>
    </li>
  );
}

/**
 * Top of the slot sheet: the slot code as a large painted plate on a pale wash
 * of its status, then size, zone, source and which facilities it has.
 */
export function SlotInspectorHeader({ slot, action }: { slot: WardSlot; action: ReactNode }) {
  return (
    <div className={`flex flex-col gap-sm px-md pb-md pt-md ${WASH[slot.status]}`}>
      <div className="flex items-start justify-between gap-sm">
        <h2 className="flex min-w-0 flex-wrap items-center gap-sm">
          <span className="text-body-md font-semibold text-text/75">Ô</span>
          <span className="flex h-12 max-w-full items-center break-all rounded-[8px] bg-card px-sm font-sign text-[28px] font-extrabold leading-none tracking-[0.03em] text-text ring-[2.5px] ring-text [font-stretch:66%]">
            {slot.slotCode}
          </span>
        </h2>
        {action}
      </div>
      <div className="flex flex-wrap items-center gap-x-sm gap-y-xs">
        <StatusChip
          label={slotStatusLabels[slot.status]}
          tone={slot.status === 'AVAILABLE' ? 'ok' : 'pending'}
        />
        <span className="flex items-center gap-1 font-tabular text-[16px] font-semibold text-text">
          <Icon name="ruler-square" size={16} color="currentColor" className="text-muted" />
          {slot.widthMeters ?? '?'} × {slot.lengthMeters ?? '?'} m
        </span>
        <span className="min-w-0 truncate text-body-sm text-text/75">{slot.zoneName}</span>
      </div>
      <ul aria-label="Tiện ích" className="flex flex-wrap gap-1">
        <Facility on={slot.hasPower} icon="flash-outline" label="Điện" />
        <Facility on={slot.hasWater} icon="water-outline" label="Nước" />
        <Facility on={slot.hasTrashBin} icon="trash-can-outline" label="Thùng rác" />
      </ul>
      <p className="flex items-center gap-1.5 text-body-sm font-medium text-text/80">
        <Icon
          name={slot.source === 'VENDOR_PROPOSED' ? 'storefront-outline' : 'shield-check-outline'}
          size={16}
          color="currentColor"
        />
        {slot.source === 'VENDOR_PROPOSED' ? 'Nguồn: hộ kinh doanh đề xuất' : 'Nguồn: phường vẽ'}
      </p>
    </div>
  );
}
