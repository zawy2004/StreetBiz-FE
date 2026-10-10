import { useId, type ReactNode } from 'react';

import { Icon, Money, type IconName } from '@/components/common';
import { StatusChip } from '@/components/status';
import { VENDOR_TYPE, type ApiRegistration } from '@/core/api';
import { hkdCode } from '@/features/sidewalk-slots/slot-format';
import { vendorTypeLabel } from '../../labels';
import { DocCheckArt, PermitMiniArt } from '../registration-art';
import { useMounted } from '../ui-motion';

/* ------------------------------------------------------------- the file */

/** The file being acted on, in one quiet row: code, name, type, status. */
export function RegistrationStrip({
  registration: r,
  title,
}: {
  registration: ApiRegistration;
  /** Optional caption above the row ("Cửa hàng của bạn"). */
  title?: string;
}) {
  return (
    <div className="flex flex-col gap-xs rounded-[18px] bg-sunken/70 p-sm md:p-md">
      {title ? <p className="text-label text-muted">{title}</p> : null}
      <div className="flex flex-wrap items-center gap-x-sm gap-y-xs">
        <span className="inline-flex h-7 items-center rounded-[6px] bg-card px-2 font-sign text-[15px] font-bold tracking-[0.03em] text-text ring-1 ring-border [font-stretch:72%] font-tabular">
          {hkdCode(r.registrationId)}
        </span>
        <span className="min-w-0 truncate text-[15px] font-semibold text-text">
          {r.displayName}
        </span>
        <span className="inline-flex items-center gap-1 text-body-md text-muted">
          <Icon
            name={
              r.vendorType === VENDOR_TYPE.fixedStorefront ? 'storefront-outline' : 'cart-outline'
            }
            size={16}
            color="currentColor"
          />
          {vendorTypeLabel(r.vendorType)}
        </span>
        <StatusChip code={r.registrationStatus} />
      </div>
    </div>
  );
}

