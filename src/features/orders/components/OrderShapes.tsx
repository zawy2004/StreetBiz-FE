import type { ReactNode } from 'react';

import { Icon } from '@/components/common';
import { useOnline } from './order-display';

/**
 * Paper shapes shared by the cart, checkout, order and pickup screens: the torn
 * edge of a printed receipt, the perforation between a ticket and its stub, and
 * the small status lines that sit around them. All decoration; every fact they
 * frame is said in words.
 */

/**
 * The dashed tear line between a ticket and its stub, with the two half-moon
 * notches punched into the paper edges. Place it as a direct child of the paper
 * (not inside its padding) so the notches sit on the edge.
 */
export function Perforation({
  notchClass = 'bg-bg',
  vertical = false,
  className = '',
}: {
  /** Colour of what is behind the paper, so the notch reads as a hole. */
  notchClass?: string;
  vertical?: boolean;
  className?: string;
}) {
  if (vertical) {
    return (
      <div
        aria-hidden="true"
        className={`relative w-0 self-stretch border-l-2 border-dashed border-border ${className}`}
      >
        <span className={`absolute -top-3 -left-[13px] h-6 w-6 rounded-full ${notchClass}`} />
        <span className={`absolute -bottom-3 -left-[13px] h-6 w-6 rounded-full ${notchClass}`} />
      </div>
    );
  }
  return (
    <div
      aria-hidden="true"
      className={`relative h-0 border-t-2 border-dashed border-border ${className}`}
    >
      <span className={`absolute -left-3 -top-[13px] h-6 w-6 rounded-full ${notchClass}`} />
      <span className={`absolute -right-3 -top-[13px] h-6 w-6 rounded-full ${notchClass}`} />
    </div>
  );
}

/** "Ảnh minh họa" on a stock photo that is not the stall's own. */
export function IllustrativeTag({ className = '' }: { className?: string }) {
  return (
    <span
      className={`pointer-events-none inline-flex items-center rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium leading-4 text-white backdrop-blur-sm ${className}`}
    >
      Ảnh minh họa
    </span>
  );
}

/**
 * A plain notice while the device is offline. It only reads the browser's
 * online flag: it never disables a control or retries a request.
 */
export function OfflineNotice({ message }: { message: string }) {
  const online = useOnline();
  if (online) return null;
  return (
    <div
      role="status"
      className="flex items-start gap-xs rounded-[14px] bg-[#EEF1F4] px-sm py-xs text-body-md font-medium text-[#2B3640] ring-1 ring-[#2B3640]/15 dark:bg-[#1D2833] dark:text-[#C5D0DA]"
    >
      <Icon name="transmission-tower" size={18} color="currentColor" className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

/** A breathing dot beside "Tự cập nhật": the screen re-reads itself. */
export function LiveDot({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex h-8 items-center gap-2 rounded-full bg-[#E6F6EC] px-sm text-body-sm font-semibold text-[#0B5D33] dark:bg-[#10301F] dark:text-[#8BE3B0] ${className}`}
    >
      <span aria-hidden="true" className="relative flex h-2.5 w-2.5">
        <span className="sb-ping absolute inset-0 rounded-full bg-current opacity-60" />
        <span className="relative h-2.5 w-2.5 rounded-full bg-current" />
      </span>
      {children}
    </span>
  );
}
