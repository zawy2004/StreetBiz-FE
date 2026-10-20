import { lazy, Suspense, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { Button, Icon } from '@/components/common';
import { LoadingState } from '@/components/feedback';
import { TextField } from '@/components/forms';
import { AppHeader, Screen } from '@/components/layout';
import { AddressSearch } from '@/features/sidewalk-slots/components/AddressSearch';
import { useAuthStore } from '@/store/auth-store';
import type { MapFocus, MapPoint } from '../components/SlotGridMap';
import { WardGate } from '../components/WardGate';
import { BatchPanel } from '../components/ops/grid/BatchPanel';
import { BulkStatusPanel } from '../components/ops/grid/BulkStatusPanel';
import { FeaturePanel } from '../components/ops/grid/FeaturePanel';
import { ZonePicker } from '../components/ops/grid/fields';
import { GpsControl } from '../components/ops/grid/GpsControl';
import {
  EmptyMapHint,
  GridWorkbench,
  MapFrame,
  MapLoading,
  NewSlotJump,
} from '../components/ops/grid/GridWorkbench';
import { GridError, GridLoading, NoZones } from '../components/ops/grid/GridStates';
import {
  BoundaryStrip,
  GuidanceCard,
  IdleInspector,
  SurveyTips,
} from '../components/ops/grid/Guidance';
import { MapLegend } from '../components/ops/grid/MapLegend';
import { ModePalette } from '../components/ops/grid/ModePalette';
import { NewSlotForm } from '../components/ops/grid/NewSlotForm';
import type { GpsFix, GridMode, RulerInfo } from '../components/ops/grid/placement';
import { SlotPanel } from '../components/ops/grid/SlotPanel';
import {
  EmptyKerb,
  FewDataGuide,
  SlotRow,
  StatusFilterChips,
} from '../components/ops/grid/SlotRegister';
import { errorMessage, wardConfigApi, type BatchPreview, type WardSlot } from '../ward-config-api';

// The Goong/mapbox bundle (~885 kB) loads with this screen only, not with every
// ward screen (the dashboard is the ward's home page).
const SlotGridMap = lazy(() =>
  import('../components/SlotGridMap').then((m) => ({ default: m.SlotGridMap })),
);

type Mode = GridMode;

const SLOTS_PER_PAGE = 20;

/** WARD-01: the ward's slot grid on the map, plus the street features slots must keep clear of. */
export function SlotGridEditorScreen() {
  return (
    <WardGate>
      <SlotGridContent />
    </WardGate>
  );
}

function SlotGridContent() {
  const userId = useAuthStore((state) => state.user?.id);
  const client = useQueryClient();
  const zones = useQuery({ queryKey: ['ward', userId, 'zones'], queryFn: wardConfigApi.listZones });
  const [zoneFilter, setZoneFilter] = useState<number | null>(null);
  const gridKey = ['ward', userId, 'slot-grid', zoneFilter];
  const grid = useQuery({
    queryKey: gridKey,
    queryFn: () => wardConfigApi.slotGrid(zoneFilter ?? undefined),
  });
  const [mode, setMode] = useState<Mode>('slot');
  const [pins, setPins] = useState<MapPoint[]>([]);
  const [selected, setSelected] = useState<WardSlot | null>(null);
  const [preview, setPreview] = useState<BatchPreview | null>(null);
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [myLocation, setMyLocation] = useState<GpsFix | null>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkIds, setBulkIds] = useState<Set<number>>(new Set());
  const [slotQuery, setSlotQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<WardSlot['status'] | 'ALL'>('ALL');
  const [slotPage, setSlotPage] = useState(1);
  // Display only: the batch panel's measurement of its two pins, for the tape label on the map.
  const [ruler, setRuler] = useState<RulerInfo | null>(null);
  // @goongmaps/goong-map-react fires its onClick prop twice per physical tap (once for
  // its internal 'anyclick' handling, once for 'click'), so every call to onMapClick
  // below would otherwise be immediately followed by a same-point duplicate -- in batch
  // mode that silently collapses the two picked pins into one point twice in a row.
  const lastClickRef = useRef<{ point: MapPoint; at: number } | null>(null);
  const refresh = () => client.invalidateQueries({ queryKey: ['ward', userId] });

  if (zones.isPending || grid.isPending) return <GridLoading />;
  if (zones.error || grid.error)
    return (
      <GridError
        message={errorMessage(zones.error ?? grid.error)}
        onRetry={() => {
          void zones.refetch();
          void grid.refetch();
        }}
      />
    );
  if (zones.data.length === 0) return <NoZones />;

  const data = grid.data;
  const defaultZone = zoneFilter ?? zones.data[0]!.zoneId;

  /** A map tap and a GPS fix both land here, so "đứng tại chỗ bấm GPS" behaves exactly like a tap. */
  const placePin = (point: MapPoint) => {
    setPreview(null);
    if (mode === 'batch') setPins((p) => (p.length >= 2 ? [point] : [...p, point]));
    else setPins([point]);
  };
  // Drop a second call for (near enough) the same point within a short window.
  const onMapClick = (point: MapPoint) => {
    const last = lastClickRef.current;
    const now = Date.now();
    lastClickRef.current = { point, at: now };
    if (
      last &&
      now - last.at < 300 &&
      Math.abs(last.point.latitude - point.latitude) < 1e-5 &&
      Math.abs(last.point.longitude - point.longitude) < 1e-5
    ) {
      return;
    }
    if (bulkMode) return;
    placePin(point);
  };
  const switchMode = (next: Mode) => {
    setMode(next);
    setPins([]);
    setPreview(null);
    setSelected(null);
  };
  const toggleBulk = (slotId: number) =>
    setBulkIds((ids) => {
      const next = new Set(ids);
      if (next.has(slotId)) next.delete(slotId);
      else next.add(slotId);
      return next;
    });
  const exitBulk = () => {
    setBulkMode(false);
    setBulkIds(new Set());
  };
  const focusOn = (point: MapPoint) => setFocus((f) => ({ point, key: (f?.key ?? 0) + 1 }));

  const query = slotQuery.trim().toLowerCase();
  const filteredSlots = data.slots.filter(
    (s) =>
      (statusFilter === 'ALL' || s.status === statusFilter) &&
      (!query || s.slotCode.toLowerCase().includes(query)),
  );
  const totalPages = Math.max(1, Math.ceil(filteredSlots.length / SLOTS_PER_PAGE));
  const page = Math.min(slotPage, totalPages);
  const visibleSlots = filteredSlots.slice((page - 1) * SLOTS_PER_PAGE, page * SLOTS_PER_PAGE);
  const bulkSlots = data.slots.filter((s) => bulkIds.has(s.slotId));

  const guidance = bulkMode
    ? 'Chạm các ô trên bản đồ hoặc trong danh sách để chọn/bỏ chọn.'
    : mode === 'batch'
      ? pins.length === 0
        ? 'Chạm (hoặc bấm Vị trí của tôi) tại ĐIỂM ĐẦU của đoạn vỉa hè.'
        : pins.length === 1
          ? 'Đã có điểm đầu. Chạm (hoặc bấm Vị trí của tôi) tại ĐIỂM CUỐI.'
          : 'Đã chọn đoạn vỉa hè. Chạm lần nữa để chọn lại từ đầu.'
      : 'Chạm lên bản đồ để đặt vị trí.';
  const emptyGrid =
    data.slots.length === 0 && data.features.length === 0 && pins.length === 0 && !bulkMode;
  const showNewSlot = !bulkMode && mode === 'slot' && !selected && !!pins[0];

  return (
    <Screen width="wide">
      <AppHeader title="Lưới ô sạp" back subtitle="Vẽ và quản lý ô trên bản đồ" />
      <ZonePicker
        label="Khu vực"
        allLabel="Tất cả"
        zones={zones.data}
        value={zoneFilter}
        onChange={(v) => {
          setZoneFilter(v);
          setSelected(null);
          setBulkIds(new Set());
          setSlotPage(1);
        }}
      />
      {!data.boundaryConfigured && <BoundaryStrip />}

      <GridWorkbench
        palette={
          bulkMode ? (
            <p className="flex min-h-14 items-center gap-sm rounded-[16px] bg-tint-primary px-md text-body-md font-semibold text-primary ring-1 ring-primary/25">
              <Icon name="check-circle" size={22} color="currentColor" />
              Đang chọn nhiều ô: {bulkIds.size} ô đã chọn
            </p>
          ) : (
            <ModePalette value={mode} onChange={switchMode} />
          )
        }
        map={
          <>
            <MapFrame>
              {/* Overlays come first in the DOM so Tab reaches search and GPS before the map's dots. */}
              <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col items-start gap-xs p-sm md:pr-[184px]">
                <div
                  role="search"
                  aria-label="Tìm địa chỉ"
                  className="pointer-events-auto w-full max-w-[440px] rounded-[16px] bg-card/95 p-xs shadow-sheet ring-1 ring-border backdrop-blur-md"
                >
                  <AddressSearch onPick={(match) => focusOn(match)} />
                </div>
                <MapLegend slots={data.slots} features={data.features} />
              </div>
              <GpsControl
                disabled={bulkMode}
                myLocation={myLocation}
                onGps={(fix) => {
                  setMyLocation(fix);
                  focusOn(fix);
                  placePin({ latitude: fix.latitude, longitude: fix.longitude });
                }}
              />
              {emptyGrid && <EmptyMapHint text="Chạm lên bản đồ để đặt vị trí." />}
              <Suspense fallback={<MapLoading label={<LoadingState label="Đang tải bản đồ" />} />}>
                <SlotGridMap
                  slots={data.slots}
                  features={data.features}
                  selectedSlotId={selected?.slotId ?? null}
                  highlightedSlotIds={bulkMode ? bulkIds : undefined}
                  pins={pins}
                  candidates={preview?.candidates ?? []}
                  focus={focus}
                  myLocation={myLocation}
                  ruler={!bulkMode && mode === 'batch' ? ruler : null}
                  onMapClick={onMapClick}
                  onSelectSlot={(slot) => {
                    if (bulkMode) {
                      toggleBulk(slot.slotId);
                      return;
                    }
                    if (mode === 'slot') {
                      setSelected(slot);
                      setPins([]);
                    }
                  }}
                />
              </Suspense>
            </MapFrame>
            {showNewSlot && (
              <NewSlotJump latitude={pins[0]!.latitude} longitude={pins[0]!.longitude} />
            )}
          </>
        }
        inspector={
          <>
            <GuidanceCard mode={mode} bulk={bulkMode} text={guidance} />
            <SurveyTips />
            {bulkMode && (
              <BulkStatusPanel
                slots={bulkSlots}
                onDone={() => {
                  exitBulk();
                  void refresh();
                }}
                onCancel={exitBulk}
              />
            )}
            {!bulkMode && mode === 'slot' && selected && (
              <SlotPanel
                key={selected.versionToken}
                slot={selected}
                zones={zones.data}
                newPosition={selected.canEditGeometry ? (pins[0] ?? null) : null}
                onClose={() => setSelected(null)}
                onChanged={(slot) => {
                  setSelected(slot);
                  setPins([]);
                  void refresh();
                }}
              />
            )}
            {!bulkMode && mode === 'slot' && !selected && pins[0] && (
              <NewSlotForm
                point={pins[0]}
                zones={zones.data}
                defaultZoneId={defaultZone}
                onCreated={() => {
                  setPins([]);
                  void refresh();
                }}
              />
            )}
            {!bulkMode && mode === 'slot' && !selected && !pins[0] && <IdleInspector />}
            {!bulkMode && mode === 'batch' && (
              <BatchPanel
                pins={pins}
                onResetPins={() => {
                  setPins([]);
                  setPreview(null);
                }}
                zones={zones.data}
                defaultZoneId={defaultZone}
                preview={preview}
                onPreview={setPreview}
                onRuler={setRuler}
                onCreated={() => {
                  setPins([]);
                  setPreview(null);
                  void refresh();
                }}
              />
            )}
            {!bulkMode && mode === 'feature' && (
              <FeaturePanel
                point={pins[0] ?? null}
                zones={zones.data}
                defaultZoneId={defaultZone}
                features={data.features}
                onFocus={focusOn}
                onClearPoint={() => setPins([])}
                onChanged={() => {
                  setPins([]);
                  void refresh();
                }}
              />
            )}
          </>
        }
      />

      <section aria-labelledby="grid-register" className="mt-md flex flex-col gap-md">
        <div className="flex flex-wrap items-end justify-between gap-sm">
          <h2
            id="grid-register"
            className="font-heading text-[24px] font-bold leading-[1.2] tracking-[-0.015em] text-text"
          >
            {filteredSlots.length === data.slots.length
              ? `Ô trên lưới (${data.slots.length})`
              : `Ô trên lưới (${filteredSlots.length}/${data.slots.length} khớp bộ lọc)`}
          </h2>
          <Button
            label={bulkMode ? 'Thoát chọn nhiều' : 'Chọn nhiều ô'}
            variant={bulkMode ? 'ghost' : 'outline'}
            fullWidth={false}
            icon={
              <Icon
                name={bulkMode ? 'close' : 'check-circle-outline'}
                size={18}
                color="currentColor"
              />
            }
            onPress={() => {
              if (bulkMode) exitBulk();
              else {
                setBulkMode(true);
                setSelected(null);
                setPins([]);
                setPreview(null);
              }
            }}
          />
        </div>
        <div className="grid gap-sm lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)] lg:items-end lg:gap-lg">
          <div className="cq min-w-0">
            <TextField
              label="Tìm theo mã ô"
              value={slotQuery}
              onChangeText={(v) => {
                setSlotQuery(v);
                setSlotPage(1);
              }}
              placeholder="VD: NVL-05"
              maxLength={30}
            />
          </div>
          <StatusFilterChips
            slots={data.slots}
            value={statusFilter}
            onChange={(v) => {
              setStatusFilter(v);
              setSlotPage(1);
            }}
          />
        </div>
        {bulkMode && filteredSlots.length > 0 && (
          <div className="flex flex-wrap gap-sm">
            <Button
              label={`Chọn tất cả ${filteredSlots.length} ô khớp bộ lọc`}
              variant="ghost"
              fullWidth={false}
              onPress={() => setBulkIds(new Set(filteredSlots.map((s) => s.slotId)))}
            />
            <Button
              label="Bỏ chọn tất cả"
              variant="ghost"
              fullWidth={false}
              disabled={bulkIds.size === 0}
              onPress={() => setBulkIds(new Set())}
            />
          </div>
        )}
        {visibleSlots.length === 0 && <EmptyKerb text="Không có ô nào khớp bộ lọc." />}
        {visibleSlots.length > 0 && (
          <ul className="grid gap-xs lg:grid-cols-2">
            {visibleSlots.map((slot) => (
              <li key={slot.slotId} className="min-w-0">
                <SlotRow
                  slot={slot}
                  bulkMode={bulkMode}
                  checked={bulkIds.has(slot.slotId)}
                  selected={!bulkMode && selected?.slotId === slot.slotId}
                  onPress={() => {
                    focusOn(slot);
                    if (bulkMode) {
                      toggleBulk(slot.slotId);
                      return;
                    }
                    switchMode('slot');
                    setSelected(slot);
                  }}
                />
              </li>
            ))}
          </ul>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-sm">
            <Button
              label="Trang trước"
              variant="outline"
              fullWidth={false}
              icon={<Icon name="chevron-left" size={18} color="currentColor" />}
              disabled={page <= 1}
              onPress={() => setSlotPage(page - 1)}
            />
            <span className="whitespace-nowrap font-tabular text-body-md font-semibold text-text">
              Trang {page}/{totalPages}
            </span>
            <Button
              label="Trang sau"
              variant="outline"
              fullWidth={false}
              disabled={page >= totalPages}
              onPress={() => setSlotPage(page + 1)}
            />
          </div>
        )}
        {data.slots.length <= 2 && !bulkMode && <FewDataGuide />}
      </section>
    </Screen>
  );
}
