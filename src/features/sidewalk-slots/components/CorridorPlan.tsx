import { useState, type CSSProperties } from 'react';

import { Icon } from '@/components/common';
import type { SidewalkSlot } from '@/core/api/side-api';
import type { Corridor, CorridorItem } from '../corridor-model';
import { slotDisplayState, slotMatchesFilters, type SlotFilters } from '../slot-stats';
import { PAVING, streetHeading } from '../slot-visuals';
import { FeatureCard } from './FeatureCard';
import { SlotCard } from './SlotCard';

type Props = {
  corridor: Corridor;
  roadName: string;
  /** Angle of the fitted street axis above due east (street-geometry), for the compass badge. */
  bearingDegrees: number;
  showFeatures: boolean;
  filters: SlotFilters;
  selectedSlotId: number | null;
  /** Slot ids the caller currently holds. */
  myHeldSlotIds: ReadonlySet<number>;
  cardWidthPx: number;
  nowMs: number;
  /** "16°03'…N 108°12'…E" of the selected slot, painted on the roadway. */
  selectedCoordinates: string | null;
  /** How far along the street the selected slot sits, in whole metres. */
  selectedAlongMeters: number | null;
  onSelect: (slot: SidewalkSlot) => void;
};

// Only the first bays are painted in one after another; a long street shows the rest at once.
const STAGGERED_BAYS = 14;
const STAGGER_MS = 30;

/**
 * The street seen from above, top to bottom: the bays of row A on the paved
 * sidewalk, the footpath, the painted kerb, the roadway with its centre line
 * and zebra crossings, the far kerb, then the footpath and bays of row B, and a
 * metre rule. Anything that is not a slot (transformer, tree, bus stop) stands
 * in its row at its place along the street. The plan scrolls sideways inside
 * its frame; the labels stay pinned to the left edge.
 */
