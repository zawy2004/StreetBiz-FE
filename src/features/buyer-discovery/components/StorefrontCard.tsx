import { formatVnd, Icon, KerbTag, type IconName } from '@/components/common';
import { StatusChip } from '@/components/status';
import type { StorefrontSummary } from '@/core/api/commerce-api';
import { colors } from '@/theme';
import { categoryIcon } from '../category-icons';
import { formatDistance, ratingText, todayHoursText } from '../discovery-format';
import { storefrontPhotos } from '../food-photos';
import { MEAL_TAG_LABELS, mealTags, type MealTag } from '../mealtime';
import { FoodImage } from './FoodImage';

type Props = {
  storefront: StorefrontSummary;
  onPress: () => void;
  /**
   * `feature`: the first stall of the home listing, laid out as a magazine spread
   * (photo beside the story). Same facts, same tap target, just more room.
   */
  variant?: 'standard' | 'feature';
};

export function OpenBadge({ isOpen }: { isOpen: boolean }) {
  return isOpen ? <StatusChip code="OPEN" /> : <StatusChip label="Đóng cửa" tone="neutral" />;
}

/** Placeholder tints for stalls without a photo, picked by id so a stall keeps its colour. */
const PLACEHOLDERS = [
  { bg: 'bg-tint-accent', color: colors.onSecondary },
  { bg: 'bg-tint-primary', color: colors.primary },
  { bg: 'bg-tint-tertiary', color: colors.tertiary },
] as const;

/**
 * A stall in the discovery grid, food-guide style: the photo carries the card,
 * open/closed and the slot plate ride on it, the name is set in the editorial
 * face. A closed stall keeps its colours; the chip says it is closed.
 */
export function StorefrontCard({ storefront, onPress, variant = 'standard' }: Props) {
  const placeholder = PLACEHOLDERS[storefront.storefrontId % PLACEHOLDERS.length]!;
  const photo = (
    <>
      <FoodImage
        photos={storefrontPhotos(storefront)}
        icon={categoryIcon(storefront.categories[0])}
        iconSize={48}
        iconColor={placeholder.color}
        placeholderClassName={placeholder.bg}
        className="h-full w-full"
        imgClassName="transition-transform duration-700 [transition-timing-function:var(--ease-out)] group-hover:scale-[1.05]"
        showIllustrativeTag
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/40 to-transparent"
      />
      <div className="absolute left-sm top-sm rounded-[7px] bg-card shadow-card">
        <OpenBadge isOpen={storefront.isOpenNow} />
      </div>
      <MealTagPills hours={storefront.todayHours} />
      <KerbTag code={storefront.slotCode} className="absolute bottom-sm left-sm" />
    </>
  );

  if (variant === 'feature') {
    return (
      <button
        type="button"
        onClick={onPress}
        className="group grid w-full overflow-hidden rounded-[28px] bg-card text-left shadow-card ring-1 ring-border transition-[box-shadow,transform] duration-300 [transition-timing-function:var(--ease-out)] hover:-translate-y-1 hover:shadow-card-hover md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]"
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden md:aspect-auto md:min-h-[360px]">
          {photo}
        </div>
        <div className="flex min-w-0 flex-col gap-sm p-md md:p-lg lg:p-xl">
          <span
            title={storefront.storefrontName}
            className="line-clamp-3 font-editorial text-[28px] font-semibold leading-[1.08] tracking-[-0.02em] text-text [font-variation-settings:'opsz'_60] lg:text-[38px]"
          >
            {storefront.storefrontName}
          </span>
          {storefront.description ? (
            <p className="line-clamp-3 max-w-[46ch] font-editorial text-[17px] leading-[1.55] text-text/75">
              {storefront.description}
            </p>
          ) : null}
          <Facts storefront={storefront} />
          <div className="mt-auto flex flex-wrap items-end justify-between gap-sm border-t border-border pt-md">
            <div className="flex flex-col">
              {storefront.minPrice != null ? (
                <span className="font-sign text-[22px] font-bold font-tabular leading-none text-primary">
                  Từ {formatVnd(storefront.minPrice)}
                </span>
              ) : null}
              {storefront.menuItemCount > 0 ? (
                <span className="mt-1 text-body-sm text-muted">
                  {storefront.menuItemCount} món trong thực đơn
                </span>
              ) : null}
            </div>
            <span className="flex h-11 items-center gap-1.5 rounded-full bg-primary px-md text-label font-semibold text-on-primary transition-colors group-hover:bg-primary-pressed">
              Xem thực đơn
              <Icon name="chevron-right" size={16} color="currentColor" />
            </span>
          </div>
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onPress}
      className="group flex w-full flex-col gap-sm rounded-[24px] text-left"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[22px] bg-sunken shadow-card transition-[box-shadow,transform] duration-300 [transition-timing-function:var(--ease-out)] group-hover:-translate-y-1 group-hover:shadow-card-hover group-active:translate-y-0">
        {photo}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1 px-1">
        <span
          title={storefront.storefrontName}
          className="line-clamp-2 font-editorial text-[21px] font-semibold leading-[1.2] tracking-[-0.01em] text-text [font-variation-settings:'opsz'_36]"
        >
          {storefront.storefrontName}
        </span>
        {storefront.minPrice != null ? (
          <span className="font-sign text-[15px] font-bold font-tabular text-primary">
            Từ {formatVnd(storefront.minPrice)}
          </span>
        ) : null}
        <Facts storefront={storefront} compact />
      </div>
    </button>
  );
}

