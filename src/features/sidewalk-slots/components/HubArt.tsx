/**
 * Four small drawings for the "Thuê ô của tôi" signposts, two-tone street
 * orange and mango on a pale tile. Decoration only (aria-hidden).
 */
const TILE = 'fill-[#FFF3E8] dark:fill-[#2A2420]';
const LINE = 'stroke-brand';
const MANGO = 'fill-accent';

export function ApplicationSlipArt() {
  return (
    <svg aria-hidden="true" viewBox="0 0 64 64" className="h-full w-full">
      <rect x="2" y="2" width="60" height="60" rx="16" className={TILE} />
      <rect x="16" y="11" width="28" height="38" rx="4" className="fill-card" />
      <rect
        x="16"
        y="11"
        width="28"
        height="38"
        rx="4"
        fill="none"
        strokeWidth="2"
        className={LINE}
      />
      <rect x="21" y="18" width="6" height="6" rx="1.5" className={MANGO} />
      <path
        d="M30 21h9M21 30h18M21 36h12"
        strokeWidth="2"
        strokeLinecap="round"
        className="stroke-muted/60"
      />
      <path d="M41 53l11-11 4 4-11 11h-4z" className={MANGO} />
      <path
        d="M41 53l11-11 4 4-11 11h-4z"
        fill="none"
        strokeWidth="2"
        strokeLinejoin="round"
        className={LINE}
      />
    </svg>
  );
}

export function ContractStampArt() {
  return (
    <svg aria-hidden="true" viewBox="0 0 64 64" className="h-full w-full">
      <rect x="2" y="2" width="60" height="60" rx="16" className={TILE} />
      <rect x="13" y="9" width="30" height="42" rx="4" className="fill-card" />
      <rect
        x="13"
        y="9"
        width="30"
        height="42"
        rx="4"
        fill="none"
        strokeWidth="2"
        className={LINE}
      />
      <path
        d="M18 17h20M18 23h20M18 29h12"
        strokeWidth="2"
        strokeLinecap="round"
        className="stroke-muted/60"
      />
      <circle cx="42" cy="44" r="11" className={MANGO} opacity="0.35" />
      <circle cx="42" cy="44" r="11" fill="none" strokeWidth="2.5" className={LINE} />
      <circle cx="42" cy="44" r="6.5" fill="none" strokeWidth="1.5" className={LINE} />
      <path
        d="M39 44l2.2 2.2L45.5 42"
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={LINE}
      />
    </svg>
  );
}

export function TransferSwapArt() {
  return (
    <svg aria-hidden="true" viewBox="0 0 64 64" className="h-full w-full">
      <rect x="2" y="2" width="60" height="60" rx="16" className={TILE} />
      <rect x="9" y="30" width="18" height="22" rx="3" className={MANGO} opacity="0.55" />
      <rect
        x="9"
        y="30"
        width="18"
        height="22"
        rx="3"
        fill="none"
        strokeWidth="2"
        className={LINE}
      />
      <rect
        x="37"
        y="30"
        width="18"
        height="22"
        rx="3"
        strokeDasharray="4 3"
        fill="none"
        strokeWidth="2"
        className={LINE}
      />
      <path
        d="M18 24c0-9 28-9 28 0"
        fill="none"
        strokeWidth="2.5"
        strokeLinecap="round"
        className={LINE}
      />
      <path
        d="M41 20l5 4.5-5 4"
        fill="none"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={LINE}
      />
    </svg>
  );
}

export function ProposalPinArt() {
  return (
    <svg aria-hidden="true" viewBox="0 0 64 64" className="h-full w-full">
      <rect x="2" y="2" width="60" height="60" rx="16" className={TILE} />
      <rect
        x="11"
        y="36"
        width="42"
        height="18"
        rx="4"
        strokeDasharray="5 4"
        fill="none"
        strokeWidth="2"
        className={LINE}
      />
      <path d="M32 46c-8-9-12-14-12-20a12 12 0 0124 0c0 6-4 11-12 20z" className={MANGO} />
      <path
        d="M32 46c-8-9-12-14-12-20a12 12 0 0124 0c0 6-4 11-12 20z"
        fill="none"
        strokeWidth="2"
        strokeLinejoin="round"
        className={LINE}
      />
      <circle cx="32" cy="26" r="4.5" className="fill-card" />
    </svg>
  );
}
