import { Icon } from '@/components/common';
import type { SidewalkSlot } from '@/core/api/side-api';
import { colors } from '@/theme';
import type { Corridor, CorridorItem } from '../corridor-model';
import { slotDisplayState, slotMatchesFilters, type SlotFilters } from '../slot-stats';
import { FeatureCard } from './FeatureCard';
import { SlotCard } from './SlotCard';

type Props = {
  corridor: Corridor;
  roadName: string;
  showFeatures: boolean;
  filters: SlotFilters;
  selectedSlotId: number | null;
  /** Slot ids the caller currently holds. */
  myHeldSlotIds: ReadonlySet<number>;
  cardWidthPx: number;
  nowMs: number;
  /** "16°03'…N 108°12'…E" of the selected slot, drawn on the roadway. */
  selectedCoordinates: string | null;
  onSelect: (slot: SidewalkSlot) => void;
};

/**
 * The street as cards: a row of slots, a footpath, the roadway, a footpath and
 * the facing row. Anything that is not a slot (transformer stations, trees,
 * bus stops) sits in the row at its real position along the street.
 */
export function CorridorPlan({
  corridor,
  roadName,
  showFeatures,
  filters,
  selectedSlotId,
  myHeldSlotIds,
  cardWidthPx,
  nowMs,
  selectedCoordinates,
  onSelect,
}: Props) {
  const renderRow = (items: CorridorItem[]) => (
    <div className="flex gap-xs">
      {items.map((item) => {
        if (item.kind === 'feature') {
          return showFeatures ? <FeatureCard key={item.key} feature={item.feature} /> : null;
        }
        const slot = item.placed.slot;
        return (
          <SlotCard
            key={item.key}
            slot={slot}
            state={slotDisplayState(slot, nowMs)}
            selected={slot.slotId === selectedSlotId}
            mine={myHeldSlotIds.has(slot.slotId)}
            matchesFilters={slotMatchesFilters(slot, filters, nowMs)}
            widthPx={cardWidthPx}
            nowMs={nowMs}
            onSelect={onSelect}
          />
        );
      })}
    </div>
  );

  const slotCount = (items: CorridorItem[]) => items.filter((i) => i.kind === 'slot').length;

  return (
    <div className="overflow-x-auto rounded-md border border-border bg-bg p-sm">
      <div className="flex min-w-max flex-col gap-xs">
        <RowLabel text={corridor.hasTwoSides ? 'DÃY A' : 'DÃY Ô'} count={slotCount(corridor.rowA)} />
        {renderRow(corridor.rowA)}

        <Footpath />
        <Roadway roadName={roadName} coordinates={selectedCoordinates} />

        {corridor.hasTwoSides && (
          <>
            <Footpath />
            <RowLabel text="DÃY B" count={slotCount(corridor.rowB)} />
            {renderRow(corridor.rowB)}
          </>
        )}
      </div>
    </div>
  );
}

function RowLabel({ text, count }: { text: string; count: number }) {
  return (
    <p className="text-badge text-muted">
      {text} · {count} Ô
    </p>
  );
}

function Footpath() {
  return (
    <div className="flex h-8 items-center gap-xs rounded-sm border border-secondary/30 bg-tint-secondary px-sm text-badge text-on-secondary">
      <Icon name="walk" size={16} color={colors.onSecondary} />
      LỐI ĐI BỘ
    </div>
  );
}

function Roadway({ roadName, coordinates }: { roadName: string; coordinates: string | null }) {
  return (
    <div className="relative flex h-24 flex-col justify-between overflow-hidden rounded-sm bg-indigo p-sm text-white">
      {/* At the left edge: the plan scrolls sideways, so a label at the far right is mostly off-screen. */}
      <span className="w-fit rounded-sm bg-white/15 px-xs text-badge">{roadName.toUpperCase()}</span>
      <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t-2 border-dashed border-secondary" />
      {coordinates && (
        <span className="relative w-fit rounded-sm bg-white/15 px-xs text-body-sm">● {coordinates}</span>
      )}
    </div>
  );
}
