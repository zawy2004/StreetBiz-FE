import { useId, useRef, type KeyboardEvent } from 'react';

import { Button, Icon, type IconName } from '@/components/common';
import { StatusChip } from '@/components/status';
import { ROLE_LABELS, type RoleCode } from '@/core/types/role';
import { useThemeStore, type ThemeMode } from '@/store/theme-store';
import { groupPhone } from './account-format';

/** What each account may do here, so a ward officer and a platform admin never mistake their scope. */
const ROLE_SCOPE: Record<RoleCode, string> = {
  CUSTOMER: 'Tìm quán, đặt món và nhắn tin với người bán.',
  VENDOR: 'Hồ sơ, ô thuê, phí và đơn hàng của hộ kinh doanh.',
  WARD_AUTHORITY: 'Bạn quản lý vỉa hè của phường. Mọi quyết định duyệt, xử phạt do bạn thực hiện.',
  PLATFORM_ADMIN: 'Vận hành nền tảng. Không có quyền nghiệp vụ của Phường.',
};

type PlateProps = {
  fullName: string;
  role: RoleCode;
  phone: string;
  suspended: boolean;
};

/**
 * The name board in front of the stall: kerb along the top edge, a large
 * monogram, the name, the legal capacity as a stamped plate, and the phone.
 */
export function AccountIdentityPlate({ fullName, role, phone, suspended }: PlateProps) {
  const initial = fullName.trim().charAt(0).toUpperCase() || '?';
  return (
    <section
      aria-label="Thông tin tài khoản"
      className="overflow-hidden rounded-[28px] bg-card shadow-card ring-1 ring-border"
    >
      <div aria-hidden="true" className="sb-kerb" style={{ height: 8 }} />
      <div className="flex flex-col gap-md p-md md:p-lg">
        <div className="flex items-start gap-md">
          <span
            aria-hidden="true"
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-tint-primary font-sign text-[28px] font-bold text-primary-pressed ring-[3px] ring-brand ring-offset-2 ring-offset-card [@container_(min-width:560px)]:h-[88px] [@container_(min-width:560px)]:w-[88px] [@container_(min-width:560px)]:text-[36px]"
          >
            {initial}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-xs pt-1">
            <h2
              title={fullName}
              className="line-clamp-2 break-words font-heading text-[24px] font-bold leading-[30px] tracking-[-0.015em] text-text [@container_(min-width:560px)]:text-[28px] [@container_(min-width:560px)]:leading-[34px]"
            >
              {fullName}
            </h2>
            <div className="flex flex-wrap items-center gap-xs">
              <span className="sb-acct-plate inline-flex h-7 items-center rounded-[6px] border border-primary/25 bg-tint-primary px-2.5 font-sign text-[13px] font-bold uppercase leading-none tracking-[0.05em] text-primary-pressed [font-stretch:72%]">
                {ROLE_LABELS[role]}
              </span>
              <StatusChip
                label={suspended ? 'Tạm khoá' : 'Đang hoạt động'}
                tone={suspended ? 'danger' : 'ok'}
              />
            </div>
          </div>
        </div>
        <dl className="flex flex-col gap-sm border-t border-dashed border-border pt-md">
          <div className="flex items-baseline justify-between gap-sm">
            <dt className="text-body-sm text-muted">Số điện thoại</dt>
            <dd className="whitespace-nowrap font-sign text-[17px] font-semibold leading-6 text-text font-tabular">
              {groupPhone(phone)}
            </dd>
          </div>
        </dl>
        <p className="flex items-start gap-xs text-body-md text-muted">
          <Icon
            name={role === 'PLATFORM_ADMIN' ? 'cog-outline' : 'shield-check-outline'}
            size={18}
            color="currentColor"
            className="mt-0.5 shrink-0 text-primary"
          />
          <span>{ROLE_SCOPE[role]}</span>
        </p>
        {suspended ? (
          <p className="rounded-[12px] bg-[#FDEBEA] px-sm py-xs text-body-md font-semibold text-[#8F1717] dark:bg-[#3A1414] dark:text-[#FF9A90]">
            Tài khoản đang bị tạm khoá.
          </p>
        ) : null}
      </div>
    </section>
  );
}

type TileProps = {
  icon: IconName;
  title: string;
  description: string;
  onPress: () => void;
};

/** One security entry: a large tile on wide screens, a 64px row with a chevron on phones. */
export function SecurityTile({ icon, title, description, onPress }: TileProps) {
  const titleId = useId();
  const descriptionId = useId();
  return (
    <button
      type="button"
      onClick={onPress}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className="group flex min-h-16 w-full items-center gap-sm rounded-[18px] bg-card p-sm text-left shadow-card ring-1 ring-border transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-card-hover active:scale-[0.98] motion-reduce:hover:translate-y-0 [@container_(min-width:560px)]:flex-col [@container_(min-width:560px)]:items-start [@container_(min-width:560px)]:gap-md [@container_(min-width:560px)]:p-md"
    >
      <span
        aria-hidden="true"
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-[#FFF3E8] text-primary transition-transform duration-150 group-hover:translate-x-0.5 dark:bg-primary/15"
      >
        <Icon name={icon} size={28} color="currentColor" weight="duotone" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span id={titleId} className="text-headline-sm text-text">
          {title}
        </span>
        <span id={descriptionId} className="text-body-sm text-muted">
          {description}
        </span>
      </span>
      <Icon
        name="chevron-right"
        size={20}
        color="currentColor"
        className="shrink-0 text-muted [@container_(min-width:560px)]:hidden"
      />
    </button>
  );
}

const THEMES: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: 'Sáng' },
  { value: 'dark', label: 'Tối' },
  { value: 'system', label: 'Tự động' },
];

