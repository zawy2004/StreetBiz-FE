import { forwardRef, useId, type ReactNode } from 'react';

import { Icon, Money } from '@/components/common';
import { OrderStatusBadge } from '../OrderStatusBadge';
import { SCALLOP_BOTTOM, usePrefersReducedMotion } from '../order-display';
import type { Order } from '../../types/order.types';

/**
 * V41 parts: the ticket gate at the counter. A bright square viewfinder with
 * orange locating corners and a running scan line; a receipt stamped "ĐÃ GIAO"
 * once the server has handed the order over. No dark camera box.
 */

export type ScanPhase = 'waiting' | 'checking' | 'refused';

const CORNER = {
  waiting: 'stroke-brand',
  checking: 'stroke-brand',
  refused: 'stroke-[#B42318] dark:stroke-[#FF7A6E]',
};

/** Four corner brackets drawn over the frame, closing in a little on a refusal. */
function Corners({ phase }: { phase: ScanPhase }) {
  const inset = phase === 'refused' ? 10 : 6;
  const len = 18;
  const a = inset;
  const b = 100 - inset;
  const paths = [
    `M${a} ${a + len} V${a} H${a + len}`,
    `M${b - len} ${a} H${b} V${a + len}`,
    `M${b} ${b - len} V${b} H${b - len}`,
    `M${a + len} ${b} H${a} V${b - len}`,
  ];
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 100"
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      {paths.map((d) => (
        <path
          key={d}
          d={d}
          fill="none"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`${CORNER[phase]} transition-all duration-150`}
        />
      ))}
    </svg>
  );
}

/** A soft orange line sweeping down the frame; still and centred under reduced motion. */
function ScanLine({ running }: { running: boolean }) {
  const reduced = usePrefersReducedMotion();
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      <defs>
        <linearGradient id="scan-line-fade" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="rgb(var(--c-brand))" stopOpacity="0" />
          <stop offset="0.5" stopColor="rgb(var(--c-brand))" stopOpacity="0.85" />
          <stop offset="1" stopColor="rgb(var(--c-brand))" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect
        x="10"
        y={running && !reduced ? 12 : 49}
        width="80"
        height="1.6"
        rx="0.8"
        fill="url(#scan-line-fade)"
      >
        {running && !reduced ? (
          <animate attributeName="y" values="12;86;12" dur="2.2s" repeatCount="indefinite" />
        ) : null}
      </rect>
    </svg>
  );
}

/**
 * The viewfinder around the camera: square, pale, corners in orange, the scan
 * line running while waiting, and a status chip at its foot (a status, never
 * an alert: the refusal below the frame is the one alert).
 */
export function ScanViewfinder({
  phase,
  children,
  below,
}: {
  phase: ScanPhase;
  children: ReactNode;
  /** The refusal strip, joined to the frame's lower edge. */
  below?: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[360px] lg:max-w-[440px]">
      <div
        aria-label="Khung quét mã QR"
        role="group"
        className={`relative aspect-square w-full overflow-hidden rounded-[28px] bg-sunken ring-1 ring-border ${
          phase === 'refused' ? 'sb-pop' : ''
        }`}
      >
        <div className="absolute inset-0">{children}</div>
        <Corners phase={phase} />
        <ScanLine running={phase === 'waiting'} />
        <div className="pointer-events-none absolute inset-x-0 bottom-md flex justify-center">
          <span
            role="status"
            className="inline-flex items-center gap-xs rounded-full bg-card/90 px-sm py-1.5 text-body-sm font-semibold text-text shadow-card backdrop-blur"
          >
            {phase === 'checking' ? (
              <>
                <span
                  aria-hidden="true"
                  className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent"
                />
                Đang kiểm mã…
              </>
            ) : phase === 'refused' ? (
              <>
                <Icon name="close-circle-outline" size={16} color="#B42318" />
                Mã chưa được nhận
              </>
            ) : (
              <>
                <Icon name="qrcode-scan" size={16} color="rgb(var(--c-primary))" />
                Đưa mã QR trên máy khách vào khung
              </>
            )}
          </span>
        </div>
      </div>
      {below}
    </div>
  );
}

/** The refusal under the frame: the server's own words, large, and "Thử lại". */
export function ScanRefusal({ children, action }: { children: ReactNode; action: ReactNode }) {
  return (
    <div className="sb-pop -mt-xs flex flex-col gap-sm rounded-b-[24px] bg-[#FDEBEA] px-md pb-md pt-md ring-1 ring-[#B42318]/25 dark:bg-[#3A1414]">
      <div className="flex items-start gap-xs text-[#8F1717] dark:text-[#FF9A90]">
        <Icon
          name="alert-octagon-outline"
          size={22}
          color="currentColor"
          className="mt-0.5 shrink-0"
        />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
      {action}
    </div>
  );
}

/** The seller's tally for this visit to the screen: kept in memory only. */
export function SessionTally({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#E6F6EC] px-sm text-body-md font-semibold text-[#0B5D33] dark:bg-[#10301F] dark:text-[#8BE3B0]">
      <Icon name="check-circle" size={18} color="currentColor" />
      Lượt này đã giao{' '}
      <span key={count} className="sb-pop inline-block font-sign text-[17px] tabular-nums">
        {count}
      </span>{' '}
      đơn
    </span>
  );
}

