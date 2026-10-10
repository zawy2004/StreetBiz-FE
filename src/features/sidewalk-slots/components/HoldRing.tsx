import { Icon } from '@/components/common';
import { HOLD_WARNING_SECONDS, holdFraction } from '../plan-labels';

type Props = {
  /** The caller's own hold; omit for "no hold yet" (an empty track) or someone else's hold. */
  heldAt?: string;
  expiresAt?: string;
  nowMs: number;
  /** 56 in the slot panel, 28 in a list row. */
  size?: number;
  /** Someone else holds the slot: a grey ring, nothing counting for the caller. */
  other?: boolean;
};

/**
 * The hold as a draining ring, like a ticket timer: mango while there is time,
 * deep orange near the end. Decoration only (aria-hidden): the countdown is
 * always written in words beside it. It fills up once when it first appears,
 * then drains second by second.
 */
export function HoldRing({ heldAt, expiresAt, nowMs, size = 56, other = false }: Props) {
  const r = 20;
  const circumference = 2 * Math.PI * r;
  const live = !other && heldAt != null && expiresAt != null;
  const fraction = live ? holdFraction(heldAt, expiresAt, nowMs) : 0;
  const secondsLeft = live ? Math.max(0, Math.ceil((Date.parse(expiresAt) - nowMs) / 1000)) : 0;
  const warning = live && secondsLeft <= HOLD_WARNING_SECONDS;

  return (
    <span
      aria-hidden="true"
      className={`relative inline-flex shrink-0 items-center justify-center ${live ? 'sb-pop' : ''}`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 48 48" className="absolute inset-0 h-full w-full -rotate-90">
        <circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          strokeWidth="5"
          strokeDasharray={live ? undefined : '3 4'}
          className={other ? 'stroke-muted/40' : 'stroke-[#FFF3D1] dark:stroke-[#3A2A08]'}
        />
        {live ? (
          <circle
            cx="24"
            cy="24"
            r={r}
            fill="none"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - fraction)}
            className={`transition-[stroke-dashoffset,stroke] duration-1000 ease-linear ${warning ? 'stroke-primary' : 'stroke-accent'}`}
          />
        ) : null}
      </svg>
      <Icon
        name={live ? 'bookmark' : 'timer-outline'}
        size={Math.round(size * 0.36)}
        color="currentColor"
        weight={live ? 'fill' : 'regular'}
        className={
          live ? (warning ? 'text-primary' : 'text-[#6B4100] dark:text-[#FFD27A]') : 'text-muted'
        }
      />
    </span>
  );
}
