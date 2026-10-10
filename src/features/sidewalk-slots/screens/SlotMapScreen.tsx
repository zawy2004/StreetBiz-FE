import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { Icon } from '@/components/common';
import { ErrorState, LoadingState, Skeleton } from '@/components/feedback';
import { SegmentedControl } from '@/components/forms';
import { sideApi, SideApiError, type SidewalkSlot } from '@/core/api/side-api';
import { useAuthStore } from '@/store/auth-store';
import { RentalStepsGuide } from '../components/RentalStepsGuide';
import { SlotDetailPanel } from '../components/SlotDetailPanel';
import { SlotFilterBar } from '../components/SlotFilterBar';
import type { Bounds } from '../components/SlotMapView';
import { ZoneHeader } from '../components/ZoneHeader';
import { ZonePlan } from '../components/ZonePlan';
import { DEFAULT_CENTER, DEFAULT_SPAN } from '../map-constants';
import { countSlots, slotMatchesFilters } from '../slot-stats';
import { PAVING } from '../slot-visuals';
import { useHolds } from '../useHolds';
import { useNow } from '../useNow';
import { useWorkspaceStore, type SlotSearchEntry, type ZoneOption } from '../workspace-store';

// The Goong/mapbox bundle (~885 kB) loads only when the map view is shown, not
// with every screen of this feature's lazy chunk.
const SlotMapView = lazy(() =>
  import('../components/SlotMapView').then((m) => ({ default: m.SlotMapView })),
);

const CARD_WIDTHS_PX = [112, 136, 160, 192];
const DEFAULT_CARD_WIDTH_INDEX = 1;

const timeFormat = new Intl.DateTimeFormat('vi-VN', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Asia/Ho_Chi_Minh',
});

