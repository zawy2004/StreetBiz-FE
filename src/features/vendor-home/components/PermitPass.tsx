import { Icon } from '@/components/common';
import { Skeleton } from '@/components/feedback';
import { VERDICT_TONES } from '@/components/illustrations';
import { statusLabel } from '@/core/constants/status-labels';
import { useMounted } from '@/features/business-registrations/components/ui-motion';

export type PermitCard = {
  contractId: number | string;
  /** Baseline label: "Ô {slotCode}" live, the permit code in demo mode. */
  label: string;
  status: string;
  slotCode: string | null;
  zoneName: string | null;
  startDate: string | null;
  endDate: string | null;
  /** When the permit was last read from the server (ms); null in demo mode. */
  fetchedAt: number | null;
};

const DAY_MS = 86_400_000;
const timeFormat = new Intl.DateTimeFormat('vi-VN', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Asia/Ho_Chi_Minh',
});

function validity(card: PermitCard, nowMs: number) {
  if (!card.endDate) return null;
  const end = Date.parse(card.endDate);
  if (!Number.isFinite(end)) return null;
  const daysLeft = Math.max(0, Math.ceil((end - nowMs) / DAY_MS));
  const start = card.startDate ? Date.parse(card.startDate) : NaN;
  const totalDays = Number.isFinite(start) ? Math.max(1, Math.round((end - start) / DAY_MS)) : 365;
  return { daysLeft, fraction: Math.min(1, daysLeft / totalDays) };
}

type Props = {
  card: PermitCard;
  online: boolean;
  onOpen: () => void;
};

/**
 * The permit hanging at the counter: painted kerb along the top, the slot plate,
 * the verdict in large words on a pale wash of its colour, a ring of the days
 * left, and when the server last said so. The QR glyph is decoration only; the
 * real code is on the permit screen.
 */
export function PermitPass({ card, online, onOpen }: Props) {
  const { label, tone } = statusLabel(card.status);
  const verdict = VERDICT_TONES[tone];
  const v = validity(card, Date.now());
  const plateLabel = card.slotCode ? `Ô ${card.slotCode}` : null;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group block w-full overflow-hidden rounded-[28px] bg-card text-left shadow-card ring-1 ring-border transition-[transform,box-shadow] duration-200 [transition-timing-function:var(--ease-out)] hover:-translate-y-1 hover:shadow-card-hover active:translate-y-0"
    >
      <div aria-hidden="true" className="sb-kerb sb-kerb-thin" />
      <div className="flex flex-col gap-md p-md md:p-lg">
        <div className="flex items-start justify-between gap-sm">
          <div className="min-w-0">
            <p className="text-[17px] font-semibold leading-6 text-text">Giấy phép số</p>
            {card.zoneName ? (
              <p className="mt-0.5 truncate text-body-md text-muted">{card.zoneName}</p>
            ) : null}
          </div>
          {plateLabel ? (
            <span className="kerb-tag !h-10 shrink-0 !px-3 !text-[22px]">{plateLabel}</span>
          ) : null}
        </div>

        {card.label !== plateLabel ? (
          <p className="-mt-xs text-body-md text-muted">
            Mã giấy phép:{' '}
            <span className="font-sign font-semibold tracking-[0.02em] text-text">
              {card.label}
            </span>
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-sm">
          <div
            className={`flex min-w-0 items-center gap-xs rounded-[14px] px-sm py-xs ${verdict.wash} ${verdict.ink}`}
          >
            <Icon name={verdict.icon} size={26} color="currentColor" weight="fill" />
            <span className="font-sign text-[22px] font-extrabold uppercase leading-none tracking-[0.01em] [font-stretch:88%]">
              {label}
            </span>
          </div>
          {v ? (
            <ValidityRing
              daysLeft={v.daysLeft}
              fraction={v.fraction}
              live={online && tone === 'ok'}
            />
          ) : null}
        </div>

        <div className="flex items-center gap-sm rounded-[16px] bg-sunken/70 p-sm">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-card text-text shadow-card">
            <Icon name="qrcode" size={30} color="currentColor" weight="duotone" />
          </span>
          <span className="min-w-0 flex-1 text-body-md font-semibold text-text">
            Mở giấy phép để xuất trình
          </span>
          <Icon
            name="chevron-right"
            size={18}
            color="currentColor"
            className="text-muted transition-transform duration-150 group-hover:translate-x-0.5"
          />
        </div>

        <p className="flex items-start gap-1.5 text-body-sm text-muted">
          <Icon name="clock-outline" size={15} color="currentColor" className="mt-0.5 shrink-0" />
          <span>
            {card.fetchedAt
              ? `Lấy từ máy chủ lúc ${timeFormat.format(card.fetchedAt)}`
              : 'Dữ liệu mẫu ở chế độ demo, không lấy từ máy chủ'}
            {!online ? (
              <span className="block font-semibold text-[#6B4100] dark:text-[#FFD27A]">
                Đang mất mạng, trạng thái có thể đã cũ
              </span>
            ) : null}
          </span>
        </p>
      </div>
    </button>
  );
}

const RADIUS = 36;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Days of validity left, drawn as a ring that fills once on mount. Mango when
 * the end is near; grey when offline or the permit is not currently valid, so it
 * never looks "alive" on stale data.
 */
export function ValidityRing({
  daysLeft,
  fraction,
  live,
}: {
  daysLeft: number;
  fraction: number;
  live: boolean;
}) {
  const mounted = useMounted();
  const soon = daysLeft <= 30;
  const stroke = !live ? 'stroke-muted/60' : soon ? 'stroke-on-secondary' : 'stroke-tertiary';
  return (
    <div
      role="img"
      aria-label={`Giấy phép còn ${daysLeft} ngày hiệu lực`}
      className="relative h-[88px] w-[88px] shrink-0"
    >
      <svg viewBox="0 0 88 88" className="h-full w-full -rotate-90">
        <circle cx="44" cy="44" r={RADIUS} fill="none" strokeWidth="8" className="stroke-sunken" />
        <circle
          cx="44"
          cy="44"
          r={RADIUS}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          className={`${stroke} transition-[stroke-dashoffset] duration-[900ms] [transition-timing-function:var(--ease-out)]`}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={mounted ? CIRCUMFERENCE * (1 - fraction) : CIRCUMFERENCE}
        />
      </svg>
      <span
        aria-hidden="true"
        className="absolute inset-0 flex flex-col items-center justify-center"
      >
        <span className="text-[11px] font-semibold leading-none text-muted">Còn</span>
        <span className="my-0.5 font-sign text-[24px] font-extrabold leading-none text-text font-tabular">
          {daysLeft}
        </span>
        <span className="text-[11px] font-semibold leading-none text-muted">ngày</span>
      </span>
    </div>
  );
}

/** The pass's outline while contracts and permits load, so nothing jumps. */
export function PermitPassSkeleton() {
  return (
    <div
      role="status"
      aria-label="Đang tải giấy phép"
      className="min-h-[200px] overflow-hidden rounded-[28px] bg-card shadow-card ring-1 ring-border"
    >
      <div aria-hidden="true" className="sb-kerb sb-kerb-thin opacity-50" />
      <div className="flex flex-col gap-md p-lg">
        <div className="flex justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-11 w-36" />
          <Skeleton className="h-[88px] w-[88px] rounded-full" />
        </div>
      </div>
    </div>
  );
}
