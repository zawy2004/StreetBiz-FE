import { useEffect, useRef, type ReactNode } from 'react';

import { Button, Icon, KerbTag, type IconName } from '@/components/common';
import { Skeleton } from '@/components/feedback';
import { VERDICT_TONES } from '@/components/illustrations';
import { statusLabel } from '@/core/constants/status-labels';
import { FoodImage } from '@/features/buyer-discovery/components/FoodImage';
import type { FoodPhoto } from '@/features/buyer-discovery/food-photos';
import { playOnce } from '@/features/food-safety/components/motion';
import { colors } from '@/theme';
import { displayDate, STATUS_CONSEQUENCE } from '../../store-view';

/** What a stall's front needs, the same for the live API and the demo store. */
export type FacadeData = {
  name: string;
  description: string | null;
  status: string;
  photos: FoodPhoto[];
  slotCode?: string;
  contractEnd?: string;
  openHours?: string;
  rating?: { average: number; count: number };
};

/**
 * The "OPEN / CLOSED" board hanging at the stall, on two thin cords. When the
 * status really changes it flips over like the real one.
 */
export function HangingStatusSign({ status, size = 'md' }: { status: string; size?: 'sm' | 'md' }) {
  const { label, tone } = statusLabel(status);
  const ink = VERDICT_TONES[tone];
  const board = useRef<HTMLParagraphElement>(null);
  const shown = useRef(status);

  useEffect(() => {
    if (shown.current === status) return;
    shown.current = status;
    playOnce(
      board.current,
      [
        { transform: 'perspective(420px) rotateY(180deg)' },
        { transform: 'perspective(420px) rotateY(0deg)' },
      ],
      { duration: 500 },
    );
  }, [status]);

  return (
    <div className="pointer-events-none flex flex-col items-center">
      <svg
        aria-hidden="true"
        viewBox="0 0 64 20"
        className={size === 'md' ? 'h-5 w-16' : 'h-3.5 w-12'}
      >
        <path
          d="M32 2 L8 19 M32 2 L56 19"
          stroke="rgb(var(--c-text) / 0.55)"
          strokeWidth="1.6"
          fill="none"
        />
        <circle cx="32" cy="2.5" r="2.2" fill="rgb(var(--c-text) / 0.7)" />
      </svg>
      <p
        ref={board}
        className={`-mt-0.5 flex items-center gap-1.5 rounded-[6px] font-sign font-extrabold uppercase tracking-[0.04em] shadow-card ring-2 ring-current [font-stretch:90%] ${size === 'md' ? 'px-sm py-1 text-[15px]' : 'px-xs py-0.5 text-[12px]'} ${ink.wash} ${ink.ink}`}
      >
        <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
        {label.toUpperCase()}
      </p>
    </div>
  );
}

/**
 * A stall as buyers meet it: cover photo, the hanging status board, the name
 * in the buyers' editorial face, and along the bottom the painted kerb with
 * the slot plate of the pavement it stands on.
 */
