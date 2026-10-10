import { useState } from 'react';

import { Icon, type IconName } from '@/components/common';
import type { FoodPhoto } from '../food-photos';

type Props = {
  /** Candidates best first (the vendor's own photo, then a stock one). */
  photos: FoodPhoto[];
  icon: IconName;
  iconSize?: number;
  className?: string;
  imgClassName?: string;
  /** Where the "Ảnh minh họa" tag sits on a stock photo (keep it clear of overlays). */
  tagClassName?: string;
};

/**
 * The large photo at the top of a stall or dish page: the page's LCP, so it is
 * fetched eagerly and first. Like `FoodImage` it falls through dead links to the
 * next candidate and ends on a category glyph on a warm tint, never a broken icon.
 * (A separate component so `FoodImage`, shared with vendor and ward screens, stays as it is.)
 */
export function HeroPhoto({
  photos,
  icon,
  iconSize = 72,
  className = '',
  imgClassName = '',
  tagClassName = 'bottom-sm right-sm',
}: Props) {
  const [failed, setFailed] = useState(0);
  const photo = photos[failed];
  // Keep the caller's positioning (often `absolute inset-0`); otherwise anchor the tag here.
  const position = /(^|\s)(absolute|fixed|sticky)(\s|$)/.test(className) ? '' : 'relative';
  return (
    <div
      className={`${position} overflow-hidden ${photo ? 'bg-sunken' : 'bg-tint-primary'} ${className}`}
    >
      {photo ? (
        <img
          key={photo.src}
          src={photo.src}
          alt=""
          loading="eager"
          fetchPriority="high"
          decoding="async"
          onError={() => setFailed((n) => n + 1)}
          className={`h-full w-full object-cover ${imgClassName}`}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-primary">
          <Icon name={icon} size={iconSize} color="currentColor" weight="duotone" />
        </div>
      )}
      {photo?.illustrative ? (
        <span
          className={`pointer-events-none absolute z-[1] rounded-full bg-black/45 px-2 py-0.5 text-[11px] leading-none text-white/90 backdrop-blur-sm ${tagClassName}`}
        >
          Ảnh minh họa
        </span>
      ) : null}
    </div>
  );
}
