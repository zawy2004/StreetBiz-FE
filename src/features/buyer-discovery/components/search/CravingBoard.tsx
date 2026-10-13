import { useState, type CSSProperties } from 'react';

import { Icon, type IconName } from '@/components/common';
import { categoryIcon } from '../../category-icons';

/** Stock dishes (public/images/food, credits there). Each photo matches the dish it names. */
const CRAVINGS = [
  { key: 'bun-cha', label: 'Bún chả' },
  { key: 'banh-mi', label: 'Bánh mì' },
  { key: 'pho', label: 'Phở' },
  { key: 'xoi-ga', label: 'Xôi gà' },
  { key: 'com-tam', label: 'Cơm tấm' },
  { key: 'banh-xeo', label: 'Bánh xèo' },
  { key: 'ca-phe', label: 'Cà phê' },
  { key: 'banh-cuon', label: 'Bánh cuốn' },
] as const;

const photo = (key: string) => `${import.meta.env.BASE_URL}images/food/${key}.jpg`;

const TIPS: { icon: IconName; text: string }[] = [
  { icon: 'magnify', text: 'Gõ tên món hoặc tên quán' },
  { icon: 'tag-outline', text: 'Mức giá ≤ 30k chỉ lọc món' },
  { icon: 'crosshairs-gps', text: 'Tìm quanh tôi để xếp quán gần nhất' },
];

/**
 * "Thèm gì hôm nay?" before anything is asked: a board of dish photos. Tapping
 * one types its name into the search, exactly as if the buyer had typed it
 * (same debounce, same requests). Two large tiles and six small on desktop.
 */
export function CravingBoard({ onPick }: { onPick: (label: string) => void }) {
  return (
    <div className="flex flex-col gap-md">
      <ul className="grid grid-cols-2 gap-sm md:grid-cols-4 lg:grid-cols-5 lg:grid-rows-2 lg:gap-md">
        {CRAVINGS.map((dish, index) => (
          <li
            key={dish.key}
            style={{ '--delay': `${index * 50}ms` } as CSSProperties}
            className={`sb-rise ${index < 2 ? 'lg:row-span-2' : ''}`}
          >
            <CravingTile
              label={dish.label}
              src={photo(dish.key)}
              large={index < 2}
              eager={index < 4}
              onPress={() => onPick(dish.label)}
            />
          </li>
        ))}
      </ul>
      <ul className="flex flex-wrap gap-x-lg gap-y-xs">
        {TIPS.map((tip) => (
          <li key={tip.text} className="flex items-center gap-1.5 text-body-sm text-muted">
            <Icon name={tip.icon} size={16} color="currentColor" />
            {tip.text}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CravingTile({
  label,
  src,
  large,
  eager,
  onPress,
}: {
  label: string;
  src: string;
  large: boolean;
  eager: boolean;
  onPress: () => void;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <button
      type="button"
      aria-label={`Tìm ${label}`}
      onClick={onPress}
      className={[
        'group relative block h-[112px] w-full overflow-hidden rounded-[20px] bg-tint-primary shadow-card ring-4 ring-card transition-[transform,box-shadow] duration-200 hover:shadow-card-hover active:scale-[0.97] md:h-[150px]',
        large ? 'lg:h-full lg:min-h-[340px]' : 'lg:h-[162px]',
      ].join(' ')}
    >
      {failed ? (
        <span className="flex h-full w-full items-center justify-center text-primary">
          <Icon name={categoryIcon(label)} size={40} color="currentColor" weight="duotone" />
        </span>
      ) : (
        <img
          src={src}
          alt=""
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover transition-transform duration-[600ms] [transition-timing-function:var(--ease-out)] group-hover:scale-[1.06]"
        />
      )}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[40%] bg-gradient-to-t from-black/45 to-transparent"
      />
      <span
        className={`absolute bottom-sm left-sm font-editorial font-semibold leading-none text-white [text-shadow:0_1px_8px_rgb(0_0_0/0.35)] ${large ? 'text-[20px] lg:text-[30px]' : 'text-[18px] lg:text-[20px]'}`}
      >
        {label}
      </span>
      {!failed ? (
        <span className="absolute right-xs top-xs rounded-full bg-black/45 px-2 py-0.5 text-[10px] leading-none text-white/90 backdrop-blur-sm">
          Ảnh minh họa
        </span>
      ) : null}
    </button>
  );
}
