import { useMemo } from 'react';

import { EmptyState } from '@/components/feedback';
import type { SidewalkSlot, StreetFeature } from '@/core/api/side-api';
import { buildCorridor } from '../corridor-model';
import { toDms } from '../slot-format';
import type { SlotFilters } from '../slot-stats';
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
};

/**
 * Fits the zone's slots to a street and draws them as the corridor plan, or
 * says why they cannot be drawn as one (no slots, or not laid out along a road).
 */
export function ZonePlan({ slots, zoneName, features, selectedSlotId, ...rest }: Props) {
  const layout = useMemo(() => buildStreetLayout(slots), [slots]);
  const corridor = useMemo(
    () => (layout.kind === 'strip' ? buildCorridor(layout, features) : null),
    [layout, features],
  );

  if (layout.kind === 'empty') return <EmptyState title="Tuyến này chưa có ô nào" />;
  if (layout.kind === 'not-a-street' || !corridor) {
    return (
      <EmptyState
        title="Các ô ở đây không xếp thành một tuyến đường"
        description="Hãy xem ở chế độ Bản đồ."
      />
    );
  }

  const selected = slots.find((s) => s.slotId === selectedSlotId);

  return (
    <div className="flex flex-col gap-xs">
      <CorridorPlan
        corridor={corridor}
        roadName={zoneName}
        selectedSlotId={selectedSlotId}
        selectedCoordinates={selected ? toDms(selected.latitude, selected.longitude) : null}
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
