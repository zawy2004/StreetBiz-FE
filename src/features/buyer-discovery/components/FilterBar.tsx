import { useState } from 'react';

import { Button, Icon } from '@/components/common';
import { categoryIcon } from '../category-icons';
import { hasActiveFilters, PRICE_CAPS, RADIUS_OPTIONS } from '../discovery-filters';
import { useDiscoveryStore } from '../discovery-store';
import { menuItemPhotos } from '../food-photos';
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

/**
 * Narrow a listing by category, opening hours, distance and price (DISC-05).
 * One strip, no box: the dishes first (each with its photo), then the switches.
 * It scrolls sideways when it runs out of room, so it never grows taller.
 */
export function FilterBar({ showRadius = false, showPrice = false }: Props) {
  const filters = useDiscoveryStore((s) => s.filters);
  const setFilters = useDiscoveryStore((s) => s.setFilters);
  const resetFilters = useDiscoveryStore((s) => s.resetFilters);
  const categories = useMarketplaceCategories();
  const hasCategories = !!categories.data && categories.data.length > 0;

  return (
    <div className="no-scrollbar -mx-md flex min-w-0 items-center gap-xs overflow-x-auto px-md py-1 md:-mx-lg md:px-lg lg:mx-0 lg:px-0">
      {/* Hold the rail's place while the categories load, so nothing beside it jumps. */}
      {categories.isPending ? (
        <div aria-hidden="true" className="flex shrink-0 gap-xs">
          {[112, 92, 120, 104, 128].map((w) => (
            <span key={w} style={{ width: w }} className="sb-shimmer h-11 shrink-0 rounded-full" />
          ))}
        </div>
      ) : null}
      {hasCategories ? (
        <CategoryRail
          options={[
            { value: ALL, label: 'Tất cả' },
            ...categories.data!.map((c) => ({
              value: String(c.categoryId),
              label: c.categoryName,
            })),
          ]}
          value={filters.categoryId == null ? ALL : String(filters.categoryId)}
          onChange={(value) => setFilters({ categoryId: value === ALL ? null : Number(value) })}
        />
      ) : null}
      {categories.isPending || hasCategories ? (
        <span aria-hidden="true" className="mx-1 h-7 w-px shrink-0 bg-border" />
      ) : null}
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
              onPress={() =>
                setFilters({ radiusMeters: filters.radiusMeters === meters ? null : meters })
              }
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
        <div className="shrink-0">
          <Button label="Xoá lọc" variant="ghost" fullWidth={false} onPress={resetFilters} />
        </div>
      ) : null}
    </div>
  );
}

type RailOption = { value: string; label: string };

/**
 * The dishes as pills: a round photo of the dish and its name (the glyph when no
 * photo matches or loads). The chosen one fills with the brand orange.
 */
function CategoryRail({
  options,
  value,
  onChange,
}: {
  options: RailOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div role="tablist" aria-label="Danh mục món" className="flex shrink-0 gap-xs">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={[
              'group flex h-11 shrink-0 items-center gap-2 rounded-full py-1 pl-1 pr-md text-label transition-[background-color,box-shadow,color] duration-200',
              active
                ? 'bg-primary font-semibold text-on-primary shadow-[0_8px_20px_-8px_rgb(var(--c-primary)/0.7)]'
                : 'bg-card text-text shadow-card ring-1 ring-border hover:ring-text/25',
            ].join(' ')}
          >
            <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full">
              {opt.value === ALL ? (
                <span
                  className={`flex h-full w-full items-center justify-center ${active ? 'bg-white/20 text-on-primary' : 'bg-tint-primary text-primary'}`}
                >
                  <Icon name="view-grid-outline" size={18} color="currentColor" weight="duotone" />
                </span>
              ) : (
                <CategoryPhoto label={opt.label} />
              )}
            </span>
            <span className="whitespace-nowrap">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** The stock photo of a category's dish, or its glyph when none matches or loads. */
function CategoryPhoto({ label }: { label: string }) {
  const [failed, setFailed] = useState(false);
  const photo = menuItemPhotos({ itemName: label })[0];
  if (!photo || failed) {
    return (
      <span className="flex h-full w-full items-center justify-center bg-tint-accent text-on-secondary">
        <Icon name={categoryIcon(label)} size={18} color="currentColor" weight="duotone" />
      </span>
    );
  }
  return (
    <img
      src={photo.src}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
    />
  );
}
