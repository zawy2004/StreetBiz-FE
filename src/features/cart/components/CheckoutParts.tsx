import type { ReactNode } from 'react';

import { Icon, Money } from '@/components/common';
import { Skeleton } from '@/components/feedback';
import { FoodImage } from '@/features/buyer-discovery/components/FoodImage';
import type { FoodPhoto } from '@/features/buyer-discovery/food-photos';
import { usePrefersReducedMotion } from '@/features/orders/components/order-display';
import type { PaymentProvider } from '@/features/orders/types/order.types';

/**
 * C11 parts: "chốt đơn ở quầy". What will be in the buyer's hands on one side,
 * the amount printed large like a stall's price board on the other. Nothing
 * here ever says the payment worked: only the payment screen does, once the
 * server has confirmed it.
 */

const PROVIDERS: { value: PaymentProvider; label: string; description: string }[] = [
  { value: 'MOMO', label: 'MoMo', description: 'Thanh toán qua ví MoMo' },
  { value: 'ZALOPAY', label: 'ZaloPay', description: 'Thanh toán qua ví ZaloPay' },
];

const providerLabel = (provider: PaymentProvider) =>
  PROVIDERS.find((option) => option.value === provider)?.label ?? provider;

/**
 * The two wallets as large tiles. Each is a real, visible radio input inside
 * its label (name "paymentProvider"), so arrow keys move between them and a
 * test can `.check()` the input itself.
 */
