import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { Button, Card, IconButton, Money } from '@/components/common';
import { StatusChip } from '@/components/status';
import { FilterChips } from '@/components/forms';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { sideApi, SideApiError, type SidewalkSlot } from '@/core/api/side-api';
import { useAuthStore } from '@/store/auth-store';
import { buildStreetLayout, type PlacedSlot } from '../street-geometry';
import { slotStatusColor } from '../slot-visuals';
import { StreetStripDiagram } from './StreetStripDiagram';

const PX_PER_METER_STEPS = [12, 18, 24, 36];
const DEFAULT_ZOOM_INDEX = 2; // 24 px/m -- a 2 m frontage renders at touchHeight (48px).

// Status -> legend label, in the order the map/diagram color-codes them.
const LEGEND_STATUSES = [
  { status: 'AVAILABLE', label: 'Còn trống' },
  { status: 'PENDING_APPLICATION', label: 'Đang có đơn' },
  { status: 'ACTIVE', label: 'Đã cho thuê' },
  { status: 'SUSPENDED', label: 'Tạm ngưng' },
] as const;

type Props = {
  slots: SidewalkSlot[];
  /** Set by the map view's "Xem sơ đồ" popup button to jump straight to that zone. */
  focusZoneId?: number | null;
};

/**
 * SIDE-01 as a to-scale street diagram instead of map pins: picks a zone from
 * the slots already fetched for the map, fetches that whole street (its own
 * zone-scoped query -- the map's bounds/take-200/AVAILABLE-only query would
 * silently clip the street), and lays it out with street-geometry.
 */
export function StreetStripView({ slots, focusZoneId }: Props) {
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.user?.id);

  const zones = useMemo(() => {
    const byZone = new Map<number, { zoneName: string; count: number }>();
    for (const s of slots) {
      const entry = byZone.get(s.zoneId);
      if (entry) entry.count += 1;
      else byZone.set(s.zoneId, { zoneName: s.zoneName, count: 1 });
    }
    return [...byZone.entries()]
      .map(([zoneId, v]) => ({ zoneId, ...v }))
      .sort((a, b) => b.count - a.count);
  }, [slots]);

  const [pickedZoneId, setPickedZoneId] = useState<number | null>(null);
  // A change to focusZoneId (map popup's "Xem sơ đồ" button) always wins over
  // whatever zone was previously picked by hand.
  useEffect(() => {
    if (focusZoneId != null) setPickedZoneId(focusZoneId);
  }, [focusZoneId]);
  const activeZoneId = pickedZoneId ?? zones[0]?.zoneId ?? null;
  const activeZoneName = zones.find((z) => z.zoneId === activeZoneId)?.zoneName ?? '';

  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX);
  const pxPerMeter = PX_PER_METER_STEPS[zoomIndex]!;

  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);

  const street = useQuery({
    queryKey: ['side', userId, 'slots', { zoneId: activeZoneId, includeUnavailable: true }],
    queryFn: () => sideApi.searchSlots({ zoneId: activeZoneId!, includeUnavailable: true, take: 500 }),
    enabled: activeZoneId != null,
  });

  if (zones.length === 0) {
    return (
      <EmptyState
        title="Không có ô nào trong khu vực đang xem"
        description="Di chuyển bản đồ tới khu vực khác rồi thử lại."
      />
    );
  }

  const layout = street.data ? buildStreetLayout(street.data) : null;
  const selectedPlaced =
    layout?.kind === 'strip' ? layout.placed.find((p) => p.slot.slotId === selectedSlotId) : undefined;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-sm border-b border-border p-sm">
        {zones.length > 1 ? (
          <FilterChips
            value={String(activeZoneId)}
            onChange={(v) => {
              setPickedZoneId(Number(v));
              setSelectedSlotId(null);
            }}
            options={zones.map((z) => ({ value: String(z.zoneId), label: z.zoneName, count: z.count }))}
          />
        ) : (
          <p className="truncate text-body-md font-semibold text-text">{activeZoneName}</p>
        )}
        <div className="flex shrink-0 items-center gap-1">
          <IconButton
            icon="minus"
            accessibilityLabel="Thu nhỏ sơ đồ"
            onPress={() => setZoomIndex((i) => Math.max(0, i - 1))}
          />
          <IconButton
            icon="plus"
            accessibilityLabel="Phóng to sơ đồ"
            onPress={() => setZoomIndex((i) => Math.min(PX_PER_METER_STEPS.length - 1, i + 1))}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-sm">
        {street.isPending && <LoadingState />}
        {street.error && (
          <ErrorState
            message={street.error instanceof SideApiError ? street.error.message : street.error.message}
            onRetry={() => void street.refetch()}
          />
        )}
        {layout?.kind === 'empty' && <EmptyState title="Tuyến này chưa có ô nào" />}
        {layout?.kind === 'not-a-street' && (
          <EmptyState
            title="Các ô ở đây không xếp thành một tuyến đường"
            description={`Lệch ngang khoảng ${Math.round(layout.crossSpreadMeters)} m — hãy xem ở chế độ Bản đồ.`}
          />
        )}
        {layout?.kind === 'strip' && (
          <>
            <StreetStripDiagram
              layout={layout}
              zoneName={activeZoneName}
              pxPerMeter={pxPerMeter}
              selectedSlotId={selectedSlotId}
              onSelect={(slot) => setSelectedSlotId(slot.slotId)}
            />
            <div className="mt-sm flex flex-wrap items-center gap-md">
              <ScaleBar pxPerMeter={pxPerMeter} />
              <Legend />
            </div>
            {layout.offStreet.length > 0 && (
              <p className="mt-xs text-body-sm text-muted">
                {layout.offStreet.length} ô không nằm trên tuyến này (không hiển thị trên sơ đồ).
              </p>
            )}
          </>
        )}
      </div>

      {selectedPlaced && (
        <SelectedSlotPanel
          placed={selectedPlaced}
          onOpenDetail={() => navigate(`/vendor/slots/${selectedPlaced.slot.slotId}`)}
        />
      )}
    </div>
  );
}

