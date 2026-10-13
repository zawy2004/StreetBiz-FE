import type { CSSProperties } from 'react';

import { Icon } from '@/components/common';
import type { ActiveVendor } from '../community-api';

type Props = {
  vendors: ActiveVendor[];
  onSelect: (vendor: ActiveVendor) => void;
};

/** City-block grid drawn with the border token so it reads in both themes. */
const STREET_GRID: CSSProperties = {
  backgroundColor: 'rgb(var(--c-sunken))',
  backgroundImage:
    'linear-gradient(rgb(var(--c-border) / 0.75) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--c-border) / 0.75) 1px, transparent 1px)',
  backgroundSize: '56px 56px',
};

/**
 * A street-plan sketch of where licensed vendors are trading right now: pins are
 * placed by their permitted coordinates inside the bounding box of all vendors.
 * The river and avenues are decoration only.
 */
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
      style={STREET_GRID}
      className="relative h-[300px] overflow-hidden rounded-[24px] border border-border md:h-[400px]"
    >
      <div aria-hidden="true" className="absolute right-[-14%] top-[-25%] h-[150%] w-[22%] rotate-[14deg] rounded-[50%] bg-primary/15" />
      <div aria-hidden="true" className="absolute left-[-10%] top-[40%] h-9 w-[120%] rotate-[5deg] border-y border-border bg-card/90">
        <div className="absolute inset-x-0 top-1/2 border-t-2 border-dashed border-accent/50" />
      </div>
      <div aria-hidden="true" className="absolute left-[40%] top-[-10%] h-[120%] w-8 -rotate-[11deg] border-x border-border bg-card/90">
        <div className="absolute inset-y-0 left-1/2 border-l-2 border-dashed border-accent/50" />
      </div>

      <div className="absolute left-sm top-sm z-10 flex items-center gap-1.5 rounded-full border border-border bg-card/95 px-sm py-1.5 text-label font-semibold text-text shadow-card backdrop-blur">
        <span aria-hidden="true" className="relative flex h-2 w-2">
          <span className="sb-ping absolute inset-0 rounded-full bg-tertiary" />
          <span className="relative h-2 w-2 rounded-full bg-tertiary" />
        </span>
        {vendors.length} hộ đang bán
      </div>

      {vendors.map((vendor) => {
        const left = 14 + ((vendor.longitude - minLng) / lngSpan) * 72;
        const top = 26 + ((maxLat - vendor.latitude) / latSpan) * 60;
        return (
          <button
            key={`${vendor.vendorId}-${vendor.slotId}`}
            type="button"
            title={`${vendor.displayName} · Ô ${vendor.slotCode}`}
            aria-label={`${vendor.displayName}, ô ${vendor.slotCode}`}
            onClick={() => onSelect(vendor)}
            className="group absolute z-[5] -translate-x-1/2 -translate-y-full rounded-full"
            style={{ left: `${left}%`, top: `${top}%` }}
          >
            <span className="relative flex flex-col items-center">
              <span aria-hidden="true" className="sb-ping absolute top-0 h-10 w-10 rounded-full bg-accent/40" />
              <span className="relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-sign bg-accent text-on-accent shadow-card-hover transition-transform duration-200 group-hover:scale-110">
                <Icon name="storefront-outline" size={18} color="currentColor" weight="fill" />
              </span>
              <span aria-hidden="true" className="-mt-1 h-2.5 w-2.5 rotate-45 rounded-[2px] bg-sign" />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-full mt-1 whitespace-nowrap rounded-full bg-sign px-2 py-0.5 text-[11px] font-semibold text-on-sign opacity-0 shadow-card transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
              >
                {vendor.displayName}
              </span>
            </span>
          </button>
        );
      })}

      <span className="absolute bottom-sm right-sm rounded-full bg-card/90 px-sm py-1 text-body-xs text-muted backdrop-blur">
        Vị trí theo tọa độ cấp phép
      </span>
    </div>
  );
}
