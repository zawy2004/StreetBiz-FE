import { useMemo, type ReactNode } from 'react';

import { Button } from '@/components/common';
import { EmptyState } from '@/components/feedback';
import type { SidewalkSlot, StreetFeature } from '@/core/api/side-api';
import { buildCorridor } from '../corridor-model';
import { toDms } from '../slot-format';
import type { SlotFilters } from '../slot-stats';
import { PAVING } from '../slot-visuals';
import { buildStreetLayout } from '../street-geometry';
import { CorridorPlan } from './CorridorPlan';

type Props = {
  zoneName: string;
  slots: SidewalkSlot[];
  features: StreetFeature[];
  filters: SlotFilters;
  showFeatures: boolean;
  selectedSlotId: number | null;
  myHeldSlotIds: ReadonlySet<number>;
  cardWidthPx: number;
  nowMs: number;
  onSelect: (slot: SidewalkSlot) => void;
  /** Switches the workspace to the map, offered when the slots do not form a street. */
  onShowMap: () => void;
};

/**
 * Fits the zone's slots to a street and draws them as the street plan, or
 * says why they cannot be drawn as one (no slots, or not laid out along a road).
 */
export function ZonePlan({ slots, zoneName, features, selectedSlotId, onShowMap, ...rest }: Props) {
  const layout = useMemo(() => buildStreetLayout(slots), [slots]);
  const corridor = useMemo(
    () => (layout.kind === 'strip' ? buildCorridor(layout, features) : null),
    [layout, features],
  );

  if (layout.kind === 'empty') {
    return (
      <EmptyPavement>
        <EmptyState title="Tuyến này chưa có ô nào" icon="view-grid-outline" />
      </EmptyPavement>
    );
  }
  if (layout.kind === 'not-a-street' || !corridor) {
    return (
      <EmptyPavement>
        <EmptyState
          icon="map-outline"
          title="Các ô ở đây không xếp thành một tuyến đường"
          description="Hãy xem ở chế độ Bản đồ."
          action={<Button label="Bản đồ" variant="outline" fullWidth={false} onPress={onShowMap} />}
        />
      </EmptyPavement>
    );
  }

  const selected = slots.find((s) => s.slotId === selectedSlotId);
  const placed =
    selected && layout.kind === 'strip'
      ? layout.placed.find((p) => p.slot.slotId === selected.slotId)
      : undefined;

  return (
    <div className="flex flex-col gap-xs">
      <CorridorPlan
        corridor={corridor}
        roadName={zoneName}
        bearingDegrees={layout.kind === 'strip' ? layout.bearingDegrees : 0}
        selectedSlotId={selectedSlotId}
        selectedCoordinates={selected ? toDms(selected.latitude, selected.longitude) : null}
        selectedAlongMeters={placed ? Math.round(placed.centerMeters) : null}
        {...rest}
      />
      {corridor.offStreet.length > 0 && (
        <p className="text-body-sm text-muted">
          {corridor.offStreet.length} ô không nằm trên tuyến này (không hiển thị trên sơ đồ).
        </p>
      )}
    </div>
  );
}

/** An empty stretch of paved sidewalk with its kerb, so a street with nothing to show still reads as a street. */
function EmptyPavement({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[20px] border border-border bg-card shadow-card">
      <div className={PAVING}>{children}</div>
      <div aria-hidden="true" className="sb-kerb sb-kerb-thin" />
      <div aria-hidden="true" className="h-10 bg-[#E6EAEE] dark:bg-[#1D2833]" />
    </div>
  );
}