/** A non-blocking "this may not apply to your file" note, mango wash. */
export function CautionNote({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-sm rounded-[14px] bg-[#FFF3D1] px-md py-sm text-[15px] font-medium leading-[22px] text-[#6B4100] dark:bg-[#3A2A08] dark:text-[#FFD27A]">
      <Icon
        name="alert-circle-outline"
        size={18}
        color="currentColor"
        className="mt-0.5 shrink-0"
      />
      <span>{children}</span>
    </p>
  );
}

/* --------------------------------------------------------- address change */

function MoveCart({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 28" aria-hidden="true" className={`h-7 w-8 ${className}`}>
      {[0, 1, 2].map((i) => (
        <path
          key={i}
          d={`M${4 + i * 8} 4 h8 v5 a4 4 0 0 1 -8 0 z`}
          className={i % 2 ? 'fill-white' : 'fill-brand'}
        />
      ))}
      <path d="M4 4 h24" strokeWidth="1.5" className="stroke-text" />
      <rect
        x="5"
        y="12"
        width="22"
        height="9"
        rx="2"
        strokeWidth="1.5"
        className="fill-accent stroke-text"
      />
      <circle cx="10" cy="24" r="2.6" strokeWidth="1.5" className="fill-card stroke-text" />
      <circle cx="22" cy="24" r="2.6" strokeWidth="1.5" className="fill-card stroke-text" />
    </svg>
  );
}

/**
 * Two address plates, "Hiện tại" → "Mới", joined by a painted dashed line. The
 * line draws itself and a small cart rolls across once something is typed; the
 * new plate follows the field letter by letter.
 */
export function AddressPlates({
  current,
  next,
  invalid,
}: {
  current: string | null;
  next: string;
  invalid?: boolean;
}) {
  const typed = next.trim().length > 0;
  const mounted = useMounted();
  const go = typed && mounted;
  const plate = 'min-h-[96px] rounded-[10px] bg-card p-sm md:p-md';
  const words =
    'line-clamp-3 break-words font-sign text-[18px] font-bold leading-[24px] [font-stretch:85%] md:text-[20px] md:leading-[26px]';

  return (
    <figure className="flex flex-col gap-sm">
      <figcaption className="sr-only">
        Từ {current?.trim() || 'chưa khai báo'} sang {typed ? next : 'địa chỉ mới chưa nhập'}
      </figcaption>
      <div
        aria-hidden="true"
        className="grid grid-cols-1 items-stretch gap-xs md:grid-cols-[minmax(0,1fr)_88px_minmax(0,1fr)] md:gap-0"
      >
        <div className="flex flex-col gap-1">
          <span className="text-label text-muted">Địa chỉ hiện tại</span>
          <div className={`${plate} ring-2 ring-border`}>
            <p title={current ?? undefined} className={`${words} text-muted`}>
              {current?.trim() || 'Chưa khai báo'}
            </p>
          </div>
        </div>

        {/* The connector: vertical on phones, horizontal from 768px. */}
        <div className="relative flex h-14 items-center justify-center md:h-auto md:pt-6">
          <svg
            viewBox="0 0 88 12"
            preserveAspectRatio="none"
            className="hidden h-3 w-full md:block"
          >
            <line
              x1="4"
              y1="6"
              x2="84"
              y2="6"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="8 7"
              className={`transition-[stroke-dashoffset,opacity] duration-[600ms] [transition-timing-function:var(--ease-out)] ${
                go ? 'stroke-brand opacity-100' : 'stroke-border opacity-80'
              }`}
              style={{ strokeDashoffset: go ? 0 : 80 }}
            />
          </svg>
          <svg viewBox="0 0 12 56" preserveAspectRatio="none" className="h-full w-3 md:hidden">
            <line
              x1="6"
              y1="4"
              x2="6"
              y2="52"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="7 6"
              className={go ? 'stroke-brand' : 'stroke-border'}
            />
          </svg>
          <span
            className="absolute top-[30px] hidden h-9 w-9 items-center justify-center rounded-full bg-card shadow-card ring-1 ring-border transition-transform duration-[600ms] [transition-timing-function:var(--ease-out)] md:flex"
            style={{ transform: `translateX(${go ? 22 : -22}px)` }}
          >
            <MoveCart />
          </span>
          <span
            className="absolute flex h-9 w-9 items-center justify-center rounded-full bg-card shadow-card ring-1 ring-border transition-transform duration-[600ms] [transition-timing-function:var(--ease-out)] md:hidden"
            style={{ transform: `translateY(${go ? 8 : -8}px)` }}
          >
            <MoveCart />
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-label text-text">Địa chỉ mới</span>
          <div
            className={`${plate} transition-[box-shadow] duration-200 ${
              invalid && !typed
                ? 'border-2 border-dashed border-[#8F1717] dark:border-[#FF9A90]'
                : typed
                  ? 'ring-[3px] ring-brand'
                  : 'ring-2 ring-border'
            }`}
          >
            <p
              title={typed ? next : undefined}
              className={`${words} ${typed ? 'text-text' : 'text-muted/80'}`}
            >
              {typed ? next : 'Nhập địa chỉ mới bên dưới'}
            </p>
          </div>
        </div>
      </div>
    </figure>
  );
}

const ADDRESS_STEPS: { icon: IconName; text: string }[] = [
  { icon: 'map-marker-radius-outline', text: 'Phường kiểm tra ô liền kề tại địa chỉ mới.' },
  {
    icon: 'timer-outline',
    text: 'Ô hiện tại được giữ trong thời gian ân hạn nếu còn phí chưa thanh toán.',
  },
];

/** "Điều gì xảy ra tiếp theo": the baseline sentence split into its two real steps. */
export function NextStepsAfterAddress() {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-sm">
      <h2 id={headingId} className="text-headline-md text-text">
        Điều gì xảy ra tiếp theo
      </h2>
      <ol className="grid gap-sm md:grid-cols-2">
        {ADDRESS_STEPS.map((step, i) => (
          <li
            key={step.text}
            className="flex items-start gap-sm rounded-[18px] bg-[#FFF3E8] p-md dark:bg-[#2A2420]"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary font-sign text-[14px] font-bold text-on-primary">
              {i + 1}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-xs">
              <Icon
                name={step.icon}
                size={32}
                color="currentColor"
                weight="duotone"
                className="text-primary"
              />
              <span className="text-[15px] leading-[22px] text-text">{step.text}</span>
            </span>
          </li>
        ))}
      </ol>
      <p className="text-body-md text-muted">
        Phường sẽ kiểm tra ô liền kề tại địa chỉ mới. Ô hiện tại được giữ trong thời gian ân hạn nếu
        còn phí chưa thanh toán.
      </p>
    </section>
  );
}

/* ---------------------------------------------------------- adjacent slot */