/** "Khách không có mã…": a small sign with a way to the order list. */
export function NoCodeSign({ children, action }: { children: ReactNode; action: ReactNode }) {
  return (
    <div className="flex flex-col gap-sm rounded-[18px] bg-[#EEF1F4] p-md text-[#2B3640] dark:bg-[#1D2833] dark:text-[#C5D0DA]">
      <div className="flex items-start gap-xs">
        <Icon
          name="information-outline"
          size={20}
          color="currentColor"
          className="mt-0.5 shrink-0"
        />
        <div className="text-[15px] leading-6">{children}</div>
      </div>
      {action}
    </div>
  );
}

/**
 * What was handed over, as a receipt with the "ĐÃ GIAO" stamp coming down on
 * it: order code, customer (once), total, status, and the dishes.
 */
export const HandoverReceipt = forwardRef<HTMLHeadingElement, { order: Order; actions: ReactNode }>(
  function HandoverReceipt({ order, actions }, headingRef) {
    const headingId = useId();
    const shown = order.items.slice(0, 5);
    const more = order.items.length - shown.length;
    return (
      <section
        aria-labelledby={headingId}
        className="mx-auto flex w-full max-w-[560px] flex-col gap-md"
      >
        <div className="sb-rise drop-shadow-[0_22px_30px_rgb(17_28_43/0.14)] dark:drop-shadow-none">
          <div
            style={SCALLOP_BOTTOM}
            className="relative flex flex-col gap-md overflow-hidden rounded-t-[28px] bg-card px-md pb-xl pt-md ring-1 ring-border md:px-lg"
          >
            <div className="-mx-md -mt-md flex items-center gap-sm bg-[#E6F6EC] px-md py-md dark:bg-[#10301F] md:-mx-lg md:px-lg">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-card text-[#0B5D33] dark:text-[#8BE3B0]">
                <Icon name="check-circle" size={26} color="currentColor" />
              </span>
              <div className="min-w-0 pr-[84px]">
                <h2
                  id={headingId}
                  ref={headingRef}
                  tabIndex={-1}
                  className="font-sign text-[24px] font-extrabold leading-7 text-[#0B5D33] outline-none dark:text-[#8BE3B0] md:text-[26px]"
                >
                  Đã giao đơn cho khách
                </h2>
                <p className="font-sign text-[16px] font-semibold tabular-nums text-text">
                  Đơn {order.orderCode}
                </p>
              </div>
            </div>
            <DeliveredStamp className="absolute right-sm top-sm h-[92px] w-[92px] md:right-md" />
            <dl className="flex flex-col gap-sm text-[16px]">
              <div className="flex items-end gap-xs">
                <dt className="flex flex-1 items-end gap-xs text-muted">
                  Khách hàng
                  <span
                    aria-hidden="true"
                    className="mb-1.5 flex-1 border-b-2 border-dotted border-border"
                  />
                </dt>
                <dd className="max-w-[60%] text-right font-semibold text-text">
                  {order.customerName}
                </dd>
              </div>
              <div className="flex items-end gap-xs">
                <dt className="flex flex-1 items-end gap-xs text-muted">
                  Tổng tiền
                  <span
                    aria-hidden="true"
                    className="mb-1.5 flex-1 border-b-2 border-dotted border-border"
                  />
                </dt>
                <dd>
                  <Money amountVnd={order.totalAmount} className="whitespace-nowrap" />
                </dd>
              </div>
              <div className="flex items-center gap-xs">
                <dt className="flex flex-1 items-center gap-xs text-muted">
                  Trạng thái
                  <span
                    aria-hidden="true"
                    className="flex-1 border-b-2 border-dotted border-border"
                  />
                </dt>
                <dd>
                  <OrderStatusBadge status={order.orderStatus} />
                </dd>
              </div>
            </dl>
            {shown.length ? (
              <ul className="flex flex-col gap-1 border-t border-dashed border-border pt-sm">
                {shown.map((item) => (
                  <li
                    key={item.orderItemId}
                    className="flex gap-sm text-[16px] leading-6 text-text"
                  >
                    <span className="w-[3ch] shrink-0 font-sign font-bold tabular-nums">
                      {item.quantity}×
                    </span>
                    <span className="min-w-0 break-words">{item.itemName}</span>
                  </li>
                ))}
                {more > 0 ? <li className="text-body-md text-muted">+{more} món nữa</li> : null}
              </ul>
            ) : null}
          </div>
        </div>
        {actions}
      </section>
    );
  },
);

/** "ĐÃ GIAO" in a green ring, pressed once onto the receipt. */
function DeliveredStamp({ className = '' }: { className?: string }) {
  const ringId = `delivered-${useId().replace(/:/g, '')}`;
  return (
    <div
      aria-hidden="true"
      className={`sb-stamp pointer-events-none text-[#0B7F43] dark:text-[#4ED18A] ${className}`}
    >
      <svg viewBox="0 0 120 120" className="h-full w-full opacity-90">
        <defs>
          <path id={ringId} d="M60 60 m-42 0 a42 42 0 1 1 84 0 a42 42 0 1 1 -84 0" />
        </defs>
        <circle cx="60" cy="60" r="55" fill="none" stroke="currentColor" strokeWidth="3.5" />
        <circle cx="60" cy="60" r="32" fill="none" stroke="currentColor" strokeWidth="2" />
        <text
          fill="currentColor"
          fontSize="11"
          fontWeight="800"
          letterSpacing="2"
          className="font-sign"
        >
          <textPath href={`#${ringId}`}>STREETBIZ ★ GIAO TẬN QUẦY ★ STREETBIZ ★</textPath>
        </text>
        <text
          x="60"
          y="65"
          textAnchor="middle"
          fill="currentColor"
          fontSize="14"
          fontWeight="900"
          className="font-sign"
        >
          ĐÃ GIAO
        </text>
      </svg>
    </div>
  );
}
