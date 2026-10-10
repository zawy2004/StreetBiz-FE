import { useEffect, useState, type ReactNode } from 'react';

import { Icon, Money } from '@/components/common';
import { Skeleton } from '@/components/feedback';
import { StatusChip } from '@/components/status';
import { FoodImage } from '@/features/buyer-discovery/components/FoodImage';
import type { FoodPhoto } from '@/features/buyer-discovery/food-photos';
import { IllustrativeTag } from '@/features/orders/components/OrderShapes';
import { SCALLOP_BOTTOM } from '@/features/orders/components/order-display';
import { cartLineNameId } from './cart-display';

/**
 * C10 parts. The cart is drawn as a tray seen from above (the dishes fanned out,
 * the stall named like its sign) beside a till slip waiting to be settled.
 * Display only: every number here comes from the cart the server returned.
 */

export type TrayDish = { key: string; name: string; photos: FoodPhoto[] };

const TILT = ['-rotate-6', 'rotate-0', 'rotate-6'];
const SHIFT = ['-translate-x-[38%]', 'translate-x-0', 'translate-x-[38%]'];

/** Photos fanned on the tray: they start squared up and spread once, as the cart lands. */
function FannedDishes({ dishes }: { dishes: TrayDish[] }) {
  const [fanned, setFanned] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setFanned(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  const shown = dishes.slice(0, 3);
  const extra = dishes.length - shown.length;
  const single = shown.length === 1;
  // Back to front, with the first dish on top: in the middle when there are
  // three, on the left when there are two. Position 0/1/2 = left/middle/right.
  const layers: { dish: TrayDish; position: number }[] =
    shown.length === 3
      ? [
          { dish: shown[1]!, position: 0 },
          { dish: shown[2]!, position: 2 },
          { dish: shown[0]!, position: 1 },
        ]
      : shown.length === 2
        ? [
            { dish: shown[1]!, position: 2 },
            { dish: shown[0]!, position: 0 },
          ]
        : shown.map((dish) => ({ dish, position: 1 }));

  return (
    <div
      className={`relative mx-auto shrink-0 ${
        single
          ? 'h-[148px] w-[148px] md:h-[184px] md:w-[184px]'
          : 'h-[118px] w-[230px] md:h-[150px] md:w-[290px]'
      }`}
    >
      {layers.map(({ dish, position }, depth) => {
        return (
          <div
            key={dish.key}
            style={{ transitionDelay: `${depth * 80}ms`, zIndex: depth + 1 }}
            className={[
              'absolute rounded-[20px] shadow-sheet ring-4 ring-card transition-transform duration-500 [transition-timing-function:var(--ease-out)]',
              single
                ? 'inset-0'
                : 'left-1/2 top-0 -ml-[59px] h-[118px] w-[118px] md:-ml-[75px] md:h-[150px] md:w-[150px]',
              fanned && !single ? `${TILT[position]} ${SHIFT[position]}` : '',
            ].join(' ')}
          >
            <FoodImage
              photos={dish.photos}
              icon="silverware-fork-knife"
              iconSize={36}
              iconColor="rgb(var(--c-primary))"
              className="h-full w-full rounded-[20px]"
              placeholderClassName="bg-tint-primary"
            />
          </div>
        );
      })}
      {extra > 0 ? (
        <span className="absolute -bottom-2 right-1 z-10 flex h-10 min-w-10 items-center justify-center rounded-full bg-card px-sm font-sign text-[15px] font-bold text-text shadow-card ring-1 ring-border">
          +{extra}
        </span>
      ) : null}
    </div>
  );
}

/**
 * The tray: dishes fanned on a pale orange board, the stall's name as its sign,
 * whether it is serving, how many dishes, and where to collect them.
 */
export function CartTray({
  dishes,
  storefrontName,
  storefrontStatus,
  count,
  address,
}: {
  dishes: TrayDish[];
  storefrontName: string;
  storefrontStatus?: string;
  count: number;
  address?: string | null;
}) {
  const illustrative = dishes.some((dish) => dish.photos[0]?.illustrative);
  return (
    <section
      aria-label="Khay món"
      className="relative overflow-hidden rounded-[28px] bg-[#FFF3E8] px-md pb-md pt-lg ring-1 ring-[#FFD9BF] dark:bg-[#2A2420] dark:ring-white/10 md:flex md:items-center md:gap-xl md:px-xl md:py-lg"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-brand/10"
      />
      <FannedDishes dishes={dishes} />
      <div className="relative mt-md min-w-0 flex-1 md:mt-0">
        <p className="font-editorial text-[28px] font-semibold leading-[1.1] tracking-[-0.02em] text-text md:text-[32px] lg:text-[40px]">
          {storefrontName}
        </p>
        <div className="mt-sm flex flex-wrap items-center gap-xs">
          {storefrontStatus ? <StatusChip code={storefrontStatus} /> : null}
          <span className="font-sign text-[15px] font-semibold text-text">
            {count.toLocaleString('vi-VN')} món
          </span>
        </div>
        <p className="mt-sm flex items-start gap-1.5 text-body-md text-text/80">
          <Icon
            name="map-marker-outline"
            size={17}
            color="rgb(var(--c-primary))"
            className="mt-0.5 shrink-0"
          />
          <span>
            {address ? `${address} · ` : ''}
            Nhận tại quầy, không giao hàng
          </span>
        </p>
        {illustrative ? <IllustrativeTag className="mt-sm" /> : null}
      </div>
    </section>
  );
}

/** 44px − / + buttons with the quantity between; the number only changes once the server answers. */
export function QtyStepper({
  quantity,
  busy,
  decreaseDisabled,
  increaseDisabled,
  onDecrease,
  onIncrease,
  describedBy,
}: {
  quantity: number;
  busy?: boolean;
  decreaseDisabled?: boolean;
  increaseDisabled?: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
  describedBy?: string;
}) {
  const button =
    'flex h-11 w-11 items-center justify-center rounded-full bg-card text-text ring-1 ring-border transition-[transform,background-color] duration-100 hover:bg-sunken active:scale-[0.94] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100';
  return (
    <div className="flex shrink-0 items-center gap-xs rounded-full bg-sunken/70 p-1">
      <button
        type="button"
        aria-label="Giảm số lượng"
        aria-describedby={describedBy}
        disabled={decreaseDisabled}
        onClick={onDecrease}
        className={button}
      >
        <Icon name="minus" size={18} color="currentColor" weight="fill" />
      </button>
      <span className="relative flex w-8 justify-center font-sign text-[20px] font-bold tabular-nums text-text">
        <span key={quantity} className="sb-pop">
          {quantity}
        </span>
        {busy ? (
          <span
            aria-hidden="true"
            className="absolute -right-1 -top-1 h-2.5 w-2.5 animate-spin rounded-full border-2 border-primary border-t-transparent"
          />
        ) : null}
      </span>
      <button
        type="button"
        aria-label="Tăng số lượng"
        aria-describedby={describedBy}
        disabled={increaseDisabled}
        onClick={onIncrease}
        className={button}
      >
        <Icon name="plus" size={18} color="currentColor" weight="fill" />
      </button>
    </div>
  );
}

/** One dish in the cart: photo, name (said once), price per dish, line total, note, availability. */
export function CartLine({
  id,
  name,
  photos,
  unitPrice,
  quantity,
  note,
  unavailable,
  stepper,
}: {
  id: string;
  name: string;
  photos: FoodPhoto[];
  unitPrice: number;
  quantity: number;
  note?: string | null;
  unavailable?: boolean;
  stepper: ReactNode;
}) {
  const nameId = cartLineNameId(id);
  return (
    <li className="flex gap-sm py-md first:pt-0 last:pb-0 md:gap-md">
      <div className="group shrink-0" title={photos[0]?.illustrative ? 'Ảnh minh họa' : undefined}>
        <FoodImage
          photos={photos}
          icon="silverware-fork-knife"
          iconSize={26}
          iconColor="rgb(var(--c-primary))"
          className="h-16 w-16 rounded-[14px] ring-1 ring-border md:h-[72px] md:w-[72px]"
          placeholderClassName="bg-tint-primary"
          imgClassName="transition-transform duration-200 group-hover:scale-[1.04]"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p
          id={nameId}
          title={name}
          className="line-clamp-2 font-editorial text-[18px] font-semibold leading-6 text-text"
        >
          {name}
        </p>
        <p className="mt-0.5 font-tabular text-body-sm text-muted">
          {unitPrice.toLocaleString('vi-VN')} đ/món
        </p>
        {note ? (
          <p className="mt-xs inline-flex max-w-full items-start gap-1 rounded-[8px] bg-[#FFF3D1] px-2 py-1 text-body-sm text-[#6B4100] dark:bg-[#3A2A08] dark:text-[#FFD27A]">
            <Icon
              name="comment-outline"
              size={14}
              color="currentColor"
              className="mt-[3px] shrink-0"
            />
            <span className="break-words">Ghi chú: {note}</span>
          </p>
        ) : null}
        {unavailable ? (
          <p className="mt-xs flex items-center gap-1 text-body-sm font-semibold text-[#8F1717] dark:text-[#FF9A90]">
            <Icon name="alert-circle-outline" size={16} color="currentColor" className="shrink-0" />
            <span className="rounded-[6px] bg-[#FDEBEA] px-1.5 py-0.5 dark:bg-[#3A1414]">
              Món hiện không còn bán.
            </span>
          </p>
        ) : null}
        <div className="mt-sm flex flex-wrap items-center justify-between gap-sm">
          <Money amountVnd={unitPrice * quantity} />
          {stepper}
        </div>
      </div>
    </li>
  );
}

export function CheckoutBlockReason({ id, reason }: { id?: string; reason: string }) {
  return (
    <p
      id={id}
      className="flex items-start gap-1.5 rounded-[12px] bg-[#FFF3D1] px-sm py-xs text-body-sm font-medium text-[#6B4100] dark:bg-[#3A2A08] dark:text-[#FFD27A]"
    >
      <Icon name="information-outline" size={16} color="currentColor" className="mt-0.5 shrink-0" />
      <span>{reason}</span>
    </p>
  );
}

/** The amount, re-set with a small lift each time the server sends a new one. */
export function RollingMoney({
  amountVnd,
  className = '',
}: {
  amountVnd: number;
  className?: string;
}) {
  return (
    <span aria-live="polite" className={`inline-block ${className}`}>
      <span key={amountVnd} className="sb-pop inline-block whitespace-nowrap font-tabular">
        {amountVnd.toLocaleString('vi-VN')}
        <span className="ml-1 text-[0.6em]">đ</span>
      </span>
    </span>
  );
}

/**
 * The till slip beside the tray: how many dishes, a dotted leader to the
 * subtotal, and the action below. Dish names are not repeated here.
 */
export function CartSummary({
  count,
  subtotal,
  children,
}: {
  count: number;
  subtotal: number;
  children?: ReactNode;
}) {
  return (
    <div className="drop-shadow-[0_18px_28px_rgb(17_28_43/0.12)] dark:drop-shadow-none">
      <div
        style={SCALLOP_BOTTOM}
        className="flex flex-col gap-md rounded-t-[20px] bg-card px-lg pb-xl pt-lg ring-1 ring-border"
      >
        <div className="flex items-center justify-between">
          <p className="font-sign text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">
            Phiếu tạm tính
          </p>
          <Icon name="receipt-text-outline" size={20} color="rgb(var(--c-primary))" />
        </div>
        <div className="flex items-baseline gap-xs text-body-md text-text">
          <span>{count.toLocaleString('vi-VN')} món</span>
        </div>
        <div className="flex items-end gap-xs">
          <span className="text-body-md text-muted">Tạm tính</span>
          <span
            aria-hidden="true"
            className="mb-1.5 flex-1 border-b-2 border-dotted border-border"
          />
          <RollingMoney
            amountVnd={subtotal}
            className="font-sign text-[30px] font-bold leading-9 tracking-[-0.02em] text-text"
          />
        </div>
        {children}
        <p className="flex items-center gap-1.5 text-body-sm text-muted">
          <Icon name="storefront-outline" size={16} color="currentColor" />
          Nhận tại quầy, không giao hàng
        </p>
      </div>
    </div>
  );
}

/** Held while an order from this cart waits to be paid: a slip clipped to the tray. */
export function CartLockNotice({ children }: { children?: ReactNode }) {
  return (
    <div
      role="status"
      className="relative flex items-start gap-sm rounded-[18px] bg-[#FFF3D1] p-md text-[#6B4100] ring-1 ring-[#6B4100]/20 dark:bg-[#3A2A08] dark:text-[#FFD27A]"
    >
      <span
        aria-hidden="true"
        className="absolute -top-2 left-lg h-4 w-10 rounded-[4px] bg-[#FFB703]/70 shadow-sm"
      />
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card/80">
        <Icon name="clock-outline" size={22} color="currentColor" weight="fill" />
      </span>
      <div className="min-w-0">
        <p className="text-[16px] font-bold leading-6">Đơn hàng đang chờ thanh toán</p>
        <p className="mt-2xs text-body-md">
          Giỏ hàng đã khoá để giữ đúng các món trong đơn. Hãy thanh toán hoặc huỷ đơn đó để sửa giỏ.
        </p>
        {children}
      </div>
    </div>
  );
}

/** An empty tray from above: the rounded board and three dashed rings where dishes would sit. */
export function EmptyTrayArt({ className = '' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 220 140" className={className}>
      <rect
        x="8"
        y="14"
        width="204"
        height="112"
        rx="26"
        className="fill-[#FFF3E8] stroke-[#FFC9A3] dark:fill-[#2A2420] dark:stroke-white/15"
        strokeWidth="2"
      />
      <rect
        x="20"
        y="26"
        width="180"
        height="88"
        rx="18"
        fill="none"
        className="stroke-[#FFD9BF] dark:stroke-white/10"
        strokeWidth="2"
      />
      {[62, 110, 158].map((cx, index) => (
        <circle
          key={cx}
          cx={cx}
          cy="70"
          r={index === 1 ? 26 : 21}
          fill="none"
          strokeWidth="2.5"
          strokeDasharray="7 6"
          className="stroke-brand/70"
        />
      ))}
      <path
        d="M104 70 h12 M110 64 v12"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="stroke-primary"
      />
    </svg>
  );
}

/** A message with the empty tray above it (guest, empty cart). */
export function TrayMessage({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="sb-pop mx-auto flex w-full max-w-[460px] flex-col items-center px-md py-xl text-center">
      <EmptyTrayArt className="h-[124px] w-[196px]" />
      <p className="mt-md font-editorial text-[24px] font-semibold leading-tight text-text">
        {title}
      </p>
      {description ? <p className="mt-xs text-body-md text-muted">{description}</p> : null}
      {action ? <div className="mt-lg w-full max-w-[280px]">{action}</div> : null}
    </div>
  );
}

/** Loading, in the shape of what arrives: the tray, two lines and the slip. */
export function CartSkeleton() {
  return (
    <div aria-label="Đang tải giỏ hàng" className="flex flex-col gap-lg">
      <div className="flex items-center gap-lg rounded-[28px] bg-sunken/60 p-lg">
        <div className="relative h-[118px] w-[200px] shrink-0">
          <Skeleton className="absolute left-0 top-2 h-[100px] w-[100px] -rotate-6 rounded-[20px]" />
          <Skeleton className="absolute left-[50px] top-0 h-[110px] w-[110px] rounded-[20px]" />
          <Skeleton className="absolute left-[100px] top-2 h-[100px] w-[100px] rotate-6 rounded-[20px]" />
        </div>
        <div className="hidden flex-1 flex-col gap-sm sm:flex">
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-5 w-1/3" />
        </div>
      </div>
      <div className="grid gap-lg lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-md rounded-[20px] bg-card p-md ring-1 ring-border">
          {[0, 1].map((row) => (
            <div key={row} className="flex gap-md">
              <Skeleton className="h-[72px] w-[72px] rounded-[14px]" />
              <div className="flex flex-1 flex-col gap-xs">
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            </div>
          ))}
        </div>
        <div className="hidden flex-col gap-sm rounded-[20px] bg-card p-lg ring-1 ring-border lg:flex">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-12 w-full rounded-[12px]" />
        </div>
      </div>
    </div>
  );
}
