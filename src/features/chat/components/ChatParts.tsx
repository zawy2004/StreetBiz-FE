import { useState } from 'react';

import { Icon } from '@/components/common';
import { Skeleton } from '@/components/feedback';

/**
 * The stall's sign as an avatar: the real storefront photo from the API, or a
 * storefront glyph on a warm tint when there is none or it fails to load.
 */
export function StoreAvatar({ uri, size }: { uri: string | null; size: number }) {
  const [failed, setFailed] = useState(false);
  const radius = size >= 48 ? 14 : 12;
  if (uri && !failed) {
    return (
      <img
        src={uri}
        alt=""
        loading="lazy"
        decoding="async"
        width={size}
        height={size}
        onError={() => setFailed(true)}
        style={{ width: size, height: size, borderRadius: radius }}
        className="shrink-0 object-cover shadow-card ring-2 ring-inset ring-white/80"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, borderRadius: radius }}
      className="flex shrink-0 items-center justify-center bg-tint-primary text-primary"
    >
      <Icon
        name="storefront-outline"
        size={Math.round(size * 0.46)}
        color="currentColor"
        weight="duotone"
      />
    </span>
  );
}

/** A stall with a striped awning and a speech bubble over it (96×72). */
function InboxStallArt({ waiting }: { waiting: boolean }) {
  return (
    <svg viewBox="0 0 96 72" aria-hidden="true" className="h-[72px] w-24 shrink-0">
      <rect
        x="14"
        y="40"
        width="52"
        height="26"
        rx="3"
        fill="rgb(var(--c-card))"
        stroke="rgb(var(--c-border))"
        strokeWidth="2"
      />
      {Array.from({ length: 6 }, (_, i) => (
        <path
          key={i}
          d={`M${10 + i * 10} 30h10v8a5 5 0 0 1-10 0z`}
          fill={i % 2 ? 'rgb(var(--c-kerb-paint))' : 'rgb(var(--c-brand))'}
        />
      ))}
      <rect x="8" y="26" width="64" height="5" rx="2" fill="rgb(var(--c-primary))" />
      <rect x="22" y="48" width="14" height="18" rx="2" fill="rgb(var(--c-sunken))" />
      <rect x="42" y="48" width="18" height="10" rx="2" fill="#FFF3E8" />
      <g className={waiting ? 'sb-chat-nod' : undefined}>
        <path
          d="M54 4h32a8 8 0 0 1 8 8v8a8 8 0 0 1-8 8H70l-7 6v-6h-9a8 8 0 0 1-8-8v-8a8 8 0 0 1 8-8z"
          fill={waiting ? 'rgb(var(--c-card))' : '#E6F6EC'}
          stroke={waiting ? 'rgb(var(--c-primary))' : 'rgb(var(--c-tertiary))'}
          strokeWidth="2"
        />
        {waiting ? (
          <>
            <circle cx="61" cy="16" r="2.5" fill="rgb(var(--c-muted))" />
            <circle cx="70" cy="16" r="2.5" fill="rgb(var(--c-muted))" />
            <circle cx="79" cy="16" r="2.5" fill="rgb(var(--c-primary))" />
          </>
        ) : (
          <path
            d="M62 16l5 5 10-10"
            fill="none"
            stroke="rgb(var(--c-tertiary))"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </g>
    </svg>
  );
}

/** "5 tin chưa đọc từ 2 cuộc trò chuyện", always one run of text, beside the stall. */
export function InboxSummary({ unread, threads }: { unread: number; threads: number }) {
  const sentence =
    unread > 0 ? `${unread} tin chưa đọc từ ${threads} cuộc trò chuyện` : 'Không có tin chưa đọc';
  return (
    <div className="flex items-center justify-between gap-md rounded-[24px] bg-card p-md shadow-card ring-1 ring-border">
      <p className="min-h-[48px] min-w-0 font-heading text-[18px] font-bold leading-6 text-text [@container_(min-width:560px)]:text-[22px] [@container_(min-width:560px)]:leading-7">
        {sentence}
      </p>
      <InboxStallArt waiting={unread > 0} />
    </div>
  );
}

/** Wide screens: the empty right pane, a stall with a buyer and two bubbles, and two tips. */
export function InboxPlaceholderPane({ vendor }: { vendor: boolean }) {
  return (
    <aside
      aria-label="Chọn một cuộc trò chuyện"
      className="hidden min-h-[520px] flex-col items-center justify-center gap-md rounded-[28px] bg-[#FFF3E8] p-xl text-center dark:bg-primary/10 [@container_(min-width:960px)]:flex"
    >
      <svg viewBox="0 0 280 200" aria-hidden="true" className="h-[200px] w-[280px]">
        <ellipse cx="140" cy="184" rx="120" ry="8" fill="rgb(var(--c-brand) / 0.12)" />
        <rect
          x="40"
          y="96"
          width="120"
          height="80"
          rx="6"
          fill="rgb(var(--c-card))"
          stroke="rgb(var(--c-border))"
          strokeWidth="2"
        />
        {Array.from({ length: 7 }, (_, i) => (
          <path
            key={i}
            d={`M${32 + i * 20} 78h20v14a10 10 0 0 1-20 0z`}
            fill={i % 2 ? 'rgb(var(--c-kerb-paint))' : 'rgb(var(--c-brand))'}
          />
        ))}
        <rect x="26" y="70" width="148" height="10" rx="4" fill="rgb(var(--c-primary))" />
        <rect x="58" y="112" width="40" height="64" rx="3" fill="rgb(var(--c-sunken))" />
        <rect
          x="108"
          y="112"
          width="40"
          height="26"
          rx="3"
          fill="#FFF3E8"
          stroke="rgb(var(--c-border))"
        />
        <circle cx="214" cy="112" r="14" fill="rgb(var(--c-accent))" />
        <path d="M194 176v-30a20 20 0 0 1 40 0v30z" fill="rgb(var(--c-indigo))" />
        <path
          d="M150 16h80a12 12 0 0 1 12 12v18a12 12 0 0 1-12 12h-44l-12 10V58h-24a12 12 0 0 1-12-12V28a12 12 0 0 1 12-12z"
          fill="rgb(var(--c-primary))"
        />
        <rect x="160" y="30" width="56" height="6" rx="3" fill="rgb(255 255 255 / 0.9)" />
        <rect x="160" y="42" width="36" height="6" rx="3" fill="rgb(255 255 255 / 0.65)" />
        <path
          d="M30 18h70a12 12 0 0 1 12 12v14a12 12 0 0 1-12 12H58l-10 9V56H30a12 12 0 0 1-12-12V30a12 12 0 0 1 12-12z"
          fill="rgb(var(--c-card))"
          stroke="rgb(var(--c-border))"
          strokeWidth="2"
        />
        <rect x="30" y="30" width="56" height="6" rx="3" fill="rgb(var(--c-border))" />
        <rect x="30" y="41" width="38" height="6" rx="3" fill="rgb(var(--c-border))" />
      </svg>
      <div className="flex max-w-[360px] flex-col gap-xs">
        <p className="font-heading text-[22px] font-bold leading-7 text-text">
          Chọn một cuộc trò chuyện để xem tin nhắn.
        </p>
        <p className="text-body-md text-muted">
          {vendor
            ? 'Mẹo: trả lời sớm giúp khách yên tâm đặt món.'
            : 'Mẹo: hỏi quán còn món trước khi đi để khỏi phải chờ.'}
        </p>
      </div>
    </aside>
  );
}

/** Nobody has called at the stall yet: dashed bubble over an empty counter. */
export function InboxEmptyArt() {
  return (
    <svg viewBox="0 0 200 140" aria-hidden="true" className="h-[140px] w-[200px]">
      <rect
        x="40"
        y="70"
        width="120"
        height="56"
        rx="6"
        fill="rgb(var(--c-card))"
        stroke="rgb(var(--c-border))"
        strokeWidth="2"
      />
      {Array.from({ length: 7 }, (_, i) => (
        <path
          key={i}
          d={`M${30 + i * 20} 54h20v12a10 10 0 0 1-20 0z`}
          fill={i % 2 ? 'rgb(var(--c-kerb-paint))' : 'rgb(var(--c-brand))'}
        />
      ))}
      <rect x="24" y="48" width="152" height="8" rx="3" fill="rgb(var(--c-primary))" />
      <path
        d="M110 6h62a10 10 0 0 1 10 10v14a10 10 0 0 1-10 10h-34l-10 8v-8h-18a10 10 0 0 1-10-10V16a10 10 0 0 1 10-10z"
        fill="none"
        stroke="rgb(var(--c-primary))"
        strokeWidth="2.5"
        strokeDasharray="7 5"
      />
      {Array.from({ length: 6 }, (_, i) => (
        <rect
          key={i}
          x={30 + i * 23.3}
          y="130"
          width="23.3"
          height="6"
          fill={i % 2 ? 'rgb(var(--c-kerb-paint))' : 'rgb(var(--c-kerb))'}
        />
      ))}
    </svg>
  );
}

/** First load of the inbox: summary line and four rows at their real heights. */
export function InboxSkeleton() {
  return (
    <div role="status" aria-label="Đang tải" className="flex flex-col gap-md">
      <Skeleton className="h-7 w-[260px] max-w-full" />
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="flex h-[72px] items-center gap-sm">
          <Skeleton className="h-[52px] w-[52px] shrink-0 rounded-[14px]" />
          <div className="flex flex-1 flex-col gap-xs">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3.5 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** "Hôm nay", "Hôm qua", "Thứ Hai, 06/10" between two hairlines. */
export function DayDivider({ label }: { label: string }) {
  return (
    <div className="my-sm flex items-center gap-sm" role="separator" aria-label={label}>
      <span aria-hidden="true" className="h-px flex-1 bg-border" />
      <span
        aria-hidden="true"
        className="rounded-[6px] bg-sunken px-2 py-0.5 font-sign text-[12px] font-bold leading-4 tracking-[0.04em] text-[#2B3640] dark:text-text/85"
      >
        {label}
      </span>
      <span aria-hidden="true" className="h-px flex-1 bg-border" />
    </div>
  );
}

/** An empty counter waiting for the first message: two dotted bubbles. */
export function ThreadEmptyArt() {
  return (
    <svg viewBox="0 0 200 140" aria-hidden="true" className="h-[140px] w-[200px]">
      <path
        d="M20 22h82a10 10 0 0 1 10 10v14a10 10 0 0 1-10 10H46l-10 8v-8H20a10 10 0 0 1-10-10V32a10 10 0 0 1 10-10z"
        fill="rgb(var(--c-card))"
        stroke="rgb(var(--c-border))"
        strokeWidth="2"
      />
      <path
        d="M98 64h82a10 10 0 0 1 10 10v14a10 10 0 0 1-10 10h-16v8l-10-8H98a10 10 0 0 1-10-10V74a10 10 0 0 1 10-10z"
        fill="none"
        stroke="rgb(var(--c-primary))"
        strokeWidth="2.5"
        strokeDasharray="7 5"
      />
      <rect x="10" y="114" width="180" height="10" rx="3" fill="rgb(var(--c-sunken))" />
      {Array.from({ length: 8 }, (_, i) => (
        <rect
          key={i}
          x={10 + i * 22.5}
          y="126"
          width="22.5"
          height="6"
          fill={i % 2 ? 'rgb(var(--c-kerb-paint))' : 'rgb(var(--c-kerb))'}
        />
      ))}
    </svg>
  );
}

/** First load of a thread: the store plate and five bubbles alternating sides. */
export function ThreadSkeleton() {
  const widths = ['w-3/5', 'w-2/5', 'w-[70%]', 'w-1/2', 'w-2/5'];
  return (
    <div role="status" aria-label="Đang tải" className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-sm border-b border-border bg-card px-md">
        <Skeleton className="h-11 w-11 rounded-[12px]" />
        <div className="flex flex-col gap-xs">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-[760px] flex-1 flex-col justify-end gap-sm p-md">
        {widths.map((width, i) => (
          <div key={i} className={`flex ${i % 2 ? 'justify-end' : 'justify-start'}`}>
            <Skeleton className={`h-11 ${width} rounded-[16px]`} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** "Xem tin nhắn cũ hơn" as a dashed pavement slot still free ahead. */
export function OlderMessagesButton({
  loading,
  onPress,
}: {
  loading: boolean;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      disabled={loading}
      aria-busy={loading || undefined}
      className="mx-auto inline-flex h-11 items-center gap-xs rounded-full border-2 border-dashed border-border bg-card px-md text-label font-semibold text-text transition-colors hover:border-primary/50 hover:text-primary-pressed disabled:cursor-wait disabled:opacity-70"
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : (
        <Icon name="history" size={17} color="currentColor" />
      )}
      Xem tin nhắn cũ hơn
    </button>
  );
}
