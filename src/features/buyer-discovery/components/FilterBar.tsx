import { Button } from '@/components/common';
import { FilterChips } from '@/components/forms';
import { hasActiveFilters, PRICE_CAPS, RADIUS_OPTIONS } from '../discovery-filters';
import { useDiscoveryStore } from '../discovery-store';
import { useMarketplaceCategories } from '../useDiscovery';
import { ToggleChip } from './ToggleChip';

type Props = {
  /** Distance chips only make sense once the customer's position is known. */
  showRadius?: boolean;
  /** A price cap applies to dishes, so only the search screen offers it. */
  showPrice?: boolean;
};

const ALL = 'ALL';
const km = (meters: number) => `≤ ${meters / 1000} km`;
const thousands = (vnd: number) => `≤ ${vnd / 1000}k`;

/** Narrow a listing by category, opening hours, distance and price (DISC-05). */
export function FilterBar({ showRadius = false, showPrice = false }: Props) {
  const filters = useDiscoveryStore((s) => s.filters);
  const setFilters = useDiscoveryStore((s) => s.setFilters);
  const resetFilters = useDiscoveryStore((s) => s.resetFilters);
  const categories = useMarketplaceCategories();

  return (
    <div className="flex flex-col gap-xs">
      {categories.data && categories.data.length > 0 ? (
        <FilterChips
          options={[
            { value: ALL, label: 'Tất cả' },
            ...categories.data.map((c) => ({ value: String(c.categoryId), label: c.categoryName })),
          ]}
          value={filters.categoryId == null ? ALL : String(filters.categoryId)}
          onChange={(value) => setFilters({ categoryId: value === ALL ? null : Number(value) })}
        />
      ) : null}
      <div className="flex items-center gap-xs overflow-x-auto py-0.5">
        <ToggleChip
          label="Đang mở"
          active={filters.openNow}
          onPress={() => setFilters({ openNow: !filters.openNow })}
        />
        {showRadius
          ? RADIUS_OPTIONS.map((meters) => (
              <ToggleChip
                key={meters}
                label={km(meters)}
                active={filters.radiusMeters === meters}
                onPress={() => setFilters({ radiusMeters: filters.radiusMeters === meters ? null : meters })}
              />
            ))
          : null}
        {showPrice
          ? PRICE_CAPS.map((cap) => (
              <ToggleChip
                key={cap}
                label={thousands(cap)}
                active={filters.maxPrice === cap}
                onPress={() => setFilters({ maxPrice: filters.maxPrice === cap ? null : cap })}
              />
            ))
          : null}
        {hasActiveFilters(filters) ? (
          <Button label="Xoá lọc" variant="ghost" fullWidth={false} onPress={resetFilters} />
        ) : null}
      </div>
    </div>
  );
}
