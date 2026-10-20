import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { Avatar, Icon } from '@/components/common';
import { EmptyState } from '@/components/feedback';
import { VERDICT_TONES } from '@/components/illustrations';
import { StatusChip } from '@/components/status';
import { statusLabel } from '@/core/constants/status-labels';
import { directionsUrl } from '@/features/buyer-discovery/discovery-format';
import { menuItemPhotos } from '@/features/buyer-discovery/food-photos';
import { useRollingNumber } from '@/features/buyer-discovery/rolling-number';
import { SidewalkStrip } from '@/features/buyer-discovery/components/storefront/SidewalkStrip';
import { SlotPlate } from '@/features/buyer-discovery/components/storefront/SlotPlate';
import type { PublicVendorProfile, VendorComment } from '../../community-api';
import { daysUntil, ratingDistribution, vendorTypeText } from '../../vendor-profile-format';
import { StallIllustration } from '../StreetArt';

const SECTION_TITLE =
  'font-editorial text-[24px] font-semibold leading-tight tracking-[-0.01em] text-text';

/**
 * The vendor's public signboard: the painted kerb along its top, a cover (a
 * stock photo of the dish the name says, labelled, or the drawn stall), the name,
 * the slot at signboard size, the vendor type and ward, the permit status, and,
 * read like the date stamp on a permit, how many days the permit has left.
 */
export function VendorSignboard({ vendor }: { vendor: PublicVendorProfile }) {
  const cover = menuItemPhotos({ itemName: vendor.displayName })[0];
  const [coverFailed, setCoverFailed] = useState(false);

  return (
    <section className="overflow-hidden rounded-[28px] bg-card shadow-sheet ring-1 ring-border">
      <div aria-hidden="true" className="sb-kerb sb-kerb-thin" />
      <div className="grid gap-lg p-md md:p-lg lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-xl lg:p-xl">
        <div className="flex min-w-0 flex-col gap-md sm:flex-row sm:items-center">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[20px] shadow-card lg:h-40 lg:w-40">
            {cover && !coverFailed ? (
              <>
                <img
                  src={cover.src}
                  alt=""
                  decoding="async"
                  onError={() => setCoverFailed(true)}
                  className="h-full w-full object-cover"
                />
                <span className="absolute bottom-1 left-1 rounded-full bg-black/45 px-1.5 py-0.5 text-[10px] leading-none text-white/90">
                  Ảnh minh họa
                </span>
              </>
            ) : (
              <StallIllustration className="h-full w-full" />
            )}
          </div>
          <div className="flex min-w-0 flex-col gap-sm">
            <h1
              title={vendor.displayName}
              className="line-clamp-3 break-words font-editorial text-[36px] font-semibold leading-[1.04] tracking-[-0.025em] text-text [font-variation-settings:'opsz'_72] md:text-[48px] xl:text-[56px]"
            >
              {vendor.displayName}
            </h1>
            <div className="flex flex-wrap items-center gap-sm">
              <SlotPlate code={vendor.slotCode} />
              <span className="text-body-md font-semibold text-text">{vendor.zoneName}</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-sm gap-y-1 text-body-md text-muted">
              <StatusChip code={vendor.permitStatus} />
              <span>{vendorTypeText(vendor.vendorType)}</span>
              <span aria-hidden="true" className="h-1 w-1 rounded-full bg-muted/60" />
              <span>{vendor.wardName ?? `#${vendor.wardId}`}</span>
            </div>
          </div>
        </div>
        <PermitValidity status={vendor.permitStatus} endDate={vendor.permitEndDate} />
      </div>
      <p className="flex flex-wrap items-center gap-x-xs gap-y-1 border-t border-border px-md py-sm text-body-sm text-muted md:px-lg lg:px-xl">
        <Icon name="information-outline" size={16} color="currentColor" />
        Theo hồ sơ công khai lúc mở trang. Muốn chắc chắn, quét mã ở quầy.
        <Link
          to="/customer/scan"
          className="inline-flex min-h-11 items-center gap-1 font-semibold text-primary underline decoration-1 underline-offset-[3px] hover:decoration-2"
        >
          <Icon name="qrcode-scan" size={16} color="currentColor" />
          Quét mã QR ở quầy
        </Link>
      </p>
    </section>
  );
}

