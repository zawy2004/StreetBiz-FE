import { Avatar, Card, Icon } from '@/components/common';
import { StatusChip } from '@/components/status';
import type { StorefrontSummary } from '@/core/api/commerce-api';
import { colors } from '@/theme';
import { formatDistance, ratingText, todayHoursText } from '../discovery-format';

type Props = { storefront: StorefrontSummary; onPress: () => void };

export function OpenBadge({ isOpen }: { isOpen: boolean }) {
  return isOpen ? <StatusChip code="OPEN" /> : <StatusChip label="Đóng cửa" tone="neutral" />;
}

export function StorefrontCard({ storefront, onPress }: Props) {
  const distance = formatDistance(storefront.distanceMeters);
  const hours = todayHoursText(storefront);

  return (
    <Card onPress={onPress}>
      <div className="flex gap-sm">
        <Avatar uri={storefront.imageUrl ?? undefined} name={storefront.storefrontName} size={56} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-start justify-between gap-xs">
            <span className="truncate text-headline-sm text-text">{storefront.storefrontName}</span>
            <OpenBadge isOpen={storefront.isOpenNow} />
          </div>
          <span className="truncate text-body-sm text-muted">
            {storefront.wardName} · Ô {storefront.slotCode}
            {distance ? ` · ${distance}` : ''}
          </span>
          <span className="flex items-center gap-1 text-body-sm text-muted">
            <Icon name="star" size={14} color={colors.secondary} />
            {ratingText(storefront.communityRating, storefront.communityCount)}
            {hours ? ` · ${hours}` : ''}
          </span>
          {storefront.categories.length > 0 ? (
            <span className="truncate text-body-sm text-muted">{storefront.categories.join(' · ')}</span>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