/** A 96×64 drawing of a screen in that theme. */
function MiniScreen({ mode }: { mode: ThemeMode }) {
  const light = (
    <>
      <rect width="96" height="64" fill="#F7F8FA" />
      <rect width="96" height="12" fill="#FF6A1F" />
      <rect x="10" y="22" width="52" height="6" rx="3" fill="#C9D0D8" />
      <rect x="10" y="34" width="72" height="5" rx="2.5" fill="#E1E5EA" />
      <rect x="10" y="44" width="40" height="5" rx="2.5" fill="#E1E5EA" />
    </>
  );
  const dark = (
    <>
      <rect width="96" height="64" fill="#0F1720" />
      <rect width="96" height="12" fill="#FF8A4C" />
      <rect x="10" y="22" width="52" height="6" rx="3" fill="#3A4A5A" />
      <rect x="10" y="34" width="72" height="5" rx="2.5" fill="#2B3946" />
      <rect x="10" y="44" width="40" height="5" rx="2.5" fill="#2B3946" />
    </>
  );
  return (
    <svg viewBox="0 0 96 64" aria-hidden="true" className="block h-auto w-full max-w-[96px]">
      {mode === 'dark' ? dark : light}
      {mode === 'system' ? (
        <>
          <clipPath id="sb-acct-half">
            <polygon points="96,0 96,64 0,64" />
          </clipPath>
          <g clipPath="url(#sb-acct-half)">{dark}</g>
        </>
      ) : null}
    </svg>
  );
}

/**
 * Light / dark / automatic as three previews. Same store as the sidebar's
 * ThemeToggle; a radio group with arrow keys moving the choice.
 */
export function ThemePreviewPicker() {
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? -1
          : 0;
    if (!step) return;
    event.preventDefault();
    const next = (index + step + THEMES.length) % THEMES.length;
    setMode(THEMES[next]!.value);
    refs.current[next]?.focus();
  };

  return (
    <div role="radiogroup" aria-label="Giao diện" className="grid grid-cols-3 gap-sm">
      {THEMES.map((option, index) => {
        const active = mode === option.value;
        return (
          <button
            key={option.value}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => setMode(option.value)}
            onKeyDown={(event) => onKey(event, index)}
            className={[
              'relative flex min-h-12 flex-col items-center gap-xs rounded-[16px] bg-card p-xs pb-sm text-label transition-[box-shadow] duration-150 sm:p-sm',
              active
                ? 'font-semibold text-text shadow-card ring-2 ring-brand'
                : 'text-muted ring-1 ring-border hover:ring-muted/40',
            ].join(' ')}
          >
            <span className="w-full overflow-hidden rounded-[10px] ring-1 ring-border">
              <MiniScreen mode={option.value} />
            </span>
            {option.label}
            {active ? (
              <span
                aria-hidden="true"
                className="sb-acct-check absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-on-primary shadow-card"
              >
                <Icon name="check" size={14} color="currentColor" />
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/** The four demo identities as role plates in a row (dev mock only). */
export function RoleDemoStrip({
  roles,
  current,
  onPick,
}: {
  roles: RoleCode[];
  current: RoleCode;
  onPick: (role: RoleCode) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-sm [@container_(min-width:560px)]:grid-cols-4">
      {roles.map((role) => {
        const active = role === current;
        return (
          <button
            key={role}
            type="button"
            onClick={() => onPick(role)}
            aria-current={active ? 'true' : undefined}
            className={[
              'flex min-h-12 items-center justify-center rounded-[10px] px-sm text-center text-label font-semibold transition-colors duration-150',
              active
                ? 'bg-tint-primary text-primary-pressed ring-1 ring-primary/30'
                : 'bg-card text-text ring-1 ring-border hover:bg-sunken',
            ].join(' ')}
          >
            {ROLE_LABELS[role]}
          </button>
        );
      })}
    </div>
  );
}

/** Closing the stall: sign-out set apart, with one line on what it does. */
export function SignOutZone({ onPress }: { onPress: () => void }) {
  return (
    <section
      aria-label="Phiên đăng nhập trên thiết bị này"
      className="flex flex-col gap-sm rounded-[20px] border border-dashed border-border bg-card/60 p-md"
    >
      <p className="flex items-start gap-xs text-body-md text-muted">
        <Icon name="logout" size={18} color="currentColor" className="mt-0.5 shrink-0" />
        <span>Đăng xuất khỏi thiết bị này. Lần sau bạn cần đăng nhập lại.</span>
      </p>
      <Button label="Đăng xuất" variant="outline" onPress={onPress} />
    </section>
  );
}