/**
 * Valid: the days left, large (amber under 30), with the end date. Anything else
 * (expired, suspended…): no count, the status said in words on a pale wash of
 * its tone (≥ 7:1, readable at the counter in sunlight).
 */
function PermitValidity({ status, endDate }: { status: string; endDate: string }) {
  const { label, tone } = statusLabel(status);
  const until = new Date(endDate).toLocaleDateString('vi-VN');
  const days = daysUntil(endDate);
  const running = useRollingNumber(Math.max(days ?? 0, 0), { duration: 600, from: 0 });

  if (tone !== 'ok' || days == null) {
    const verdict = VERDICT_TONES[tone];
    return (
      <div
        className={`flex flex-col gap-1 rounded-[20px] px-md py-sm lg:min-w-[240px] ${verdict.wash}`}
      >
        <p
          className={`flex items-center gap-xs font-sign text-[24px] font-extrabold leading-tight [font-stretch:90%] ${verdict.ink}`}
        >
          <Icon name={verdict.icon} size={26} color="currentColor" weight="fill" />
          Giấy phép {label.toLowerCase()}
        </p>
        <p className="text-body-md text-text/80">Giấy phép có hiệu lực đến {until}</p>
      </div>
    );
  }

  const soon = days < 30;
  return (
    <div className="flex flex-col gap-0.5 lg:min-w-[220px] lg:border-l lg:border-dashed lg:border-border lg:pl-xl lg:text-right">
      <p className="flex items-baseline gap-sm lg:justify-end">
        <span
          className={`font-sign text-[56px] font-extrabold leading-none font-tabular [font-stretch:86%] ${soon ? 'text-on-secondary' : 'text-tertiary'}`}
        >
          {running}
        </span>
        <span className="text-body-md font-semibold text-text">ngày còn hiệu lực</span>
      </p>
      <p className="text-body-md text-muted">Giấy phép có hiệu lực đến {until}</p>
    </div>
  );
}

/**
 * The community's score: the average large, five mango stars, the spread of
 * the loaded reviews over five bars (growing in one after another), and the
 * verified-purchase score set apart when there is one.
 */
export function CommunityScore({ vendor }: { vendor: PublicVendorProfile }) {
  const spread = ratingDistribution(vendor.comments);
  const rated = spread.reduce((sum, n) => sum + n, 0);
  const peak = Math.max(...spread, 1);
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  const average = vendor.communityRating;

  return (
    <section
      aria-labelledby="score-title"
      className="flex flex-col gap-md rounded-[24px] bg-card p-md shadow-card ring-1 ring-border md:p-lg"
    >
      <h2 id="score-title" className={SECTION_TITLE}>
        Điểm cộng đồng
      </h2>
      <div className="grid gap-lg sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
        <div className="flex flex-col gap-1">
          <span
            className={`font-sign font-extrabold leading-none text-text [font-stretch:86%] ${average != null ? 'text-[56px] font-tabular' : 'text-[28px]'}`}
          >
            {average?.toFixed(1) ?? 'Chưa có điểm'}
          </span>
          <Stars value={average ?? 0} />
          <span className="text-body-md text-muted">({vendor.communityCount} đánh giá)</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <ul aria-hidden="true" className="flex flex-col gap-1.5">
            {spread.map((count, index) => (
              <li
                key={index}
                className="grid grid-cols-[28px_minmax(0,1fr)_28px] items-center gap-sm text-body-sm text-muted"
              >
                <span className="flex items-center gap-0.5 font-semibold text-text">
                  {5 - index}
                  <Icon name="star" size={12} color="rgb(var(--c-accent))" weight="fill" />
                </span>
                <span className="h-2.5 overflow-hidden rounded-full bg-sunken">
                  <span
                    className="block h-full origin-left rounded-full bg-accent transition-transform duration-500 [transition-timing-function:var(--ease-out)]"
                    style={{
                      width: `${(count / peak) * 100}%`,
                      transform: `scaleX(${grown ? 1 : 0})`,
                      transitionDelay: `${index * 60}ms`,
                    }}
                  />
                </span>
                <span className="text-right font-tabular">{count}</span>
              </li>
            ))}
          </ul>
          <p className="sr-only">
            {spread.map((count, index) => `${5 - index} sao: ${count} đánh giá`).join(', ')}
          </p>
          <p className="text-body-xs text-muted">Theo {rated} đánh giá có chấm sao</p>
        </div>
      </div>
      {vendor.verifiedCount > 0 ? (
        <div className="flex flex-wrap items-center gap-x-sm gap-y-1 rounded-[16px] bg-tint-tertiary px-md py-sm">
          <Icon
            name="shield-check-outline"
            size={20}
            color="rgb(var(--c-tertiary))"
            weight="fill"
          />
          <span className="text-body-md font-semibold text-text">
            Đánh giá từ giao dịch xác thực
          </span>
          <span className="font-sign text-[18px] font-bold font-tabular text-tertiary">
            {`${vendor.verifiedRating?.toFixed(1) ?? '—'} ★ (${vendor.verifiedCount})`}
          </span>
        </div>
      ) : null}
    </section>
  );
}

