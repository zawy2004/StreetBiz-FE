import { useState } from 'react';

import { Icon } from '@/components/common';
import type { ServiceArea } from '@/core/api/commerce-api';
import { formatDistance } from '../discovery-format';
import { useDiscoveryStore } from '../discovery-store';
import { useServiceAreas } from '../useDiscovery';

/** Stock dishes to dress each ward card; they stand for the street, not for one stall. */
const COVERS = [
  'banh-xeo',
  'com-tam',
  'bun-bo-hue',
  'banh-cuon',
  'xoi-ga',
  'nem-nuong',
  'hu-tieu',
  'banh-trang-nuong',
] as const;

const cover = (index: number) =>
  `${import.meta.env.BASE_URL}images/food/${COVERS[index % COVERS.length]}.jpg`;

type Props = {
  /** Called after a ward is picked, so the screen can bring the listing back into view. */
  onPicked?: () => void;
};

/**
 * "Khu phố ẩm thực": the wards that have stalls, as photo cards with their
 * stall count. Picking one is the same `setFilters({ wardId })` as the area
 * picker in the hero (and picking it again goes back to every area). Reads the
 * service areas the hero's location bar already loaded (same query key), so it
 * costs no request.
 */
export function AreaStrip({ onPicked }: Props) {
  const areas = useServiceAreas();
  const wardId = useDiscoveryStore((s) => s.filters.wardId);
  const setFilters = useDiscoveryStore((s) => s.setFilters);
  const list = areas.data ?? [];
  if (list.length < 2) return null;

  return (
    <section aria-labelledby="area-strip-title" className="flex flex-col gap-md">
      <div className="flex flex-col gap-1">
        <h2
          id="area-strip-title"
          className="font-editorial text-[28px] font-semibold leading-[1.1] tracking-[-0.02em] text-text [font-variation-settings:'opsz'_48] lg:text-[34px]"
        >
          Khu phố ẩm thực
        </h2>
        <p className="text-body-md text-muted">Chọn một phường để xem các quán đang bán ở đó.</p>
      </div>
      <ul className="no-scrollbar -mx-md flex snap-x snap-mandatory gap-sm overflow-x-auto px-md pb-1 md:-mx-lg md:px-lg lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-md lg:overflow-visible lg:px-0">
        {list.map((area, index) => (
          <li key={area.wardId} className="w-[232px] shrink-0 snap-start lg:w-auto">
            <AreaCard
              area={area}
              index={index}
              active={wardId === area.wardId}
              onPress={() => {
                setFilters({ wardId: wardId === area.wardId ? null : area.wardId });
                onPicked?.();
              }}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function AreaCard({
  area,
  index,
  active,
  onPress,
}: {
  area: ServiceArea;
  index: number;
  active: boolean;
  onPress: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const distance = formatDistance(area.distanceMeters);
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onPress}
      className="group flex w-full flex-col gap-sm rounded-[22px] text-left"
    >
      <span
        className={[
          'relative block aspect-[4/3] w-full overflow-hidden rounded-[20px] bg-tint-primary shadow-card transition-[box-shadow,transform] duration-300 [transition-timing-function:var(--ease-out)] group-hover:-translate-y-1 group-hover:shadow-card-hover',
          active ? 'ring-[3px] ring-brand ring-offset-2 ring-offset-bg' : '',
        ].join(' ')}
      >
        {failed ? (
          <span className="flex h-full w-full items-center justify-center text-primary">
            <Icon
              name="map-marker-radius-outline"
              size={40}
              color="currentColor"
              weight="duotone"
            />
          </span>
        ) : (
          <img
            src={cover(index)}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
            className="h-full w-full object-cover transition-transform duration-700 [transition-timing-function:var(--ease-out)] group-hover:scale-[1.05]"
          />
        )}
        <span className="absolute left-sm top-sm flex h-7 items-center gap-1 rounded-full bg-card/95 px-2.5 font-sign text-[14px] font-bold text-text shadow-card [font-stretch:90%]">
          <Icon name="storefront-outline" size={14} color="currentColor" weight="fill" />
          <span className="font-tabular">{area.storefrontCount}</span> quán
        </span>
        {active ? (
          <span className="absolute right-sm top-sm flex h-7 items-center gap-1 rounded-full bg-primary px-2.5 text-body-xs font-semibold text-on-primary shadow-card">
            <Icon name="check" size={13} color="currentColor" />
            Đang xem
          </span>
        ) : null}
        {!failed ? (
          <span className="pointer-events-none absolute bottom-1 right-1 rounded-sm bg-black/45 px-1.5 py-0.5 text-[10px] leading-none text-white/90">
            Ảnh minh họa
          </span>
        ) : null}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5 px-1">
        <span
          title={area.wardName}
          className="truncate font-editorial text-[19px] font-semibold leading-tight text-text"
        >
          {area.wardName}
        </span>
        <span className="truncate text-body-sm text-muted">
          {[area.districtName, distance ? `cách ${distance}` : null].filter(Boolean).join(' · ') ||
            'Đà Nẵng'}
        </span>
      </span>
    </button>
  );
}
