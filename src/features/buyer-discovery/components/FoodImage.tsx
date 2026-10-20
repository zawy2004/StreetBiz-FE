import { useState } from 'react';

import { Icon } from '@/components/common';
import type { IconName } from '@/components/common/Icon';
import type { FoodPhoto } from '../food-photos';

type Props = {
  /** Candidates best first (see `storefrontPhotos` / `menuItemPhotos`). */
  photos: FoodPhoto[];
  /** Glyph for the tile when no photo loads. */
  icon: IconName;
  iconSize?: number;
  iconColor?: string;
  /** Sizing/rounding of the frame. */
  className?: string;
  /** Background of the empty tile. */
  placeholderClassName?: string;
  imgClassName?: string;
  /** Show the "Ảnh minh họa" tag on stock photos (off for small thumbnails). */
  showIllustrativeTag?: boolean;
};

/**
 * A food photo that degrades gracefully: a dead link moves on to the next
 * candidate (the vendor's own photo, then a stock one), and when none is left
 * the frame shows a category glyph instead of a broken-image icon.
 */
export function FoodImage({
  photos,
  icon,
  iconSize = 32,
  iconColor,
  className = '',
  placeholderClassName = 'bg-sunken',
  imgClassName = '',
  showIllustrativeTag = false,
}: Props) {
  const [failed, setFailed] = useState(0);
  const photo = photos[failed];

  return (
    <div className={`relative overflow-hidden ${photo ? 'bg-sunken' : placeholderClassName} ${className}`}>
      {photo ? (
        <img
          key={photo.src}
          src={photo.src}
          onError={() => setFailed((n) => n + 1)}
          alt=""
          loading="lazy"
          decoding="async"
          className={`h-full w-full object-cover ${imgClassName}`}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <Icon name={icon} size={iconSize} color={iconColor} />
        </div>
      )}
      {photo?.illustrative && showIllustrativeTag ? (
        <span className="pointer-events-none absolute bottom-1 right-1 rounded-sm bg-black/45 px-1.5 py-0.5 text-[10px] leading-none text-white/90">
          Ảnh minh họa
        </span>
      ) : null}
    </div>
  );
}
