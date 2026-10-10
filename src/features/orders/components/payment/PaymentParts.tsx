import { useEffect, useState, type ReactNode } from 'react';

import { Icon, Money } from '@/components/common';
import { Skeleton } from '@/components/feedback';
import { FoodImage } from '@/features/buyer-discovery/components/FoodImage';
import { storefrontPhotos } from '@/features/buyer-discovery/food-photos';
import type { Order } from '../../types/order.types';
import { OrderStatusBadge } from '../OrderStatusBadge';
import { SCALLOP_TOP, usePrefersReducedMotion } from '../order-display';
import { SIGNAL_TONE, type SignalState } from './payment-tones';

/**
 * C14 parts: a signal lamp at the toll gate. Mango while the gateway has not
 * answered, green only once the server says the order is PLACED, red when it
 * failed. The lamp and the three-party sketch are decoration (aria-hidden):
 * the verdict is always in the words beside them.
 */

const CIRCUMFERENCE = 2 * Math.PI * 70;

/** The lamp: a pale disc, a ring in the verdict's colour, its glyph. No words inside. */
export function PaymentSignal({ state }: { state: SignalState }) {
  const tone = SIGNAL_TONE[state];
  const [drawn, setDrawn] = useState(state !== 'placed');
  useEffect(() => {
    if (state !== 'placed') return;
    const frame = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(frame);
  }, [state]);

  return (
    <div
      aria-hidden="true"
      data-state={state === 'pending' ? 'pending' : state === 'failed' ? 'failed' : 'ok'}
      className={`relative mx-auto h-[136px] w-[136px] md:h-[168px] md:w-[168px] ${tone.ink}`}
    >
      <svg viewBox="0 0 168 168" className="h-full w-full">
        <circle cx="84" cy="84" r="78" className={tone.wash} />
        {state === 'pending' ? (
          <>
            <circle
              cx="84"
              cy="84"
              r="70"
              fill="none"
              strokeWidth="6"
              className="stroke-[#FFB703]/25"
            />
            <g className="origin-center animate-spin [animation-duration:2.4s] [transform-box:fill-box]">
              <circle
                cx="84"
                cy="84"
                r="70"
                fill="none"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${CIRCUMFERENCE * 0.28} ${CIRCUMFERENCE}`}
                className="stroke-[#FFB703]"
              />
            </g>
          </>
        ) : (
          <circle
            key={state}
            cx="84"
            cy="84"
            r="70"
            fill="none"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={drawn ? 0 : CIRCUMFERENCE}
            transform="rotate(-90 84 84)"
            className={`${tone.ring} transition-[stroke-dashoffset] duration-[600ms] [transition-timing-function:var(--ease-out)]`}
          />
        )}
      </svg>
      <span
        key={state}
        className={`absolute inset-0 flex items-center justify-center ${state === 'placed' ? 'sb-pop' : ''}`}
      >
        <Icon name={tone.icon} size={52} color="currentColor" weight="fill" />
      </span>
    </div>
  );
}

function Node({ icon, label, lit }: { icon: string; label: string; lit: boolean }) {
  return (
    <div className="flex w-[72px] shrink-0 flex-col items-center gap-1 text-center">
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-full ring-2 ${
          lit ? 'bg-card text-text ring-text/70' : 'bg-sunken text-muted ring-border'
        }`}
      >
        <Icon name={icon} size={20} color="currentColor" />
      </span>
      <span className="text-body-xs font-semibold leading-4 text-text/80">{label}</span>
    </div>
  );
}

/**
 * "Bạn → Cổng MoMo → StreetBiz": where the payment signal has got to. The
 * second leg runs dashed while waiting, turns solid green once confirmed, and
 * breaks with a cross on failure.
 */
export function PaymentHandshake({ gateway, state }: { gateway: string; state: SignalState }) {
  const reduced = usePrefersReducedMotion();
  const ok = state === 'placed' || state === 'confirmed';
  const failed = state === 'failed';
  return (
    <div aria-hidden="true" className="mx-auto flex w-full max-w-[420px] items-start">
      <Node icon="account-circle-outline" label="Bạn" lit />
      <div className="relative mt-[18px] h-1 flex-1">
        <span className={`absolute inset-0 rounded-full ${ok ? 'bg-[#0B7F43]' : 'bg-text/60'}`} />
      </div>
      <Node icon="wallet-outline" label={`Cổng ${gateway}`} lit />
      <div className="relative mt-[16px] flex-1">
        <svg viewBox="0 0 100 8" preserveAspectRatio="none" className="block h-2 w-full">
          {ok ? (
            <line
              x1="0"
              y1="4"
              x2="100"
              y2="4"
              strokeWidth="4"
              strokeLinecap="round"
              className="stroke-[#0B7F43]"
              strokeDasharray="100"
              strokeDashoffset="0"
            >
              {reduced ? null : (
                <animate
                  attributeName="stroke-dashoffset"
                  from="100"
                  to="0"
                  dur="0.4s"
                  fill="freeze"
                />
              )}
            </line>
          ) : (
            <line
              x1="0"
              y1="4"
              x2="100"
              y2="4"
              strokeWidth="4"
              strokeDasharray="8 7"
              className={failed ? 'stroke-[#B42318]/50' : 'stroke-[#FFB703]'}
            >
              {reduced || failed ? null : (
                <animate
                  attributeName="stroke-dashoffset"
                  from="30"
                  to="0"
                  dur="1.6s"
                  repeatCount="indefinite"
                />
              )}
            </line>
          )}
        </svg>
        {failed ? (
          <span className="absolute left-1/2 top-1/2 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#FDEBEA] text-[#8F1717] ring-2 ring-card dark:bg-[#3A1414] dark:text-[#FF9A90]">
            <Icon name="close" size={14} color="currentColor" />
          </span>
        ) : null}
        {state === 'pending' ? (
          <span className="mt-1 block text-center text-body-xs font-semibold text-[#6B4100] dark:text-[#FFD27A]">
            Chờ xác nhận
          </span>
        ) : null}
      </div>
      <Node icon="shield-check-outline" label="StreetBiz" lit={ok} />
    </div>
  );
}

/** A small strip torn off a receipt: stall, dishes, wallet, amount, order status. */
export function PaymentReceiptStrip({ order, gateway }: { order: Order; gateway: string | null }) {
  const photos = storefrontPhotos(order.storefront);
  const count = order.items.reduce((sum, item) => sum + item.quantity, 0);
  return (
    <div
      style={SCALLOP_TOP}
      className="flex flex-wrap items-center gap-sm rounded-b-[20px] bg-card px-md pb-md pt-lg ring-1 ring-border"
    >
      <span title={photos[0]?.illustrative ? 'Ảnh minh họa' : undefined}>
        <FoodImage
          photos={photos}
          icon="storefront-outline"
          iconSize={18}
          iconColor="rgb(var(--c-primary))"
          className="h-10 w-10 shrink-0 rounded-full"
          placeholderClassName="bg-tint-primary"
        />
      </span>
      <div className="min-w-0 flex-1">
        <p
          className="truncate font-editorial text-[18px] font-semibold leading-6 text-text"
          title={order.storefront.storefrontName}
        >
          {order.storefront.storefrontName}
        </p>
        <p className="text-body-sm text-muted">
          {count} món{gateway ? ` · ${gateway}` : ''}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <Money amountVnd={order.totalAmount} size="lg" className="whitespace-nowrap" />
        <OrderStatusBadge status={order.orderStatus} />
      </div>
    </div>
  );
}

/** The two simulator buttons, fenced off so nobody takes them for a real payment. */
export function SandboxPanel({ children }: { children: ReactNode }) {
  return (
    <section
      aria-label="Chỉ môi trường thử nghiệm"
      className="flex flex-col gap-sm rounded-[18px] border-2 border-dashed border-[#FFB703] bg-[#FFF4D1] p-md dark:bg-[#3A2A08]"
    >
      <p className="flex items-center gap-1.5 text-label text-[#6B4100] dark:text-[#FFD27A]">
        <Icon name="information-outline" size={16} color="currentColor" />
        Chỉ môi trường thử nghiệm
      </p>
      <div className="grid gap-sm sm:grid-cols-2">{children}</div>
    </section>
  );
}

/** Loading: a grey lamp, two lines, the strip, two buttons. No verdict colour at all. */
export function PaymentSkeleton() {
  return (
    <div aria-label="Đang tải trạng thái thanh toán" className="flex flex-col items-center gap-md">
      <Skeleton className="h-[136px] w-[136px] rounded-full md:h-[168px] md:w-[168px]" />
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-20 w-full rounded-[20px]" />
      <Skeleton className="h-12 w-full rounded-[12px]" />
      <Skeleton className="h-12 w-full rounded-[12px]" />
    </div>
  );
}
