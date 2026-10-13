import type { AssistantRole } from './types';

const ink = 'rgb(var(--c-text))';
const card = 'rgb(var(--c-card))';
const line = 'rgb(var(--c-border))';
const brand = 'rgb(var(--c-brand))';
const primary = 'rgb(var(--c-primary))';
const mango = 'rgb(var(--c-accent))';
const leaf = 'rgb(var(--c-tertiary))';
const sunken = 'rgb(var(--c-sunken))';

/** A sign on a lamp post: StreetBiz, for someone not signed in yet. */
function GuestArt() {
  return (
    <>
      <rect x="56" y="18" width="5" height="74" rx="2" fill={ink} />
      <path
        d="M58 18c0-8 10-12 22-10"
        fill="none"
        stroke={ink}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path d="M74 6h16l-3 9H77z" fill={mango} />
      <rect x="18" y="34" width="62" height="26" rx="6" fill={primary} />
      <rect x="24" y="42" width="34" height="5" rx="2.5" fill="rgb(255 255 255 / 0.95)" />
      <rect x="24" y="50" width="22" height="4" rx="2" fill="rgb(255 255 255 / 0.7)" />
      <rect x="40" y="88" width="38" height="6" rx="2" fill={line} />
    </>
  );
}

/** A steaming bowl with a map pin: find a dish, find the stall. */
function CustomerArt() {
  return (
    <>
      <g
        className="sb-steam"
        fill="none"
        stroke={brand}
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.7"
      >
        <path d="M40 40c-4-6 4-10 0-16" />
        <path d="M52 40c-4-6 4-10 0-16" />
        <path d="M64 40c-4-6 4-10 0-16" />
      </g>
      <path d="M18 48h70a35 35 0 0 1-70 0z" fill={primary} />
      <path d="M18 48h70" stroke={ink} strokeWidth="3" strokeLinecap="round" />
      <path d="M30 56h46" stroke="rgb(255 255 255 / 0.55)" strokeWidth="3" strokeLinecap="round" />
      <rect x="44" y="82" width="18" height="5" rx="2" fill={ink} />
      <path
        d="M98 16a13 13 0 0 1 13 13c0 10-13 23-13 23S85 39 85 29a13 13 0 0 1 13-13z"
        fill={mango}
      />
      <circle cx="98" cy="29" r="5" fill={card} />
    </>
  );
}

/** A stall with a striped awning and a small QR permit on its front. */
function VendorArt() {
  return (
    <>
      <rect x="14" y="44" width="70" height="44" rx="4" fill={card} stroke={line} strokeWidth="2" />
      {Array.from({ length: 7 }, (_, i) => (
        <path
          key={i}
          d={`M${8 + i * 12} 30h12v10a6 6 0 0 1-12 0z`}
          fill={i % 2 ? 'rgb(var(--c-kerb-paint))' : brand}
        />
      ))}
      <rect x="6" y="25" width="88" height="7" rx="3" fill={primary} />
      <rect x="22" y="54" width="22" height="34" rx="2" fill={sunken} />
      <rect x="54" y="54" width="22" height="22" rx="3" fill={card} stroke={ink} strokeWidth="2" />
      <path d="M58 58h5v5h-5zM67 58h5v5h-5zM58 67h5v5h-5zM67 67h2v2h-2zM70 70h2v2h-2z" fill={ink} />
      <circle cx="104" cy="70" r="11" fill="none" stroke={leaf} strokeWidth="3" />
      <path
        d="M99 70l4 4 7-8"
        fill="none"
        stroke={leaf}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  );
}

/** A piece of the slot grid with the ward stamp pressed on it. */
function WardArt() {
  return (
    <>
      <rect x="8" y="20" width="84" height="64" rx="8" fill={card} stroke={line} strokeWidth="2" />
      {Array.from({ length: 4 }, (_, c) =>
        Array.from({ length: 3 }, (_, r) => (
          <rect
            key={`${c}-${r}`}
            x={16 + c * 19}
            y={28 + r * 17}
            width="15"
            height="13"
            rx="2"
            fill={c === 2 && r === 1 ? brand : sunken}
          />
        )),
      )}
      <g transform="rotate(-12 96 66)">
        <circle cx="96" cy="66" r="18" fill={card} stroke={primary} strokeWidth="3" />
        <circle
          cx="96"
          cy="66"
          r="12"
          fill="none"
          stroke={primary}
          strokeWidth="1.5"
          strokeDasharray="3 2.5"
        />
        <path
          d="M90 66l4 4 8-8"
          fill="none"
          stroke={primary}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </>
  );
}

/** A catalogue board with three drawers: running the platform. */
function AdminArt() {
  return (
    <>
      <rect
        x="14"
        y="14"
        width="92"
        height="72"
        rx="10"
        fill={card}
        stroke={line}
        strokeWidth="2"
      />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect
            x="22"
            y={22 + i * 21}
            width="76"
            height="16"
            rx="4"
            fill={i === 0 ? '#FFF3E8' : sunken}
          />
          <rect
            x="28"
            y={28 + i * 21}
            width={i === 0 ? 34 : 26}
            height="4"
            rx="2"
            fill={i === 0 ? primary : line}
          />
          <circle cx="90" cy={30 + i * 21} r="3" fill={i === 0 ? brand : i === 1 ? mango : leaf} />
        </g>
      ))}
    </>
  );
}

/** Welcome drawing for the role in front of the assistant (decorative). */
export function AssistantWelcomeArt({ role }: { role: AssistantRole }) {
  const art =
    role === 'CUSTOMER' ? (
      <CustomerArt />
    ) : role === 'VENDOR' ? (
      <VendorArt />
    ) : role === 'WARD_AUTHORITY' ? (
      <WardArt />
    ) : role === 'PLATFORM_ADMIN' ? (
      <AdminArt />
    ) : (
      <GuestArt />
    );
  return (
    <svg viewBox="0 0 120 96" aria-hidden="true" focusable="false" className="sb-welcome-art">
      {art}
    </svg>
  );
}
