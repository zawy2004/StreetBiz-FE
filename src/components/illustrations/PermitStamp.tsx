import { useId } from 'react';

import { Icon, type IconName } from '@/components/common';

type Props = {
  icon: IconName;
  /** Text colour class of the verdict tone (the ring text uses currentColor). */
  inkClass: string;
  /** Stroke colour class of the verdict tone. */
  strokeClass: string;
  /** Words around the ring. Keep them off the verdict word itself, so screen text stays unique. */
  ringText?: string;
  className?: string;
};

/**
 * A round ward stamp pressed onto a permit or a receipt. It comes down with
 * `sb-stamp` each time it mounts (give it a `key` per lookup to replay).
 * Decoration only: the verdict is always said in words beside it.
 */
export function PermitStamp({
  icon,
  inkClass,
  strokeClass,
  ringText = 'GIẤY PHÉP VỈA HÈ ★ STREETBIZ ★',
  className = '',
}: Props) {
  const ringId = `stamp-ring-${useId().replace(/:/g, '')}`;
  // The icon is centred over the ring, so the stamp needs a positioned box; keep the caller's if given.
  const position = /\b(absolute|fixed|sticky)\b/.test(className) ? '' : 'relative';
  return (
    <div
      aria-hidden="true"
      className={`sb-stamp pointer-events-none ${position} ${inkClass} ${className}`}
    >
      <svg viewBox="0 0 140 140" className="h-full w-full opacity-[0.88]">
        <defs>
          <path id={ringId} d="M70 70 m-50 0 a50 50 0 1 1 100 0 a50 50 0 1 1 -100 0" />
        </defs>
        <circle cx="70" cy="70" r="64" fill="none" strokeWidth="4" className={strokeClass} />
        <circle cx="70" cy="70" r="40" fill="none" strokeWidth="2.5" className={strokeClass} />
        <text
          fill="currentColor"
          fontSize="12.5"
          fontWeight="800"
          letterSpacing="2.2"
          className="font-sign"
        >
          <textPath href={`#${ringId}`}>{ringText}</textPath>
        </text>
      </svg>
      <span className="absolute inset-0 flex items-center justify-center">
        <Icon name={icon} size={38} color="currentColor" weight="fill" />
      </span>
    </div>
  );
}
