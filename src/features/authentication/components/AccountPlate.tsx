import { useEffect, useRef } from 'react';
import { PiLockSimpleFill, PiLockSimpleOpenFill } from 'react-icons/pi';

import { playOnce } from './paint-in';

type Props = {
  /** Already formatted for display (the subtitle reads the same number aloud). */
  phone: string;
  /** All six password rules met (display only; validation still runs on submit). */
  unlocked: boolean;
};

/**
 * Whose password this is: a plate with the account number and a padlock that
 * springs open once the new password meets every rule. The number is hidden
 * from screen readers because the subtitle already reads it; the lock state is
 * announced politely.
 */
export function AccountPlate({ phone, unlocked }: Props) {
  const shackle = useRef<HTMLSpanElement>(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!unlocked) return;
    playOnce(
      shackle.current,
      [
        { transform: 'translateY(0) rotate(0deg)' },
        { transform: 'translateY(-4px) rotate(18deg)' },
        { transform: 'translateY(0) rotate(0deg)' },
      ],
      { duration: 360, easing: 'cubic-bezier(.3,1.4,.5,1)' },
    );
  }, [unlocked]);

  const LockGlyph = unlocked ? PiLockSimpleOpenFill : PiLockSimpleFill;

  return (
    <div
      className={[
        'flex min-h-[76px] items-center gap-sm rounded-[14px] border-l-4 border-brand px-md py-sm transition-colors duration-200',
        unlocked
          ? 'bg-[#E6F6EC] text-[#0B5D33] dark:bg-[#10301F] dark:text-[#8BE3B0]'
          : 'bg-sunken text-[#2B3640] dark:text-[#C5D0DA]',
      ].join(' ')}
    >
      <span
        ref={shackle}
        aria-hidden="true"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-card shadow-card"
      >
        <LockGlyph size={26} />
      </span>
      <div aria-hidden="true" className="min-w-0 flex-1">
        <p className="text-body-xs opacity-80">Tài khoản</p>
        <p className="truncate font-sign text-[20px] font-semibold leading-[26px] tracking-[0.02em] font-tabular sm:text-[22px] sm:leading-[28px]">
          {phone}
        </p>
      </div>
      <span
        aria-hidden="true"
        className={`hidden shrink-0 text-label transition-opacity duration-200 min-[400px]:block ${unlocked ? 'opacity-100' : 'opacity-0'}`}
      >
        Mật khẩu đủ mạnh
      </span>
      <span aria-live="polite" className="sr-only">
        {unlocked ? 'Mật khẩu đủ mạnh' : 'Mật khẩu chưa đủ mạnh'}
      </span>
    </div>
  );
}
