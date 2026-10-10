/*
 * Hand-drawn vendor-paperwork marks for the registration screens, in theme tokens
 * so they work light and dark. All decorative (aria-hidden): the words beside
 * them carry the meaning. None imitates a real CCCD, licence or state seal.
 */

type ArtProps = { className?: string };

/** An empty folder with a sheet of paper half out: nothing filed yet. */
export function EmptyFolderArt({ className = 'h-[120px] w-[160px]' }: ArtProps) {
  return (
    <svg viewBox="0 0 160 120" aria-hidden="true" className={className}>
      <rect
        x="18"
        y="20"
        width="96"
        height="78"
        rx="6"
        className="fill-card stroke-border"
        strokeWidth="2"
        transform="rotate(-6 66 59)"
      />
      <g transform="rotate(-6 66 59)">
        <rect x="30" y="34" width="54" height="5" rx="2.5" className="fill-sunken" />
        <rect x="30" y="46" width="66" height="5" rx="2.5" className="fill-sunken" />
        <rect x="30" y="58" width="40" height="5" rx="2.5" className="fill-sunken" />
      </g>
      <path
        d="M10 44 h44 l10 10 h76 a6 6 0 0 1 6 6 v46 a6 6 0 0 1 -6 6 h-124 a6 6 0 0 1 -6 -6 v-56 a6 6 0 0 1 6 -6 z"
        className="fill-[rgb(var(--c-secondary)/0.12)] stroke-secondary"
        strokeWidth="2.5"
        strokeDasharray="8 6"
        strokeLinejoin="round"
      />
      <rect x="10" y="108" width="140" height="6" rx="1" className="fill-brand" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <rect
          key={i}
          x={10 + i * 20 + 10}
          y="108"
          width="10"
          height="6"
          className="fill-kerb-paint"
        />
      ))}
    </svg>
  );
}

/** A registration sheet ("HKD") with a green tick: the business file. */
export function DocCheckArt({
  className = 'h-[72px] w-[72px]',
  checked = true,
}: ArtProps & { checked?: boolean }) {
  return (
    <svg viewBox="0 0 72 72" aria-hidden="true" className={className}>
      <rect
        x="14"
        y="6"
        width="44"
        height="58"
        rx="6"
        className="fill-card stroke-text"
        strokeWidth="2"
      />
      <text
        x="36"
        y="24"
        textAnchor="middle"
        className="fill-text font-sign"
        fontSize="11"
        fontWeight="800"
        letterSpacing="1"
      >
        HKD
      </text>
      <rect x="21" y="31" width="30" height="3.5" rx="1.75" className="fill-sunken" />
      <rect x="21" y="39" width="24" height="3.5" rx="1.75" className="fill-sunken" />
      <rect x="21" y="47" width="28" height="3.5" rx="1.75" className="fill-sunken" />
      {checked ? (
        <g>
          <circle cx="54" cy="54" r="12" className="fill-tertiary" />
          <path
            d="M48.5 54.5 l4 4 l7.5 -8"
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="stroke-white dark:stroke-[#06140C]"
          />
        </g>
      ) : null}
    </svg>
  );
}

/** One painted sidewalk slot seen from above, a stall standing in it. */
export function SlotTopArt({
  className = 'h-[72px] w-[72px]',
  empty = false,
}: ArtProps & { empty?: boolean }) {
  return (
    <svg viewBox="0 0 72 72" aria-hidden="true" className={className}>
      <rect
        x="4"
        y="8"
        width="64"
        height="48"
        rx="6"
        className="fill-[#FFF3E8] dark:fill-[#2A2420]"
      />
      <rect
        x="12"
        y="15"
        width="48"
        height="34"
        rx="5"
        fill="none"
        strokeWidth="3"
        strokeDasharray={empty ? '7 5' : undefined}
        className="stroke-brand"
      />
      {!empty ? (
        <>
          <rect x="24" y="23" width="24" height="16" rx="3" className="fill-accent" />
          <rect x="24" y="23" width="24" height="5" rx="2" className="fill-brand" />
        </>
      ) : null}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect
          key={i}
          x={4 + i * 11}
          y="60"
          width="11"
          height="6"
          className={i % 2 ? 'fill-kerb-paint' : 'fill-brand'}
        />
      ))}
    </svg>
  );
}