type FrontageProps = {
  shopName: string;
  /** The demo suggestion's code, when there is one. */
  slotCode?: string;
  mode: 'suggested' | 'none' | 'live';
  highlight?: boolean;
  onSlotHover?: (on: boolean) => void;
};

/**
 * The shop front seen from above: the awning with the shop's name, the
 * pavement with its painted slots, the kerb and the road. The suggested demo
 * slot glows in front of the door; a dashed arc marks "phạm vi liền kề" and is
 * labelled as an illustration — it does not claim the distance was checked.
 */
export function FrontageDiagram({
  shopName,
  slotCode,
  mode,
  highlight,
  onSlotHover,
}: FrontageProps) {
  const label =
    mode === 'suggested'
      ? `Sơ đồ minh họa: cửa hàng ${shopName}, ô ${slotCode} ngay trước cửa.`
      : `Sơ đồ minh họa: cửa hàng ${shopName}, chưa chọn ô.`;
  const slots = [0, 1, 2, 3, 4];
  const nameSize = shopName.length > 26 ? 14 : shopName.length > 18 ? 17 : 20;

  return (
    <div className="overflow-hidden rounded-[24px] bg-card shadow-card ring-1 ring-border">
      <svg
        role="img"
        aria-label={label}
        viewBox="0 0 560 320"
        className="block aspect-[7/4] w-full"
      >
        <rect width="560" height="120" className="fill-[#FFF3E8] dark:fill-[#2A2420]" />
        <rect
          x="70"
          y="18"
          width="420"
          height="102"
          strokeWidth="2.5"
          className="fill-card stroke-text"
        />
        <rect
          x="120"
          y="30"
          width="320"
          height="34"
          rx="6"
          className="fill-white stroke-brand"
          strokeWidth="3"
        />
        <text
          x="280"
          y="53"
          textAnchor="middle"
          fontSize={nameSize}
          fontWeight="800"
          className="fill-[#111C2B] font-sign"
        >
          {shopName.length > 34 ? `${shopName.slice(0, 33)}…` : shopName}
        </text>
        {Array.from({ length: 21 }, (_, i) => (
          <path
            key={i}
            d={`M${70 + i * 20} 72 h20 v12 a10 10 0 0 1 -20 0 z`}
            className={i % 2 ? 'fill-white' : 'fill-brand'}
          />
        ))}
        <rect
          x="250"
          y="88"
          width="60"
          height="32"
          strokeWidth="2"
          className="fill-[#DDEBF7] stroke-text dark:fill-[#203142]"
        />
        <rect y="120" width="560" height="120" className="fill-[#EEF1F4] dark:fill-[#1D2833]" />
        <path
          d="M130 120 A150 150 0 0 0 430 120"
          fill="none"
          strokeWidth="2.5"
          strokeDasharray="9 7"
          className="stroke-tertiary"
        />
        <text
          x="438"
          y="148"
          fontSize="12"
          fontWeight="600"
          className="fill-[#0B5D33] dark:fill-[#8BE3B0]"
        >
          Phạm vi liền kề (minh họa)
        </text>
        {slots.map((i) => {
          const x = 40 + i * 100;
          const isSuggested = mode === 'suggested' && i === 2;
          return (
            <g key={i}>
              <rect
                x={x}
                y="150"
                width="80"
                height="64"
                rx="8"
                strokeWidth={isSuggested ? 3 : 2}
                strokeDasharray={isSuggested ? undefined : '7 6'}
                className={
                  isSuggested
                    ? `fill-[rgb(var(--c-brand)/0.25)] stroke-brand ${highlight ? 'opacity-100' : ''}`
                    : 'fill-none stroke-muted/60'
                }
                onMouseEnter={isSuggested ? () => onSlotHover?.(true) : undefined}
                onMouseLeave={isSuggested ? () => onSlotHover?.(false) : undefined}
              />
              {isSuggested ? (
                <>
                  <rect
                    x={x - 6}
                    y="144"
                    width="92"
                    height="76"
                    rx="12"
                    fill="none"
                    strokeWidth="2.5"
                    className="sb-slot-beacon stroke-brand"
                    style={{ animationIterationCount: 2 }}
                  />
                  <rect x={x + 12} y="170" width="56" height="22" rx="4" className="fill-sign" />
                  <text
                    x={x + 40}
                    y="186"
                    textAnchor="middle"
                    fontSize="13"
                    fontWeight="800"
                    className="fill-white font-sign"
                  >
                    {slotCode && slotCode.length > 8 ? slotCode.slice(0, 8) : slotCode}
                  </text>
                </>
              ) : mode === 'live' ? (
                <text
                  x={x + 40}
                  y="190"
                  textAnchor="middle"
                  fontSize="24"
                  fontWeight="800"
                  className="sb-rise fill-muted font-sign"
                  style={{ ['--delay' as string]: `${i * 80}ms` }}
                >
                  ?
                </text>
              ) : null}
            </g>
          );
        })}
        {mode === 'live' ? (
          <text
            x="280"
            y="232"
            textAnchor="middle"
            fontSize="12.5"
            fontWeight="600"
            className="fill-muted"
          >
            Chọn ô trên bản đồ của Phường
          </text>
        ) : null}
      </svg>
      <div aria-hidden="true" className="sb-kerb" />
      <div aria-hidden="true" className="h-10 bg-[#E1E5EA] dark:bg-[#2B3946]">
        <div className="mx-auto h-full w-full bg-[repeating-linear-gradient(90deg,rgb(255_255_255/0.9)_0_28px,transparent_28px_52px)] bg-[length:100%_3px] bg-center bg-no-repeat dark:opacity-30" />
      </div>
    </div>
  );
}

