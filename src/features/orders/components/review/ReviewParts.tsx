import { useState, type ReactNode } from 'react';

import { Icon } from '@/components/common';
import { Skeleton } from '@/components/feedback';
import { Steam } from '@/components/illustrations';
import { FoodImage } from '@/features/buyer-discovery/components/FoodImage';
import type { FoodPhoto } from '@/features/buyer-discovery/food-photos';
import { IllustrativeTag } from '../OrderShapes';

/**
 * C15 parts: a clean plate seen from above, and a row of mango stars like the
 * ones chalked on a stall's board. The stars keep their "{n} sao" names and
 * `aria-pressed` on the chosen one only.
 */

const RATING_WORDS = ['Chưa ổn', 'Tạm được', 'Được', 'Ngon', 'Tuyệt vời'];

/** The dish in a round porcelain plate on a pale orange table, steam rising. */
export function DishPlate({ photos, empty = false }: { photos: FoodPhoto[]; empty?: boolean }) {
  return (
    <div className="relative mx-auto flex w-full flex-col items-center rounded-[32px] bg-[#FFF3E8] px-md pb-md pt-lg dark:bg-[#2A2420]">
      <div className="relative">
        {empty ? (
          <div className="flex h-[168px] w-[168px] items-center justify-center rounded-full border-[3px] border-dashed border-brand/50 bg-card md:h-[200px] md:w-[200px] lg:h-[220px] lg:w-[220px]">
            <Icon name="silverware-fork-knife" size={44} color="rgb(var(--c-muted))" />
          </div>
        ) : (
          <>
            <div className="rounded-full bg-card p-[10px] [box-shadow:inset_0_0_0_10px_rgb(var(--c-card)),0_28px_60px_-18px_rgb(17_28_43/0.3)]">
              <FoodImage
                photos={photos}
                icon="silverware-fork-knife"
                iconSize={48}
                iconColor="rgb(var(--c-primary))"
                className="h-[148px] w-[148px] rounded-full ring-4 ring-[#F4EEE8] dark:ring-white/10 md:h-[180px] md:w-[180px] lg:h-[200px] lg:w-[200px]"
                placeholderClassName="bg-tint-primary"
              />
            </div>
            <Steam className="pointer-events-none absolute -top-14 left-1/2 h-[96px] w-[78px] -translate-x-1/2" />
          </>
        )}
      </div>
      {!empty && photos[0]?.illustrative ? <IllustrativeTag className="mt-sm" /> : null}
    </div>
  );
}

/** Five large stars; a hover previews, only a press changes the rating. */
export function StarRating({
  value,
  onChange,
  labelled = true,
}: {
  value: number;
  onChange: (rating: number) => void;
  /** The demo screen's stars carry no names; keep it that way there. */
  labelled?: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value;
  return (
    <div
      role="group"
      aria-label="Chấm sao"
      className="flex justify-center gap-xs sm:gap-sm"
      onMouseLeave={() => setHover(null)}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const lit = n <= shown;
        return (
          <button
            key={n}
            type="button"
            aria-label={labelled ? `${n} sao` : undefined}
            aria-pressed={labelled ? n === value : undefined}
            onClick={() => onChange(n)}
            onMouseEnter={() => setHover(n)}
            onFocus={() => setHover(null)}
            className="relative flex h-12 w-12 items-center justify-center rounded-full transition-transform duration-150 hover:scale-110 focus-visible:ring-4 focus-visible:ring-primary/30 sm:h-14 sm:w-14"
          >
            <span
              key={`${n}-${value}`}
              style={{ animationDelay: `${(n - 1) * 40}ms` }}
              className={n <= value ? 'sb-pop' : ''}
            >
              <Icon
                name={lit ? 'star' : 'star-outline'}
                size={44}
                color={lit ? '#FFB703' : 'rgb(var(--c-border))'}
                className={
                  lit
                    ? '[filter:drop-shadow(0_0_0.5px_#7A5400)_drop-shadow(0_0_0.5px_#7A5400)]'
                    : ''
                }
              />
            </span>
            {n === value ? (
              <svg
                key={`rays-${value}`}
                aria-hidden="true"
                viewBox="0 0 60 60"
                className="sb-pop pointer-events-none absolute inset-[-6px] h-[calc(100%+12px)] w-[calc(100%+12px)]"
              >
                {[0, 60, 120, 180, 240, 300].map((angle) => (
                  <line
                    key={angle}
                    x1="30"
                    y1="3"
                    x2="30"
                    y2="8"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    transform={`rotate(${angle} 30 30)`}
                    className="stroke-[#FFB703]"
                  />
                ))}
              </svg>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/** "Ngon", "Tuyệt vời": the rating in a word, re-set each time it changes. */
export function RatingWord({ value }: { value: number }) {
  return (
    <p aria-live="polite" className="flex h-8 items-center justify-center">
      <span
        key={value}
        className="sb-pop font-editorial text-[22px] font-medium italic leading-8 text-text"
      >
        {RATING_WORDS[value - 1] ?? ''}
      </span>
    </p>
  );
}

/** A torn-off stub reminding which order this is. */
export function OrderRecapStrip({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <p
      title={title}
      className="mx-auto max-w-full truncate rounded-full bg-sunken px-md py-xs text-center text-body-sm text-text/80"
    >
      {children}
    </p>
  );
}

/** "12/1000", turning mango close to the limit. */
export function CharCounter({ length, max }: { length: number; max: number }) {
  return (
    <span
      className={`font-sign text-[13px] tabular-nums ${
        length > max * 0.9 ? 'font-semibold text-[#6B4100] dark:text-[#FFD27A]' : 'text-muted'
      }`}
    >
      {length}/{max}
    </span>
  );
}

/** Loading: the plate, five grey stars, the field. */
export function ReviewSkeleton() {
  return (
    <div aria-label="Đang tải đánh giá" className="flex flex-col items-center gap-md">
      <div className="flex w-full justify-center rounded-[32px] bg-sunken/60 py-lg">
        <Skeleton className="h-[168px] w-[168px] rounded-full md:h-[200px] md:w-[200px]" />
      </div>
      <Skeleton className="h-8 w-1/2" />
      <div className="flex gap-sm">
        {[0, 1, 2, 3, 4].map((n) => (
          <Skeleton key={n} className="h-12 w-12 rounded-full" />
        ))}
      </div>
      <Skeleton className="h-[104px] w-full rounded-[10px]" />
    </div>
  );
}
