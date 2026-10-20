import { useId, useState } from 'react';

import { Button, formatVnd, Icon, KerbTag, type IconName } from '@/components/common';
import { Skeleton } from '@/components/feedback';
import { StatusChip } from '@/components/status';
import type { SlotHold } from '@/core/api/side-api';
import {
  DocCheckArt,
  PermitMiniArt,
  SlotTopArt,
} from '@/features/business-registrations/components/registration-art';
import { formatCountdown, secondsUntil } from '@/features/sidewalk-slots/slot-format';
import { useNow } from '@/features/sidewalk-slots/useNow';
import { payableSummary, type Todo, type TodoKind } from '../todos';
import { useCountUp } from './count-up';

const VN_TZ = 'Asia/Ho_Chi_Minh';
const todayFormat = new Intl.DateTimeFormat('vi-VN', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: VN_TZ,
});
const shortDate = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  timeZone: VN_TZ,
});

const formatShort = (iso: string | null) => {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? shortDate.format(t) : null;
};

/* ------------------------------------------------------------------ greeting */

type GreetingProps = {
  fullName: string;
  hkd: string | null;
  latestStatus: string | null;
  /** Registrations still loading: hold the chips' place. */
  loading?: boolean;
};

/** Today's date, the household-business code and the latest file's status, then the greeting. */
export function HomeGreeting({ fullName, hkd, latestStatus, loading = false }: GreetingProps) {
  const today = todayFormat.format(new Date());
  return (
    <header className="flex flex-col gap-1.5">
      {/* min-h holds the chip row's height, and the placeholders hold the chips' width while the
          registrations load, so the greeting below does not jump when they arrive. */}
      <p className="flex min-h-7 flex-wrap items-center gap-x-sm gap-y-1.5 text-body-md font-medium text-muted">
        <span>{today}</span>
        {loading && !hkd ? (
          <>
            <span aria-hidden="true" className="sb-shimmer h-7 w-[76px] rounded-[6px]" />
            <span aria-hidden="true" className="sb-shimmer h-6 w-[90px] rounded-[6px]" />
          </>
        ) : null}
        {hkd ? (
          <span className="inline-flex h-7 w-[76px] items-center justify-center rounded-[6px] bg-sunken font-sign text-[15px] font-bold tracking-[0.03em] text-text [font-stretch:72%] font-tabular">
            {hkd}
          </span>
        ) : null}
        {latestStatus ? <StatusChip code={latestStatus} /> : null}
      </p>
      <h1 className="line-clamp-2 break-words font-sign text-[28px] font-extrabold leading-[34px] tracking-[-0.02em] text-text md:text-[34px] md:leading-[40px]">
        Chào {fullName}
      </h1>
      <p className="text-body-lg text-muted">Hôm nay quán mình cần làm gì?</p>
    </header>
  );
}

/* ---------------------------------------------------------------- today board */

const TICKET_TONE: Record<
  TodoKind,
  { bar: string; wash: string; ink: string; icon: IconName; press: string }
> = {
  penalty: {
    bar: 'bg-[#8F1717] dark:bg-[#FF9A90]',
    wash: 'bg-[#FDEBEA] dark:bg-[#3A1414]',
    ink: 'text-[#8F1717] dark:text-[#FF9A90]',
    icon: 'gavel',
    press: 'active:bg-[#FDEBEA] dark:active:bg-[#3A1414]',
  },
  fee: {
    bar: 'bg-secondary',
    wash: 'bg-[#FFF3D1] dark:bg-[#3A2A08]',
    ink: 'text-[#6B4100] dark:text-[#FFD27A]',
    icon: 'cash-multiple',
    press: 'active:bg-[#FFF3D1] dark:active:bg-[#3A2A08]',
  },
  registration: {
    bar: 'bg-[#2B3640] dark:bg-[#C5D0DA]',
    wash: 'bg-[#EEF1F4] dark:bg-[#1D2833]',
    ink: 'text-[#2B3640] dark:text-[#C5D0DA]',
    icon: 'file-document-outline',
    press: 'active:bg-[#EEF1F4] dark:active:bg-[#1D2833]',
  },
};

const VISIBLE_TICKETS = 4;

type BoardProps = {
  todos: Todo[];
  /** First load still running: draw the board's outline, not "no todos". */
  loading: boolean;
  onOpen: (path: string) => void;
};

/**
 * "Bảng việc hôm nay": how many things are waiting and how much has to be paid,
 * in large signage figures, then one ticket per todo pinned under them.
 */