export function StorefrontFacade({
  data,
  variant = 'full',
  photoIcon = 'storefront-outline',
  children,
}: {
  data: FacadeData;
  variant?: 'full' | 'preview';
  photoIcon?: IconName;
  children?: ReactNode;
}) {
  const preview = variant === 'preview';
  const consequence = STATUS_CONSEQUENCE[data.status];
  return (
    <div
      className={[
        'group overflow-hidden bg-card ring-1 ring-border',
        preview
          ? 'rounded-[20px] shadow-card'
          : 'rounded-[28px] shadow-card transition-[box-shadow,transform] duration-300 [transition-timing-function:var(--ease-out)] hover:-translate-y-0.5 hover:shadow-card-hover',
      ].join(' ')}
    >
      <div
        className={
          preview
            ? 'flex flex-col'
            : 'grid md:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]'
        }
      >
        <div
          className={`relative w-full overflow-hidden ${preview ? 'aspect-[16/9]' : 'aspect-[16/9] md:aspect-auto md:min-h-[240px]'}`}
        >
          <FoodImage
            photos={data.photos}
            icon={photoIcon}
            iconSize={preview ? 36 : 52}
            iconColor={colors.primary}
            placeholderClassName="bg-[#FFF3E8] dark:bg-sunken"
            className="h-full w-full"
            imgClassName={
              preview
                ? ''
                : 'transition-transform duration-700 [transition-timing-function:var(--ease-out)] group-hover:scale-[1.03]'
            }
            showIllustrativeTag
          />
          <div className={`absolute top-0 ${preview ? 'right-sm' : 'right-md'}`}>
            <HangingStatusSign status={data.status} size={preview ? 'sm' : 'md'} />
          </div>
        </div>
        <div className={`flex min-w-0 flex-col gap-sm ${preview ? 'p-sm' : 'p-md md:p-lg'}`}>
          {preview ? (
            <p className="line-clamp-2 font-editorial text-[22px] font-semibold leading-tight text-text">
              {data.name || 'Tên quán sẽ hiện ở đây'}
            </p>
          ) : (
            <h2
              title={data.name}
              className="line-clamp-2 font-editorial text-[26px] font-semibold leading-[1.1] tracking-[-0.015em] text-text [font-variation-settings:'opsz'_48] md:text-[32px]"
            >
              {data.name}
            </h2>
          )}
          <p
            className={`line-clamp-3 ${preview ? 'text-body-md' : 'text-body-lg'} ${data.description ? 'text-text/80' : 'text-muted'}`}
          >
            {data.description || 'Chưa có mô tả'}
          </p>
          {data.openHours || data.rating ? (
            <p className="flex flex-wrap items-center gap-x-sm gap-y-1 text-body-md text-text/80">
              {data.rating && data.rating.count > 0 ? (
                <span className="inline-flex items-center gap-1">
                  <Icon name="star" size={16} color={colors.accent} weight="fill" />
                  {data.rating.average.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} (
                  {data.rating.count})
                </span>
              ) : null}
              {data.openHours ? (
                <span className="inline-flex items-center gap-1">
                  <Icon name="clock-outline" size={16} color="currentColor" />
                  {data.openHours}
                </span>
              ) : null}
            </p>
          ) : null}
          {!preview && consequence ? (
            <p className="text-body-sm text-muted">{consequence}</p>
          ) : null}
          {children ? <div className="mt-auto pt-xs">{children}</div> : null}
        </div>
      </div>
      <div className="relative">
        {data.slotCode ? (
          <div
            className={`flex flex-wrap items-center gap-x-sm gap-y-1 pb-xs ${preview ? 'px-sm' : 'px-md md:px-lg'}`}
          >
            <KerbTag code={data.slotCode} />
            {data.contractEnd ? (
              <span className="text-body-sm text-text/80">
                Hợp đồng đến {displayDate(data.contractEnd)}
              </span>
            ) : null}
          </div>
        ) : null}
        <div aria-hidden="true" className={preview ? 'sb-kerb sb-kerb-thin' : 'sb-kerb'} />
      </div>
    </div>
  );
}

/** Orders and takings as two big tiles by the title; the new-order count when it is known. */
export function StoreShortcuts({
  newOrders,
  onOrders,
  onSales,
}: {
  newOrders: number | undefined;
  onOrders: () => void;
  onSales: () => void;
}) {
  const tile =
    'group flex min-h-16 min-w-0 items-center gap-sm rounded-[18px] bg-card px-sm py-xs text-left shadow-card ring-1 ring-border transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-card-hover md:px-md';
  return (
    <div className="grid grid-cols-2 gap-sm xl:w-[440px]">
      <button
        type="button"
        onClick={onOrders}
        aria-label={newOrders ? `Đơn hàng, ${newOrders} đơn mới` : undefined}
        className={tile}
      >
        <span className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-tint-primary text-primary">
          <Icon name="receipt-text-outline" size={20} color="currentColor" weight="duotone" />
          {newOrders ? (
            <span
              aria-hidden="true"
              className="absolute right-0 top-0 size-2.5 rounded-full bg-brand"
            >
              <span className="sb-ping absolute inset-0 rounded-full bg-brand" />
            </span>
          ) : null}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-body-md font-semibold text-text">Đơn hàng</span>
          {newOrders !== undefined ? (
            <span className="truncate text-body-sm text-muted">
              <span
                className={`font-sign text-[20px] font-bold leading-none ${newOrders ? 'text-primary' : 'text-muted'}`}
              >
                {newOrders}
              </span>{' '}
              đơn mới
            </span>
          ) : null}
        </span>
        <Icon
          name="chevron-right"
          size={18}
          color="currentColor"
          className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5"
        />
      </button>
      <button type="button" onClick={onSales} className={tile}>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-tint-tertiary text-tertiary">
          <Icon name="chart-bar" size={20} color="currentColor" weight="duotone" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-body-md font-semibold text-text">Doanh thu</span>
          <span className="truncate text-body-sm text-muted">Theo ngày, tuần, tháng</span>
        </span>
        <Icon
          name="chevron-right"
          size={18}
          color="currentColor"
          className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5"
        />
      </button>
    </div>
  );
}

/**
 * An empty pavement slot seen from above, its code painted in the middle: the
 * stall that could stand here. The one "Tạo gian hàng" button of the page.
 */
