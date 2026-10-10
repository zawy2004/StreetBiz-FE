import type { CSSProperties } from 'react';

import { formatVnd } from '@/components/common';
import type { IconName } from '@/components/common/Icon';
import { StatusChip } from '@/components/status';
import { FoodSafetyBadge } from '@/features/food-safety/components/FoodSafetyBits';
import { colors } from '@/theme';
import type { FoodPhoto } from '../../food-photos';
import { FoodImage } from '../FoodImage';

export type MenuItemCardData = {
  itemName: string;
  storefrontName?: string | null;
  categoryName?: string | null;
  unitPrice: number;
  soldOut: boolean;
  certified: boolean;
  photos: FoodPhoto[];
  icon: IconName;
};

type Props = {
  item: MenuItemCardData;
  onPress: () => void;
  /** `tile` in the grid; `wide` (photo beside the words) when it is the only dish found. */
  variant?: 'tile' | 'wide';
  /** Position in the grid, for the staggered arrival of the first results. */
  index?: number;
};

/**
 * A dish on the street's menu board: the photo first, then its name in the
 * editorial face and the price in orange signage figures, then who sells it.
 * Sold out says so in a chip; the photo keeps its colours. The dish name is a
 * single text node so the whole card reads (and is found) by it.
 */
export function MenuItemResultCard({ item, onPress, variant = 'tile', index = 0 }: Props) {
  const rise = { '--delay': `${Math.min(index, 7) * 40}ms` } as CSSProperties;
  const byline = [item.storefrontName, item.categoryName].filter(Boolean).join(' · ');
  const photo = (
    <>
      <FoodImage
        photos={item.photos}
        icon={item.icon}
        iconSize={variant === 'wide' ? 48 : 36}
        iconColor={colors.onSecondary}
        placeholderClassName="bg-tint-accent"
        className="h-full w-full"
        imgClassName="transition-transform duration-500 [transition-timing-function:var(--ease-out)] group-hover:scale-[1.05]"
        showIllustrativeTag
      />
      {item.soldOut ? (
        <span className="absolute left-xs top-xs rounded-[7px] bg-card shadow-card">
          <StatusChip code="SOLD_OUT" />
        </span>
      ) : null}
    </>
  );
  const words = (
    <>
      <span
        className={`line-clamp-2 font-editorial font-semibold leading-[1.2] tracking-[-0.01em] text-text ${variant === 'wide' ? 'text-[24px] lg:text-[28px]' : 'text-[18px] lg:text-[20px]'}`}
      >
        {item.itemName}
      </span>
      <span
        className={`font-sign font-bold font-tabular leading-none text-primary ${variant === 'wide' ? 'text-[24px]' : 'text-[18px]'}`}
      >
        {formatVnd(item.unitPrice)}
      </span>
      {byline ? (
        <span title={byline} className="truncate text-body-sm text-muted">
          {byline}
        </span>
      ) : null}
      {item.certified ? (
        <span className="mt-0.5">
          <FoodSafetyBadge />
        </span>
      ) : null}
    </>
  );

  if (variant === 'wide') {
    return (
      <button
        type="button"
        onClick={onPress}
        style={rise}
        className="sb-rise group grid w-full grid-cols-[132px_minmax(0,1fr)] items-center gap-md rounded-[24px] bg-card p-sm text-left shadow-card ring-1 ring-border transition-[box-shadow,transform] duration-300 hover:-translate-y-[3px] hover:shadow-card-hover sm:grid-cols-[220px_minmax(0,1fr)] sm:gap-lg"
      >
        <span className="relative block aspect-square overflow-hidden rounded-[18px]">{photo}</span>
        <span className="flex min-w-0 flex-col gap-sm py-xs pr-xs">{words}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onPress}
      style={rise}
      className="sb-rise group flex w-full flex-col gap-sm rounded-[22px] text-left"
    >
      <span className="relative block aspect-square w-full overflow-hidden rounded-[20px] shadow-card ring-4 ring-card transition-[box-shadow,transform] duration-300 [transition-timing-function:var(--ease-out)] group-hover:-translate-y-[3px] group-hover:shadow-card-hover">
        {photo}
      </span>
      <span className="flex min-w-0 flex-col gap-1.5 px-1">{words}</span>
    </button>
  );
}
