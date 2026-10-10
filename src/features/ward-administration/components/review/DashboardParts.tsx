import type { ReactNode } from 'react';

import { Button, formatVnd, Icon, type IconName } from '@/components/common';
import { Skeleton } from '@/components/feedback';
import { VERDICT_TONES } from '@/components/illustrations';
import { useGrowOnMount } from './helpers';
import { CountUp } from './Primitives';

const lift =
  'transition-[transform,box-shadow] duration-200 [transition-timing-function:var(--ease-out)] hover:-translate-y-0.5 hover:shadow-card-hover active:scale-[0.98]';

type TaskBoardProps = {
  pendingCount: number;
  pendingRegistrations: number;
  pendingApplications: number;
  openViolations: number;
  onOpenInbox: () => void;
  onOpenViolations: () => void;
};

/**
 * Today's work, set like the notice board outside the ward office: the two
 * numbers that say how much is waiting, each with a painted kerb edge.
 */
export function WardTaskBoard({
  pendingCount,
  pendingRegistrations,
  pendingApplications,
  openViolations,
  onOpenInbox,
  onOpenViolations,
}: TaskBoardProps) {
  const allClear = pendingCount === 0 && openViolations === 0;
  const clear = VERDICT_TONES.ok;
  const danger = VERDICT_TONES.danger;
  const violationTone = openViolations > 0 ? danger : clear;

  return (
    <section
      aria-label="Việc hôm nay"
      className={`overflow-hidden rounded-[28px] shadow-sheet ring-1 ring-border ${allClear ? clear.wash : 'bg-card'}`}
    >
      <div className="grid grid-cols-1 md:grid-cols-2">
        {/* Pending files */}
        <div className="relative flex min-h-[200px] flex-col gap-sm p-md pl-lg md:p-lg md:pl-xl">
          <span
            aria-hidden="true"
            className={`absolute inset-y-md left-0 w-[6px] rounded-r-full ${allClear ? 'bg-tertiary' : 'bg-brand'}`}
          />
          <button
            type="button"
            onClick={onOpenInbox}
            aria-label={`Hồ sơ chờ duyệt: ${pendingCount}. ${pendingCount > 0 ? 'Mở hộp duyệt để xử lý' : 'Đã xử lý hết'}`}
            className="-m-xs flex flex-col items-start rounded-[16px] p-xs text-left transition-colors hover:bg-sunken/60"
          >
            <span className="font-sign text-[56px] font-extrabold leading-none tracking-[-0.02em] text-text [font-stretch:88%] font-tabular md:text-[72px]">
              <CountUp value={pendingCount} />
            </span>
            <span
              className={`mt-xs text-[16px] font-semibold leading-6 ${allClear ? clear.ink : 'text-primary'}`}
            >
              Hồ sơ chờ duyệt
            </span>
            <span className="text-[14px] leading-[22px] text-muted">
              {pendingCount > 0 ? 'Mở hộp duyệt để xử lý' : 'Đã xử lý hết'}
            </span>
          </button>
          <p className="text-[14px] leading-[22px] text-text/80">
            <span className="font-semibold font-tabular">{pendingRegistrations}</span> đăng ký điểm
            bán + <span className="font-semibold font-tabular">{pendingApplications}</span> đơn thuê
            ô<span className="text-muted"> · chưa gồm gia hạn</span>
          </p>
          <div className="mt-auto pt-xs md:max-w-[260px]">
            <Button
              label="Mở hộp duyệt"
              onPress={onOpenInbox}
              icon={<Icon name="inbox-outline" size={19} color="currentColor" />}
            />
          </div>
        </div>

        {/* Open violations */}
        <div
          className={`relative flex min-h-[200px] flex-col gap-sm border-t border-border/70 p-md pl-lg md:border-l md:border-t-0 md:p-lg md:pl-xl ${allClear ? '' : violationTone.wash}`}
        >
          <span
            aria-hidden="true"
            className={`absolute inset-y-md left-0 w-[6px] rounded-r-full ${openViolations > 0 ? 'bg-error' : 'bg-tertiary'}`}
          />
          <button
            type="button"
            onClick={onOpenViolations}
            aria-label={`Vi phạm cần xử lý: ${openViolations}. ${openViolations > 0 ? 'chưa xử phạt hoặc chưa nộp phạt' : 'Đã xử lý hết'}`}
            className={`-m-xs flex flex-col items-start rounded-[16px] p-xs text-left transition-colors hover:bg-card/60 ${violationTone.ink}`}
          >
            <span className="flex items-center gap-sm">
              <span className="font-sign text-[56px] font-extrabold leading-none tracking-[-0.02em] [font-stretch:88%] font-tabular md:text-[72px]">
                <CountUp value={openViolations} />
              </span>
              <Icon
                name={openViolations > 0 ? 'shield-alert-outline' : 'check-circle'}
                size={34}
                color="currentColor"
                weight="fill"
              />
            </span>
            <span className="mt-xs text-[16px] font-semibold leading-6">Vi phạm cần xử lý</span>
            <span className="text-[14px] leading-[22px]">
              {openViolations > 0 ? 'chưa xử phạt hoặc chưa nộp phạt' : 'Đã xử lý hết'}
            </span>
            <span className="mt-sm flex items-center gap-1 text-[14px] font-semibold leading-[22px] text-text/80">
              Xem báo cáo
              <Icon name="chevron-right" size={16} color="currentColor" />
            </span>
          </button>
        </div>
      </div>
      {allClear ? (
        <p
          className={`flex items-center gap-xs border-t border-[#0B5D33]/15 px-lg py-sm text-[14px] font-medium md:px-xl ${clear.ink}`}
        >
          <Icon name="check-circle" size={18} color="currentColor" />
          Hồ sơ mới sẽ hiện ở hộp duyệt.
        </p>
      ) : null}
    </section>
  );
}