const MEAL_ICONS: Record<MealTag, { icon: IconName; color: string }> = {
  EARLY: { icon: 'white-balance-sunny', color: colors.onSecondary },
  LATE: { icon: 'weather-night', color: colors.indigo },
};

/** "Mở sáng sớm" / "Bán khuya" riding on the photo's top-right corner, read off today's hours. */
function MealTagPills({ hours }: { hours: StorefrontSummary['todayHours'] }) {
  const tags = mealTags(hours);
  if (tags.length === 0) return null;
  return (
    <div className="absolute right-sm top-sm flex flex-col items-end gap-1">
      {tags.map((tag) => (
        <span
          key={tag}
          className="flex h-6 items-center gap-1 rounded-full bg-card/95 pl-1.5 pr-2.5 text-body-xs font-semibold text-text shadow-card backdrop-blur-sm"
        >
          <Icon name={MEAL_ICONS[tag].icon} size={14} color={MEAL_ICONS[tag].color} weight="fill" />
          {MEAL_TAG_LABELS[tag]}
        </span>
      ))}
    </div>
  );
}

/** Rating and today's hours, then the ward (and distance once located), then the dishes. */
function Facts({
  storefront,
  compact = false,
}: {
  storefront: StorefrontSummary;
  compact?: boolean;
}) {
  const distance = formatDistance(storefront.distanceMeters);
  const hours = todayHoursText(storefront);
  const size = compact ? 'text-body-sm' : 'text-body-md';
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className={`flex min-w-0 items-center gap-1.5 ${size} text-text/80`}>
        <Icon name="star" size={compact ? 14 : 16} color={colors.accent} weight="fill" />
        <span className="shrink-0">
          {ratingText(storefront.communityRating, storefront.communityCount)}
        </span>
        {hours ? (
          <>
            <span aria-hidden="true" className="h-1 w-1 shrink-0 rounded-full bg-muted/60" />
            <span className="truncate text-muted">{hours}</span>
          </>
        ) : null}
      </span>
      <span className={`flex min-w-0 items-center gap-1.5 ${size} text-muted`}>
        <Icon name="map-marker-outline" size={compact ? 14 : 16} color="currentColor" />
        <span className="truncate">
          {storefront.wardName}
          {distance ? ` · ${distance}` : ''}
        </span>
      </span>
      {storefront.categories.length > 0 ? (
        <span className={`mt-0.5 truncate ${compact ? 'text-body-xs' : 'text-body-sm'} text-muted`}>
          {storefront.categories.join(', ')}
        </span>
      ) : null}
    </div>
  );
}