/**
 * The vendor's slot workspace, chosen like seats on a seating plan: the route
 * as a street-name plate with its occupancy bar, one toolbar (view, filters,
 * bay size), the street seen from above (or the map), and the selected slot's
 * "booking counter". From 1280px the panel is a right-hand column; below it,
 * it sits under the plan.
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
    for (const s of nearby.data ?? [])
      byId.set(s.zoneId, { zoneId: s.zoneId, zoneName: s.zoneName });
    return [...byId.values()];
  }, [nearby.data]);

  const activeZoneId = zoneId ?? nearbyZones[0]?.zoneId ?? null;

  // The whole street: its own zone-scoped query, because the viewport query's
  // take-200 cut would silently clip a long street.
  const zoneSlots = useQuery({
    queryKey: ['side', userId, 'slots', { zoneId: activeZoneId, includeUnavailable: true }],
    queryFn: () =>
      sideApi.searchSlots({ zoneId: activeZoneId!, includeUnavailable: true, take: 500 }),
    enabled: activeZoneId != null,
  });
  const zone = useQuery({
    queryKey: ['side', userId, 'zone', activeZoneId],
    queryFn: () => sideApi.getZone(activeZoneId!),
    enabled: activeZoneId != null,
  });

  const slots = useMemo(() => zoneSlots.data ?? [], [zoneSlots.data]);
  const selectedSlot = slots.find((s) => s.slotId === selectedSlotId) ?? null;
  const zoneName =
    zone.data?.zoneName ??
    slots[0]?.zoneName ??
    nearbyZones.find((z) => z.zoneId === activeZoneId)?.zoneName ??
    '';

  // A zone picked from elsewhere (basket, search) may lie outside the viewport;
  // keep it in the header's select once its name is known.
  const zoneOptions = useMemo(() => {
    if (activeZoneId == null || nearbyZones.some((z) => z.zoneId === activeZoneId) || !zoneName)
      return nearbyZones;
    return [...nearbyZones, { zoneId: activeZoneId, zoneName }];
  }, [nearbyZones, activeZoneId, zoneName]);

  const searchIndex = useMemo<SlotSearchEntry[]>(() => {
    const byId = new Map<number, SlotSearchEntry>();
    for (const s of [...(nearby.data ?? []), ...slots]) {
      byId.set(s.slotId, {
        slotId: s.slotId,
        slotCode: s.slotCode,
        zoneId: s.zoneId,
        zoneName: s.zoneName,
      });
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
  const planRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (selectedSlotId != null)
      panelRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
  }, [selectedSlotId]);

  const counts = useMemo(() => countSlots(slots, nowMs), [slots, nowMs]);
  const matchCount = useMemo(
    () => slots.filter((s) => slotMatchesFilters(s, filters, nowMs)).length,
    [slots, filters, nowMs],
  );
  const myHeldSlotIds = useMemo(() => new Set(holds.map((h) => h.slotId)), [holds]);
  const features = zone.data?.features;
  // Stable, so a bay only re-renders when its own state changes.
  const onSelectSlot = useCallback((slot: SidewalkSlot) => selectSlot(slot.slotId), [selectSlot]);

  if (nearby.isPending && !nearby.data) return <WorkspaceSkeleton />;

  // With nothing around the viewport there is no zone to plan, so the map is the
  // only way to find one -- show it whatever view was last chosen.
  const effectiveView = nearbyZones.length === 0 && activeZoneId == null ? 'MAP' : view;
  const updatedAt = effectiveView === 'PLAN' ? zoneSlots.dataUpdatedAt : nearby.dataUpdatedAt;

  return (
    <div className="h-full min-h-0 overflow-y-auto bg-bg xl:flex xl:overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col gap-lg p-md md:p-lg xl:overflow-y-auto">
        {activeZoneId != null && (
          <ZoneHeader zoneName={zoneName} zone={zone.data} counts={counts} nowMs={nowMs} />
        )}

        <section ref={planRef} className="flex scroll-mt-md flex-col gap-md">
          {/* One toolbar: pinned under the top bar while the plan scrolls, frosted on wide screens. */}
          <div className="z-20 -mx-md flex flex-col gap-sm bg-bg/95 md:sticky md:top-0 px-md py-sm backdrop-blur md:-mx-lg md:px-lg lg:bg-bg/80 lg:backdrop-blur-xl">
            <div className="flex flex-wrap items-center gap-x-md gap-y-sm">
              <h2 className="w-full font-sign text-[18px] font-bold leading-6 text-text sm:w-auto">
                {effectiveView === 'PLAN' ? 'Sơ đồ hành lang tuyến' : 'Bản đồ khu vực'}
              </h2>
              <div className="flex flex-1 items-center justify-between gap-sm sm:flex-none">
                <div className="w-full max-w-[220px] sm:w-auto">
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
                  <div className="flex items-center gap-xs sm:hidden">
                    <SizeButtons onChange={setCardWidthIndex} />
                  </div>
                )}
              </div>
              {updatedAt > 0 ? (
                <span className="ml-auto hidden items-center gap-1 text-body-xs text-muted md:flex">
                  <Icon name="clock-outline" size={14} color="currentColor" />
                  Cập nhật lúc {timeFormat.format(updatedAt)}
                </span>
              ) : null}
            </div>
            {effectiveView === 'PLAN' && (
              <div className="flex items-center gap-sm">
                <div className="min-w-0 flex-1">
                  <SlotFilterBar filters={filters} onChange={setFilters} matchCount={matchCount} />
                </div>
                <div className="hidden shrink-0 items-center gap-xs sm:flex">
                  <SizeButtons onChange={setCardWidthIndex} />
                </div>
              </div>
            )}
          </div>

          {effectiveView === 'PLAN' && (
            <>
              {zoneSlots.isPending && activeZoneId != null && <StreetSkeleton />}
              {zoneSlots.error && (
                <div className="overflow-hidden rounded-[20px] border border-border bg-card shadow-card">
                  <div className={PAVING}>
                    <ErrorState
                      message={
                        zoneSlots.error instanceof SideApiError
                          ? zoneSlots.error.message
                          : zoneSlots.error.message
                      }
                      onRetry={() => void zoneSlots.refetch()}
                    />
                  </div>
                  <div aria-hidden="true" className="sb-kerb sb-kerb-thin" />
                </div>
              )}
              {zoneSlots.data && (
                <ZonePlan
                  key={activeZoneId ?? 'none'}
                  zoneName={zoneName}
                  slots={slots}
                  features={features ?? []}
                  filters={filters}
                  showFeatures={showFeatures}
                  selectedSlotId={selectedSlotId}
                  myHeldSlotIds={myHeldSlotIds}
                  cardWidthPx={CARD_WIDTHS_PX[cardWidthIndex]!}
                  nowMs={nowMs}
                  onSelect={onSelectSlot}
                  onShowMap={() => setView('MAP')}
                />
              )}
            </>
          )}

          {effectiveView === 'MAP' && (
            <div className="h-[62vh] min-h-[420px] overflow-hidden rounded-[20px] border border-border bg-sunken shadow-card md:h-[560px]">
              <Suspense fallback={<LoadingState label="Đang tải bản đồ" />}>
                <SlotMapView
                  slots={nearby.data ?? []}
                  onBoundsChange={setBounds}
                  error={nearby.error}
                  onRetry={() => void nearby.refetch()}
                  onViewZoneDiagram={(id) => {
                    selectZone(id);
                    setView('PLAN');
                  }}
                  empty={nearbyZones.length === 0}
                />
              </Suspense>
            </div>
          )}
        </section>
      </div>

      <aside
        ref={panelRef}
        aria-label="Chi tiết ô"
        className="scroll-mt-md px-md pb-xl md:px-lg xl:w-[440px] xl:shrink-0 xl:overflow-y-auto xl:border-l xl:border-border xl:bg-card xl:px-lg xl:py-lg"
      >
        {selectedSlot ? (
          <SlotDetailPanel
            key={selectedSlot.slotId}
            slot={selectedSlot}
            zone={zone.data}
            onBackToPlan={() =>
              planRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
            }
          />
        ) : (
          <RentalStepsGuide />
        )}
      </aside>
    </div>
  );
}

