import { Icon } from '@/components/common';
import { colors } from '@/theme';
import type { ActiveVendor } from '../community-api';

type Props = {
  vendors: ActiveVendor[];
  onSelect: (vendor: ActiveVendor) => void;
};

export function ActiveVendorMap({ vendors, onSelect }: Props) {
  const latitudes = vendors.map((vendor) => vendor.latitude);
  const longitudes = vendors.map((vendor) => vendor.longitude);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);
  const latSpan = Math.max(maxLat - minLat, 0.002);
  const lngSpan = Math.max(maxLng - minLng, 0.002);

  return (
    <div
      aria-label="Bản đồ hộ kinh doanh đang hoạt động"
      className="relative h-64 overflow-hidden rounded-md border border-border bg-tint-tertiary"
    >
      <div className="absolute left-[-10%] top-[35%] h-8 w-[120%] rotate-6 bg-card/70" />
      <div className="absolute left-[42%] top-[-10%] h-[120%] w-7 -rotate-12 bg-card/70" />
      {vendors.map((vendor) => {
        const left = 8 + ((vendor.longitude - minLng) / lngSpan) * 84;
        const top = 8 + ((maxLat - vendor.latitude) / latSpan) * 84;
        return (
          <button
            key={`${vendor.vendorId}-${vendor.slotId}`}
            type="button"
            title={`${vendor.displayName} · Ô ${vendor.slotCode}`}
            aria-label={`${vendor.displayName}, ô ${vendor.slotCode}`}
            onClick={() => onSelect(vendor)}
            className="absolute -translate-x-1/2 -translate-y-full rounded-full bg-card p-1 shadow-card"
            style={{ left: `${left}%`, top: `${top}%` }}
          >
            <Icon name="map-marker" size={24} color={colors.primary} />
          </button>
        );
      })}
      <span className="absolute bottom-1 right-2 text-body-sm text-muted">
        Vị trí theo tọa độ cấp phép
      </span>
    </div>
  );
}
