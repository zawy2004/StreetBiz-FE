import { Icon } from '@/components/common';
import type { StorefrontSummary } from '@/core/api/commerce-api';
import { formatDistance } from '../../discovery-format';
import { SidewalkStrip } from './SidewalkStrip';
import { SlotPlate } from './SlotPlate';

/**
 * Where the stall stands, as a piece of the street: the pavement seen from
 * above with its slot lit, the slot code at signboard size, then the address
 * line (one run of text, address · zone · slot · ward · distance).
 */
export function SidewalkCard({ storefront }: { storefront: StorefrontSummary }) {
  const distance = formatDistance(storefront.distanceMeters);
  return (
    <section
      aria-labelledby="sidewalk-card-title"
      className="overflow-hidden rounded-[24px] bg-[#FFF3E8] ring-1 ring-[#F5DCC6] dark:bg-card dark:ring-border"
    >
      <SidewalkStrip className="h-auto w-full" />
      <div className="flex flex-col gap-sm p-md md:p-lg">
        <h2
          id="sidewalk-card-title"
          className="font-editorial text-[22px] font-semibold leading-tight text-text"
        >
          Ô vỉa hè của quán
        </h2>
        <div className="flex flex-wrap items-center gap-sm">
          <SlotPlate code={storefront.slotCode} />
          <span className="min-w-0 text-body-md font-semibold text-text">
            {storefront.zoneName}
          </span>
        </div>
        <p className="flex items-start gap-xs text-body-md text-text/80">
          <Icon
            name="map-marker-outline"
            size={18}
            color="currentColor"
            className="mt-0.5 shrink-0 text-primary"
          />
          <span>
            {storefront.address ? `${storefront.address} · ` : ''}
            {storefront.zoneName} · Ô {storefront.slotCode} · {storefront.wardName}
            {distance ? ` · ${distance}` : ''}
          </span>
        </p>
        <p className="flex items-center gap-1.5 text-body-sm text-muted">
          <Icon
            name="shield-check-outline"
            size={16}
            color="currentColor"
            className="text-tertiary"
          />
          Ô được phường kẻ vạch, đánh số và cấp phép.
        </p>
      </div>
    </section>
  );
}
