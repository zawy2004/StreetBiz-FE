/**
 * Hand-drawn pieces of the street for the buyer's community screens. All are
 * decoration (`aria-hidden`); what they show is always said in words nearby.
 * Colours come from the theme tokens so they hold in both themes.
 */

const STRIPES = Array.from({ length: 8 }, (_, i) => i);

/** The striped awning over a stall, scalloped at the bottom edge. */
function Awning({ x, y, width }: { x: number; y: number; width: number }) {
  const stripe = width / STRIPES.length;
  return (
    <g>
      {STRIPES.map((i) => (
        <path
          key={i}
          d={`M${x + i * stripe} ${y} h${stripe} v14 a${stripe / 2} ${stripe / 2.4} 0 0 1 ${-stripe} 0 Z`}
          style={{ fill: i % 2 ? 'rgb(var(--c-card))' : 'rgb(var(--c-brand))' }}
          stroke="rgb(var(--c-brand))"
          strokeWidth="1.2"
        />
      ))}
    </g>
  );
}

/** A street stall: awning, counter with a steaming pot, two plastic stools (C05 cover fallback). */
export function StallIllustration({ className = '' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 160 160" className={className}>
      <rect
        width="160"
        height="160"
        rx="20"
        className="fill-[#FFF3E8] dark:fill-[rgb(var(--c-sunken))]"
      />
      <rect
        x="30"
        y="34"
        width="4"
        height="86"
        rx="2"
        style={{ fill: 'rgb(var(--c-text) / 0.55)' }}
      />
      <rect
        x="126"
        y="34"
        width="4"
        height="86"
        rx="2"
        style={{ fill: 'rgb(var(--c-text) / 0.55)' }}
      />
      <Awning x={22} y={26} width={116} />
      <rect x="34" y="86" width="92" height="34" rx="5" style={{ fill: 'rgb(var(--c-primary))' }} />
      <rect
        x="40"
        y="94"
        width="80"
        height="5"
        rx="2.5"
        style={{ fill: 'rgb(255 255 255 / 0.6)' }}
      />
      <path d="M60 86 h28 v-9 a14 6 0 0 0 -28 0 Z" style={{ fill: 'rgb(var(--c-text) / 0.85)' }} />
      {[66, 74, 82].map((x) => (
        <path
          key={x}
          d={`M${x} 70 c-4 -6 4 -9 0 -16`}
          fill="none"
          stroke="rgb(var(--c-muted) / 0.55)"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      ))}
      <rect x="100" y="72" width="16" height="14" rx="3" style={{ fill: 'rgb(var(--c-accent))' }} />
      {[46, 102].map((x) => (
        <g key={x}>
          <rect
            x={x}
            y="128"
            width="16"
            height="5"
            rx="2"
            style={{ fill: 'rgb(var(--c-indigo))' }}
          />
          <path
            d={`M${x + 2} 133 l-2 12 M${x + 14} 133 l2 12`}
            stroke="rgb(var(--c-indigo))"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </g>
      ))}
      <rect x="0" y="146" width="160" height="14" style={{ fill: 'rgb(var(--c-kerb) / 0.9)' }} />
      {[0, 2, 4, 6].map((i) => (
        <rect
          key={i}
          x={i * 20 + 20}
          y="146"
          width="20"
          height="14"
          style={{ fill: 'rgb(var(--c-kerb-paint))' }}
        />
      ))}
    </svg>
  );
}

/** A stall standing half outside its painted slot: what a sidewalk report is usually about (C07). */
export function OffSlotIllustration({ className = '' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 240 180" className={className}>
      <rect width="240" height="180" className="fill-[#FFF3E8] dark:fill-[rgb(var(--c-sunken))]" />
      {/* kerb along the bottom */}
      {Array.from({ length: 10 }, (_, i) => (
        <rect
          key={i}
          x={i * 24}
          y="160"
          width="24"
          height="8"
          style={{ fill: i % 2 ? 'rgb(var(--c-kerb-paint))' : 'rgb(var(--c-kerb))' }}
        />
      ))}
      <rect x="0" y="168" width="240" height="12" style={{ fill: 'rgb(var(--c-border))' }} />
      {/* the painted slot */}
      <rect
        x="34"
        y="58"
        width="104"
        height="86"
        rx="8"
        fill="none"
        stroke="rgb(var(--c-primary) / 0.5)"
        strokeWidth="2.5"
        strokeDasharray="8 6"
      />
      {/* the stall, shifted out of it */}
      <g transform="translate(92 44)">
        <rect
          x="6"
          y="18"
          width="3"
          height="70"
          rx="1.5"
          style={{ fill: 'rgb(var(--c-text) / 0.5)' }}
        />
        <rect
          x="95"
          y="18"
          width="3"
          height="70"
          rx="1.5"
          style={{ fill: 'rgb(var(--c-text) / 0.5)' }}
        />
        <Awning x={0} y={12} width={104} />
        <rect
          x="8"
          y="58"
          width="88"
          height="34"
          rx="5"
          style={{ fill: 'rgb(var(--c-primary) / 0.85)' }}
        />
      </g>
      <path
        d="M142 30 l22 0 m-8 -6 l8 6 l-8 6"
        fill="none"
        stroke="rgb(var(--c-error) / 0.75)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const QR = ['1110111', '1010101', '1110111', '0001000', '1101011', '0110110', '1011101'];

/** A permit pass hanging under a stall's awning, its stamp circle still waiting (C09 idle). */
export function WaitingPermitIllustration({ className = '' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 220 200" className={className}>
      <rect
        width="220"
        height="200"
        rx="24"
        className="fill-[#FFF3E8] dark:fill-[rgb(var(--c-sunken))]"
      />
      <Awning x={20} y={18} width={180} />
      <path d="M78 40 L92 64 M142 40 L128 64" stroke="rgb(var(--c-text) / 0.45)" strokeWidth="2" />
      <rect
        x="62"
        y="62"
        width="96"
        height="116"
        rx="12"
        style={{ fill: 'rgb(var(--c-card))' }}
        stroke="rgb(var(--c-border))"
        strokeWidth="2"
      />
      <rect x="62" y="62" width="96" height="8" rx="4" style={{ fill: 'rgb(var(--c-kerb))' }} />
      {QR.map((row, r) =>
        row
          .split('')
          .map((cell, c) =>
            cell === '1' ? (
              <rect
                key={`${r}-${c}`}
                x={80 + c * 8.5}
                y={82 + r * 8.5}
                width="7.5"
                height="7.5"
                rx="1.2"
                style={{ fill: 'rgb(var(--c-text))' }}
              />
            ) : null,
          ),
      )}
      <rect
        x="78"
        y="150"
        width="64"
        height="16"
        rx="4"
        style={{ fill: 'rgb(var(--c-card))' }}
        stroke="rgb(var(--c-text))"
        strokeWidth="2"
      />
      <rect
        x="86"
        y="155"
        width="48"
        height="6"
        rx="3"
        style={{ fill: 'rgb(var(--c-text) / 0.8)' }}
      />
      <circle
        cx="166"
        cy="150"
        r="30"
        fill="none"
        stroke="rgb(var(--c-brand) / 0.55)"
        strokeWidth="3"
        strokeDasharray="7 6"
      />
    </svg>
  );
}