export function TodayBoard({ todos, loading, onOpen }: BoardProps) {
  const headingId = useId();
  const [expanded, setExpanded] = useState(false);
  const summary = payableSummary(todos);
  const ready = !loading;
  const count = useCountUp(todos.length, ready, 600);
  const total = useCountUp(summary.total, ready, 900);

  const shown = expanded ? todos : todos.slice(0, VISIBLE_TICKETS);
  const hiddenCount = todos.length - Math.min(todos.length, VISIBLE_TICKETS);
  const parts = [
    summary.registrations ? `${summary.registrations} hồ sơ cần bổ sung` : null,
    summary.fees ? `${summary.fees} kỳ phí` : null,
    summary.penalties ? `${summary.penalties} biên bản` : null,
  ].filter(Boolean);

  return (
    <section
      aria-labelledby={headingId}
      className="overflow-hidden rounded-[28px] bg-card shadow-card ring-1 ring-border"
    >
      <div aria-hidden="true" className="sb-kerb sb-kerb-thin" />
      <div className="flex flex-col p-md md:p-lg">
        <h2 id={headingId} className="text-[15px] font-bold leading-5 text-text">
          Việc cần làm
        </h2>

        {loading && todos.length === 0 ? (
          <BoardSkeleton />
        ) : todos.length === 0 ? (
          <div className="mt-sm flex items-center gap-sm rounded-[18px] bg-[#E6F6EC] p-md dark:bg-[#10301F]">
            <span className="text-[#0B5D33] dark:text-[#8BE3B0]">
              <Icon name="check-circle" size={32} color="currentColor" />
            </span>
            <div className="min-w-0">
              <p className="text-[17px] font-bold leading-6 text-[#0B5D33] dark:text-[#8BE3B0]">
                Không có việc cần xử lý
              </p>
              <p className="text-body-md text-text/80">
                Phí, biên bản và yêu cầu bổ sung hồ sơ sẽ hiện ở đây.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-xs flex flex-col gap-y-sm sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-x-lg">
              <div>
                <p className="sr-only">{todos.length} việc đang chờ bạn</p>
                <div aria-hidden="true" className="flex items-end gap-sm">
                  <span className="font-sign text-[56px] font-extrabold leading-[0.9] tracking-[-0.02em] text-text [font-stretch:72%] font-tabular md:text-[72px]">
                    {Math.round(count)}
                  </span>
                  <span className="pb-1 text-[17px] font-semibold leading-tight text-text">
                    việc đang
                    <span className="block">chờ bạn</span>
                  </span>
                </div>
              </div>
              {summary.total > 0 ? (
                <div className="sm:text-right">
                  <p className="sr-only">Cần trả {formatVnd(summary.total)}</p>
                  <div aria-hidden="true">
                    <p className="text-label text-muted">Cần trả</p>
                    <p className="whitespace-nowrap font-sign text-[32px] font-extrabold leading-[1.1] tracking-[-0.01em] text-text font-tabular md:text-[40px]">
                      {Math.round(total).toLocaleString('vi-VN')}
                      <span className="ml-1 text-[0.55em] font-bold text-muted">đ</span>
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
            {parts.length > 0 ? (
              <p className="mt-1 text-body-md text-muted">gồm {parts.join(', ')}</p>
            ) : null}

            <ul className="mt-md flex flex-col gap-xs">
              {shown.map((todo, i) => (
                <li
                  key={todo.key}
                  className="sb-rise"
                  style={{ ['--delay' as string]: `${Math.min(i, 4) * 60}ms` }}
                >
                  <TodoTicket todo={todo} onOpen={onOpen} />
                </li>
              ))}
            </ul>

            {hiddenCount > 0 ? (
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setExpanded((v) => !v)}
                className="mt-xs flex h-12 w-full items-center justify-center gap-xs rounded-[14px] text-[15px] font-semibold text-primary transition-colors hover:bg-tint-primary"
              >
                {expanded ? 'Thu gọn' : `Xem thêm ${hiddenCount} việc`}
                <Icon
                  name={expanded ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color="currentColor"
                />
              </button>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}

function TodoTicket({ todo, onOpen }: { todo: Todo; onOpen: (path: string) => void }) {
  const titleId = useId();
  const detailId = useId();
  const tone = TICKET_TONE[todo.kind];
  const date = formatShort(todo.date);

  return (
    <button
      type="button"
      onClick={() => onOpen(todo.path)}
      aria-labelledby={titleId}
      aria-describedby={detailId}
      className={`group relative flex min-h-[72px] w-full items-center gap-sm overflow-hidden rounded-[16px] bg-card py-sm pl-md pr-sm text-left ring-1 ring-border transition-[transform,background-color,box-shadow] duration-[120ms] hover:shadow-card-hover active:scale-[.99] ${tone.press}`}
    >
      <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1.5 ${tone.bar}`} />
      <span
        aria-hidden="true"
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${tone.wash} ${tone.ink}`}
      >
        <Icon name={tone.icon} size={22} color="currentColor" weight="duotone" />
      </span>
      <span className="min-w-0 flex-1">
        <span id={titleId} className="line-clamp-2 text-[17px] font-semibold leading-6 text-text">
          {todo.title}
        </span>
        <span
          id={detailId}
          className="mt-0.5 flex flex-wrap items-center gap-x-xs gap-y-1 text-[14px] leading-5 text-muted"
        >
          {todo.kind === 'fee' ? (
            <>
              {date ? <span>Hạn {date}</span> : null}
              {todo.slotCode ? <KerbTag code={todo.slotCode} /> : null}
              {todo.overdue ? <StatusChip code="OVERDUE" /> : null}
            </>
          ) : todo.kind === 'penalty' ? (
            <>
              {todo.note ? <span className="truncate">{todo.note}</span> : null}
              {date ? <span>lập {date}</span> : null}
              {todo.slotCode ? <KerbTag code={todo.slotCode} /> : null}
            </>
          ) : (
            <span className="line-clamp-1">
              {todo.note ? `Phường: “${todo.note}”` : 'Phường yêu cầu bổ sung hồ sơ'}
            </span>
          )}
          {todo.amount != null ? (
            <span className="sr-only">Số tiền {formatVnd(todo.amount)}</span>
          ) : null}
        </span>
      </span>
      {todo.amount != null ? (
        <span
          aria-hidden="true"
          className="min-w-[96px] whitespace-nowrap text-right font-sign text-[18px] font-extrabold text-text font-tabular"
        >
          {todo.amount.toLocaleString('vi-VN')}
          <span className="ml-0.5 text-[13px] font-bold text-muted">đ</span>
        </span>
      ) : null}
      <Icon
        name="chevron-right"
        size={18}
        color="currentColor"
        className="shrink-0 text-muted transition-transform duration-150 group-hover:translate-x-0.5"
      />
    </button>
  );
}

function BoardSkeleton() {
  return (
    <div role="status" aria-label="Đang tải việc cần làm" className="mt-sm flex flex-col gap-sm">
      <div className="flex items-end justify-between gap-md">
        <Skeleton className="h-16 w-14" />
        <Skeleton className="h-10 w-40" />
      </div>
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-[72px] w-full rounded-[16px]" />
      ))}
    </div>
  );
}

/* ----------------------------------------------------------------- holds line */

/** "Đang giữ chỗ {n} ô · còn mm:ss", counting down to the first hold that lapses. */
export function HoldLine({ holds, onOpen }: { holds: SlotHold[]; onOpen: () => void }) {
  const nowMs = useNow();
  const soonest = holds.reduce(
    (min, h) => Math.min(min, secondsUntil(h.expiresAt, nowMs)),
    Number.POSITIVE_INFINITY,
  );
  const left = Number.isFinite(soonest) ? soonest : 0;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex min-h-12 w-full items-center gap-sm rounded-[16px] bg-[#FFF3D1] px-md py-sm text-left text-[#6B4100] ring-1 ring-secondary/40 transition-colors hover:bg-[#FFEDB8] dark:bg-[#3A2A08] dark:hover:bg-[#4A360A] dark:text-[#FFD27A]"
    >
      <span aria-hidden="true" className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="sb-ping absolute inset-0 rounded-full bg-brand opacity-60" />
        <span className="relative h-2.5 w-2.5 rounded-full bg-brand" />
      </span>
      <span className="min-w-0 flex-1 text-[15px] font-semibold leading-5">
        Đang giữ chỗ {holds.length} ô · còn{' '}
        <span className="font-sign font-extrabold font-tabular">{formatCountdown(left)}</span>
      </span>
      <Icon name="chevron-right" size={18} color="currentColor" />
    </button>
  );
}

/* ------------------------------------------------------------- shortcut tiles */

const SHORTCUTS: { icon: IconName; label: string; path: string; warm?: boolean }[] = [
  { icon: 'file-document-outline', label: 'Đăng ký kinh doanh', path: '/vendor/registrations' },
  { icon: 'map-marker-radius-outline', label: 'Thuê ô vỉa hè', path: '/vendor/slots', warm: true },
  { icon: 'qrcode-scan', label: 'Quét mã nhận hàng', path: '/vendor/orders/scan' },
  { icon: 'silverware-fork-knife', label: 'Cửa hàng & thực đơn', path: '/vendor/store' },
];

/** Four big way-finding tiles; "Thuê ô vỉa hè" warmer, the main job of a vendor without a slot. */
export function ShortcutTiles({ onOpen }: { onOpen: (path: string) => void }) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-sm">
      <h2 id={headingId} className="text-[15px] font-bold leading-5 text-text">
        Lối tắt
      </h2>
      <div className="grid grid-cols-2 gap-sm">
        {SHORTCUTS.map((s) => (
          <button
            key={s.path}
            type="button"
            onClick={() => onOpen(s.path)}
            className={`group flex min-h-[104px] flex-col justify-between gap-sm rounded-[20px] p-md text-left ring-1 transition-[transform,box-shadow] duration-200 [transition-timing-function:var(--ease-out)] hover:-translate-y-0.5 hover:shadow-card-hover active:translate-y-0 ${
              s.warm
                ? 'bg-[#FFF3E8] ring-brand/25 dark:bg-[#2A2420]'
                : 'bg-card shadow-card ring-border'
            }`}
          >
            <span aria-hidden="true" className="relative h-8 w-8 text-primary">
              <Icon
                name={s.icon}
                size={32}
                color="currentColor"
                className="absolute inset-0 transition-opacity duration-150 group-hover:opacity-0"
              />
              <Icon
                name={s.icon}
                size={32}
                color="currentColor"
                weight="duotone"
                className="absolute inset-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
              />
            </span>
            <span className="text-[16px] font-semibold leading-[22px] text-text">{s.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- register path */

const PATH_STAGES = [
  { label: 'Đăng ký kinh doanh', caption: 'Phường xét hồ sơ hộ kinh doanh', art: 'doc' },
  { label: 'Thuê ô vỉa hè', caption: 'Nộp đơn riêng khi hồ sơ đã được duyệt', art: 'slot' },
  { label: 'Nhận giấy phép số', caption: 'Có mã QR để xuất trình khi cán bộ hỏi', art: 'permit' },
] as const;

/**
 * Shown while the vendor has no registration: the road to a legal sidewalk
 * slot in three illustrated stops (BR-08: registration and rental are separate;
 * BR-16: renting needs an approved registration).
 */
export function RegisterPath({ onStart }: { onStart: () => void }) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className="overflow-hidden rounded-[28px] bg-[#FFF3E8] p-md ring-1 ring-brand/20 md:p-lg dark:bg-[#2A2420]"
    >
      <h2
        id={headingId}
        className="font-sign text-[24px] font-extrabold leading-tight tracking-[-0.01em] text-text md:text-[28px]"
      >
        Chưa có hồ sơ đăng ký
      </h2>
      <p className="mt-1 max-w-[52ch] text-body-lg text-text/75">
        Đăng ký kinh doanh để bắt đầu thuê ô vỉa hè hợp pháp.
      </p>

      <ol className="relative mt-lg grid grid-cols-3 gap-xs">
        <span
          aria-hidden="true"
          className="absolute left-[16.66%] right-[16.66%] top-[44px] border-t-[3px] border-dashed border-brand/60 md:top-[52px]"
        />
        {PATH_STAGES.map((stage, i) => (
          <li key={stage.label} className="relative flex flex-col items-center gap-xs text-center">
            <span className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-card shadow-card ring-1 ring-border md:h-[104px] md:w-[104px]">
              {stage.art === 'doc' ? (
                <DocCheckArt
                  checked={false}
                  className="h-[60px] w-[60px] md:h-[72px] md:w-[72px]"
                />
              ) : stage.art === 'slot' ? (
                <SlotTopArt empty className="h-[60px] w-[60px] md:h-[72px] md:w-[72px]" />
              ) : (
                <PermitMiniArt className="h-[60px] w-[60px] md:h-[72px] md:w-[72px]" />
              )}
            </span>
            <span className="flex items-center gap-1 text-[15px] font-semibold leading-5 text-text">
              <span className="hidden h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary font-sign text-[13px] font-bold text-on-primary sm:flex">
                {i + 1}
              </span>
              {stage.label}
            </span>
            <span className="hidden text-body-sm text-muted sm:block">{stage.caption}</span>
          </li>
        ))}
      </ol>

      <div className="mt-lg sm:max-w-[280px]">
        <Button label="Đăng ký ngay" onPress={onStart} />
      </div>
    </section>
  );
}