export function CorridorPlan({
  corridor,
  roadName,
  bearingDegrees,
  showFeatures,
  filters,
  selectedSlotId,
  myHeldSlotIds,
  cardWidthPx,
  nowMs,
  selectedCoordinates,
  selectedAlongMeters,
  onSelect,
}: Props) {
  // A phone only shows a few bays; say once that the street goes on, until the vendor scrolls it.
  const [scrolled, setScrolled] = useState(false);
  let bayIndex = 0;
  const renderRow = (items: CorridorItem[]) => (
    <div className={`flex gap-xs px-sm py-md ${PAVING}`}>
      {items.map((item) => {
        if (item.kind === 'feature') {
          return showFeatures ? <FeatureCard key={item.key} feature={item.feature} /> : null;
        }
        const slot = item.placed.slot;
        const state = slotDisplayState(slot, nowMs);
        const index = bayIndex++;
        const staggered = index < STAGGERED_BAYS;
        return (
          // The paint-in runs on a wrapper so it never fights the bay's own hover lift.
          <div
            key={item.key}
            className={`flex shrink-0 ${staggered ? 'sb-rise' : ''}`}
            style={
              staggered ? ({ '--delay': `${index * STAGGER_MS}ms` } as CSSProperties) : undefined
            }
          >
            <SlotCard
              slot={slot}
              state={state}
              selected={slot.slotId === selectedSlotId}
              mine={myHeldSlotIds.has(slot.slotId)}
              matchesFilters={slotMatchesFilters(slot, filters, nowMs)}
              widthPx={cardWidthPx}
              // Only a held bay shows a clock; the others skip the once-a-second re-render.
              nowMs={state === 'HELD' ? nowMs : 0}
              onSelect={onSelect}
            />
          </div>
        );
      })}
    </div>
  );

  const slotCount = (items: CorridorItem[]) => items.filter((i) => i.kind === 'slot').length;
  const lengthMeters = Math.round(corridor.lengthMeters);

  return (
    <section aria-label={`Sơ đồ tuyến ${roadName}`} className="flex flex-col gap-xs">
      <div className="flex flex-wrap items-center justify-between gap-x-md gap-y-xs">
        <BearingBadge bearingDegrees={bearingDegrees} />
        <span className="flex items-center gap-1.5 text-body-sm text-muted">
          <span
            aria-hidden="true"
            className="h-3.5 w-5 rounded-[4px] border-2 border-brand bg-card shadow-[0_0_0_2px_rgb(var(--c-brand)/0.25)]"
          />
          Đang chọn
        </span>
      </div>

      <div className="relative overflow-hidden rounded-[20px] border border-border bg-card shadow-card">
        <div
          className="overflow-x-auto overscroll-x-contain"
          onScroll={scrolled ? undefined : () => setScrolled(true)}
        >
          <div className="flex min-w-max flex-col">
            <RowLabel
              text={corridor.hasTwoSides ? 'DÃY A' : 'DÃY Ô'}
              count={slotCount(corridor.rowA)}
            />
            {renderRow(corridor.rowA)}
            <Footpath />
            <div aria-hidden="true" className="sb-kerb sb-kerb-thin" />
            <Roadway
              roadName={roadName}
              coordinates={selectedCoordinates}
              alongMeters={selectedAlongMeters}
            />
            <div aria-hidden="true" className="sb-kerb sb-kerb-thin" />
            {corridor.hasTwoSides ? (
              <>
                <Footpath />
                {renderRow(corridor.rowB)}
                <RowLabel text="DÃY B" count={slotCount(corridor.rowB)} bottom />
              </>
            ) : null}
            <StreetRuler lengthMeters={lengthMeters} />
          </div>
        </div>
        {/* The far edge fades so a phone shows there is more street to the right. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-card to-transparent md:w-6"
        />
      </div>
      {scrolled ? null : (
        <p className="flex items-center gap-1 text-body-sm text-muted md:hidden">
          <Icon name="swap-horizontal" size={16} color="currentColor" />
          Kéo ngang để xem cả tuyến
        </p>
      )}
    </section>
  );
}

function RowLabel({ text, count, bottom }: { text: string; count: number; bottom?: boolean }) {
  return (
    <div className={`${PAVING} px-sm ${bottom ? 'pb-sm' : 'pt-sm'}`}>
      <p className="sticky left-sm w-fit rounded-[5px] bg-card/90 px-1.5 py-0.5 text-badge text-muted shadow-card">
        {text} · {count} Ô
      </p>
    </div>
  );
}

function Footpath() {
  return (
    <div className="flex h-8 items-center bg-[#FFF4D1] px-sm text-badge text-[#6B4100] dark:bg-[#3A2A08] dark:text-[#FFD27A]">
      <span className="sticky left-sm flex items-center gap-1.5">
        <Icon name="walk" size={16} color="currentColor" />
        LỐI ĐI BỘ
      </span>
    </div>
  );
}

/** Light asphalt, a dashed white centre line, zebra crossings at both ends, the name painted on it. */
function Roadway({
  roadName,
  coordinates,
  alongMeters,
}: {
  roadName: string;
  coordinates: string | null;
  alongMeters: number | null;
}) {
  const zebra =
    'w-7 shrink-0 bg-[repeating-linear-gradient(0deg,rgb(255_255_255/0.95)_0_6px,transparent_6px_12px)] dark:bg-[repeating-linear-gradient(0deg,rgb(255_255_255/0.22)_0_6px,transparent_6px_12px)]';
  return (
    <div className="relative flex h-[96px] bg-[#E6EAEE] dark:bg-[#1D2833]">
      <span aria-hidden="true" className={zebra} />
      <div className="relative flex min-w-0 flex-1 flex-col justify-between py-xs pl-sm pr-sm">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 bg-[repeating-linear-gradient(90deg,#fff_0_22px,transparent_22px_38px)] dark:bg-[repeating-linear-gradient(90deg,rgb(255_255_255/0.35)_0_22px,transparent_22px_38px)]"
        />
        {/* At the left edge: the plan scrolls sideways, so a label at the far right would be off-screen. */}
        <span className="sticky left-sm w-fit font-sign text-[15px] font-extrabold tracking-[0.18em] text-[#566173] [font-stretch:80%] dark:text-[#A7B3C0]">
          {roadName.toUpperCase()}
        </span>
        {coordinates ? (
          <span className="sticky left-sm flex w-fit items-center gap-1.5 rounded-full bg-card px-sm py-0.5 text-body-sm font-semibold text-text shadow-card">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-brand" />
            {coordinates}
            {alongMeters != null ? (
              <span className="font-normal text-muted">· cách đầu tuyến {alongMeters} m</span>
            ) : null}
          </span>
        ) : (
          <span className="sticky left-sm text-body-xs text-[#566173] dark:text-[#A7B3C0]">
            Chọn một ô để xem toạ độ
          </span>
        )}
      </div>
      <span aria-hidden="true" className={zebra} />
    </div>
  );
}

/**
 * Where the street starts and ends, in metres. The bays are in their real
 * order along the street but not to scale, so the rule marks only its ends.
 */
function StreetRuler({ lengthMeters }: { lengthMeters: number }) {
  return (
    <div className="flex items-center gap-xs bg-card px-sm py-xs text-body-xs font-tabular text-muted">
      <span className="sticky left-sm shrink-0 font-semibold text-text">Đầu tuyến · 0 m</span>
      <span aria-hidden="true" className="relative h-3 min-w-[96px] flex-1">
        <span className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-muted/50" />
        <span className="absolute inset-0 bg-[repeating-linear-gradient(90deg,rgb(var(--c-muted)/0.5)_0_1.5px,transparent_1.5px_32px)] [mask-image:linear-gradient(transparent_25%,#000_25%,#000_75%,transparent_75%)]" />
        <span className="absolute inset-y-0 left-0 w-0.5 rounded-full bg-muted" />
        <span className="absolute inset-y-0 right-0 w-0.5 rounded-full bg-muted" />
      </span>
      <span className="shrink-0 font-semibold text-text">Cuối tuyến · {lengthMeters} m</span>
    </div>
  );
}

function BearingBadge({ bearingDegrees }: { bearingDegrees: number }) {
  // The needle points to north as it lies on the plan: rows read left to right along the street axis.
  return (
    <span className="flex items-center gap-xs text-body-sm text-muted">
      <span
        aria-hidden="true"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-card shadow-card ring-1 ring-border"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          style={{ transform: `rotate(${bearingDegrees}deg)` }}
        >
          <path d="M12 2.5 16 12h-8z" className="fill-brand" />
          <path d="M12 21.5 8 12h8z" className="fill-muted/50" />
          <text
            x="12"
            y="9.6"
            textAnchor="middle"
            fontSize="5.5"
            fontWeight="800"
            className="fill-white"
          >
            B
          </text>
        </svg>
      </span>
      Tuyến chạy hướng {streetHeading(bearingDegrees)}, đọc từ trái sang phải
    </span>
  );
}