function Stars({ value, size = 20 }: { value: number; size?: number }) {
  return (
    <span aria-hidden="true" className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Icon
          key={i}
          name={i <= Math.round(value) ? 'star' : 'star-outline'}
          size={size}
          color={
            i <= Math.round(value) ? 'rgb(var(--c-accent))' : 'rgb(var(--c-on-secondary) / 0.45)'
          }
          weight={i <= Math.round(value) ? 'fill' : 'regular'}
        />
      ))}
    </span>
  );
}

/** Where the vendor trades: the pavement with its slot lit, the facts in words, and the way there. */
export function VendorLocation({ vendor }: { vendor: PublicVendorProfile }) {
  const rows: { label: string; value: string }[] = [
    { label: 'Vị trí', value: `${vendor.zoneName} · Ô ${vendor.slotCode}` },
    { label: 'Phường', value: vendor.wardName ?? `#${vendor.wardId}` },
    { label: 'Địa chỉ đăng ký', value: vendor.address ?? 'Chưa cập nhật' },
  ];
  return (
    <section
      aria-labelledby="location-title"
      className="overflow-hidden rounded-[24px] bg-[#FFF3E8] ring-1 ring-[#F5DCC6] dark:bg-card dark:ring-border"
    >
      <SidewalkStrip className="h-auto w-full" />
      <div className="flex flex-col gap-md p-md">
        <h2
          id="location-title"
          className="font-editorial text-[22px] font-semibold leading-tight text-text"
        >
          Nơi bán
        </h2>
        <dl className="flex flex-col gap-sm">
          {rows.map((row) => (
            <div key={row.label} className="flex flex-col gap-0.5">
              <dt className="text-body-xs font-medium text-muted">{row.label}</dt>
              <dd className="text-body-md font-semibold text-text">{row.value}</dd>
            </div>
          ))}
        </dl>
        <a
          href={directionsUrl(vendor.latitude, vendor.longitude)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-12 items-center justify-center gap-xs rounded-[12px] bg-card px-lg text-[15px] font-semibold text-text ring-1 ring-inset ring-border transition-colors hover:bg-sunken"
        >
          <Icon name="walk" size={20} color="currentColor" />
          Chỉ đường
        </a>
      </div>
    </section>
  );
}

const FIRST_REVIEWS = 6;

/** The guest book: reviews set as quotations, six at first, the rest one tap away (no new request). */
export function ReviewList({ comments }: { comments: VendorComment[] }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? comments : comments.slice(0, FIRST_REVIEWS);
  const hidden = comments.length - shown.length;

  return (
    <section aria-labelledby="reviews-title" className="flex flex-col gap-md">
      <h2 id="reviews-title" className={SECTION_TITLE}>
        Đánh giá cộng đồng ({comments.length})
      </h2>
      {comments.length === 0 ? (
        <div className="rounded-[24px] bg-card ring-1 ring-border">
          <EmptyState
            icon="comment-outline"
            title="Chưa có đánh giá nào"
            description="Bạn đã ăn ở đây? Viết đánh giá đầu tiên."
          />
        </div>
      ) : (
        <ul className={`grid gap-md ${comments.length > 2 ? 'md:grid-cols-2' : ''}`}>
          {shown.map((comment, index) => (
            <li
              key={comment.commentId}
              className={index >= FIRST_REVIEWS ? 'transition-opacity duration-200' : undefined}
            >
              <ReviewCard comment={comment} />
            </li>
          ))}
        </ul>
      )}
      {hidden > 0 ? (
        <div>
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="inline-flex h-12 items-center gap-xs rounded-full bg-card px-lg text-label font-semibold text-text shadow-card ring-1 ring-border hover:ring-text/25"
          >
            Xem thêm {hidden} đánh giá
            <Icon name="chevron-down" size={16} color="currentColor" />
          </button>
        </div>
      ) : null}
    </section>
  );
}

function ReviewCard({ comment }: { comment: VendorComment }) {
  return (
    <figure className="relative flex h-full flex-col gap-sm rounded-[24px] bg-card p-md shadow-card ring-1 ring-border md:p-lg">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-md top-0 font-editorial text-[88px] leading-none text-primary/25"
      >
        “
      </span>
      {comment.rating ? (
        <span className="flex items-center gap-xs">
          <Stars value={comment.rating} size={16} />
          <span className="text-body-sm font-semibold text-text">{comment.rating}</span>
        </span>
      ) : null}
      {comment.commentText ? (
        <blockquote className="font-editorial text-[18px] leading-[1.5] text-text">
          {comment.commentText}
        </blockquote>
      ) : (
        <p className="text-body-sm text-muted">Chỉ chấm sao, không kèm nhận xét.</p>
      )}
      <figcaption className="mt-auto flex items-center gap-sm pt-xs">
        <Avatar name={comment.authorName} size={32} />
        <span className="min-w-0 flex-1 truncate text-body-sm font-semibold text-text">
          {comment.authorName}
        </span>
        <span className="shrink-0 text-body-sm text-muted">
          {new Date(comment.createdAt).toLocaleDateString('vi-VN')}
        </span>
      </figcaption>
    </figure>
  );
}

/** Two ways for the buyer to have a say; the report one in red outline (never a red slab). */
export function ProfileActions({
  onReview,
  onReport,
  layout,
}: {
  onReview: () => void;
  onReport: () => void;
  layout: 'stack' | 'row';
}) {
  return (
    <div className={layout === 'row' ? 'grid w-full grid-cols-2 gap-sm' : 'flex flex-col gap-sm'}>
      <ActionButton onPress={onReview} tone="primary" icon="pencil-outline">
        Viết đánh giá
      </ActionButton>
      <ActionButton onPress={onReport} tone="report" icon="flag-outline">
        Báo cáo vi phạm
      </ActionButton>
    </div>
  );
}

function ActionButton({
  onPress,
  tone,
  icon,
  children,
}: {
  onPress: () => void;
  tone: 'primary' | 'report';
  icon: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      className={[
        'inline-flex h-12 min-w-0 items-center justify-center gap-xs rounded-[12px] px-md text-[15px] font-semibold transition-[background-color,transform] duration-150 active:translate-y-px',
        tone === 'primary'
          ? 'bg-primary text-on-primary shadow-[0_10px_22px_-12px_rgb(var(--c-primary)/0.9)] hover:bg-primary-pressed'
          : 'bg-card text-error ring-1 ring-inset ring-error/40 hover:bg-tint-error',
      ].join(' ')}
    >
      <Icon name={icon} size={18} color="currentColor" />
      <span className="truncate">{children}</span>
    </button>
  );
}
