import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { IconButton } from '@/components/common';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { SegmentedControl } from '@/components/forms';
import { sideApi, SideApiError } from '@/core/api/side-api';
import { useAuthStore } from '@/store/auth-store';
import { SlotDetailPanel } from '../components/SlotDetailPanel';
import { SlotFilterBar } from '../components/SlotFilterBar';
import { SlotMapView, type Bounds } from '../components/SlotMapView';
import { ZoneHeader } from '../components/ZoneHeader';
import { ZonePlan } from '../components/ZonePlan';
import { DEFAULT_CENTER, DEFAULT_SPAN } from '../map-constants';
import { countSlots, slotMatchesFilters } from '../slot-stats';
import { useHolds } from '../useHolds';
import { useNow } from '../useNow';
import { useWorkspaceStore, type SlotSearchEntry, type ZoneOption } from '../workspace-store';

const CARD_WIDTHS_PX = [112, 136, 160, 192];
const DEFAULT_CARD_WIDTH_INDEX = 1;

/**
 * The vendor's slot workspace: the route's header and numbers, quick filters,
 * the corridor plan (or the map) and the selected slot's panel. From the 2xl
 * breakpoint the panel sits in a right-hand column; below it, under the plan.
 */
export function SlotMapScreen() {
  const userId = useAuthStore((s) => s.user?.id);
  const nowMs = useNow();
  const { holds } = useHolds();

  const zoneId = useWorkspaceStore((s) => s.zoneId);
  const selectedSlotId = useWorkspaceStore((s) => s.selectedSlotId);
  const view = useWorkspaceStore((s) => s.view);
  const filters = useWorkspaceStore((s) => s.filters);
  const showFeatures = useWorkspaceStore((s) => s.showFeatures);
  const selectZone = useWorkspaceStore((s) => s.selectZone);
  const selectSlot = useWorkspaceStore((s) => s.selectSlot);
  const setView = useWorkspaceStore((s) => s.setView);
  const setFilters = useWorkspaceStore((s) => s.setFilters);
  const register = useWorkspaceStore((s) => s.register);
  const clearRegistered = useWorkspaceStore((s) => s.clearRegistered);

  const [cardWidthIndex, setCardWidthIndex] = useState(DEFAULT_CARD_WIDTH_INDEX);
  const [bounds, setBounds] = useState<Bounds>({
    minLat: DEFAULT_CENTER[0] - DEFAULT_SPAN,
    maxLat: DEFAULT_CENTER[0] + DEFAULT_SPAN,
    minLng: DEFAULT_CENTER[1] - DEFAULT_SPAN,
    maxLng: DEFAULT_CENTER[1] + DEFAULT_SPAN,
  });

  // What is around the viewport: feeds the map's zone markers and the header's
  // route select and search. includeUnavailable so rented/suspended slots count.
  const nearby = useQuery({
    queryKey: ['side', userId, 'slots', { ...bounds, includeUnavailable: true }],
    queryFn: () => sideApi.searchSlots({ ...bounds, includeUnavailable: true, take: 200 }),
    placeholderData: (previous) => previous,
  });

  const nearbyZones = useMemo<ZoneOption[]>(() => {
    const byId = new Map<number, ZoneOption>();
    for (const s of nearby.data ?? []) byId.set(s.zoneId, { zoneId: s.zoneId, zoneName: s.zoneName });
    return [...byId.values()];
  }, [nearby.data]);

  const activeZoneId = zoneId ?? nearbyZones[0]?.zoneId ?? null;

  // The whole street: its own zone-scoped query, because the viewport query's
  // take-200 cut would silently clip a long street.
  const zoneSlots = useQuery({
    queryKey: ['side', userId, 'slots', { zoneId: activeZoneId, includeUnavailable: true }],
    queryFn: () => sideApi.searchSlots({ zoneId: activeZoneId!, includeUnavailable: true, take: 500 }),
    enabled: activeZoneId != null,
  });
  const zone = useQuery({
    queryKey: ['side', userId, 'zone', activeZoneId],
    queryFn: () => sideApi.getZone(activeZoneId!),
    enabled: activeZoneId != null,
  });

  const slots = useMemo(() => zoneSlots.data ?? [], [zoneSlots.data]);
  const selectedSlot = slots.find((s) => s.slotId === selectedSlotId) ?? null;
  const zoneName = zone.data?.zoneName ?? slots[0]?.zoneName ?? nearbyZones.find((z) => z.zoneId === activeZoneId)?.zoneName ?? '';

  // A zone picked from elsewhere (basket, search) may lie outside the viewport;
  // keep it in the header's select once its name is known.
  const zoneOptions = useMemo(() => {
    if (activeZoneId == null || nearbyZones.some((z) => z.zoneId === activeZoneId) || !zoneName) return nearbyZones;
    return [...nearbyZones, { zoneId: activeZoneId, zoneName }];
  }, [nearbyZones, activeZoneId, zoneName]);

  const searchIndex = useMemo<SlotSearchEntry[]>(() => {
    const byId = new Map<number, SlotSearchEntry>();
    for (const s of [...(nearby.data ?? []), ...slots]) {
      byId.set(s.slotId, { slotId: s.slotId, slotCode: s.slotCode, zoneId: s.zoneId, zoneName: s.zoneName });
    }
    return [...byId.values()];
  }, [nearby.data, slots]);

  useEffect(() => {
    register(zoneOptions, searchIndex);
  }, [register, zoneOptions, searchIndex]);
  useEffect(() => clearRegistered, [clearRegistered]);

  // Keep the store's zone in step with what is shown, so the header select agrees.
  useEffect(() => {
    if (zoneId == null && activeZoneId != null) selectZone(activeZoneId);
  }, [zoneId, activeZoneId, selectZone]);

  const panelRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (selectedSlotId != null) panelRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
  }, [selectedSlotId]);

  const counts = useMemo(() => countSlots(slots, nowMs), [slots, nowMs]);
  const matchCount = useMemo(
    () => slots.filter((s) => slotMatchesFilters(s, filters, nowMs)).length,
    [slots, filters, nowMs],
  );
  const myHeldSlotIds = useMemo(() => new Set(holds.map((h) => h.slotId)), [holds]);
  const features = zone.data?.features;

  if (nearby.isPending && !nearby.data) return <LoadingState />;

  // With nothing around the viewport there is no zone to plan, so the map is the
  // only way to find one -- show it whatever view was last chosen.
  const effectiveView = nearbyZones.length === 0 && activeZoneId == null ? 'MAP' : view;

  return (
    <div className="h-full min-h-0 overflow-y-auto bg-bg 2xl:flex 2xl:overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col gap-md p-md 2xl:overflow-y-auto">
        {activeZoneId != null && (
          <ZoneHeader zoneName={zoneName} zone={zone.data} counts={counts} nowMs={nowMs} />
        )}

        <section className="flex flex-col gap-sm rounded-md border border-border bg-card p-sm shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-sm">
            <h2 className="text-headline-sm text-text">
              {effectiveView === 'PLAN' ? 'Sơ đồ hành lang tuyến' : 'Bản đồ khu vực'}
            </h2>
            <div className="flex items-center gap-xs">
              <div className="w-44">
                <SegmentedControl
                  value={effectiveView}
                  onChange={setView}
                  options={[
                    { value: 'PLAN', label: 'Sơ đồ' },
                    { value: 'MAP', label: 'Bản đồ' },
                  ]}
                />
              </div>
              {effectiveView === 'PLAN' && (
                <>
                  <IconButton
                    icon="minus"
                    accessibilityLabel="Thu nhỏ thẻ ô"
                    onPress={() => setCardWidthIndex((i) => Math.max(0, i - 1))}
                  />
                  <IconButton
                    icon="plus"
                    accessibilityLabel="Phóng to thẻ ô"
                    onPress={() => setCardWidthIndex((i) => Math.min(CARD_WIDTHS_PX.length - 1, i + 1))}
                  />
                </>
              )}
            </div>
          </div>

          {effectiveView === 'PLAN' && (
            <>
              <SlotFilterBar filters={filters} onChange={setFilters} matchCount={matchCount} />
              {zoneSlots.isPending && activeZoneId != null && <LoadingState />}
              {zoneSlots.error && (
                <ErrorState
                  message={zoneSlots.error instanceof SideApiError ? zoneSlots.error.message : zoneSlots.error.message}
                  onRetry={() => void zoneSlots.refetch()}
                />
              )}
              {zoneSlots.data && (
                <ZonePlan
                  zoneName={zoneName}
                  slots={slots}
                  features={features ?? []}
                  filters={filters}
                  showFeatures={showFeatures}
                  selectedSlotId={selectedSlotId}
                  myHeldSlotIds={myHeldSlotIds}
                  cardWidthPx={CARD_WIDTHS_PX[cardWidthIndex]!}
                  nowMs={nowMs}
                  onSelect={(slot) => selectSlot(slot.slotId)}
                />
              )}
            </>
          )}

          {effectiveView === 'MAP' && (
            <div className="h-[520px] overflow-hidden rounded-md border border-border">
              <SlotMapView
                slots={nearby.data ?? []}
                onBoundsChange={setBounds}
                error={nearby.error}
                onRetry={() => void nearby.refetch()}
                onViewZoneDiagram={(id) => {
                  selectZone(id);
                  setView('PLAN');
                }}
              />
            </div>
          )}
        </section>
      </div>

      <aside
        ref={panelRef}
        className="p-md pt-0 2xl:w-[440px] 2xl:shrink-0 2xl:overflow-y-auto 2xl:border-l 2xl:border-border 2xl:bg-card 2xl:pt-md"
      >
        {selectedSlot ? (
          // Stacked under the plan the panel would stretch across the whole page.
          <div className="mx-auto w-full max-w-3xl 2xl:max-w-none">
            <SlotDetailPanel key={selectedSlot.slotId} slot={selectedSlot} zone={zone.data} />
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-border p-lg 2xl:border-0">
            <EmptyState
              title="Chọn một ô để xem chi tiết"
              description="Bấm vào một thẻ ô trên sơ đồ để xem ảnh, thông số, báo giá và nộp hồ sơ."
              icon="crosshairs-gps"
            />
          </div>
        )}
      </aside>
    </div>
  );
}
