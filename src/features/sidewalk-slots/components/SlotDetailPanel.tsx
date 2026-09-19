import { useQuery } from '@tanstack/react-query';

import { Icon } from '@/components/common';
import type { IconName } from '@/components/common/Icon';
import type { SidewalkSlot, SidewalkZone } from '@/core/api/side-api';
import { reverseGeocode } from '@/services/map/reverse-geocode';
import { colors } from '@/theme';
import { formatAreaSqm, formatHours, formatSize, toDms } from '../slot-format';
import { BUSINESS_CATEGORY_LABELS, shiftLabel, slotDisplayState } from '../slot-stats';
import { DISPLAY_STATE_LABELS, slotDisplayColor } from '../slot-visuals';
import { useNow } from '../useNow';
import { SlotApplyForm } from './SlotApplyForm';

type Props = {
  slot: SidewalkSlot;
  /** Loaded separately; the panel is usable without it (no ward contact card). */
  zone: SidewalkZone | undefined;
};

/** Photo, measurements, amenities, fee estimate and the apply flow for one slot. */
export function SlotDetailPanel({ slot, zone }: Props) {
  const nowMs = useNow();
  const state = slotDisplayState(slot, nowMs);
  const address = useQuery({
    queryKey: ['side', 'reverse-geocode', slot.latitude, slot.longitude],
    queryFn: ({ signal }) => reverseGeocode(slot.latitude, slot.longitude, signal),
    staleTime: Infinity,
  });
  const size = formatSize(slot.widthMeters, slot.lengthMeters);
  const area = formatAreaSqm(slot.widthMeters, slot.lengthMeters);

  return (
    <article className="flex flex-col gap-md" data-testid="slot-detail-panel">
      <div className="relative h-40 overflow-hidden rounded-md bg-indigo">
        {slot.imageUrl ? (
          <img src={slot.imageUrl} alt={`Ô ${slot.slotCode}`} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-white/70">
            <Icon name="storefront-outline" size={40} color="rgba(255,255,255,0.7)" />
            <span className="text-body-sm">Chưa có ảnh hiện trạng</span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-sm bg-gradient-to-t from-black/70 to-transparent p-sm">
          <div className="min-w-0">
            <p className="text-badge text-white/80">MÃ SỐ: {slot.slotCode}</p>
            <h2 className="truncate text-headline-md text-white">{slot.zoneName}</h2>
          </div>
          <span
            className="shrink-0 rounded-full px-sm text-badge text-white"
            style={{ backgroundColor: slotDisplayColor(state) }}
          >
            {DISPLAY_STATE_LABELS[state].toUpperCase()}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1 text-body-sm text-muted">
        <span className="flex items-start gap-1">
          <Icon name="map-marker-outline" size={16} color={colors.muted} />
          {address.isPending ? 'Đang tìm địa chỉ…' : (address.data ?? `${slot.latitude}, ${slot.longitude}`)}
        </span>
        <span className="flex items-center gap-1">
          <Icon name="crosshairs-gps" size={16} color={colors.muted} />
          {toDms(slot.latitude, slot.longitude)} (WGS84)
        </span>
      </div>

      <div className="grid grid-cols-2 gap-xs">
        <Fact
          icon="ruler-square"
          label="Kích thước"
          value={size ? `${size}${area ? ` (${area})` : ''}` : 'Chưa đo kích thước'}
        />
        <Fact icon="clock-outline" label="Khung giờ hoạt động" value={`${shiftLabel(slot)} (${formatHours(slot.availableFrom, slot.availableTo)})`} />
        <Fact
          icon="tag-outline"
          label="Nhóm ngành hàng"
          value={slot.businessCategory ? BUSINESS_CATEGORY_LABELS[slot.businessCategory] : 'Chưa phân ngành'}
        />
        {slot.tenantName && <Fact icon="storefront-outline" label="Hộ đang thuê" value={slot.tenantName} />}
      </div>

      <div className="flex flex-col gap-xs">
        <p className="text-badge text-muted">HẠ TẦNG KỸ THUẬT TẠI VỊ TRÍ</p>
        <div className="grid grid-cols-3 gap-xs">
          <Amenity icon="flash-outline" label="Điện" on={slot.hasPower} />
          <Amenity icon="water-outline" label="Nước" on={slot.hasWater} />
          <Amenity icon="trash-can-outline" label="Thùng rác" on={slot.hasTrashBin} />
        </div>
      </div>

      <SlotApplyForm slot={slot} />

      {zone?.contactName && (
        <div className="flex items-center justify-between gap-sm rounded-md border border-border bg-card p-sm shadow-card">
          <div className="min-w-0">
            <p className="truncate text-headline-sm text-text">{zone.contactName}</p>
            <p className="truncate text-body-sm text-muted">
              {zone.wardName}
              {zone.contactPhone ? ` · ${zone.contactPhone}` : ''}
            </p>
          </div>
          {zone.contactPhone && (
            <a
              href={`tel:${zone.contactPhone.replace(/\s/g, '')}`}
              className="shrink-0 rounded-sm bg-bg px-sm py-xs text-label font-semibold text-indigo"
            >
              Gọi hỗ trợ
            </a>
          )}
        </div>
      )}
    </article>
  );
}

function Fact({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <div className="flex items-start gap-xs rounded-md bg-bg p-sm">
      <Icon name={icon} size={20} color={colors.indigo} />
      <div className="min-w-0">
        <p className="text-body-sm text-muted">{label}</p>
        <p className="text-body-sm font-semibold text-text">{value}</p>
      </div>
    </div>
  );
}

function Amenity({ icon, label, on }: { icon: IconName; label: string; on: boolean }) {
  return (
    <div
      className={[
        'flex items-center gap-1 rounded-md border px-xs py-xs text-body-sm',
        on ? 'border-tertiary/30 bg-tint-tertiary text-text' : 'border-border bg-card text-muted line-through',
      ].join(' ')}
    >
      <Icon name={icon} size={16} color={on ? colors.tertiary : colors.muted} />
      {label}
    </div>
  );
}
