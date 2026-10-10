import { useEffect, useId, useState } from 'react';

import { Icon, type IconName } from '@/components/common';
import type { SidewalkSlot } from '@/core/api/side-api';
import { bayLabel, metres } from '../plan-labels';
import type { SlotDisplayState } from '../slot-stats';

type Variant = 'page' | 'docked' | 'mini';

type Props = {
  slot: Pick<
    SidewalkSlot,
    'slotCode' | 'widthMeters' | 'lengthMeters' | 'hasPower' | 'hasWater' | 'hasTrashBin'
  >;
  state: SlotDisplayState;
  /** `page` 4:3 with amenities (V12), `docked` 16:9 in the workspace panel, `mini` a small plan (V15). */
  variant?: Variant;
  className?: string;
};

// SVG paint per display state: the same pale wash / deep ink pairs as the plan (slot-visuals.ts).
const BAY_PAINT: Record<SlotDisplayState, { fill: string; stroke: string; ink: string }> = {
  AVAILABLE: {
    fill: 'fill-[#E6F6EC] dark:fill-[#10301F]',
    stroke: 'stroke-[#0B5D33] dark:stroke-[#8BE3B0]',
    ink: 'fill-[#0B5D33] dark:fill-[#8BE3B0]',
  },
  HELD: {
    fill: 'fill-[#FFF3D1] dark:fill-[#3A2A08]',
    stroke: 'stroke-[#6B4100] dark:stroke-[#FFD27A]',
    ink: 'fill-[#6B4100] dark:fill-[#FFD27A]',
  },
  PENDING: {
    fill: 'fill-[#FFF3D1] dark:fill-[#3A2A08]',
    stroke: 'stroke-[#6B4100] dark:stroke-[#FFD27A]',
    ink: 'fill-[#6B4100] dark:fill-[#FFD27A]',
  },
  ACTIVE: {
    fill: 'fill-[#EEF1F4] dark:fill-[#1D2833]',
    stroke: 'stroke-[#2B3640] dark:stroke-[#C5D0DA]',
    ink: 'fill-[#2B3640] dark:fill-[#C5D0DA]',
  },
  SUSPENDED: {
    fill: 'fill-[#FDEBEA] dark:fill-[#3A1414]',
    stroke: 'stroke-[#8F1717] dark:stroke-[#FF9A90]',
    ink: 'fill-[#8F1717] dark:fill-[#FF9A90]',
  },
};

const BOX: Record<Variant, { w: number; h: number }> = {
  page: { w: 400, h: 300 },
  docked: { w: 400, h: 225 },
  mini: { w: 200, h: 150 },
};

// Drawing-only stand-in for an unmeasured bay (as street-geometry does); never labelled with numbers.
const PLACEHOLDER = { along: 2, across: 2.5 };

/**
 * A slot drawn like an architect's floor plan, to its true proportions: the
 * building line dashed along the top, the painted kerb along the bottom, a
 * 0.5 m grid, the bay in its state colours with its code, and orange dimension
 * lines that "measure out" from the middle when it first appears. A bay with
 * no recorded size is a dashed placeholder that says so and carries no numbers.
 */
