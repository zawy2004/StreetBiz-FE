import { Link } from 'react-router-dom';

import { Icon } from '@/components/common';
import { StatusChip } from '@/components/status';
import { Skeleton } from '@/components/feedback';
import { deviceKind, relativeTime, shortDate, within24h, type DeviceKind } from './account-format';

/** A device drawn from its name: laptop, phone or tablet, screen lit warm with a little kerb. */
export function DeviceGlyph({ kind, size }: { kind: DeviceKind; size: 'lg' | 'sm' }) {
  const stroke = 'rgb(var(--c-text))';
  const screen = '#FFF3E8';
  const kerb = (x: number, y: number, w: number) =>
    Array.from({ length: 4 }, (_, i) => (
      <rect
        key={i}
        x={x + (i * w) / 4}
        y={y}
        width={w / 4}
        height="4"
        fill={i % 2 ? 'rgb(var(--c-kerb-paint))' : 'rgb(var(--c-kerb))'}
      />
    ));
  if (kind === 'phone') {
    return (
      <svg
        viewBox="0 0 56 96"
        aria-hidden="true"
        className={size === 'lg' ? 'h-24 w-14' : 'h-10 w-6'}
      >
        <rect
          x="3"
          y="3"
          width="50"
          height="90"
          rx="10"
          fill="rgb(var(--c-card))"
          stroke={stroke}
          strokeWidth="2.5"
        />
        <rect x="9" y="13" width="38" height="66" rx="4" fill={screen} />
        {kerb(9, 71, 38)}
        <rect x="22" y="7" width="12" height="2.5" rx="1.25" fill={stroke} />
      </svg>
    );
  }
  if (kind === 'tablet') {
    return (
      <svg
        viewBox="0 0 96 80"
        aria-hidden="true"
        className={size === 'lg' ? 'h-20 w-24' : 'h-8 w-10'}
      >
        <rect
          x="3"
          y="3"
          width="90"
          height="74"
          rx="9"
          fill="rgb(var(--c-card))"
          stroke={stroke}
          strokeWidth="2.5"
        />
        <rect x="10" y="10" width="76" height="60" rx="4" fill={screen} />
        {kerb(10, 62, 76)}
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 120 80"
      aria-hidden="true"
      className={size === 'lg' ? 'h-20 w-[120px]' : 'h-8 w-12'}
    >
      <rect
        x="16"
        y="4"
        width="88"
        height="58"
        rx="6"
        fill="rgb(var(--c-card))"
        stroke={stroke}
        strokeWidth="2.5"
      />
      <rect x="22" y="10" width="76" height="46" rx="3" fill={screen} />
      {kerb(22, 48, 76)}
      <path
        d="M4 66h112l-6 10H10z"
        fill="rgb(var(--c-card))"
        stroke={stroke}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <rect x="50" y="66" width="20" height="3" rx="1.5" fill={stroke} />
    </svg>
  );
}

export type SessionView = {
  sessionId: number;
  name: string;
  /** Accessible name of the sign-out button, word for word from before. */
  revokeLabel: string;
  /** The original subtitle, kept word for word: "{ip} · Hoạt động gần nhất {thời điểm}". */
  subtitle: string;
  lastActiveAt: string | null;
  createdAt: string | null;
  expiresAt: string | null;
};

/** The device in the user's hand, framed apart like the pass they are wearing. */
export function CurrentDeviceCard({ session }: { session: SessionView }) {
  const kind = deviceKind(session.name);
  const relative = relativeTime(session.lastActiveAt);
  const showExpiry = session.expiresAt && session.expiresAt !== session.createdAt;
  return (
    <section
      aria-label="Thiết bị này"
      className="relative overflow-hidden rounded-[20px] bg-card p-md shadow-card ring-1 ring-tertiary/25 md:p-lg"
    >
      <div className="flex flex-col gap-md sm:flex-row sm:items-center sm:gap-lg">
        <div className="relative flex h-24 w-[132px] shrink-0 items-center justify-center rounded-[16px] bg-sunken/60">
          <DeviceGlyph kind={kind} size="lg" />
          <span aria-hidden="true" className="absolute right-2.5 top-2.5 flex h-3 w-3">
            <span className="sb-ping absolute inline-flex h-full w-full rounded-full bg-tertiary/60" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-tertiary ring-2 ring-card" />
          </span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-xs">
          <p className="text-body-xs font-semibold uppercase tracking-[0.06em] text-muted">
            Thiết bị này
          </p>
          <div className="flex flex-wrap items-center gap-xs">
            <h2
              title={session.name}
              className="line-clamp-2 min-w-0 break-words text-headline-lg text-text"
            >
              {session.name}
            </h2>
            <StatusChip label="Đang dùng" tone="ok" />
          </div>
          <p className="break-words text-body-sm text-muted">
            {session.subtitle}
            {relative ? (
              <span className="font-sign font-semibold text-text font-tabular"> · {relative}</span>
            ) : null}
          </p>
          {session.createdAt ? (
            <p className="text-body-sm text-muted">
              Đăng nhập lúc {shortDate(session.createdAt)}
              {showExpiry ? ` · Hết hạn ${shortDate(session.expiresAt)}` : ''}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

type RowProps = {
  session: SessionView;
  pending: boolean;
  onRevoke: () => void;
};

/** One line of the gate log: a dot on the rule, the device, when it was last seen, and a worded sign-out. */
export function DeviceRow({ session, pending, onRevoke }: RowProps) {
  const fresh = within24h(session.lastActiveAt);
  const relative = relativeTime(session.lastActiveAt);
  return (
    <div className="relative flex flex-col gap-sm rounded-[16px] py-sm pl-lg pr-xs transition-colors hover:bg-sunken/70 sm:flex-row sm:items-center sm:gap-md">
      <span
        aria-hidden="true"
        className={`absolute -left-[6px] top-[22px] h-2.5 w-2.5 rounded-full ring-[3px] ring-bg ${fresh ? 'bg-primary' : 'bg-muted'}`}
      />
      <div className="flex min-w-0 flex-1 items-start gap-sm">
        <span className="mt-0.5 flex h-11 w-12 shrink-0 items-center justify-center rounded-[12px] bg-sunken">
          <DeviceGlyph kind={deviceKind(session.name)} size="sm" />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <p title={session.name} className="line-clamp-2 break-words text-headline-sm text-text">
            {session.name}
          </p>
          {relative ? (
            <p className="font-sign text-[13px] font-semibold leading-[18px] text-text font-tabular">
              {relative}
            </p>
          ) : null}
          <p className="truncate text-body-sm text-muted">{session.subtitle}</p>
        </div>
      </div>
      <button
        type="button"
        aria-label={session.revokeLabel}
        onClick={onRevoke}
        className="inline-flex h-12 shrink-0 items-center justify-center gap-xs self-end rounded-[12px] bg-card px-md text-label font-semibold text-error ring-1 ring-inset ring-error/40 transition-colors hover:bg-error-bg sm:self-center"
      >
        {pending ? (
          <span
            aria-hidden="true"
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
        ) : null}
        Đăng xuất
      </button>
    </div>
  );
}

/** The next safe step, beside the list on wide screens and under it on phones. */
export function SessionSafetyNote() {
  return (
    <aside
      aria-label="An toàn tài khoản"
      className="flex flex-col gap-sm rounded-[20px] bg-[#FFF3E8] p-md dark:bg-primary/10 md:p-lg"
    >
      <span
        aria-hidden="true"
        className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-card text-primary shadow-card"
      >
        <Icon name="shield-alert-outline" size={26} color="currentColor" weight="duotone" />
      </span>
      <p className="text-headline-sm text-text">An toàn tài khoản</p>
      <p className="text-body-md text-text/80">
        Không nhận ra thiết bị? Đăng xuất thiết bị đó, rồi đổi mật khẩu.
      </p>
      <Link
        to="/account/password"
        className="inline-flex h-12 w-fit items-center gap-xs rounded-[12px] bg-card px-md text-label font-semibold text-text ring-1 ring-inset ring-border transition-colors hover:bg-sunken"
      >
        <Icon name="lock-outline" size={18} color="currentColor" />
        Đổi mật khẩu
      </Link>
    </aside>
  );
}

/** Only this device is signed in: say so instead of an empty "other devices" list. */
export function OnlyThisDevice() {
  return (
    <p className="flex items-center gap-sm rounded-[16px] bg-[#E6F6EC] px-md py-sm text-body-md font-semibold text-[#0B5D33] dark:bg-tertiary/15 dark:text-tertiary">
      <Icon name="shield-check-outline" size={22} color="currentColor" weight="fill" />
      Chỉ có thiết bị này đang đăng nhập.
    </p>
  );
}

/** Loading: the counter, the device card and two rows, in their real sizes. */
export function SessionsSkeleton() {
  return (
    <div role="status" aria-label="Đang tải" className="flex flex-col gap-lg">
      <Skeleton className="h-11 w-14" />
      <Skeleton className="h-[148px] w-full max-w-[600px] rounded-[20px]" />
      <div className="flex max-w-[600px] flex-col gap-sm">
        <Skeleton className="h-16 w-full rounded-[16px]" />
        <Skeleton className="h-16 w-full rounded-[16px]" />
      </div>
    </div>
  );
}
