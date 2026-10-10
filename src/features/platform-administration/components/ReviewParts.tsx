import { useId, useState, type ReactNode } from 'react';

import { Icon, type IconName } from '@/components/common';
import { Skeleton } from '@/components/feedback';
import { StatusChip } from '@/components/status';
import { statusLabel } from '@/core/constants/status-labels';

const CONTENT_ICON: Record<string, IconName> = {
  STOREFRONT: 'storefront-outline',
  MENU_ITEM: 'silverware-fork-knife',
  REVIEW: 'comment-outline',
};

/**
 * The reported content in the shape buyers meet it: a stall sign for a
 * storefront, a dish card for a menu item, a quotation for a review. No stock
 * food photos here, so nothing reads as the reported item's own picture.
 */
export function EvidenceFrame({
  contentType,
  heading,
  title,
  body,
  contentStatus,
  exists,
  stamp,
}: {
  contentType: string;
  /** "Gian hàng #12", already composed by the screen. */
  heading: string;
  title: string;
  body: string | null;
  contentStatus: string;
  exists: boolean;
  stamp?: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const bodyId = useId();
  const long = (body?.length ?? 0) > 600;
  const isReview = contentType === 'REVIEW';

  return (
    <article
      aria-label="Nội dung bị báo cáo"
      className={`relative overflow-hidden rounded-[20px] bg-card shadow-sheet ${exists ? 'ring-1 ring-border' : 'border-2 border-dashed border-error/40'}`}
    >
      {contentType === 'STOREFRONT' ? (
        <div aria-hidden="true" className="sb-kerb sb-kerb-thin" />
      ) : null}
      <div
        className={`flex flex-col gap-sm p-md md:p-lg ${stamp ? 'pr-[108px] md:pr-[156px]' : ''}`}
      >
        <span className="inline-flex w-fit items-center gap-1.5 rounded-[8px] bg-sunken px-2 py-1 text-body-sm font-semibold text-text">
          <Icon name={CONTENT_ICON[contentType] ?? 'flag-outline'} size={16} color="currentColor" />
          {heading}
        </span>

        {contentType === 'STOREFRONT' ? (
          <h2 className="font-editorial text-[26px] font-semibold leading-8 text-text">{title}</h2>
        ) : contentType === 'MENU_ITEM' ? (
          <h2 className="flex items-center gap-sm text-[22px] font-semibold leading-7 text-text">
            <span
              aria-hidden="true"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-tint-accent text-on-secondary"
            >
              <Icon name="silverware-fork-knife" size={22} color="currentColor" weight="duotone" />
            </span>
            {title}
          </h2>
        ) : (
          <h2 className="text-headline-md text-text">{title}</h2>
        )}

        {body ? (
          <div className={isReview ? 'relative pl-[44px]' : ''}>
            {isReview ? (
              <span
                aria-hidden="true"
                className="absolute -top-2 left-0 font-editorial text-[56px] font-bold leading-none text-brand"
              >
                “
              </span>
            ) : null}
            <p
              id={bodyId}
              className={`whitespace-pre-line ${isReview ? 'font-editorial text-[18px] italic leading-[30px] text-text' : 'text-body-md text-muted'} ${long && !expanded ? 'line-clamp-[12]' : ''}`}
            >
              {body}
            </p>
            {long ? (
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={bodyId}
                onClick={() => setExpanded((v) => !v)}
                className="mt-xs inline-flex h-11 items-center rounded-[10px] px-xs text-label font-semibold text-primary hover:bg-tint-primary"
              >
                {expanded ? 'Thu gọn' : 'Xem toàn bộ'}
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-xs">
          <StatusChip code={contentStatus} />
          {!exists && contentStatus !== 'MISSING' ? (
            <StatusChip label="Không còn tồn tại" tone="danger" />
          ) : null}
        </div>
        {!exists ? (
          <p className="text-body-sm text-muted">
            Nội dung này không còn trên nền tảng nên không thể ẩn. Bạn vẫn có thể bỏ qua báo cáo.
          </p>
        ) : null}
      </div>
      {stamp}
    </article>
  );
}

/**
 * The outcome pressed onto the evidence like an office stamp: a double ring,
 * the decision in capitals and the day under it. It comes down (`sb-stamp`)
 * only when the decision lands while the admin is on the page.
 */
export function DecisionStamp({
  status,
  day,
  animate,
}: {
  status: string;
  day: string | null;
  animate: boolean;
}) {
  const label = statusLabel(status).label;
  const hidden = status === 'HIDDEN';
  const ink = hidden ? 'text-error' : 'text-muted';
  return (
    <div
      role="img"
      aria-label={day ? `${label}, ${day}` : label}
      className={`pointer-events-none absolute right-sm top-sm h-[88px] w-[88px] md:right-md md:top-md md:h-[120px] md:w-[120px] ${ink} ${animate ? 'sb-stamp' : '-rotate-[9deg]'}`}
    >
      <svg viewBox="0 0 120 120" className="h-full w-full opacity-[0.85]" aria-hidden="true">
        <circle cx="60" cy="60" r="56" fill="none" stroke="currentColor" strokeWidth="4" />
        <circle cx="60" cy="60" r="47" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <text
          x="60"
          y={day ? 58 : 66}
          textAnchor="middle"
          fill="currentColor"
          fontSize={label.length > 8 ? 15 : 19}
          fontWeight="800"
          className="font-sign"
        >
          {label.toUpperCase()}
        </text>
        {day ? (
          <text
            x="60"
            y="80"
            textAnchor="middle"
            fill="currentColor"
            fontSize="11"
            fontWeight="700"
            className="font-sign"
          >
            {day}
          </text>
        ) : null}
      </svg>
    </div>
  );
}

/** The detail page's shape while the report loads. */
export function ReviewSkeleton({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-label={label}
      className="mx-auto flex w-full max-w-[1320px] flex-col gap-md p-md md:px-lg lg:px-xl lg:py-lg"
    >
      <div className="flex items-center gap-sm">
        <Skeleton className="h-11 w-11 rounded-full" />
        <Skeleton className="h-8 w-64" />
      </div>
      <div className="grid gap-lg xl:grid-cols-[minmax(0,1fr)_368px]">
        <div className="flex flex-col gap-md">
          <Skeleton className="h-[240px] w-full rounded-[20px]" />
          <Skeleton className="h-14 w-full rounded-[14px]" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
        </div>
        <div className="flex flex-col gap-sm">
          <Skeleton className="h-12 w-full rounded-[12px]" />
          <Skeleton className="h-12 w-full rounded-[12px]" />
        </div>
      </div>
    </div>
  );
}
