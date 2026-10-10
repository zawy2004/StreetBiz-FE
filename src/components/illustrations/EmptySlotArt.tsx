type Props = {
  /** `barrier`: the slot is fenced off with striped barriers (a crash); `sign`: a small "?" sign on the kerb (not found). */
  variant: 'barrier' | 'sign';
  className?: string;
};

/**
 * An empty sidewalk slot seen at an angle: the painted dashed outline on the
 * pavement and the orange/white kerb in front of it. Used where the app has
 * nothing to show (404) or broke (crash screen). Decoration only.
 */
export function EmptySlotArt({ variant, className = '' }: Props) {
  return (
    <svg aria-hidden="true" viewBox="0 0 240 160" className={className}>
      <rect x="0" y="0" width="240" height="122" rx="18" fill="rgb(var(--c-brand) / 0.08)" />
      <rect
        x="44"
        y="30"
        width="152"
        height="76"
        rx="12"
        fill="none"
        stroke="rgb(var(--c-brand) / 0.65)"
        strokeWidth="3"
        strokeDasharray="12 8"
      />
      {Array.from({ length: 11 }, (_, i) => (
        <rect
          key={i}
          x={i * 22}
          y="126"
          width="22"
          height="12"
          fill={i % 2 ? 'rgb(var(--c-kerb-paint))' : 'rgb(var(--c-kerb))'}
        />
      ))}
      <rect x="0" y="138" width="240" height="22" rx="4" fill="rgb(var(--c-sunken))" />
      {variant === 'barrier' ? (
        <g>
          {[64, 140].map((x) => (
            <g key={x}>
              <rect x={x + 6} y="58" width="4" height="40" rx="2" fill="rgb(var(--c-muted))" />
              <rect x={x + 30} y="58" width="4" height="40" rx="2" fill="rgb(var(--c-muted))" />
              <rect
                x={x}
                y="48"
                width="40"
                height="16"
                rx="3"
                fill="rgb(var(--c-card))"
                stroke="rgb(var(--c-error))"
                strokeWidth="2"
              />
              {[0, 1, 2].map((k) => (
                <path
                  key={k}
                  d={`M${x + 4 + k * 13} 62 l9 -12`}
                  stroke="rgb(var(--c-error))"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              ))}
            </g>
          ))}
        </g>
      ) : (
        <g>
          <rect x="116" y="64" width="5" height="62" rx="2.5" fill="rgb(var(--c-muted))" />
          <rect x="94" y="34" width="50" height="40" rx="8" fill="rgb(var(--c-indigo))" />
          <text
            x="119"
            y="63"
            textAnchor="middle"
            fontSize="26"
            fontWeight="800"
            fill="rgb(var(--c-on-indigo))"
            className="font-sign"
          >
            ?
          </text>
        </g>
      )}
    </svg>
  );
}