/** A small permit pass with its slot plate and a QR glyph (decoration, not a scannable code). */
export function PermitMiniArt({ className = 'h-[72px] w-[72px]' }: ArtProps) {
  return (
    <svg viewBox="0 0 72 72" aria-hidden="true" className={className}>
      <rect
        x="8"
        y="8"
        width="56"
        height="56"
        rx="9"
        className="fill-card stroke-text"
        strokeWidth="2"
      />
      <rect x="8" y="8" width="56" height="6" rx="3" className="fill-brand" />
      <rect x="15" y="21" width="26" height="11" rx="2.5" className="fill-sign" />
      <rect x="18" y="25" width="20" height="3" rx="1.5" className="fill-white" />
      <g className="fill-text">
        <rect x="15" y="39" width="7" height="7" />
        <rect x="25" y="39" width="4" height="4" />
        <rect x="15" y="49" width="4" height="4" />
        <rect x="22" y="49" width="7" height="7" />
        <rect x="32" y="39" width="7" height="7" />
        <rect x="32" y="50" width="4" height="4" />
      </g>
      <circle
        cx="51"
        cy="47"
        r="9"
        fill="none"
        strokeWidth="2.5"
        className="stroke-tertiary"
        strokeDasharray="3 2.5"
      />
    </svg>
  );
}

/** A shopfront with a striped awning and the adjacent slot painted in front of it. */
export function FrontageMiniArt({ className = 'h-[72px] w-[96px]' }: ArtProps) {
  return (
    <svg viewBox="0 0 96 72" aria-hidden="true" className={className}>
      <rect
        x="10"
        y="6"
        width="76"
        height="32"
        rx="3"
        className="fill-[#FFF3E8] stroke-text dark:fill-[#2A2420]"
        strokeWidth="2"
      />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <path
          key={i}
          d={`M${10 + i * 12.67} 14 h12.67 v6 a6.33 6.33 0 0 1 -12.67 0 z`}
          className={i % 2 ? 'fill-white' : 'fill-brand'}
        />
      ))}
      <rect
        x="40"
        y="24"
        width="16"
        height="14"
        rx="1.5"
        className="fill-card stroke-text"
        strokeWidth="1.5"
      />
      <rect x="4" y="42" width="88" height="22" rx="3" className="fill-sunken" />
      <rect
        x="30"
        y="45"
        width="36"
        height="16"
        rx="3"
        className="fill-[rgb(var(--c-brand)/0.22)] stroke-brand"
        strokeWidth="2.5"
      />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <rect
          key={i}
          x={4 + i * 11}
          y="66"
          width="11"
          height="5"
          className={i % 2 ? 'fill-kerb-paint' : 'fill-brand'}
        />
      ))}
    </svg>
  );
}

/** A blue-black house-number plate, the kind screwed beside a shop door. */
export function HousePlateArt({ className = 'h-[56px] w-[96px]' }: ArtProps) {
  return (
    <svg viewBox="0 0 96 56" aria-hidden="true" className={className}>
      <rect x="6" y="8" width="84" height="40" rx="7" className="fill-sign" />
      <rect
        x="10"
        y="12"
        width="76"
        height="32"
        rx="5"
        fill="none"
        strokeWidth="1.5"
        className="stroke-white/80"
      />
      <text
        x="48"
        y="35"
        textAnchor="middle"
        className="fill-white font-sign"
        fontSize="18"
        fontWeight="800"
        letterSpacing="1"
      >
        112
      </text>
      <circle cx="14" cy="28" r="1.8" className="fill-white/70" />
      <circle cx="82" cy="28" r="1.8" className="fill-white/70" />
    </svg>
  );
}