/** Bay size: four widths, 136px to start. Each press clamps at the ends. */
function SizeButtons({ onChange }: { onChange: (update: (i: number) => number) => void }) {
  const base =
    'flex h-12 w-12 items-center justify-center rounded-full bg-card text-text shadow-card ring-1 ring-border transition-[transform,background-color] hover:bg-sunken active:scale-95 md:h-11 md:w-11';
  return (
    <>
      <button
        type="button"
        aria-label="Thu nhỏ thẻ ô"
        title="Thu nhỏ thẻ ô"
        className={base}
        onClick={() => onChange((i) => Math.max(0, i - 1))}
      >
        <Icon name="minus" size={20} color="currentColor" />
      </button>
      <button
        type="button"
        aria-label="Phóng to thẻ ô"
        title="Phóng to thẻ ô"
        className={base}
        onClick={() => onChange((i) => Math.min(CARD_WIDTHS_PX.length - 1, i + 1))}
      >
        <Icon name="plus" size={20} color="currentColor" />
      </button>
    </>
  );
}

/** The street's outline while its slots load: two rows of bays, footpaths, kerbs, the road. */
function StreetSkeleton() {
  const row = (
    <div className={`flex gap-xs overflow-hidden px-sm py-md ${PAVING}`}>
      {Array.from({ length: 8 }, (_, i) => (
        <Skeleton key={i} className="h-[124px] w-[136px] shrink-0 rounded-[12px]" />
      ))}
    </div>
  );
  return (
    <div
      role="status"
      aria-label="Đang tải sơ đồ tuyến"
      className="overflow-hidden rounded-[20px] border border-border bg-card shadow-card"
    >
      {row}
      <div className="h-8 bg-[#FFF4D1] dark:bg-[#3A2A08]" />
      <div aria-hidden="true" className="sb-kerb sb-kerb-thin" />
      <div className="h-[96px] bg-[#E6EAEE] dark:bg-[#1D2833]" />
      <div aria-hidden="true" className="sb-kerb sb-kerb-thin" />
      <div className="h-8 bg-[#FFF4D1] dark:bg-[#3A2A08]" />
      {row}
    </div>
  );
}

/** First load: the plate, the occupancy bar, the toolbar and the street, in their real shapes. */
function WorkspaceSkeleton() {
  return (
    <div className="h-full min-h-0 overflow-y-auto bg-bg">
      <div className="flex flex-col gap-lg p-md md:p-lg">
        <div className="flex gap-xs">
          <Skeleton className="h-8 w-40 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-full" />
        </div>
        <Skeleton className="h-[56px] w-[280px] max-w-full rounded-[14px]" />
        <Skeleton className="h-[72px] w-full rounded-[20px]" />
        <div className="flex gap-xs overflow-hidden">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-28 shrink-0 rounded-full" />
          ))}
        </div>
        <StreetSkeleton />
      </div>
    </div>
  );
}
