import { useState } from 'react';

import { formatVnd, Icon, KerbTag } from '@/components/common';
import { StatusChip } from '@/components/status';
import type { StorefrontSummary } from '@/core/api/commerce-api';
import { colors } from '@/theme';
import { categoryIcon } from '../category-icons';
import { formatDistance, ratingText, todayHoursText } from '../discovery-format';

type Props = { storefront: StorefrontSummary; onPress: () => void };

export function OpenBadge({ isOpen }: { isOpen: boolean }) {
  return isOpen ? <StatusChip code="OPEN" /> : <StatusChip label="Đóng cửa" tone="neutral" />;
}

/** Placeholder tints for stalls without a photo, picked by id so a stall keeps its colour. */
const PLACEHOLDERS = [
  { bg: 'bg-tint-primary', color: colors.primary },
  { bg: 'bg-tint-secondary', color: colors.onSecondary },
  { bg: 'bg-tint-tertiary', color: colors.tertiary },
] as const;

/**
 * A stall in the discovery grid, food-app style: photo first, then name,
 * rating and hours, then where it is. The slot code rides on the photo as a
 * kerb tag — the painted slot the buyer will actually walk up to.
 */
export function StorefrontCard({ storefront, onPress }: Props) {
  const distance = formatDistance(storefront.distanceMeters);
  const hours = todayHoursText(storefront);
  const placeholder = PLACEHOLDERS[storefront.storefrontId % PLACEHOLDERS.length]!;
  // A dead photo link falls back to the placeholder tile rather than a broken-image icon.
  const [photoFailed, setPhotoFailed] = useState(false);
  const photo = photoFailed ? null : storefront.imageUrl;

  return (
    <button
      type="button"
      onClick={onPress}
      className="group flex w-full flex-col overflow-hidden rounded-md border border-border bg-card text-left shadow-card transition-[box-shadow,border-color] duration-150 hover:border-muted/40 hover:shadow-card-hover"
    >
      <div className={`relative aspect-[16/10] w-full overflow-hidden ${photo ? 'bg-sunken' : placeholder.bg}`}>
        {photo ? (
          <img
            src={photo}
            onError={() => setPhotoFailed(true)}
            alt=""
            loading="lazy"
            className={`h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03] ${storefront.isOpenNow ? '' : 'grayscale-[60%]'}`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Icon name={categoryIcon(storefront.categories[0])} size={44} color={placeholder.color} />
          </div>
        )}
        <div className="absolute left-xs top-xs">
          <OpenBadge isOpen={storefront.isOpenNow} />
        </div>
        <KerbTag code={storefront.slotCode} className="absolute bottom-xs left-xs !bg-card" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1 p-sm">
        <span className="line-clamp-1 text-headline-sm text-text">{storefront.storefrontName}</span>
        <span className="flex min-w-0 items-center gap-1 text-body-sm text-muted">
          <Icon name="star" size={14} color={colors.secondary} />
          <span className="truncate">
            {ratingText(storefront.communityRating, storefront.communityCount)}
            {hours ? ` · ${hours}` : ''}
          </span>
        </span>
        <span className="truncate text-body-sm text-muted">
          {storefront.wardName}
          {distance ? ` · ${distance}` : ''}
        </span>
        {storefront.categories.length > 0 || storefront.minPrice != null ? (
          <div className="mt-auto flex items-center justify-between gap-sm pt-xs">
            <span className="truncate text-body-xs text-muted">{storefront.categories.join(', ')}</span>
            {storefront.minPrice != null ? (
              <span className="shrink-0 text-label font-semibold font-tabular text-primary">
                Từ {formatVnd(storefront.minPrice)}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </button>
  );
}
