type Props = {
  /** Which of the five painted slots is the stall's (lit, with a beacon). */
  litIndex?: number;
  className?: string;
};

const SLOT_W = 56;
const SLOT_GAP = 12;
const SLOTS_X = 16;

/**
 * A piece of the street seen from above: the carriageway with its dashed
 * centre line, the painted kerb (orange and ivory blocks), then the pavement
 * with five dashed slots, the stall's one lit in brand orange. Decoration only
 * (`aria-hidden`): the slot, zone and ward are always said in words beside it.
 * Shared by the stall page (C03) and the vendor profile (C05).
 */
export function SidewalkStrip({ litIndex = 2, className = '' }: Props) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 360 120"
      preserveAspectRatio="xMidYMid slice"
      className={`block ${className}`}
    >
      {/* Carriageway */}
      <rect
        x="0"
        y="0"
        width="360"
        height="40"
        className="fill-[#E9EDF1] dark:fill-[rgb(var(--c-sunken))]"
      />
      <line
        x1="0"
        y1="20"
        x2="360"
        y2="20"
        stroke="white"
        strokeWidth="2.5"
        strokeDasharray="16 12"
        className="dark:opacity-40"
      />
      {/* Painted kerb */}
      {Array.from({ length: 15 }, (_, i) => (
        <rect
          key={i}
          x={i * 24}
          y="40"
          width="24"
          height="8"
          style={{ fill: i % 2 ? 'rgb(var(--c-kerb-paint))' : 'rgb(var(--c-kerb))' }}
        />
      ))}
      {/* Pavement */}
      <rect
        x="0"
        y="48"
        width="360"
        height="72"
        className="fill-[#FFF3E8] dark:fill-[rgb(var(--c-card))]"
      />
      {Array.from({ length: 5 }, (_, i) => {
        const x = SLOTS_X + i * (SLOT_W + SLOT_GAP);
        const lit = i === litIndex;
        return (
          <g key={i}>
            {lit ? (
              <rect
                x={x - 3}
                y="59"
                width={SLOT_W + 6}
                height="50"
                rx="9"
                className="sb-slot-beacon"
                style={{ fill: 'rgb(var(--c-brand) / 0.22)' }}
              />
            ) : null}
            <rect
              x={x}
              y="62"
              width={SLOT_W}
              height="44"
              rx="6"
              style={{
                fill: lit ? 'rgb(var(--c-card))' : 'transparent',
                stroke: lit ? 'rgb(var(--c-brand))' : 'rgb(var(--c-primary) / 0.4)',
                strokeWidth: lit ? 2.5 : 1.5,
                strokeDasharray: lit ? undefined : '5 4',
              }}
            />
            {lit ? (
              <g transform={`translate(${x + SLOT_W / 2 - 14} 70)`}>
                {/* A stall under a striped awning. */}
                <path d="M0 9 L4 0 H24 L28 9 Z" style={{ fill: 'rgb(var(--c-brand))' }} />
                <path d="M8 0 L7 9 M14 0 V9 M20 0 L21 9" stroke="white" strokeWidth="2.2" />
                <rect
                  x="3"
                  y="11"
                  width="22"
                  height="14"
                  rx="2"
                  style={{ fill: 'rgb(var(--c-text) / 0.85)' }}
                />
                <rect
                  x="7"
                  y="15"
                  width="14"
                  height="3"
                  rx="1.5"
                  style={{ fill: 'rgb(var(--c-card))' }}
                />
              </g>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
