import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

import { Icon, KerbTag } from '@/components/common';
import { menuItemPhotos } from '@/features/buyer-discovery/food-photos';
import type { PublicVendorProfile } from '../../community-api';

const MOODS = ['Tệ', 'Chưa ổn', 'Tạm được', 'Ngon', 'Tuyệt vời'];

/** A five-point star with softly rounded tips, drawn to stay even at 56px. */
function StarGlyph({ filled, preview }: { filled: boolean; preview: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" className="h-12 w-12 sm:h-14 sm:w-14">
      <path
        d="M24 5.5l5.4 11.6 12.7 1.5-9.4 8.7 2.5 12.5L24 33.6l-11.2 6.2 2.5-12.5-9.4-8.7 12.7-1.5z"
        strokeLinejoin="round"
        strokeWidth="2.6"
        style={{
          fill: filled
            ? 'rgb(var(--c-accent))'
            : preview
              ? 'rgb(var(--c-accent) / 0.35)'
              : 'transparent',
          stroke: filled ? 'rgb(var(--c-accent))' : 'rgb(var(--c-on-secondary) / 0.5)',
        }}
      />
    </svg>
  );
}

/**
 * The score as five large stars, a radio group named "Số sao" (one Tab stop,
 * arrow keys move the choice). Hovering previews a score without choosing it;
 * choosing one makes the stars up to it hop in turn. The word for the score
 * ("Tuyệt vời"…) sits under them and is announced politely.
 */
export function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const [hop, setHop] = useState(false);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const choose = (next: number) => {
    onChange(next);
    setHop(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setHop(false), 260);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const moves: Record<string, number> = {
      ArrowRight: Math.min(5, value + 1),
      ArrowUp: Math.min(5, value + 1),
      ArrowLeft: Math.max(1, value - 1),
      ArrowDown: Math.max(1, value - 1),
      Home: 1,
      End: 5,
    };
    const next = moves[event.key];
    if (next == null) return;
    event.preventDefault();
    choose(next);
    buttons.current[next - 1]?.focus();
  };

  return (
    <div className="flex flex-col items-center gap-xs">
      <div
        role="radiogroup"
        aria-label="Số sao"
        onMouseLeave={() => setHover(null)}
        className="flex items-center gap-0.5 sm:gap-sm"
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            ref={(el) => {
              buttons.current[n - 1] = el;
            }}
            type="button"
            role="radio"
            aria-checked={n === value}
            aria-label={`${n} sao`}
            tabIndex={n === value ? 0 : -1}
            onClick={() => choose(n)}
            onMouseEnter={() => setHover(n)}
            onKeyDown={onKeyDown}
            style={{ transitionDelay: hop && n <= value ? `${(n - 1) * 40}ms` : '0ms' }}
            className={[
              'flex h-14 w-14 items-center justify-center rounded-full transition-transform duration-[120ms] [transition-timing-function:cubic-bezier(.3,1.4,.5,1)] hover:bg-tint-accent sm:h-16 sm:w-16',
              hop && n <= value ? 'scale-[1.22]' : 'scale-100',
            ].join(' ')}
          >
            <StarGlyph
              filled={n <= (hover ?? value)}
              preview={hover != null && n <= hover && n > value}
            />
          </button>
        ))}
      </div>
      <p
        key={value}
        aria-live="polite"
        className="sb-pop font-editorial text-[28px] font-semibold leading-tight text-text"
      >
        {MOODS[value - 1]}
      </p>
    </div>
  );
}

/**
 * Which stall is being reviewed: a vertical kerb stripe down its left edge, the
 * slot plate, the name in the editorial face and its current score. A stock
 * photo of the dish it is named after, when there is one (titled as illustrative).
 */
export function ReviewedVendorCard({ vendor }: { vendor: PublicVendorProfile }) {
  const photo = menuItemPhotos({ itemName: vendor.displayName })[0];
  const [failed, setFailed] = useState(false);
  return (
    <div className="relative flex items-center gap-sm overflow-hidden rounded-[20px] bg-card p-md pl-[22px] shadow-card ring-1 ring-border">
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1.5"
        style={{
          background:
            'repeating-linear-gradient(180deg, rgb(var(--c-kerb)) 0 18px, rgb(var(--c-kerb-paint)) 18px 36px)',
        }}
      />
      {photo && !failed ? (
        <img
          src={photo.src}
          alt=""
          title="Ảnh minh họa"
          decoding="async"
          onError={() => setFailed(true)}
          className="h-14 w-14 shrink-0 rounded-[14px] object-cover"
        />
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <KerbTag code={vendor.slotCode} place={vendor.zoneName} className="w-fit" />
        <p
          title={vendor.displayName}
          className="truncate font-editorial text-[22px] font-semibold leading-tight text-text"
        >
          {vendor.displayName}
        </p>
        <p className="flex items-center gap-1 text-body-sm text-muted">
          <Icon name="star" size={14} color="rgb(var(--c-accent))" weight="fill" />
          {vendor.communityRating != null
            ? `${vendor.communityRating.toFixed(1)} ★ (${vendor.communityCount})`
            : 'Chưa có điểm'}
          {vendor.wardName ? ` · ${vendor.wardName}` : ''}
        </p>
      </div>
    </div>
  );
}

/** The two most recent reviews, to read before writing (from the profile already loaded). */
export function RecentReviews({ vendor }: { vendor: PublicVendorProfile }) {
  const recent = [...vendor.comments]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 2);
  if (recent.length === 0) return null;
  return (
    <section
      aria-labelledby="recent-reviews-title"
      className="flex flex-col gap-sm rounded-[20px] bg-card p-md shadow-card ring-1 ring-border"
    >
      <h2 id="recent-reviews-title" className="font-editorial text-[20px] font-semibold text-text">
        Người khác nói gì
      </h2>
      <ul className="flex flex-col divide-y divide-border">
        {recent.map((comment) => (
          <li key={comment.commentId} className="flex flex-col gap-1 py-sm first:pt-0 last:pb-0">
            <div className="flex items-center justify-between gap-xs">
              <span className="truncate text-body-sm font-semibold text-text">
                {comment.authorName}
              </span>
              {comment.rating ? (
                <span className="flex shrink-0 items-center gap-0.5 text-body-sm font-semibold text-on-secondary">
                  <Icon name="star" size={13} color="rgb(var(--c-accent))" weight="fill" />
                  {comment.rating}
                </span>
              ) : null}
            </div>
            {comment.commentText ? (
              <p className="line-clamp-2 font-editorial text-[16px] leading-snug text-text/85">
                {comment.commentText}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
