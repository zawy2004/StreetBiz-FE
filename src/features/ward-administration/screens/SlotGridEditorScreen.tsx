import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button, Card, Icon } from '@/components/common';
import { ConfirmDialog, LoadingState, showToast } from '@/components/feedback';
import { SegmentedControl, SelectField, TextField } from '@/components/forms';
import { AppHeader, Screen, Section } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { AddressSearch } from '@/features/sidewalk-slots/components/AddressSearch';
import { useAuthStore } from '@/store/auth-store';
import { colors } from '@/theme';
import { Checkbox } from '../components/ConfigFields';
import type { MapFocus, MapPoint } from '../components/SlotGridMap';
import { WardGate } from '../components/WardGate';
import {
  batchSlotCount,
  businessCategoryLabels,
  distanceMeters,
  errorMessage,
  featureTypeLabels,
  isConflict,
  MAX_BATCH_SLOTS,
  slotStatusLabels,
  wardConfigApi,
  type BatchPreview,
  type ConfigHistoryEntry,
  type PlacementCheck,
  type PlacementIssue,
  type SlotFacilities,
  type StreetFeatureType,
  type WardSlot,
  type WardStreetFeature,
  type WardZone,
} from '../ward-config-api';

// The Goong/mapbox bundle (~885 kB) loads with this screen only, not with every
// ward screen (the dashboard is the ward's home page).
const SlotGridMap = lazy(() =>
  import('../components/SlotGridMap').then((m) => ({ default: m.SlotGridMap })),
);

type Mode = 'slot' | 'batch' | 'feature';

const SLOTS_PER_PAGE = 20;

/** WARD-01: the ward's slot grid on the map, plus the street features slots must keep clear of. */
export function SlotGridEditorScreen() {
  return (
    <WardGate title="Lưới ô sạp">
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
  const [myLocation, setMyLocation] = useState<(MapPoint & { accuracy: number }) | null>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkIds, setBulkIds] = useState<Set<number>>(new Set());
  const [slotQuery, setSlotQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<WardSlot['status'] | 'ALL'>('ALL');
  const [slotPage, setSlotPage] = useState(1);
  // @goongmaps/goong-map-react fires its onClick prop twice per physical tap (once for
  // its internal 'anyclick' handling, once for 'click'), so every call to onMapClick
  // below would otherwise be immediately followed by a same-point duplicate -- in batch
  // mode that silently collapses the two picked pins into one point twice in a row.
  const lastClickRef = useRef<{ point: MapPoint; at: number } | null>(null);
  const refresh = () => client.invalidateQueries({ queryKey: ['ward', userId] });

  if (zones.isPending || grid.isPending)
    return (
      <Screen>
        <p role="status">Đang tải lưới ô…</p>
      </Screen>
    );
  if (zones.error || grid.error)
    return (
      <Screen>
        <AppHeader title="Lưới ô sạp" back />
        <p role="alert" className="text-error">
          {errorMessage(zones.error ?? grid.error)}
        </p>
        <Button
          label="Thử lại"
          onPress={() => {
            void zones.refetch();
            void grid.refetch();
          }}
        />
      </Screen>
    );
  if (zones.data.length === 0)
    return (
      <Screen>
        <AppHeader title="Lưới ô sạp" back />
        <Card>
          <p>Phường chưa có khu vực nào. Hãy tạo khu vực ở mục Giá & khung giờ trước khi vẽ ô.</p>
        </Card>
      </Screen>
    );

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

  return (
    <Screen>
      <AppHeader title="Lưới ô sạp" back subtitle="Vẽ và quản lý ô trên bản đồ" />
      {!data.boundaryConfigured && (
        <Card>
          <p className="text-body-sm text-text">
            ⚠️ Chưa cấu hình ranh giới phường chính thức, tọa độ ô sạp chỉ được ghi nhận theo vị trí
            cắm pin.
          </p>
        </Card>
      )}
      <Card>
        <p className="text-body-sm text-text">
          Bản đồ và ảnh vệ tinh chỉ để định vị gần đúng (sai số vài mét). Hãy khảo sát thực địa, đo
          bề rộng vỉa hè và chiều dài ô bằng thước, rồi đứng tại vị trí ô bấm{' '}
          <strong>Vị trí của tôi</strong> để ghi tọa độ GPS thay vì chấm tay trên ảnh.
        </p>
      </Card>

      <SelectField
        label="Khu vực"
        layout="inline"
        value={zoneFilter == null ? 'all' : String(zoneFilter)}
        onChange={(v) => {
          setZoneFilter(v === 'all' ? null : Number(v));
          setSelected(null);
          setBulkIds(new Set());
          setSlotPage(1);
        }}
        options={[
          { value: 'all', label: 'Tất cả' },
          ...zones.data.map((z) => ({ value: String(z.zoneId), label: z.zoneName })),
        ]}
      />
      {!bulkMode && (
        <SegmentedControl<Mode>
          value={mode}
          onChange={switchMode}
          options={[
            { value: 'slot', label: 'Đặt ô' },
            { value: 'batch', label: 'Rải hàng loạt' },
            { value: 'feature', label: 'Chướng ngại vật' },
          ]}
        />
      )}

      <LocationTools
        disabled={bulkMode}
        myLocation={myLocation}
        onAddress={focusOn}
        onGps={(fix) => {
          setMyLocation(fix);
          focusOn(fix);
          placePin({ latitude: fix.latitude, longitude: fix.longitude });
        }}
      />

      <p className="text-body-sm text-muted">
        {bulkMode
          ? 'Chạm các ô trên bản đồ hoặc trong danh sách để chọn/bỏ chọn.'
          : mode === 'batch'
            ? pins.length === 0
              ? 'Chạm (hoặc bấm Vị trí của tôi) tại ĐIỂM ĐẦU của đoạn vỉa hè.'
              : pins.length === 1
                ? 'Đã có điểm đầu. Chạm (hoặc bấm Vị trí của tôi) tại ĐIỂM CUỐI.'
                : 'Đã chọn đoạn vỉa hè. Chạm lần nữa để chọn lại từ đầu.'
            : 'Chạm lên bản đồ để đặt vị trí.'}{' '}
        Điểm đỏ: chướng ngại vật cấm kinh doanh; điểm vàng: chướng ngại vật khác; vòng xanh dương:
        vị trí của bạn.
      </p>

      <Suspense fallback={<LoadingState label="Đang tải bản đồ" />}>
        <SlotGridMap
          slots={data.slots}
          features={data.features}
          selectedSlotId={selected?.slotId ?? null}
          highlightedSlotIds={bulkMode ? bulkIds : undefined}
          pins={pins}
          candidates={preview?.candidates ?? []}
          focus={focus}
          myLocation={myLocation}
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

      <Section
        title={
          filteredSlots.length === data.slots.length
            ? `Ô trên lưới (${data.slots.length})`
            : `Ô trên lưới (${filteredSlots.length}/${data.slots.length} khớp bộ lọc)`
        }
        action={
          <Button
            label={bulkMode ? 'Thoát chọn nhiều' : 'Chọn nhiều ô'}
            size="sm"
            variant={bulkMode ? 'ghost' : 'outline'}
            fullWidth={false}
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
        }
      >
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
        <SelectField
          label="Trạng thái"
          layout="cards"
          value={statusFilter}
          onChange={(v) => {
            setStatusFilter(v as WardSlot['status'] | 'ALL');
            setSlotPage(1);
          }}
          options={[
            { value: 'ALL', label: 'Tất cả' },
            ...(Object.keys(slotStatusLabels) as WardSlot['status'][]).map((s) => ({
              value: s,
              label: slotStatusLabels[s],
            })),
          ]}
        />
        {bulkMode && filteredSlots.length > 0 && (
          <div className="flex flex-wrap gap-sm">
            <Button
              label={`Chọn tất cả ${filteredSlots.length} ô khớp bộ lọc`}
              size="sm"
              variant="ghost"
              fullWidth={false}
              onPress={() => setBulkIds(new Set(filteredSlots.map((s) => s.slotId)))}
            />
            <Button
              label="Bỏ chọn tất cả"
              size="sm"
              variant="ghost"
              fullWidth={false}
              disabled={bulkIds.size === 0}
              onPress={() => setBulkIds(new Set())}
            />
          </div>
        )}
        {visibleSlots.length === 0 && (
          <p className="text-body-sm text-muted">Không có ô nào khớp bộ lọc.</p>
        )}
        {visibleSlots.map((slot) => {
          const checked = bulkIds.has(slot.slotId);
          return (
            <button
              key={slot.slotId}
              type="button"
              aria-pressed={bulkMode ? checked : undefined}
              onClick={() => {
                focusOn(slot);
                if (bulkMode) {
                  toggleBulk(slot.slotId);
                  return;
                }
                switchMode('slot');
                setSelected(slot);
              }}
              className={`flex w-full items-center justify-between gap-sm rounded-sm border bg-card p-sm text-left ${
                bulkMode && checked ? 'border-primary' : 'border-border'
              }`}
            >
              <span className="flex items-center gap-sm">
                {bulkMode && (
                  <Icon
                    name={checked ? 'check-circle' : 'check-circle-outline'}
                    size={22}
                    color={checked ? colors.primary : colors.muted}
                  />
                )}
                <span>
                  <span className="text-headline-sm text-text">{slot.slotCode}</span>
                  <span className="block text-body-sm text-muted">
                    {slot.zoneName} · {slot.widthMeters ?? '?'} × {slot.lengthMeters ?? '?'} m
                    {slot.source === 'VENDOR_PROPOSED' ? ' · do hộ kinh doanh đề xuất' : ''}
                  </span>
                </span>
              </span>
              <StatusChip
                label={slotStatusLabels[slot.status]}
                tone={
                  slot.status === 'AVAILABLE'
                    ? 'ok'
                    : slot.status === 'SUSPENDED'
                      ? 'neutral'
                      : 'pending'
                }
              />
            </button>
          );
        })}
        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-sm">
            <Button
              label="Trang trước"
              size="sm"
              variant="outline"
              fullWidth={false}
              disabled={page <= 1}
              onPress={() => setSlotPage(page - 1)}
            />
            <span className="whitespace-nowrap text-body-sm text-muted">
              Trang {page}/{totalPages}
            </span>
            <Button
              label="Trang sau"
              size="sm"
              variant="outline"
              fullWidth={false}
              disabled={page >= totalPages}
              onPress={() => setSlotPage(page + 1)}
            />
          </div>
        )}
      </Section>
    </Screen>
  );
}