export function OpenAnotherStall({
  slotCode,
  contractEnd,
  onCreate,
  large = false,
}: {
  slotCode: string;
  contractEnd: string;
  onCreate: () => void;
  large?: boolean;
}) {
  return (
    <section
      aria-labelledby="open-stall-title"
      className={`group flex flex-col gap-md rounded-[28px] bg-[#FFF3E8] p-md ring-1 ring-brand/20 dark:bg-brand/10 md:p-lg ${large ? 'md:flex-row md:items-center md:gap-xl' : ''}`}
    >
      <div
        aria-hidden="true"
        className={`relative mx-auto w-full ${large ? 'max-w-[300px] md:mx-0' : 'max-w-[260px]'}`}
      >
        <svg viewBox="0 0 260 150" className="h-auto w-full">
          <rect
            x="6"
            y="6"
            width="248"
            height="124"
            rx="14"
            className="transition-[stroke-dashoffset] duration-[1200ms] ease-linear group-hover:[stroke-dashoffset:-68]"
            style={{
              fill: 'rgb(var(--c-card))',
              stroke: 'rgb(var(--c-brand) / 0.75)',
              strokeWidth: 3,
              strokeDasharray: '12 5',
            }}
          />
          {Array.from({ length: 12 }, (_, i) => (
            <rect
              key={i}
              x={6 + i * 20.7}
              y="138"
              width="20.7"
              height="8"
              style={{ fill: i % 2 ? 'rgb(var(--c-kerb-paint))' : 'rgb(var(--c-kerb))' }}
            />
          ))}
          <text
            x="130"
            y="80"
            textAnchor="middle"
            className="font-sign"
            style={{
              fill: 'rgb(var(--c-brand) / 0.85)',
              fontSize: 34,
              fontWeight: 800,
              letterSpacing: '0.06em',
              fontStretch: '70%',
            }}
          >
            {slotCode}
          </text>
        </svg>
      </div>
      <div className="flex min-w-0 flex-col gap-sm">
        <h2 id="open-stall-title" className="font-heading text-[21px] font-bold text-text">
          Mở thêm gian hàng
        </h2>
        <p className="text-body-md text-text/80">
          Ô <span className="font-sign font-bold tracking-[0.03em] text-text">{slotCode}</span> đang
          trống. Hợp đồng đến {displayDate(contractEnd)}.
        </p>
        <div className="sm:w-auto">
          <Button label="Tạo gian hàng" onPress={onCreate} />
        </div>
      </div>
    </section>
  );
}

const STEPS: { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'storefront-outline',
    title: 'Mở gian hàng trên ô đã thuê',
    text: 'Mỗi ô có hợp đồng còn hiệu lực mở được một gian hàng.',
  },
  {
    icon: 'camera-plus-outline',
    title: 'Thêm món có ảnh thật',
    text: 'Ảnh món của chính quán giúp khách nhận ra ngay.',
  },
  {
    icon: 'shield-check-outline',
    title: 'Nộp giấy ATTP cho món cần',
    text: 'Món nước, cơm - bún - phở… chỉ hiện với khách khi có giấy.',
  },
];

/** Three steps from a rented slot to a stall on the market. Static. */
export function StartSellingSteps() {
  return (
    <section
      aria-labelledby="start-selling-title"
      className="flex flex-col gap-md rounded-[24px] bg-card p-md shadow-card ring-1 ring-border md:p-lg"
    >
      <h2 id="start-selling-title" className="font-heading text-[19px] font-bold text-text">
        Ba bước để quán lên chợ
      </h2>
      <ol className="flex flex-col gap-sm">
        {STEPS.map((step, index) => (
          <li key={step.title} className="flex items-start gap-sm">
            <span className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-[#FFF3E8] text-primary dark:bg-brand/15">
              <Icon name={step.icon} size={20} color="currentColor" weight="duotone" />
              <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-primary font-sign text-[11px] font-bold text-on-primary">
                {index + 1}
              </span>
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-body-md font-semibold text-text">{step.title}</span>
              <span className="text-body-sm text-muted">{step.text}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** First load: two tiles, one facade on its kerb, and the side column. */
export function StoreSkeleton() {
  return (
    <div
      aria-busy="true"
      className="mx-auto flex w-full max-w-[1320px] flex-col gap-md p-md md:px-lg lg:px-xl lg:py-lg"
    >
      <span className="sr-only">Đang tải…</span>
      <div className="flex flex-wrap items-end justify-between gap-md">
        <div className="flex flex-col gap-xs">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="grid w-full grid-cols-2 gap-sm xl:w-[440px]">
          <Skeleton className="h-16 rounded-[18px]" />
          <Skeleton className="h-16 rounded-[18px]" />
        </div>
      </div>
      <div className="grid gap-lg xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="overflow-hidden rounded-[28px] bg-card ring-1 ring-border">
          <div className="grid md:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
            <Skeleton className="aspect-[16/9] w-full rounded-none md:aspect-auto md:min-h-[240px]" />
            <div className="flex flex-col gap-sm p-lg">
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="mt-sm h-12 w-full" />
            </div>
          </div>
          <div className="h-[10px] bg-border" />
        </div>
        <Skeleton className="hidden h-[260px] rounded-[28px] xl:block" />
      </div>
    </div>
  );
}
