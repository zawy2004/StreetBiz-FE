import type { KeyboardEvent } from 'react';

import { formatVnd } from '@/components/common';
import { colors } from '@/theme';
import { statusLabel } from '@/core/constants/status-labels';
import type { SidewalkSlot } from '@/core/api/side-api';
import type { PlacedSlot, StreetLayout } from '../street-geometry';
import { slotStatusColor, slotStatusTint } from '../slot-visuals';

// Fixed band heights, in px -- these do NOT scale with pxPerMeter, only the
// slot rects and the ruler ticks do. A scaling viewBox was deliberately
// avoided: it would also scale stroke widths and font sizes with zoom.
const RULER_HEIGHT = 18;
const BUILDING_HEIGHT = 28;
const MIN_SIDEWALK_METERS = 4;
const KERB_HEIGHT = 2;
const ROADWAY_HEIGHT = 64;
const END_PADDING_METERS = 2;

type StripLayout = Extract<StreetLayout, { kind: 'strip' }>;

type Props = {
  layout: StripLayout;
  zoneName: string;
  pxPerMeter: number;
  selectedSlotId: number | null;
  onSelect: (slot: SidewalkSlot) => void;
};

export function StreetStripDiagram({ layout, zoneName, pxPerMeter: pm, selectedSlotId, onSelect }: Props) {
  const maxAcrossMeters = Math.max(MIN_SIDEWALK_METERS, ...layout.placed.map((p) => p.footprint.acrossMeters));
  const sidewalkHeight = maxAcrossMeters * pm;

  const widthPx = (layout.lengthMeters + END_PADDING_METERS) * pm;
  const heightPx = RULER_HEIGHT + BUILDING_HEIGHT + sidewalkHeight + KERB_HEIGHT + ROADWAY_HEIGHT;

  const sidewalkTop = RULER_HEIGHT + BUILDING_HEIGHT;
  const kerbTop = sidewalkTop + sidewalkHeight;
  const roadwayTop = kerbTop + KERB_HEIGHT;

  const ticks = [];
  for (let m = 0; m <= layout.lengthMeters; m += 10) {
    ticks.push(m);
  }

  return (
    <svg
      role="group"
      aria-label={`Sơ đồ tuyến ${zoneName}, ${layout.placed.length} ô vỉa hè`}
      width={widthPx}
      height={heightPx}
      viewBox={`0 0 ${widthPx} ${heightPx}`}
    >
      <defs>
        <pattern id="street-strip-hatch" width={8} height={8} patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
          <line x1={0} y1={0} x2={0} y2={8} stroke={colors.border} strokeWidth={2} />
        </pattern>
      </defs>

      {/* Ruler */}
      <g>
        {ticks.map((m) => (
          <g key={m}>
            <line x1={m * pm} y1={RULER_HEIGHT - 6} x2={m * pm} y2={RULER_HEIGHT} stroke={colors.muted} strokeWidth={1} />
            <text x={m * pm + 2} y={RULER_HEIGHT - 7} fontSize={9} fill={colors.muted}>
              {m} m
            </text>
          </g>
        ))}
      </g>

      {/* Building frontage */}
      <rect x={0} y={RULER_HEIGHT} width={widthPx} height={BUILDING_HEIGHT} fill="url(#street-strip-hatch)" />
      <rect x={0} y={RULER_HEIGHT} width={widthPx} height={BUILDING_HEIGHT} fill={colors.bg} opacity={0.6} />
      <text x={8} y={RULER_HEIGHT + BUILDING_HEIGHT / 2 + 3} fontSize={10} fill={colors.muted}>
        Mặt tiền nhà
      </text>

      {/* Sidewalk */}
      <rect x={0} y={sidewalkTop} width={widthPx} height={sidewalkHeight} fill={colors.card} stroke={colors.border} strokeWidth={1} />
      <line
        x1={0}
        y1={kerbTop - 1}
        x2={widthPx}
        y2={kerbTop - 1}
        stroke={colors.border}
        strokeWidth={1}
        strokeDasharray="3 3"
      />
      <text x={8} y={kerbTop - 6} fontSize={9} fill={colors.muted}>
        Lối đi bộ
      </text>

      {layout.placed.map((placed) => (
        <SlotRect
          key={placed.slot.slotId}
          placed={placed}
          pm={pm}
          top={sidewalkTop}
          selected={placed.slot.slotId === selectedSlotId}
          onSelect={onSelect}
        />
      ))}

      {/* Kerb */}
      <rect x={0} y={kerbTop} width={widthPx} height={KERB_HEIGHT} fill={colors.muted} />

      {/* Roadway */}
      <rect x={0} y={roadwayTop} width={widthPx} height={ROADWAY_HEIGHT} fill="#EEF2F6" />
      <line
        x1={0}
        y1={roadwayTop + ROADWAY_HEIGHT / 2}
        x2={widthPx}
        y2={roadwayTop + ROADWAY_HEIGHT / 2}
        stroke={colors.secondary}
        strokeWidth={2}
        strokeDasharray="10 8"
      />
      <text x={8} y={roadwayTop + ROADWAY_HEIGHT / 2 + 4} fontSize={11} fill={colors.muted}>
        {zoneName}
      </text>
    </svg>
  );
}