const MAX_DRAWN = 60;

/**
 * The ward's pavement drawn as its own row of slots over a painted kerb:
 * rented slots in orange, free ones dashed. One button opens the slot grid.
 */
export function KerbOccupancyStrip({
  rented,
  total,
  percent,
  activeContracts,
  onOpen,
}: {
  rented: number;
  total: number;
  percent: number;
  activeContracts: number;
  onOpen: () => void;
}) {
  const per = total > MAX_DRAWN ? Math.ceil(total / MAX_DRAWN) : 1;
  const drawn = total > 0 ? Math.ceil(total / per) : 13;
  const filled = total > 0 ? Math.min(drawn, Math.round(rented / per)) : 0;

  return (
    <section aria-labelledby="ward-kerb-title" className="flex flex-col gap-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-x-lg gap-y-xs">
        <h2
          id="ward-kerb-title"
          className="font-sign text-[21px] font-bold leading-tight text-text"
        >
          Vỉa hè của phường
        </h2>
        <dl className="flex flex-wrap gap-x-lg gap-y-1">
          <Stat label="Ô đang thuê" value={`${rented}/${total}`} />
          <Stat label="Tỷ lệ lấp đầy" value={`${percent}%`} />
          <Stat label="Hợp đồng đang hiệu lực" value={String(activeContracts)} />
        </dl>
      </div>
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Ô đang thuê ${rented}/${total}, ô trên toàn phường`}
        className={`group flex flex-col gap-sm rounded-[20px] bg-card p-md text-left shadow-card ring-1 ring-border md:p-lg ${lift}`}
      >
        <div
          aria-hidden="true"
          className="grid gap-[5px]"
          style={{ gridTemplateColumns: 'repeat(auto-fill, 20px)' }}
        >
          {Array.from({ length: drawn }, (_, i) =>
            i < filled ? (
              <span
                key={i}
                className="sb-pop h-7 w-5 rounded-[4px] bg-brand shadow-[inset_0_-3px_0_rgb(0_0_0/0.12)]"
                style={{ animationDelay: `${Math.min(i * 12, 500)}ms` }}
              />
            ) : (
              <span
                key={i}
                className={`h-7 w-5 rounded-[4px] border-[1.5px] border-dashed bg-card ${total > 0 ? 'border-muted/45' : 'border-muted/25'}`}
              />
            ),
          )}
        </div>
        <div aria-hidden="true" className="sb-kerb sb-kerb-thin rounded-full" />
        <div className="flex flex-wrap items-center justify-between gap-xs text-[14px] leading-[22px] text-muted">
          <span className="flex flex-wrap items-center gap-x-md gap-y-1">
            {total > 0 ? (
              <>
                <Legend swatch="bg-brand" label="Đã thuê" />
                <Legend
                  swatch="border-[1.5px] border-dashed border-muted/60 bg-card"
                  label="Còn trống"
                />
                {per > 1 ? <span>Mỗi ô vẽ = {per} ô</span> : null}
              </>
            ) : (
              <span>Chưa có ô nào trên lưới của phường</span>
            )}
          </span>
          <span className="flex items-center gap-1 font-semibold text-primary">
            ô trên toàn phường
            <Icon
              name="chevron-right"
              size={16}
              color="currentColor"
              className="transition-transform group-hover:translate-x-0.5"
            />
          </span>
        </div>
      </button>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-xs">
      <dt className="text-[14px] text-muted">{label}</dt>
      <dd className="font-sign text-[22px] font-bold leading-none text-text font-tabular md:text-[28px]">
        {value}
      </dd>
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span aria-hidden="true" className={`h-3.5 w-2.5 rounded-[3px] ${swatch}`} />
      {label}
    </span>
  );
}

/** Collected vs still owed on one ruled bar, the two sums as buttons at either end. */
export function CollectionLedger({
  collected,
  outstanding,
  onOpen,
}: {
  collected: number;
  outstanding: number;
  onOpen: () => void;
}) {
  const sum = collected + outstanding;
  const share = sum > 0 ? collected / sum : 0;
  const grown = useGrowOnMount(share);

  return (
    <section aria-labelledby="ward-ledger-title" className="flex flex-col gap-sm">
      <h2
        id="ward-ledger-title"
        className="font-sign text-[21px] font-bold leading-tight text-text"
      >
        Sổ thu
      </h2>
      <div className="grid grid-cols-1 items-center gap-md rounded-[20px] bg-card p-md shadow-card ring-1 ring-border md:grid-cols-[auto_minmax(0,1fr)_auto] md:p-lg">
        <LedgerSum
          label="Đã thu"
          amount={collected}
          hint="phí thuê ô và tiền phạt"
          swatch="bg-tertiary"
          onOpen={onOpen}
        />
        {sum > 0 ? (
          <div
            aria-hidden="true"
            className="order-last flex h-[14px] overflow-hidden rounded-full bg-accent md:order-none"
          >
            <div
              className="h-full rounded-l-full bg-tertiary transition-[width] duration-700 [transition-timing-function:var(--ease-out)]"
              style={{ width: `${grown * 100}%` }}
            />
          </div>
        ) : (
          <p className="order-last text-center text-[14px] text-muted md:order-none">
            Chưa có khoản thu nào trong kỳ
          </p>
        )}
        <LedgerSum
          label="Còn phải thu"
          amount={outstanding}
          hint="phí và phạt chưa thanh toán"
          swatch="bg-accent"
          onOpen={onOpen}
          alignEnd
        />
      </div>
    </section>
  );
}

function LedgerSum({
  label,
  amount,
  hint,
  swatch,
  onOpen,
  alignEnd,
}: {
  label: string;
  amount: number;
  hint: string;
  swatch: string;
  onOpen: () => void;
  alignEnd?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${label} ${formatVnd(amount)}, ${hint}`}
      className={`flex min-h-12 flex-col rounded-[14px] p-xs text-left transition-colors hover:bg-sunken/70 ${alignEnd ? 'md:items-end md:text-right' : ''}`}
    >
      <span className="flex items-center gap-1.5 text-[14px] font-semibold text-text">
        <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${swatch}`} />
        {label}
      </span>
      <span className="font-sign text-[24px] font-bold leading-[34px] text-text font-tabular md:text-[28px]">
        {formatVnd(amount)}
      </span>
      <span className="text-[13px] text-muted">{hint}</span>
    </button>
  );
}

export type Shortcut = { to: string; icon: IconName; title: string; description: string };

const SHORTCUT_TINTS = [
  'bg-tint-primary text-primary',
  'bg-tint-indigo text-indigo',
  'bg-tint-tertiary text-tertiary',
  'bg-tint-error text-error',
];

/** The shift toolbar: four big pictogram tiles, no boxed cards. */
export function ShiftShortcuts({
  shortcuts,
  onOpen,
}: {
  shortcuts: Shortcut[];
  onOpen: (to: string) => void;
}) {
  return (
    <ul className="grid grid-cols-1 gap-xs md:grid-cols-2 md:gap-sm xl:grid-cols-4">
      {shortcuts.map((s, i) => (
        <li key={s.to}>
          <button
            type="button"
            onClick={() => onOpen(s.to)}
            className="group flex min-h-14 w-full items-center gap-sm rounded-[16px] p-xs text-left transition-colors hover:bg-card hover:shadow-card md:items-start md:p-sm"
          >
            <span
              className={`flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[10px] transition-transform duration-200 group-hover:translate-x-0.5 ${SHORTCUT_TINTS[i % SHORTCUT_TINTS.length]}`}
            >
              <Icon name={s.icon} size={28} color="currentColor" weight="duotone" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[16px] font-semibold leading-6 text-text">{s.title}</span>
              <span className="mt-0.5 hidden text-[14px] leading-[22px] text-muted sm:block">
                {s.description}
              </span>
            </span>
            <Icon
              name="chevron-right"
              size={18}
              color="currentColor"
              className="shrink-0 self-center text-muted opacity-60 transition-opacity group-hover:opacity-100"
            />
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Same footprint as the loaded board, strip and ledger, so nothing jumps. */
export function DashboardSkeleton({ aside }: { aside?: ReactNode }) {
  return (
    <div role="status" className="flex flex-col gap-lg">
      <span className="sr-only">Đang tải…</span>
      <div className="grid gap-md xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="grid grid-cols-1 overflow-hidden rounded-[28px] bg-card ring-1 ring-border md:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="flex min-h-[200px] flex-col gap-sm p-lg">
              <Skeleton className="h-[64px] w-[120px]" />
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-56" />
              <Skeleton className="mt-auto h-12 w-[220px]" />
            </div>
          ))}
        </div>
        {aside}
      </div>
      <div className="flex flex-col gap-sm">
        <Skeleton className="h-6 w-48" />
        <div className="rounded-[20px] bg-card p-lg ring-1 ring-border">
          <div
            className="grid gap-[5px]"
            style={{ gridTemplateColumns: 'repeat(auto-fill, 20px)' }}
          >
            {Array.from({ length: 26 }, (_, i) => (
              <Skeleton key={i} className="h-7 w-5 rounded-[4px]" />
            ))}
          </div>
          <Skeleton className="mt-sm h-1.5 w-full" />
        </div>
      </div>
      <div className="flex flex-col gap-sm">
        <Skeleton className="h-6 w-28" />
        <div className="rounded-[20px] bg-card p-lg ring-1 ring-border">
          <Skeleton className="h-[14px] w-full rounded-full" />
        </div>
      </div>
    </div>
  );
}
