import { Link } from 'react-router-dom';

import { Icon } from '@/components/common';
import { PASSWORD_RULES } from '@/core/auth/password-policy';
import { passedCount } from './account-format';

/** Short marks painted inside each slot; the full rule text is always listed too. */
const SLOT_MARK: Record<string, string> = {
  length: '8+',
  lower: 'a-z',
  upper: 'A-Z',
  digit: '0-9',
  special: '!@#',
  nospace: '␣',
};

type SlotsProps = {
  value: string;
  /** `lg` for the desktop lock panel, `sm` under the field on phones. */
  size: 'lg' | 'sm';
};

/**
 * BR-59 as a row of six pavement slots that light up green as each rule is
 * met, with a running count. The list is what screen readers get; the
 * painted marks are decoration.
 */
export function PasswordRuleSlots({ value, size }: SlotsProps) {
  const count = passedCount(value);
  const large = size === 'lg';
  return (
    <div className="flex flex-col gap-sm">
      <p className="flex items-baseline gap-xs">
        <span
          className={`font-sign font-bold leading-none text-text font-tabular ${large ? 'text-[30px]' : 'text-[22px]'}`}
        >
          {count}/{PASSWORD_RULES.length}
        </span>
        <span className="text-body-sm text-muted">quy tắc đạt</span>
      </p>
      <ul aria-label="Quy tắc mật khẩu" className="flex gap-1">
        {PASSWORD_RULES.map((rule) => {
          const passed = rule.test(value);
          return (
            <li
              // Re-mounting on change replays the light-up once per rule met.
              key={`${rule.id}-${passed}`}
              className={[
                'relative flex flex-1 items-center justify-center rounded-[6px] font-sign font-bold [font-stretch:80%]',
                large ? 'h-[52px] max-w-[72px] text-[15px]' : 'h-9 max-w-12 text-[12px]',
                passed
                  ? 'sb-acct-slot-on border-2 border-tertiary bg-[#E6F6EC] text-[#0B5D33] dark:bg-tertiary/15 dark:text-tertiary'
                  : 'border-2 border-dashed border-border bg-sunken text-muted',
              ].join(' ')}
            >
              <span className="sr-only">
                {rule.label}: {passed ? 'đạt' : 'chưa đạt'}
              </span>
              <span aria-hidden="true" className="flex items-center gap-0.5">
                {passed ? <Icon name="check" size={large ? 16 : 13} color="currentColor" /> : null}
                {SLOT_MARK[rule.id] ?? ''}
              </span>
            </li>
          );
        })}
      </ul>
      {/* The full wording of every rule; the slots above already carry it for screen readers. */}
      <ul aria-hidden="true" className="flex flex-col gap-1.5">
        {PASSWORD_RULES.map((rule) => {
          const passed = rule.test(value);
          return (
            <li key={rule.id} className="flex items-center gap-xs">
              <Icon
                name={passed ? 'check-circle' : 'circle-outline'}
                size={16}
                color="currentColor"
                weight={passed ? 'fill' : 'regular'}
                className={passed ? 'text-tertiary' : 'text-muted'}
              />
              <span className={`text-body-sm ${passed ? 'text-text' : 'text-muted'}`}>
                {rule.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * A shuttered stall with a padlock on a kerb. When the new password passes
 * every rule the shackle drops into the body.
 */
export function LockIllustration({ locked }: { locked: boolean }) {
  return (
    <svg
      viewBox="0 0 260 180"
      aria-hidden="true"
      data-locked={locked}
      className="block h-auto w-full max-w-[260px]"
    >
      <rect x="30" y="14" width="200" height="126" rx="10" fill="rgb(var(--c-sunken))" />
      {Array.from({ length: 9 }, (_, i) => (
        <rect key={i} x="30" y={22 + i * 13} width="200" height="3" fill="rgb(var(--c-border))" />
      ))}
      <rect x="22" y="8" width="216" height="10" rx="4" fill="rgb(var(--c-muted) / 0.35)" />
      <g className="sb-acct-shackle">
        <path
          d="M110 84V68a20 20 0 0 1 40 0v16"
          fill="none"
          stroke="rgb(var(--c-text))"
          strokeWidth="9"
          strokeLinecap="round"
        />
      </g>
      <rect x="98" y="84" width="64" height="50" rx="12" fill="rgb(var(--c-primary))" />
      <circle cx="130" cy="104" r="6" fill="rgb(255 255 255 / 0.9)" />
      <rect x="127" y="106" width="6" height="14" rx="3" fill="rgb(255 255 255 / 0.9)" />
      {Array.from({ length: 6 }, (_, i) => (
        <rect
          key={i}
          x={10 + i * 40}
          y="150"
          width="40"
          height="12"
          fill={i % 2 ? 'rgb(var(--c-kerb-paint))' : 'rgb(var(--c-kerb))'}
        />
      ))}
      <rect x="10" y="162" width="240" height="4" fill="rgb(0 0 0 / 0.08)" />
    </svg>
  );
}

/** What happens once the password changes, and where to check devices afterwards. */
export function AfterChangeNote() {
  return (
    <div className="flex items-start gap-sm rounded-[20px] bg-[#FFF3E8] p-md dark:bg-primary/10">
      <span
        aria-hidden="true"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-card text-primary shadow-card"
      >
        <Icon name="devices" size={22} color="currentColor" weight="duotone" />
      </span>
      <div className="flex min-w-0 flex-col gap-xs">
        <p className="text-headline-sm text-text">Sau khi đổi</p>
        <p className="text-body-md text-text/80">Các thiết bị khác sẽ phải đăng nhập lại.</p>
        <p className="text-body-sm text-muted">
          Dùng mật khẩu riêng cho StreetBiz, không dùng lại mật khẩu ngân hàng hay mạng xã hội.
        </p>
        <Link
          to="/account/sessions"
          className="mt-1 inline-flex min-h-11 w-fit items-center gap-1 rounded-[10px] text-label font-semibold text-primary-pressed underline-offset-4 hover:underline"
        >
          Xem thiết bị đang đăng nhập
          <Icon name="chevron-right" size={16} color="currentColor" />
        </Link>
      </div>
    </div>
  );
}