function SlotRect({
  placed,
  pm,
  top,
  selected,
  onSelect,
}: {
  placed: PlacedSlot;
  pm: number;
  top: number;
  selected: boolean;
  onSelect: (slot: SidewalkSlot) => void;
}) {
  const { slot, footprint, startMeters } = placed;
  const x = startMeters * pm;
  const width = footprint.alongMeters * pm;
  const height = footprint.acrossMeters * pm;
  const color = slotStatusColor(slot.slotStatus);
  const tint = slotStatusTint(slot.slotStatus);

  const areaLabel = footprint.measured
    ? `${footprint.areaSqm!.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} m²`
    : '— m²';
  const status = statusLabel(slot.slotStatus).label;
  const sizePart = footprint.measured
    ? `rộng ${footprint.alongMeters} mét, sâu ${footprint.acrossMeters} mét, diện tích ${areaLabel}`
    : 'chưa có kích thước';
  const ariaLabel = `Ô ${slot.slotCode}, ${status}, ${sizePart}, ${formatVnd(slot.pricePerDay)} mỗi ngày`;

  const handleKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(slot);
    }
  };

  const showTwoLines = width >= 48;
  const showCodeOnly = !showTwoLines && width >= 30;

  return (
    <g
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={ariaLabel}
      onClick={() => onSelect(slot)}
      onKeyDown={handleKeyDown}
      style={{ cursor: 'pointer' }}
    >
      {selected && (
        <rect x={x - 4} y={top - 4} width={width + 8} height={height + 8} fill={colors.indigo} opacity={0.2} />
      )}
      <rect
        x={x}
        y={top}
        width={width}
        height={height}
        fill={footprint.measured ? tint : 'none'}
        stroke={selected ? colors.indigo : color}
        strokeWidth={selected ? 3 : 1.5}
        strokeDasharray={footprint.measured ? undefined : '4 3'}
      />
      {showTwoLines && (
        <text x={x + width / 2} y={top + height / 2} fontSize={10} textAnchor="middle" fill={colors.text}>
          <tspan x={x + width / 2} dy={-3}>
            {slot.slotCode}
          </tspan>
          <tspan x={x + width / 2} dy={12} fontSize={9} fill={colors.muted}>
            {areaLabel}
          </tspan>
        </text>
      )}
      {showCodeOnly && (
        <text
          x={x + width / 2}
          y={top + height / 2}
          fontSize={9}
          textAnchor="middle"
          fill={colors.text}
          transform={`rotate(-90 ${x + width / 2} ${top + height / 2})`}
        >
          {slot.slotCode}
        </text>
      )}
    </g>
  );
}