type GpsFix = MapPoint & { accuracy: number };

/** Metres beyond which a phone GPS fix is too loose to pin a 2 m slot on. */
const GPS_ACCURACY_WARN_METERS = 15;

/** Address search (only moves the view) and the officer's GPS fix (drops a pin, like a tap). */
function LocationTools({
  disabled,
  myLocation,
  onAddress,
  onGps,
}: {
  disabled: boolean;
  myLocation: GpsFix | null;
  onAddress: (point: MapPoint) => void;
  onGps: (fix: GpsFix) => void;
}) {
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string>();

  const locate = () => {
    if (!navigator.geolocation) {
      setLocateError('Trình duyệt không hỗ trợ định vị.');
      return;
    }
    setLocating(true);
    setLocateError(undefined);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        onGps({
          latitude: Math.round(pos.coords.latitude * 1e6) / 1e6,
          longitude: Math.round(pos.coords.longitude * 1e6) / 1e6,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => {
        setLocating(false);
        setLocateError(
          err.code === err.PERMISSION_DENIED
            ? 'Bạn chưa cho phép truy cập vị trí. Hãy bật quyền định vị cho trang này rồi thử lại.'
            : 'Không lấy được vị trí. Hãy ra chỗ thoáng (ít nhà cao tầng che) rồi thử lại, hoặc chạm vào bản đồ.',
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  return (
    <Card>
      <div className="flex flex-col gap-sm">
        <AddressSearch onPick={(match) => onAddress(match)} />
        <p className="text-body-sm text-muted">
          Tìm địa chỉ chỉ để di chuyển bản đồ tới gần khu vực, không tự đặt ô.
        </p>
        <Button
          label="Vị trí của tôi (GPS)"
          variant="outline"
          fullWidth={false}
          disabled={disabled}
          loading={locating}
          icon={<Icon name="crosshairs-gps" size={18} color={colors.primary} />}
          onPress={locate}
        />
        {locateError && (
          <p role="alert" className="text-body-sm text-error">
            {locateError}
          </p>
        )}
        {myLocation && (
          <p
            className={`text-body-sm ${myLocation.accuracy > GPS_ACCURACY_WARN_METERS ? 'text-error' : 'text-muted'}`}
            aria-live="polite"
          >
            GPS: {myLocation.latitude.toFixed(6)}, {myLocation.longitude.toFixed(6)} · sai số khoảng{' '}
            {Math.round(myLocation.accuracy)} m
            {myLocation.accuracy > GPS_ACCURACY_WARN_METERS &&
              ' — sai số lớn, hãy chờ vài giây ở chỗ thoáng rồi bấm lại trước khi lưu ô.'}
          </p>
        )}
      </div>
    </Card>
  );
}

/**
 * Suspend or reopen several slots at once, e.g. a whole kerb stretch closed for roadworks.
 * Runs the ordinary one-slot status change per slot, so each keeps its own version check,
 * audit entry and the backend's rules (no open application, no contract).
 */
function BulkStatusPanel({
  slots,
  onDone,
  onCancel,
}: {
  slots: WardSlot[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState('');
  const [failures, setFailures] = useState<{ slotCode: string; message: string }[]>([]);
  const suspendable = slots.filter((s) => s.status === 'AVAILABLE');
  const reopenable = slots.filter((s) => s.status === 'SUSPENDED');
  const skipped = slots.length - suspendable.length - reopenable.length;

  const run = useMutation({
    mutationFn: async (target: 'SUSPENDED' | 'AVAILABLE') => {
      const batch = target === 'SUSPENDED' ? suspendable : reopenable;
      const failed: { slotCode: string; message: string }[] = [];
      for (const slot of batch) {
        try {
          await wardConfigApi.setSlotStatus(slot, target, reason.trim());
        } catch (error) {
          failed.push({ slotCode: slot.slotCode, message: errorMessage(error) });
        }
      }
      return { done: batch.length - failed.length, failed };
    },
    onSuccess: ({ done, failed }) => {
      setFailures(failed);
      showToast(
        failed.length
          ? `Đã đổi ${done} ô, ${failed.length} ô không đổi được (xem chi tiết).`
          : `Đã đổi trạng thái ${done} ô.`,
      );
      if (failed.length === 0) onDone();
    },
  });

  return (
    <Section
      title={`Đã chọn ${slots.length} ô`}
      action={<Button label="Hủy" size="sm" variant="ghost" fullWidth={false} onPress={onCancel} />}
    >
      <Card>
        <div className="flex flex-col gap-sm">
          <p className="text-body-sm text-muted">
            {suspendable.length} ô đang Trống có thể tạm ngưng, {reopenable.length} ô đang Tạm ngưng
            có thể mở lại.
            {skipped > 0 &&
              ` ${skipped} ô đang có đơn hoặc hợp đồng sẽ được bỏ qua: xử lý đơn ở Hộp duyệt, hoặc đình chỉ giấy phép ở Tuần tra.`}
          </p>
          <TextField
            label="Lý do (áp dụng cho tất cả ô đã chọn)"
            value={reason}
            onChangeText={setReason}
            maxLength={500}
            multiline
            placeholder="VD: Thi công vỉa hè đoạn Nút giao Hoàng Diệu đến 30/10"
          />
          <div className="flex flex-wrap gap-sm">
            <Button
              label={`Tạm ngưng ${suspendable.length} ô`}
              variant="outline"
              fullWidth={false}
              disabled={suspendable.length === 0 || !reason.trim() || run.isPending}
              loading={run.isPending && run.variables === 'SUSPENDED'}
              onPress={() => run.mutate('SUSPENDED')}
            />
            <Button
              label={`Mở lại ${reopenable.length} ô`}
              variant="outline"
              fullWidth={false}
              disabled={reopenable.length === 0 || !reason.trim() || run.isPending}
              loading={run.isPending && run.variables === 'AVAILABLE'}
              onPress={() => run.mutate('AVAILABLE')}
            />
          </div>
          {failures.length > 0 && (
            <ul className="flex flex-col gap-xs" aria-live="polite">
              {failures.map((f) => (
                <li key={f.slotCode} className="text-body-sm text-error">
                  {f.slotCode}: {f.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </Section>
  );
}

function IssueList({ check }: { check: PlacementCheck | undefined }) {
  if (!check) return null;
  if (check.issues.length === 0)
    return <p className="text-body-sm text-tertiary">✓ Vị trí hợp lệ.</p>;
  return (
    <ul className="flex flex-col gap-xs" aria-live="polite">
      {check.issues.map((issue, i) => (
        <li
          key={i}
          className={`text-body-sm ${issue.severity === 'BLOCK' ? 'text-error' : 'text-text'}`}
        >
          {issue.severity === 'BLOCK' ? '⛔' : '⚠️'} {issue.message}
        </li>
      ))}
    </ul>
  );
}

function hasBlock(issues: PlacementIssue[]) {
  return issues.some((i) => i.severity === 'BLOCK');
}

function WarningAck({
  issues,
  ack,
  reason,
  onAck,
  onReason,
}: {
  issues: PlacementIssue[];
  ack: boolean;
  reason: string;
  onAck: (v: boolean) => void;
  onReason: (v: string) => void;
}) {
  if (issues.length === 0 || hasBlock(issues)) return null;
  return (
    <>
      <Checkbox label="Tôi đã xem cảnh báo và vẫn muốn lưu" checked={ack} onChange={onAck} />
      {ack && (
        <TextField
          label="Lý do bỏ qua cảnh báo"
          value={reason}
          onChangeText={onReason}
          maxLength={500}
          multiline
        />
      )}
    </>
  );
}

function FacilitiesFields({
  value,
  onChange,
}: {
  value: SlotFacilities;
  onChange: (v: SlotFacilities) => void;
}) {
  return (
    <>
      <div className="flex flex-wrap gap-md">
        <Checkbox
          label="Có điện"
          checked={value.hasPower}
          onChange={(v) => onChange({ ...value, hasPower: v })}
        />
        <Checkbox
          label="Có nước"
          checked={value.hasWater}
          onChange={(v) => onChange({ ...value, hasWater: v })}
        />
        <Checkbox
          label="Có thùng rác"
          checked={value.hasTrashBin}
          onChange={(v) => onChange({ ...value, hasTrashBin: v })}
        />
      </div>
      <SelectField
        label="Ngành hàng gợi ý (không bắt buộc)"
        layout="inline"
        value={value.businessCategory ?? 'NONE'}
        onChange={(v) => onChange({ ...value, businessCategory: v === 'NONE' ? null : v })}
        options={[
          { value: 'NONE', label: 'Không' },
          ...Object.entries(businessCategoryLabels).map(([k, label]) => ({ value: k, label })),
        ]}
      />
    </>
  );
}

const sizeValue = (text: string) => {
  const n = Number(text.replace(',', '.'));
  return Number.isFinite(n) && n > 0 && n <= 999.99 ? n : null;
};

function usePlacementCheck(
  zoneId: number,
  point: MapPoint | null,
  width: number | null,
  length: number | null,
  ignoreSlotId?: number,
) {
  const userId = useAuthStore((state) => state.user?.id);
  return useQuery({
    queryKey: [
      'ward',
      userId,
      'placement',
      zoneId,
      point?.latitude,
      point?.longitude,
      width,
      length,
      ignoreSlotId,
    ],
    queryFn: () =>
      wardConfigApi.checkPlacement(
        {
          zoneId,
          latitude: point!.latitude,
          longitude: point!.longitude,
          widthMeters: width!,
          lengthMeters: length!,
        },
        ignoreSlotId,
      ),
    enabled: !!point && width != null && length != null,
  });
}

function ZoneSelect({
  zones,
  value,
  onChange,
}: {
  zones: WardZone[];
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <SelectField
      label="Thuộc khu vực"
      layout="inline"
      value={String(value)}
      onChange={(v) => onChange(Number(v))}
      options={zones.map((z) => ({ value: String(z.zoneId), label: z.zoneName }))}
    />
  );
}

function NewSlotForm({
  point,
  zones,
  defaultZoneId,
  onCreated,
}: {
  point: MapPoint;
  zones: WardZone[];
  defaultZoneId: number;
  onCreated: () => void;
}) {
  const [zoneId, setZoneId] = useState(defaultZoneId);
  const [width, setWidth] = useState('2');
  const [length, setLength] = useState('2');
  const [code, setCode] = useState('');
  const [facilities, setFacilities] = useState<SlotFacilities>({
    hasPower: false,
    hasWater: false,
    hasTrashBin: false,
    businessCategory: null,
  });
  const [ack, setAck] = useState(false);
  const [reason, setReason] = useState('');
  const w = sizeValue(width);
  const l = sizeValue(length);
  const check = usePlacementCheck(zoneId, point, w, l);
  useEffect(() => setAck(false), [check.data]);

  const issues = check.data?.issues ?? [];
  const canSave =
    w != null &&
    l != null &&
    check.data &&
    !hasBlock(issues) &&
    (issues.length === 0 || (ack && reason.trim()));
  const create = useMutation({
    mutationFn: () =>
      wardConfigApi.createSlot({
        zoneId,
        latitude: point.latitude,
        longitude: point.longitude,
        widthMeters: w!,
        lengthMeters: l!,
        slotCode: code.trim() || null,
        ...facilities,
        acknowledgeWarnings: issues.length > 0,
        warningReason: issues.length > 0 ? reason.trim() : null,
      }),
    onSuccess: (result) => {
      showToast(`Đã thêm ô ${result.slot.slotCode}`);
      onCreated();
    },
    onError: (error) => showToast(errorMessage(error)),
  });

  return (
    <Section title="Ô mới">
      <Card>
        <div className="flex flex-col gap-sm">
          <p className="text-body-sm text-muted">
            Vị trí: {point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}
          </p>
          <ZoneSelect zones={zones} value={zoneId} onChange={setZoneId} />
          <div className="grid grid-cols-2 gap-sm">
            <TextField
              label="Rộng (m)"
              value={width}
              onChangeText={setWidth}
              keyboardType="numeric"
              error={w == null ? 'Từ 0 đến 999,99 m' : undefined}
            />
            <TextField
              label="Dài (m)"
              value={length}
              onChangeText={setLength}
              keyboardType="numeric"
              error={l == null ? 'Từ 0 đến 999,99 m' : undefined}
            />
          </div>
          <TextField
            label="Mã ô (để trống để hệ thống tự đặt)"
            value={code}
            onChangeText={setCode}
            maxLength={30}
          />
          <FacilitiesFields value={facilities} onChange={setFacilities} />
          {check.isFetching && (
            <p role="status" className="text-body-sm">
              Đang kiểm tra vị trí…
            </p>
          )}
          {check.error && (
            <p role="alert" className="text-error">
              {errorMessage(check.error)}
            </p>
          )}
          <IssueList check={check.data} />
          <WarningAck
            issues={issues}
            ack={ack}
            reason={reason}
            onAck={setAck}
            onReason={setReason}
          />
          <Button
            label="Thêm ô"
            variant="approve"
            disabled={!canSave}
            loading={create.isPending}
            onPress={() => create.mutate()}
          />
        </div>
      </Card>
    </Section>
  );
}

function SlotPanel({
  slot,
  zones,
  newPosition,
  onClose,
  onChanged,
}: {
  slot: WardSlot;
  zones: WardZone[];
  newPosition: MapPoint | null;
  onClose: () => void;
  onChanged: (slot: WardSlot) => void;
}) {
  const client = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);
  const readOnly = slot.source === 'VENDOR_PROPOSED';
  const [zoneId, setZoneId] = useState(slot.zoneId);
  const [width, setWidth] = useState(String(slot.widthMeters ?? 2));
  const [length, setLength] = useState(String(slot.lengthMeters ?? 2));
  const [code, setCode] = useState(slot.slotCode);
  const [facilities, setFacilities] = useState<SlotFacilities>({
    hasPower: slot.hasPower,
    hasWater: slot.hasWater,
    hasTrashBin: slot.hasTrashBin,
    businessCategory: slot.businessCategory,
  });
  const [ack, setAck] = useState(false);
  const [reason, setReason] = useState('');
  const [statusReason, setStatusReason] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const w = sizeValue(width);
  const l = sizeValue(length);
  const position = newPosition ?? { latitude: slot.latitude, longitude: slot.longitude };
  const geometryChanged =
    !!newPosition ||
    zoneId !== slot.zoneId ||
    w !== slot.widthMeters ||
    l !== slot.lengthMeters ||
    code.trim() !== slot.slotCode;
  const check = usePlacementCheck(zoneId, geometryChanged ? position : null, w, l, slot.slotId);
  const issues = geometryChanged ? (check.data?.issues ?? []) : [];
  const onError = (error: unknown) => {
    showToast(errorMessage(error));
    if (isConflict(error)) void client.invalidateQueries({ queryKey: ['ward', userId] });
  };

  const save = useMutation({
    mutationFn: () =>
      wardConfigApi.updateSlot(slot, {
        zoneId,
        latitude: position.latitude,
        longitude: position.longitude,
        widthMeters: w!,
        lengthMeters: l!,
        slotCode: code.trim(),
        ...facilities,
        acknowledgeWarnings: issues.length > 0,
        warningReason: issues.length > 0 ? reason.trim() : null,
      }),
    onSuccess: (result) => {
      showToast('Đã lưu ô');
      onChanged(result.slot);
    },
    onError,
  });
  const status = useMutation({
    mutationFn: (next: 'AVAILABLE' | 'SUSPENDED') =>
      wardConfigApi.setSlotStatus(slot, next, statusReason.trim()),
    onSuccess: (updated) => {
      showToast('Đã đổi trạng thái ô');
      setStatusReason('');
      onChanged(updated);
    },
    onError,
  });
  const remove = useMutation({
    mutationFn: () => wardConfigApi.deleteSlot(slot),
    onSuccess: () => {
      showToast('Đã xóa ô');
      void client.invalidateQueries({ queryKey: ['ward', userId] });
      onClose();
    },
    onError,
  });

  const canSave =
    !readOnly &&
    w != null &&
    l != null &&
    code.trim() &&
    (!geometryChanged || (check.data && !hasBlock(issues))) &&
    (issues.length === 0 || (ack && reason.trim()));
  const canToggle = slot.status === 'AVAILABLE' || slot.status === 'SUSPENDED';

  return (
    <Section
      title={`Ô ${slot.slotCode}`}
      action={<Button label="Đóng" size="sm" variant="ghost" fullWidth={false} onPress={onClose} />}
    >
      <Card>
        <div className="flex flex-col gap-sm">
          <StatusChip
            label={slotStatusLabels[slot.status]}
            tone={slot.status === 'AVAILABLE' ? 'ok' : 'pending'}
          />
          {readOnly && (
            <p className="text-body-sm text-muted">
              Ô do hộ kinh doanh đề xuất, được xử lý ở luồng duyệt đề xuất và không sửa tại đây.
            </p>
          )}
          {!readOnly && !slot.canEditGeometry && (
            <p className="text-body-sm text-muted">
              Ô không ở trạng thái Trống nên chỉ sửa được tiện ích và ngành hàng.
            </p>
          )}
          {slot.canEditGeometry && (
            <>
              <p className="text-body-sm text-muted">
                Chạm bản đồ để dời ô. {newPosition ? 'Đã chọn vị trí mới.' : ''}
              </p>
              <TextField label="Mã ô" value={code} onChangeText={setCode} maxLength={30} />
              <ZoneSelect zones={zones} value={zoneId} onChange={setZoneId} />
              <div className="grid grid-cols-2 gap-sm">
                <TextField
                  label="Rộng (m)"
                  value={width}
                  onChangeText={setWidth}
                  keyboardType="numeric"
                />
                <TextField
                  label="Dài (m)"
                  value={length}
                  onChangeText={setLength}
                  keyboardType="numeric"
                />
              </div>
            </>
          )}
          {!readOnly && <FacilitiesFields value={facilities} onChange={setFacilities} />}
          {geometryChanged && <IssueList check={check.data} />}
          <WarningAck
            issues={issues}
            ack={ack}
            reason={reason}
            onAck={setAck}
            onReason={setReason}
          />
          {!readOnly && (
            <Button
              label="Lưu ô"
              variant="approve"
              disabled={!canSave}
              loading={save.isPending}
              onPress={() => save.mutate()}
            />
          )}

          {canToggle && (
            <div className="flex flex-col gap-sm border-t border-border pt-sm">
              <TextField
                label={slot.status === 'AVAILABLE' ? 'Lý do tạm ngưng' : 'Lý do mở lại'}
                value={statusReason}
                onChangeText={setStatusReason}
                maxLength={500}
              />
              <Button
                label={slot.status === 'AVAILABLE' ? 'Tạm ngưng ô' : 'Mở lại ô'}
                variant="outline"
                disabled={!statusReason.trim()}
                loading={status.isPending}
                onPress={() =>
                  status.mutate(slot.status === 'AVAILABLE' ? 'SUSPENDED' : 'AVAILABLE')
                }
              />
            </div>
          )}
          {slot.status === 'PENDING_APPLICATION' && (
            <p className="border-t border-border pt-sm text-body-sm text-muted">
              Ô đang có đơn thuê chờ xử lý nên chưa tạm ngưng được. Hãy duyệt hoặc từ chối đơn ở Hộp
              duyệt trước; hệ thống không tự hủy đơn của hộ kinh doanh.
            </p>
          )}
          {slot.status === 'ACTIVE' && (
            <p className="border-t border-border pt-sm text-body-sm text-muted">
              Ô đang có hợp đồng. Muốn dừng kinh doanh tại ô này, hãy đình chỉ hoặc thu hồi giấy
              phép ở mục Tuần tra để hộ kinh doanh được thông báo và có căn cứ.
            </p>
          )}
          {slot.canHardDelete ? (
            <Button label="Xóa ô" variant="danger" onPress={() => setConfirmDelete(true)} />
          ) : (
            !readOnly && (
              <p className="text-body-sm text-muted">
                Ô đã có lịch sử (đơn, hợp đồng, vi phạm…) nên không xóa được; dùng Tạm ngưng.
              </p>
            )
          )}

          <Button
            label={showHistory ? 'Ẩn lịch sử thay đổi' : 'Lịch sử thay đổi'}
            size="sm"
            variant="ghost"
            fullWidth={false}
            icon={<Icon name="history" size={18} color={colors.text} />}
            onPress={() => setShowHistory(!showHistory)}
          />
          {showHistory && <SlotHistory slotId={slot.slotId} zones={zones} />}
        </div>
      </Card>
      <ConfirmDialog
        visible={confirmDelete}
        title={`Xóa ô ${slot.slotCode}?`}
        description="Chỉ xóa ô vẽ nhầm, chưa từng phát sinh giao dịch."
        confirmLabel="Xóa"
        confirmVariant="danger"
        onConfirm={() => {
          setConfirmDelete(false);
          remove.mutate();
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </Section>
  );
}

const slotHistoryLabels: Record<string, string> = {
  SLOT_CREATED: 'Tạo ô',
  SLOT_UPDATED: 'Cập nhật ô',
  SLOT_STATUS_CHANGED: 'Đổi trạng thái',
  SLOT_DELETED: 'Xóa ô',
};

type SlotAuditSnapshot = {
  slotCode?: string;
  zoneId?: number;
  latitude?: number;
  longitude?: number;
  widthMeters?: number | null;
  lengthMeters?: number | null;
  status?: WardSlot['status'];
  hasPower?: boolean;
  hasWater?: boolean;
  hasTrashBin?: boolean;
  businessCategory?: string | null;
};
type SlotAuditDetails = {
  before?: SlotAuditSnapshot | null;
  after?: SlotAuditSnapshot | null;
  reason?: string | null;
};

function parseSlotDetails(raw: string | null): SlotAuditDetails | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SlotAuditDetails;
  } catch {
    return null;
  }
}

const yesNo = (v: boolean | undefined) => (v ? 'có' : 'không');

/** Human-readable list of what an update changed, from the before/after snapshots the backend audits. */
function describeSlotChanges(details: SlotAuditDetails, zones: WardZone[]): string[] {
  const b = details.before;
  const a = details.after;
  if (!b || !a) return [];
  const zoneName = (id: number | undefined) => zones.find((z) => z.zoneId === id)?.zoneName ?? `#${id}`;
  const changes: string[] = [];
  if (b.status !== undefined && a.status !== undefined && b.status !== a.status)
    changes.push(`${slotStatusLabels[b.status]} → ${slotStatusLabels[a.status]}`);
  if (b.slotCode !== undefined && b.slotCode !== a.slotCode) changes.push(`Mã ${b.slotCode} → ${a.slotCode}`);
  if (b.zoneId !== undefined && b.zoneId !== a.zoneId)
    changes.push(`Khu vực ${zoneName(b.zoneId)} → ${zoneName(a.zoneId)}`);
  if (
    b.latitude !== undefined &&
    a.latitude !== undefined &&
    b.longitude !== undefined &&
    a.longitude !== undefined &&
    (b.latitude !== a.latitude || b.longitude !== a.longitude)
  ) {
    const moved = distanceMeters(
      { latitude: b.latitude, longitude: b.longitude },
      { latitude: a.latitude, longitude: a.longitude },
    );
    changes.push(`Dời vị trí ~${moved < 1 ? moved.toFixed(1) : Math.round(moved)} m`);
  }
  if (b.widthMeters !== a.widthMeters || b.lengthMeters !== a.lengthMeters)
    changes.push(`Kích thước ${b.widthMeters ?? '?'}×${b.lengthMeters ?? '?'} → ${a.widthMeters ?? '?'}×${a.lengthMeters ?? '?'} m`);
  if (b.hasPower !== a.hasPower) changes.push(`Điện: ${yesNo(b.hasPower)} → ${yesNo(a.hasPower)}`);
  if (b.hasWater !== a.hasWater) changes.push(`Nước: ${yesNo(b.hasWater)} → ${yesNo(a.hasWater)}`);
  if (b.hasTrashBin !== a.hasTrashBin) changes.push(`Thùng rác: ${yesNo(b.hasTrashBin)} → ${yesNo(a.hasTrashBin)}`);
  if (b.businessCategory !== a.businessCategory) {
    const label = (c: string | null | undefined) => (c ? (businessCategoryLabels[c] ?? c) : 'không');
    changes.push(`Ngành hàng: ${label(b.businessCategory)} → ${label(a.businessCategory)}`);
  }
  return changes;
}

function SlotHistory({ slotId, zones }: { slotId: number; zones: WardZone[] }) {
  const userId = useAuthStore((state) => state.user?.id);
  const history = useQuery({
    queryKey: ['ward', userId, 'slot-history', slotId],
    queryFn: () => wardConfigApi.slotHistory(slotId),
  });
  if (history.isPending) return <p role="status">Đang tải lịch sử…</p>;
  if (history.error)
    return (
      <p role="alert" className="text-error">
        {errorMessage(history.error)}
      </p>
    );
  if (history.data.length === 0)
    return (
      <p className="text-body-sm text-muted">
        Chưa có thay đổi nào được ghi nhận riêng cho ô này. Ô tạo bằng "Rải hàng loạt" được ghi
        trong lịch sử của khu vực (mục Giá & khung giờ).
      </p>
    );
  return (
    <ol className="flex flex-col gap-sm border-t border-border pt-sm">
      {history.data.map((entry: ConfigHistoryEntry) => {
        const details = parseSlotDetails(entry.details);
        const changes = details ? describeSlotChanges(details, zones) : [];
        return (
          <li key={entry.auditId} className="text-body-sm">
            <strong>{slotHistoryLabels[entry.action] ?? entry.action}</strong> · {entry.actorName} ·{' '}
            {new Date(entry.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
            {changes.length > 0 && (
              <ul className="ml-md list-disc text-muted">
                {changes.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            )}
            {details?.reason && <p className="text-muted">Lý do: {details.reason}</p>}
          </li>
        );
      })}
    </ol>
  );
}

function BatchPanel({
  pins,
  onResetPins,
  zones,
  defaultZoneId,
  preview,
  onPreview,
  onCreated,
}: {
  pins: MapPoint[];
  onResetPins: () => void;
  zones: WardZone[];
  defaultZoneId: number;
  preview: BatchPreview | null;
  onPreview: (p: BatchPreview | null) => void;
  onCreated: () => void;
}) {
  const [zoneId, setZoneId] = useState(defaultZoneId);
  const [width, setWidth] = useState('1.5');
  const [length, setLength] = useState('2');
  const [gap, setGap] = useState('1');
  const [facilities, setFacilities] = useState<SlotFacilities>({
    hasPower: false,
    hasWater: false,
    hasTrashBin: false,
    businessCategory: null,
  });
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const [ack, setAck] = useState(false);
  const [reason, setReason] = useState('');
  const w = sizeValue(width);
  const l = sizeValue(length);
  const g = Number(gap.replace(',', '.'));
  const gapValid = Number.isFinite(g) && g >= 0 && g <= 100;
  const segment = pins.length === 2 ? distanceMeters(pins[0]!, pins[1]!) : null;
  const estimate = segment != null && l != null && gapValid ? batchSlotCount(segment, l, g) : null;
  const tooShort = segment != null && l != null && segment < l;

  // A preview is only valid for the size, spacing and zone it was computed with; creating
  // from a stale one would lay slots of the new size on the old spacing.
  useEffect(() => {
    onPreview(null);
  }, [zoneId, w, l, g, onPreview]);

  const run = useMutation({
    mutationFn: () =>
      wardConfigApi.previewBatch({
        zoneId,
        startLatitude: pins[0]!.latitude,
        startLongitude: pins[0]!.longitude,
        endLatitude: pins[1]!.latitude,
        endLongitude: pins[1]!.longitude,
        widthMeters: w!,
        lengthMeters: l!,
        gapMeters: g,
      }),
    onSuccess: (data) => {
      onPreview(data);
      setExcluded(new Set(data.candidates.filter((c) => hasBlock(c.issues)).map((c) => c.index)));
      setAck(false);
    },
    onError: (error) => showToast(errorMessage(error)),
  });
  const chosen = preview?.candidates.filter((c) => !excluded.has(c.index)) ?? [];
  const warned = chosen.some((c) => c.issues.length > 0);
  const create = useMutation({
    mutationFn: () =>
      wardConfigApi.createBatch({
        zoneId,
        positions: chosen.map((c) => ({ latitude: c.latitude, longitude: c.longitude })),
        widthMeters: w!,
        lengthMeters: l!,
        ...facilities,
        acknowledgeWarnings: warned,
        warningReason: warned ? reason.trim() : null,
      }),
    onSuccess: (slots) => {
      showToast(`Đã tạo ${slots.length} ô`);
      onCreated();
    },
    onError: (error) => showToast(errorMessage(error)),
  });

  return (
    <Section title="Rải ô hàng loạt">
      <Card>
        <div className="flex flex-col gap-sm">
          <div className="flex flex-wrap items-center justify-between gap-sm">
            <p className="text-body-sm text-muted">
              {pins.length < 2 ? `Đã chọn ${pins.length}/2 điểm.` : 'Đã chọn đoạn vỉa hè.'} Tối đa{' '}
              {MAX_BATCH_SLOTS} ô mỗi lần.
            </p>
            {pins.length > 0 && (
              <Button
                label="Chọn lại đoạn"
                size="sm"
                variant="ghost"
                fullWidth={false}
                onPress={onResetPins}
              />
            )}
          </div>
          {segment != null && (
            <p
              className={`text-body-md ${tooShort ? 'text-error' : 'text-text'}`}
              aria-live="polite"
            >
              Đoạn dài khoảng <strong>{segment < 10 ? segment.toFixed(1) : Math.round(segment)} m</strong>
              {tooShort
                ? ` — ngắn hơn chiều dài một ô (${l} m). Hãy chọn điểm cuối xa hơn hoặc giảm chiều dài ô.`
                : estimate != null
                  ? ` → rải được khoảng ${estimate} ô${estimate === MAX_BATCH_SLOTS ? ' (đã chạm giới hạn, phần còn lại rải ở lượt sau)' : ''}.`
                  : '.'}
            </p>
          )}
          <ZoneSelect zones={zones} value={zoneId} onChange={setZoneId} />
          <div className="grid grid-cols-3 gap-sm">
            <TextField
              label="Rộng (m)"
              value={width}
              onChangeText={setWidth}
              keyboardType="numeric"
            />
            <TextField
              label="Dài (m)"
              value={length}
              onChangeText={setLength}
              keyboardType="numeric"
            />
            <TextField
              label="Khoảng cách (m)"
              value={gap}
              onChangeText={setGap}
              keyboardType="numeric"
            />
          </div>
          <FacilitiesFields value={facilities} onChange={setFacilities} />
          <Button
            label="Xem trước"
            variant="outline"
            disabled={pins.length < 2 || w == null || l == null || !gapValid || tooShort}
            loading={run.isPending}
            onPress={() => run.mutate()}
          />
          {preview && (
            <>
              <p className="text-body-sm">
                {preview.candidates.length} vị trí đề xuất, chọn {chosen.length} ô để tạo.
              </p>
              <ul className="flex max-h-72 flex-col gap-xs overflow-auto">
                {preview.candidates.map((c) => {
                  const blocked = hasBlock(c.issues);
                  return (
                    <li key={c.index} className="rounded-sm border border-border p-xs">
                      <Checkbox
                        label={`${c.proposedCode}${blocked ? ' · bị chặn' : c.issues.length ? ' · có cảnh báo' : ''}`}
                        checked={!excluded.has(c.index)}
                        disabled={blocked}
                        onChange={(on) =>
                          setExcluded((s) => {
                            const n = new Set(s);
                            if (on) n.delete(c.index);
                            else n.add(c.index);
                            return n;
                          })
                        }
                      />
                      {c.issues.map((issue, i) => (
                        <p key={i} className="text-body-sm text-muted">
                          {issue.message}
                        </p>
                      ))}
                    </li>
                  );
                })}
              </ul>
              {warned && (
                <>
                  <Checkbox
                    label="Tôi đã xem các cảnh báo và vẫn muốn tạo"
                    checked={ack}
                    onChange={setAck}
                  />
                  {ack && (
                    <TextField
                      label="Lý do bỏ qua cảnh báo"
                      value={reason}
                      onChangeText={setReason}
                      maxLength={500}
                      multiline
                    />
                  )}
                </>
              )}
              <Button
                label={`Tạo ${chosen.length} ô`}
                variant="approve"
                disabled={chosen.length === 0 || (warned && (!ack || !reason.trim()))}
                loading={create.isPending}
                onPress={() => create.mutate()}
              />
            </>
          )}
        </div>
      </Card>
    </Section>
  );
}

function FeaturePanel({
  point,
  zones,
  defaultZoneId,
  features,
  onFocus,
  onClearPoint,
  onChanged,
}: {
  point: MapPoint | null;
  zones: WardZone[];
  defaultZoneId: number;
  features: WardStreetFeature[];
  onFocus: (point: MapPoint) => void;
  onClearPoint: () => void;
  onChanged: () => void;
}) {
  const client = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);
  const [editing, setEditing] = useState<WardStreetFeature | null>(null);
  const [zoneId, setZoneId] = useState(defaultZoneId);
  const [type, setType] = useState<StreetFeatureType>('HYDRANT');
  const [label, setLabel] = useState('');
  const [blocks, setBlocks] = useState(true);
  const [note, setNote] = useState('');
  const [toDelete, setToDelete] = useState<WardStreetFeature | null>(null);

  const resetForm = () => {
    onClearPoint();
    setEditing(null);
    setZoneId(defaultZoneId);
    setType('HYDRANT');
    setLabel('');
    setBlocks(true);
    setNote('');
  };
  const startEdit = (f: WardStreetFeature) => {
    // A tap made before choosing "Sửa" must not silently become the feature's new position.
    onClearPoint();
    setEditing(f);
    setZoneId(f.zoneId);
    setType(f.featureType);
    setLabel(f.label);
    setBlocks(f.blocksBusiness);
    setNote(f.note ?? '');
    onFocus(f);
  };
  // Editing keeps the stored position unless the officer taps a new one on the map.
  const position = point ?? (editing ? { latitude: editing.latitude, longitude: editing.longitude } : null);
  const affectedToast = (count: number, verb: string) =>
    count
      ? `${verb}. Lưu ý ${count} ô hiện có nằm quá gần chướng ngại vật này — xem lại các ô đó.`
      : `${verb} chướng ngại vật`;
  const onMutationError = (error: unknown) => {
    showToast(errorMessage(error));
    if (isConflict(error)) void client.invalidateQueries({ queryKey: ['ward', userId] });
  };
  const input = () => ({
    zoneId,
    featureType: type,
    label: label.trim(),
    latitude: position!.latitude,
    longitude: position!.longitude,
    blocksBusiness: blocks,
    note: note.trim() || null,
  });

  const create = useMutation({
    mutationFn: () => wardConfigApi.createFeature(input()),
    onSuccess: (result) => {
      showToast(affectedToast(result.affectedSlots.length, 'Đã thêm'));
      resetForm();
      onChanged();
    },
    onError: onMutationError,
  });
  const update = useMutation({
    mutationFn: () => wardConfigApi.updateFeature(editing!, input()),
    onSuccess: (result) => {
      showToast(affectedToast(result.affectedSlots.length, 'Đã lưu'));
      resetForm();
      onChanged();
    },
    onError: onMutationError,
  });
  const remove = useMutation({
    mutationFn: (feature: WardStreetFeature) => wardConfigApi.deleteFeature(feature),
    onSuccess: (_, feature) => {
      showToast('Đã xóa chướng ngại vật');
      if (editing?.featureId === feature.featureId) resetForm();
      onChanged();
    },
    onError: onMutationError,
  });

  return (
    <Section
      title={editing ? `Sửa chướng ngại vật: ${editing.label}` : 'Thêm chướng ngại vật'}
      action={
        editing ? (
          <Button label="Hủy sửa" size="sm" variant="ghost" fullWidth={false} onPress={resetForm} />
        ) : undefined
      }
    >
      <Card>
        <div className="flex flex-col gap-sm">
          {!editing && !point && (
            <p className="text-body-sm text-muted">Chạm bản đồ để chọn vị trí chướng ngại vật.</p>
          )}
          {editing && (
            <p className="text-body-sm text-muted">
              {point
                ? 'Đã chọn vị trí mới trên bản đồ; bấm Lưu để dời chướng ngại vật tới đó.'
                : 'Giữ nguyên vị trí cũ. Chạm bản đồ nếu muốn dời chướng ngại vật.'}
            </p>
          )}
          <ZoneSelect zones={zones} value={zoneId} onChange={setZoneId} />
          <SelectField
            label="Loại"
            layout="inline"
            value={type}
            onChange={setType}
            options={(Object.keys(featureTypeLabels) as StreetFeatureType[]).map((k) => ({
              value: k,
              label: featureTypeLabels[k],
            }))}
          />
          <TextField
            label="Tên / mô tả ngắn"
            value={label}
            onChangeText={setLabel}
            maxLength={150}
          />
          <Checkbox label="Cấm đặt ô sạp đè lên vị trí này" checked={blocks} onChange={setBlocks} />
          <TextField label="Ghi chú" value={note} onChangeText={setNote} maxLength={200} />
          {editing ? (
            <Button
              label="Lưu thay đổi"
              variant="approve"
              disabled={!position || !label.trim()}
              loading={update.isPending}
              onPress={() => update.mutate()}
            />
          ) : (
            <Button
              label="Thêm chướng ngại vật"
              variant="approve"
              disabled={!position || !label.trim()}
              loading={create.isPending}
              onPress={() => create.mutate()}
            />
          )}
        </div>
      </Card>
      {features.length > 0 && (
        <p className="text-label text-text">Chướng ngại vật hiện có ({features.length})</p>
      )}
      {features.map((f) => (
        <Card key={f.featureId}>
          <div className="flex flex-wrap items-center justify-between gap-sm">
            <button type="button" className="min-w-0 text-left" onClick={() => onFocus(f)}>
              <span className="text-body-md text-text">{f.label}</span>
              <span className="block text-body-sm text-muted">
                {featureTypeLabels[f.featureType]}
                {f.blocksBusiness ? ' · cấm kinh doanh' : ''}
                {f.clearanceMeters ? ` · khoảng cách cấu hình ${f.clearanceMeters} m` : ''}
                {f.note ? ` · ${f.note}` : ''}
              </span>
            </button>
            <div className="flex gap-xs">
              <Button
                label={editing?.featureId === f.featureId ? 'Đang sửa' : 'Sửa'}
                size="sm"
                variant="ghost"
                fullWidth={false}
                disabled={editing?.featureId === f.featureId}
                onPress={() => startEdit(f)}
              />
              <Button
                label="Xóa"
                size="sm"
                variant="ghost"
                fullWidth={false}
                onPress={() => setToDelete(f)}
              />
            </div>
          </div>
        </Card>
      ))}
      <ConfirmDialog
        visible={!!toDelete}
        title={`Xóa chướng ngại vật${toDelete ? ` "${toDelete.label}"` : ''}?`}
        description="Các ô gần vị trí này sẽ không còn bị cảnh báo va chạm với nó nữa."
        confirmLabel="Xóa"
        confirmVariant="danger"
        onConfirm={() => {
          if (toDelete) remove.mutate(toDelete);
          setToDelete(null);
        }}
        onCancel={() => setToDelete(null)}
      />
    </Section>
  );
}