export function SlotBayDrawing({ slot, state, variant = 'page', className = '' }: Props) {
  const clip = `bay-clip-${useId().replace(/:/g, '')}`;
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const id = window.requestAnimationFrame(() => setDrawn(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  const { w: W, h: H } = BOX[variant];
  const small = variant === 'mini';
  const measured = slot.widthMeters != null && slot.lengthMeters != null;
  const along = measured ? slot.widthMeters! : PLACEHOLDER.along;
  const across = measured ? slot.lengthMeters! : PLACEHOLDER.across;
  const paint = BAY_PAINT[state];

  // Sidewalk between the building line (top) and the kerb (bottom).
  const houseY = small ? 16 : 30;
  const kerbY = H - (small ? 14 : 26);
  const left = small ? 22 : 64;
  const right = W - (small ? 14 : variant === 'page' ? 72 : 40);
  const top = houseY + (small ? 12 : 22);
  const bottom = kerbY - (small ? 14 : 38);
  const scale = Math.min((right - left) / along, (bottom - top) / across) * 0.86;
  const bw = along * scale;
  const bh = across * scale;
  const bx = left + (right - left - bw) / 2;
  const by = top + (bottom - top - bh) / 2;
  const grid = 0.5 * scale;

  const gridLines: number[] = [];
  for (let x = bx % grid; x < W; x += grid) gridLines.push(x);
  const gridRows: number[] = [];
  for (let y = by % grid; y < kerbY; y += grid) if (y > houseY) gridRows.push(y);

  const dimY = by + bh + (small ? 9 : 18);
  const dimX = bx - (small ? 9 : 18);
  const area = measured
    ? (slot.widthMeters! * slot.lengthMeters!).toLocaleString('vi-VN', { maximumFractionDigits: 2 })
    : null;
  const measure = (length: number) => ({
    strokeDasharray: length,
    strokeDashoffset: drawn ? 0 : length,
    transition: 'stroke-dashoffset 600ms var(--ease-out)',
  });

  const amenities: { on: boolean; icon: IconName; on_: string; off: string }[] = [
    { on: slot.hasPower, icon: 'flash-outline', on_: 'Có điện', off: 'Không có điện' },
    { on: slot.hasWater, icon: 'water-outline', on_: 'Có nước', off: 'Không có nước' },
    {
      on: slot.hasTrashBin,
      icon: 'trash-can-outline',
      on_: 'Có thùng rác',
      off: 'Không có thùng rác',
    },
  ];

  return (
    <div
      className={`relative overflow-hidden rounded-[20px] bg-card ring-1 ring-border ${className}`}
    >
      <svg
        role="img"
        aria-label={bayLabel(slot)}
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full"
        style={{ aspectRatio: `${W} / ${H}` }}
      >
        <defs>
          <clipPath id={clip}>
            <rect x="0" y={houseY} width={W} height={kerbY - houseY} />
          </clipPath>
        </defs>
        {/* Building strip above the line */}
        <rect x="0" y="0" width={W} height={houseY} className="fill-sunken" />
        <g clipPath={`url(#${clip})`}>
          {gridLines.map((x) => (
            <line
              key={`gx${x}`}
              x1={x}
              y1={houseY}
              x2={x}
              y2={kerbY}
              className="stroke-border"
              strokeWidth="1"
            />
          ))}
          {gridRows.map((y) => (
            <line
              key={`gy${y}`}
              x1="0"
              y1={y}
              x2={W}
              y2={y}
              className="stroke-border"
              strokeWidth="1"
            />
          ))}
        </g>
        <line
          x1="0"
          y1={houseY}
          x2={W}
          y2={houseY}
          strokeWidth="1.5"
          strokeDasharray="8 4 2 4"
          className="stroke-muted"
        />
        {small ? null : (
          <text x="10" y={houseY - 9} fontSize="11" fontWeight="600" className="fill-muted">
            Mép nhà
          </text>
        )}
        {/* Painted kerb: orange and white blocks */}
        {Array.from({ length: Math.ceil(W / 22) }, (_, i) => (
          <rect
            key={`k${i}`}
            x={i * 22}
            y={kerbY}
            width="22"
            height={small ? 6 : 10}
            className={i % 2 ? 'fill-kerb-paint' : 'fill-kerb'}
          />
        ))}
        <rect
          x="0"
          y={kerbY + (small ? 6 : 10)}
          width={W}
          height={H}
          className="fill-[#E6EAEE] dark:fill-[#1D2833]"
        />
        {small ? null : (
          <text
            x={W - 10}
            y={kerbY - 8}
            textAnchor="end"
            fontSize="11"
            fontWeight="600"
            className="fill-muted"
          >
            Bó vỉa
          </text>
        )}

        {/* The bay */}
        <rect
          x={bx}
          y={by}
          width={bw}
          height={bh}
          rx={small ? 4 : 6}
          strokeWidth={small ? 1.5 : 2.5}
          strokeDasharray={measured ? undefined : '7 5'}
          className={`${paint.fill} ${paint.stroke}`}
        />
        <text
          x={bx + bw / 2}
          y={by + bh / 2 + (small ? 4 : 7)}
          textAnchor="middle"
          fontSize={small ? 12 : Math.min(26, Math.max(15, bw / 5))}
          fontWeight="800"
          aria-hidden="true"
          className={`font-sign ${paint.ink}`}
          style={{ fontStretch: '72%' }}
        >
          {slot.slotCode}
        </text>

        {measured ? (
          <>
            {/* Frontage, along the street */}
            <g className="stroke-brand" strokeWidth="1.5" fill="none">
              <line x1={bx} y1={dimY - 5} x2={bx} y2={dimY + 5} />
              <line x1={bx + bw} y1={dimY - 5} x2={bx + bw} y2={dimY + 5} />
              <path d={`M${bx + bw / 2} ${dimY} H${bx}`} style={measure(bw / 2)} />
              <path d={`M${bx + bw / 2} ${dimY} H${bx + bw}`} style={measure(bw / 2)} />
              <path d={`M${bx + 6} ${dimY - 4} L${bx} ${dimY} L${bx + 6} ${dimY + 4}`} />
              <path
                d={`M${bx + bw - 6} ${dimY - 4} L${bx + bw} ${dimY} L${bx + bw - 6} ${dimY + 4}`}
              />
            </g>
            {/* Depth, kerb to building line */}
            <g className="stroke-brand" strokeWidth="1.5" fill="none">
              <line x1={dimX - 5} y1={by} x2={dimX + 5} y2={by} />
              <line x1={dimX - 5} y1={by + bh} x2={dimX + 5} y2={by + bh} />
              <path d={`M${dimX} ${by + bh / 2} V${by}`} style={measure(bh / 2)} />
              <path d={`M${dimX} ${by + bh / 2} V${by + bh}`} style={measure(bh / 2)} />
              <path d={`M${dimX - 4} ${by + 6} L${dimX} ${by} L${dimX + 4} ${by + 6}`} />
              <path
                d={`M${dimX - 4} ${by + bh - 6} L${dimX} ${by + bh} L${dimX + 4} ${by + bh - 6}`}
              />
            </g>
            {small ? null : (
              <g
                fontSize="15"
                fontWeight="700"
                className="font-sign fill-text"
                style={{ opacity: drawn ? 1 : 0, transition: 'opacity 200ms 120ms' }}
              >
                <DimLabel x={bx + bw / 2} y={dimY} text={metres(slot.widthMeters!)} />
                <DimLabel x={dimX} y={by + bh / 2} text={metres(slot.lengthMeters!)} vertical />
                <text x={bx + bw} y={by - 8} textAnchor="end" fontSize="14" className="fill-muted">
                  {area} m²
                </text>
              </g>
            )}
          </>
        ) : small ? null : (
          <text
            x={bx + bw / 2}
            y={by + bh + 24}
            textAnchor="middle"
            fontSize="14"
            fontWeight="700"
            className="fill-muted"
          >
            Chưa đo kích thước
          </text>
        )}
      </svg>

      {variant === 'page' ? (
        // Named in the drawing's own label; the badges add a tooltip for pointer users.
        <ul
          aria-hidden="true"
          className="absolute right-sm top-[calc(10%+8px)] flex flex-col gap-1.5"
        >
          {amenities.map((a) => (
            <li
              key={a.icon}
              title={a.on ? a.on_ : a.off}
              className={`flex h-9 w-9 items-center justify-center rounded-full shadow-card ring-1 ${
                a.on
                  ? 'bg-[#E6F6EC] text-[#0B5D33] ring-[#0B5D33]/25 dark:bg-[#10301F] dark:text-[#8BE3B0]'
                  : 'bg-card text-muted/70 ring-border'
              }`}
            >
              <Icon
                name={a.icon}
                size={18}
                color="currentColor"
                weight={a.on ? 'duotone' : 'regular'}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function DimLabel({
  x,
  y,
  text,
  vertical,
}: {
  x: number;
  y: number;
  text: string;
  vertical?: boolean;
}) {
  const width = text.length * 8.4 + 12;
  return (
    <g transform={vertical ? `rotate(-90 ${x} ${y})` : undefined}>
      <rect x={x - width / 2} y={y - 11} width={width} height="22" rx="6" className="fill-card" />
      <text x={x} y={y + 5} textAnchor="middle">
        {text}
      </text>
    </g>
  );
}