function ScaleBar({ pxPerMeter }: { pxPerMeter: number }) {
  return (
    <div className="flex items-center gap-xs text-body-sm text-muted">
      <div style={{ width: 10 * pxPerMeter }} className="h-1.5 rounded-full bg-muted" />
      <span>10 m</span>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-sm text-body-sm text-muted">
      {LEGEND_STATUSES.map(({ status, label }) => (
        <span key={status} className="flex items-center gap-1">
          <span
            className="h-3 w-3 rounded-sm border"
            style={{ backgroundColor: slotStatusColor(status), borderColor: slotStatusColor(status) }}
          />
          {label}
        </span>
      ))}
      <span className="flex items-center gap-1">
        <span className="h-3 w-3 rounded-sm border border-dashed border-muted bg-transparent" />
        Chưa rõ kích thước
      </span>
    </div>
  );
}

function SelectedSlotPanel({ placed, onOpenDetail }: { placed: PlacedSlot; onOpenDetail: () => void }) {
  const { slot, footprint, centerMeters } = placed;
  const sizeText = footprint.measured
    ? `${footprint.alongMeters.toLocaleString('vi-VN')} × ${footprint.acrossMeters.toLocaleString('vi-VN')} m = ${footprint.areaSqm!.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} m²`
    : 'Chưa có kích thước';
  const hoursText = slot.availableFrom && slot.availableTo ? `${slot.availableFrom} – ${slot.availableTo}` : 'Cả ngày';

  return (
    <div className="border-t border-border p-sm">
      <Card>
        <div className="flex items-center justify-between gap-sm">
          <p className="text-headline-sm text-text">{slot.slotCode}</p>
          <StatusChip code={slot.slotStatus} />
        </div>
        <p className="mt-1 text-body-sm text-muted">{sizeText}</p>
        <div className="mt-1 flex items-center justify-between gap-sm">
          <Money amountVnd={slot.pricePerDay} />
          <span className="text-body-sm text-muted">mỗi ngày</span>
        </div>
        <p className="mt-1 text-body-sm text-muted">{hoursText}</p>
        <p className="mt-1 text-body-sm text-muted">cách đầu tuyến ~{Math.round(centerMeters)} m</p>
        <div className="mt-sm">
          <Button label="Xem chi tiết" onPress={onOpenDetail} />
        </div>
      </Card>
    </div>
  );
}
