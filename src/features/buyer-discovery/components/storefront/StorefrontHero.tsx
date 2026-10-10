import { useState, type CSSProperties } from 'react';

import { Icon, KerbTag } from '@/components/common';
import type { StorefrontDetail } from '@/core/api/commerce-api';
import { colors } from '@/theme';
import { categoryIcon } from '../../category-icons';
import { ratingText } from '../../discovery-format';
import { menuItemPhotos, storefrontPhotos, type FoodPhoto } from '../../food-photos';
import { BackButton } from '../BackButton';
import { HeroPhoto } from '../HeroPhoto';
import { OpenBadge } from '../StorefrontCard';

const delay = (ms: number) => ({ '--delay': `${ms}ms` }) as CSSProperties;

/**
 * The stall's cover: the same photo as its card on the listing, grown to the
 * full head of the page. Open/closed and the slot plate ride on it (top left),
 * a few of its dishes are pinned on the right (desktop), and the name sits on
 * frosted glass at the bottom. Holds the page's one `h1` and its one open badge.
 */
export function StorefrontHero({ detail }: { detail: StorefrontDetail }) {
  const { storefront, menu } = detail;
  const cover = storefrontPhotos(storefront);
  // A few of the stall's own dishes, without words (the names belong to the menu below).
  const dishes = menu
    .flatMap((category) => category.items)
    .map((item) => menuItemPhotos(item)[0])
    .filter((photo): photo is FoodPhoto => photo != null && photo.src !== cover[0]?.src)
    .filter((photo, index, all) => all.findIndex((p) => p.src === photo.src) === index)
    .slice(0, 3);

  return (
    <header className="mx-auto w-full max-w-[1320px] md:px-lg md:pt-md lg:px-xl lg:pt-lg">
      <div className="sb-rise relative isolate aspect-[4/3] overflow-hidden bg-tint-primary md:aspect-[16/9] md:rounded-[28px] lg:aspect-auto lg:h-[380px] lg:rounded-[32px] xl:h-[460px] xl:rounded-[36px]">
        <HeroPhoto
          photos={cover}
          icon={categoryIcon(storefront.categories[0])}
          className="absolute inset-0 -z-10 h-full w-full"
          tagClassName="right-sm top-sm md:right-md md:top-md lg:bottom-md lg:top-auto"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-[5] h-1/3 bg-gradient-to-b from-black/25 to-transparent"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 -z-[5] h-[35%] bg-gradient-to-t from-black/30 to-transparent"
        />

        <div className="absolute left-sm top-sm flex items-center gap-xs md:left-md md:top-md">
          <BackButton floating />
          <span className="rounded-[7px] bg-card shadow-card">
            <OpenBadge isOpen={storefront.isOpenNow} />
          </span>
          <KerbTag code={storefront.slotCode} className="hidden sm:inline-flex" />
        </div>

        {dishes.length > 0 ? (
          <div className="absolute right-md top-md hidden gap-sm lg:flex">
            {dishes.map((photo, index) => (
              <DishThumb key={photo.src} photo={photo} index={index} />
            ))}
          </div>
        ) : null}

        <div
          style={delay(120)}
          className="sb-rise absolute inset-x-sm bottom-sm max-w-[680px] rounded-[22px] border border-white/80 bg-[linear-gradient(140deg,rgb(255_255_255/0.9)_0%,rgb(255_244_234/0.8)_100%)] p-md shadow-sheet backdrop-blur-xl backdrop-saturate-150 dark:border-white/10 dark:bg-none dark:bg-card/[0.72] md:inset-x-auto md:bottom-md md:left-md md:rounded-[26px] md:p-lg lg:bottom-lg lg:left-lg"
        >
          <h1
            title={storefront.storefrontName}
            className="line-clamp-2 font-editorial text-[30px] font-semibold leading-[1.04] tracking-[-0.025em] text-text [font-variation-settings:'opsz'_72] sm:line-clamp-3 sm:text-[38px] md:text-[52px] xl:text-[64px]"
          >
            {storefront.storefrontName}
          </h1>
          <p className="mt-xs flex min-w-0 flex-wrap items-center gap-x-sm gap-y-1 text-body-md text-text/85">
            <span className="flex items-center gap-1 font-semibold">
              <Icon name="star" size={17} color={colors.accent} weight="fill" />
              {ratingText(storefront.communityRating, storefront.communityCount)}
            </span>
            {storefront.categories.length > 0 ? (
              <span className="min-w-0 truncate text-muted">
                {storefront.categories.join(', ')}
              </span>
            ) : null}
          </p>
        </div>
      </div>
    </header>
  );
}

/** One of the stall's dishes pinned on the cover; hidden if its photo will not load. */
function DishThumb({ photo, index }: { photo: FoodPhoto; index: number }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <figure
      style={delay(220 + index * 120)}
      className={`sb-rise relative h-[112px] w-[112px] overflow-hidden rounded-[20px] shadow-sheet ring-4 ring-card xl:h-[132px] xl:w-[132px] ${index === 2 ? 'hidden xl:block' : ''} ${index % 2 ? 'mt-lg' : ''}`}
    >
      <img
        src={photo.src}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className="h-full w-full object-cover"
      />
      {photo.illustrative ? (
        <figcaption className="absolute bottom-1 left-1 rounded-full bg-black/45 px-1.5 py-0.5 text-[10px] leading-none text-white/90">
          Ảnh minh họa
        </figcaption>
      ) : null}
    </figure>
  );
}