/** The suggested slot as a painted plate: code, street, size and hours, monthly fee. */
export function SlotPlate({
  slotCode,
  street,
  size,
  timeWindow,
  priceMonthly,
  status,
  highlight,
}: {
  slotCode: string;
  street: string;
  size: number;
  timeWindow: string;
  priceMonthly: number;
  status: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-sm rounded-[14px] bg-card p-md shadow-card ring-[2.5px] transition-[box-shadow] duration-200 ${
        highlight ? 'ring-brand' : 'ring-text'
      }`}
    >
      <div className="flex items-start justify-between gap-sm">
        <p className="font-sign text-[32px] font-extrabold leading-none tracking-[0.02em] text-text [font-stretch:66%] md:text-[40px]">
          {slotCode}
        </p>
        <StatusChip code={status} />
      </div>
      <div className="flex flex-col gap-0.5">
        <p className="text-[16px] font-semibold text-text">{street}</p>
        <p className="text-body-md text-muted">
          {size} m² · {timeWindow}
        </p>
      </div>
      <div className="flex items-baseline gap-xs border-t border-border pt-sm">
        <Money amountVnd={priceMonthly} size="lg" />
        <p className="text-body-sm text-muted">mỗi tháng</p>
      </div>
    </div>
  );
}

const PROCESS = [
  { label: 'Gửi đơn thuê ô', art: 'doc' },
  { label: 'Phường duyệt', art: 'seal' },
  { label: 'Hợp đồng và giấy phép số', art: 'permit' },
] as const;

/** "Đơn thuê ô xét riêng" (BR-08, BR-17): three static stages, joined by painted dashes. */
export function RentalProcessStrip() {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-sm rounded-[24px] bg-card p-md shadow-card ring-1 ring-border md:p-lg"
    >
      <div>
        <h2 id={headingId} className="text-headline-md text-text">
          Đơn thuê ô xét riêng
        </h2>
        <p className="mt-0.5 text-body-md text-muted">
          Hồ sơ kinh doanh đã duyệt chưa phải là đã có ô. Đơn thuê ô được Phường xét riêng.
        </p>
      </div>
      <ol className="relative grid grid-cols-3 gap-xs pt-xs">
        <span
          aria-hidden="true"
          className="absolute left-[16.66%] right-[16.66%] top-[44px] border-t-[3px] border-dashed border-brand/50"
        />
        {PROCESS.map((p, i) => (
          <li key={p.label} className="relative flex flex-col items-center gap-xs text-center">
            <span className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[#FFF3E8] ring-1 ring-brand/25 dark:bg-[#2A2420]">
              {p.art === 'doc' ? (
                <DocCheckArt checked={false} className="h-12 w-12" />
              ) : p.art === 'seal' ? (
                <svg viewBox="0 0 48 48" aria-hidden="true" className="h-12 w-12 text-muted">
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeDasharray="5 4"
                  />
                  <circle
                    cx="24"
                    cy="24"
                    r="11"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeDasharray="3 3"
                  />
                </svg>
              ) : (
                <PermitMiniArt className="h-12 w-12" />
              )}
            </span>
            <span className="text-[14px] font-semibold leading-5 text-text">
              <span className="sr-only">Bước {i + 1}: </span>
              {p.label}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