export function ProviderTiles({
  value,
  onChange,
  disabled,
}: {
  value: PaymentProvider;
  onChange: (provider: PaymentProvider) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-sm font-sign text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">
        Phương thức thanh toán
      </legend>
      <div className="grid gap-sm sm:grid-cols-2">
        {PROVIDERS.map((provider) => {
          const selected = value === provider.value;
          return (
            <label
              key={provider.value}
              className={[
                'relative flex min-h-[76px] cursor-pointer items-center gap-sm rounded-[18px] border-2 p-sm pr-md transition-[transform,border-color,background-color,box-shadow] duration-150 [transition-timing-function:var(--ease-out)] has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-primary/25 md:min-h-[88px]',
                selected
                  ? '-translate-y-0.5 border-brand bg-tint-primary shadow-[0_14px_26px_-18px_rgb(var(--c-primary)/0.9)]'
                  : 'border-border bg-card hover:border-text/25',
                disabled ? 'cursor-not-allowed opacity-60' : '',
              ].join(' ')}
            >
              <input
                type="radio"
                name="paymentProvider"
                value={provider.value}
                checked={selected}
                disabled={disabled}
                onChange={() => onChange(provider.value)}
                className="h-5 w-5 shrink-0 cursor-pointer accent-[rgb(var(--c-primary))] focus:outline-none"
              />
              <span
                aria-hidden="true"
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] ${
                  selected ? 'bg-card text-primary' : 'bg-sunken text-muted'
                }`}
              >
                <Icon name="wallet-outline" size={24} color="currentColor" weight="duotone" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-sign text-[20px] font-bold leading-6 text-text">
                  {provider.label}
                </span>
                <span className="mt-0.5 block text-body-sm text-muted">{provider.description}</span>
              </span>
              {selected ? (
                <span aria-hidden="true" className="sb-pop text-primary">
                  <Icon name="check-circle" size={24} color="currentColor" />
                </span>
              ) : null}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/**
 * The painted kerb along the board's top. While the checkout request is out it
 * runs like a progress bar; with reduced motion it stands still and turns mango.
 */
export function KerbProgress({ running }: { running: boolean }) {
  const reduced = usePrefersReducedMotion();
  if (!running) return <div aria-hidden="true" className="sb-kerb sb-kerb-thin" />;
  if (reduced) return <div aria-hidden="true" className="h-[6px] bg-accent" />;
  return (
    <svg aria-hidden="true" className="block h-[6px] w-full" preserveAspectRatio="none">
      <defs>
        <pattern id="checkout-kerb" width="88" height="6" patternUnits="userSpaceOnUse">
          <rect width="44" height="6" fill="rgb(var(--c-kerb))" />
          <rect x="44" width="44" height="6" fill="rgb(var(--c-kerb-paint))" />
          <animateTransform
            attributeName="patternTransform"
            type="translate"
            from="0 0"
            to="88 0"
            dur="1.2s"
            repeatCount="indefinite"
          />
        </pattern>
      </defs>
      <rect width="100%" height="6" fill="url(#checkout-kerb)" />
    </svg>
  );
}

/**
 * The price board: the amount to pay in large signage figures, what it is for,
 * then whatever action the screen puts below it.
 */
export function CheckoutBoard({
  label,
  amount,
  caption,
  running = false,
  compact = false,
  children,
}: {
  label: string;
  amount: number;
  caption: string;
  running?: boolean;
  /** Phone strip: the amount only, the action lives in the thumb bar. */
  compact?: boolean;
  children?: ReactNode;
}) {
  return (
    <section
      aria-label="Bảng chốt đơn"
      className="overflow-hidden rounded-[28px] bg-[#FFF3E8] ring-1 ring-[#FFD9BF] dark:bg-[#2A2420] dark:ring-white/10"
    >
      <KerbProgress running={running} />
      <div className={`flex flex-col ${compact ? 'gap-2xs p-md' : 'gap-md p-lg'}`}>
        <div>
          <p className="text-label text-[#6B3A12] dark:text-[#FFC9A3]">{label}</p>
          <p
            className={`mt-2xs whitespace-nowrap font-sign font-extrabold leading-none tracking-[-0.03em] text-text tabular-nums ${
              compact ? 'text-[36px] md:text-[44px]' : 'text-[48px] xl:text-[56px]'
            }`}
          >
            {amount.toLocaleString('vi-VN')}
            <span className="ml-1.5 text-[0.5em] font-bold">đ</span>
          </p>
          <p className="mt-xs truncate text-body-md text-text/75" title={caption}>
            {caption}
          </p>
        </div>
        {children}
      </div>
    </section>
  );
}

/** "Sau khi bấm": what happens next, worded for the wallet chosen. */
export function AfterPayNote({ provider, amount }: { provider: PaymentProvider; amount: number }) {
  const rows: { icon: string; text: ReactNode }[] = [
    {
      icon: 'wallet-outline',
      text: (
        <>
          Chuyển sang{' '}
          <span key={provider} className="sb-pop inline-block font-semibold text-text">
            {providerLabel(provider)}
          </span>{' '}
          để trả <span className="font-semibold text-text">{amount.toLocaleString('vi-VN')} đ</span>
        </>
      ),
    },
    {
      icon: 'shield-check-outline',
      text: 'Đơn chỉ được gửi cho quán sau khi cổng thanh toán xác nhận',
    },
    {
      icon: 'lock-outline',
      text: 'Giỏ hàng khoá cho tới khi đơn được thanh toán hoặc huỷ',
    },
  ];
  return (
    <div className="flex flex-col gap-xs">
      <p className="text-label text-text">Sau khi bấm</p>
      <ul className="flex flex-col gap-xs">
        {rows.map((row) => (
          <li key={row.icon} className="flex items-start gap-xs text-body-sm text-muted">
            <span className="mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-card text-primary ring-1 ring-border">
              <Icon name={row.icon} size={14} color="currentColor" />
            </span>
            <span className="pt-0.5">{row.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The pavement in front of the stall from above: kerb, painted slot, awning, pin. */
export function PickupPointArt({ className = '' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 240 140" className={className}>
      <rect width="240" height="140" rx="18" className="fill-[#FFF3E8] dark:fill-[#2A2420]" />
      <path d="M0 18 H240 V0 H0 Z" className="fill-[#E9EDF1] dark:fill-[#1D2833]" />
      <path
        d="M0 9 H240"
        strokeDasharray="16 12"
        strokeWidth="2.5"
        className="stroke-white/90 dark:stroke-white/25"
      />
      {Array.from({ length: 11 }, (_, i) => (
        <rect
          key={i}
          x={i * 22}
          y="18"
          width="22"
          height="7"
          className={i % 2 ? 'fill-[#FFF8F2]' : 'fill-brand'}
        />
      ))}
      <rect
        x="70"
        y="40"
        width="100"
        height="78"
        rx="10"
        fill="none"
        strokeWidth="2.5"
        strokeDasharray="8 6"
        className="stroke-primary/50"
      />
      <g>
        {Array.from({ length: 6 }, (_, i) => (
          <rect
            key={i}
            x={84 + i * 12}
            y="54"
            width="12"
            height="30"
            className={i % 2 ? 'fill-[#FFF8F2]' : 'fill-brand'}
          />
        ))}
        <rect x="84" y="84" width="72" height="20" rx="4" className="fill-accent" />
        <circle cx="96" cy="94" r="4" className="fill-card" />
        <circle cx="144" cy="94" r="4" className="fill-card" />
      </g>
      <g transform="translate(176 36)">
        <path
          d="M14 0 C6 0 0 6 0 14 C0 24 14 38 14 38 C14 38 28 24 28 14 C28 6 22 0 14 0 Z"
          className="fill-primary"
        />
        <circle cx="14" cy="14" r="5.5" className="fill-white" />
      </g>
    </svg>
  );
}

/** One dish as it will be ordered: photo, "2× Bánh mì", note, and its total. */
export function CheckoutLine({
  title,
  note,
  photos,
  amount,
}: {
  title: string;
  note?: string | null;
  photos: FoodPhoto[];
  amount: number;
}) {
  return (
    <li className="flex items-start gap-sm py-sm first:pt-0 last:pb-0">
      <span title={photos[0]?.illustrative ? 'Ảnh minh họa' : undefined}>
        <FoodImage
          photos={photos}
          icon="silverware-fork-knife"
          iconSize={20}
          iconColor="rgb(var(--c-primary))"
          className="h-12 w-12 shrink-0 rounded-[10px] ring-1 ring-border"
          placeholderClassName="bg-tint-primary"
        />
      </span>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-[15px] font-medium leading-[22px] text-text">{title}</p>
        {note ? <p className="mt-0.5 text-body-sm text-muted">{note}</p> : null}
      </div>
      <Money amountVnd={amount} className="shrink-0" />
    </li>
  );
}

/** Pickup point: the drawn pavement beside the address. */
export function PickupPoint({
  address,
  tall = false,
}: {
  address: string;
  /** One-dish orders get a taller drawing so the column does not look empty. */
  tall?: boolean;
}) {
  return (
    <section
      aria-label="Điểm nhận món"
      className="flex flex-col gap-md sm:flex-row sm:items-center"
    >
      <PickupPointArt
        className={`w-full shrink-0 sm:w-[200px] lg:w-[220px] ${tall ? 'sm:h-[150px]' : ''}`}
      />
      <div className="min-w-0">
        <p className="text-label text-text">Điểm nhận món</p>
        <p className="mt-2xs text-body-md text-muted">{address}</p>
        <p className="mt-xs inline-flex items-center gap-1.5 rounded-full bg-tint-primary px-sm py-1 text-body-sm font-semibold text-primary">
          <Icon name="storefront-outline" size={15} color="currentColor" />
          Nhận món trực tiếp tại điểm bán
        </p>
      </div>
    </section>
  );
}

/** Loading, shaped like the board and the two wallet tiles. */
export function CheckoutSkeleton() {
  return (
    <div
      aria-label="Đang tải thanh toán"
      className="grid gap-lg lg:grid-cols-[minmax(0,1fr)_356px]"
    >
      <div className="flex flex-col gap-md">
        <Skeleton className="h-[120px] w-full rounded-[18px]" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <div className="grid gap-sm sm:grid-cols-2">
          <Skeleton className="h-[88px] rounded-[18px]" />
          <Skeleton className="h-[88px] rounded-[18px]" />
        </div>
      </div>
      <div className="order-first flex flex-col gap-sm rounded-[28px] bg-sunken/60 p-lg lg:order-none">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-14 w-2/3" />
        <Skeleton className="hidden h-12 w-full rounded-[12px] lg:block" />
      </div>
    </div>
  );
}
