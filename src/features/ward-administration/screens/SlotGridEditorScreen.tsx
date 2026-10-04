import { lazy, Suspense, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button, Card } from '@/components/common';
import { ConfirmDialog, LoadingState, showToast } from '@/components/feedback';
import { SegmentedControl, SelectField, TextField } from '@/components/forms';
import { AppHeader, Screen, Section } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { useAuthStore } from '@/store/auth-store';
import { Checkbox } from '../components/ConfigFields';
import type { MapPoint } from '../components/SlotGridMap';
import { WardGate } from '../components/WardGate';
import {
  businessCategoryLabels,
  errorMessage,
  featureTypeLabels,
  isConflict,
  slotStatusLabels,
  wardConfigApi,
  type BatchPreview,
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
  const onMapClick = (point: MapPoint) => {
    setPreview(null);
    if (mode === 'batch') setPins((p) => (p.length >= 2 ? [point] : [...p, point]));
    else setPins([point]);
  };
  const switchMode = (next: Mode) => {
    setMode(next);
    setPins([]);
    setPreview(null);
    setSelected(null);
  };

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

      <SelectField
        label="Khu vực"
        layout="inline"
        value={zoneFilter == null ? 'all' : String(zoneFilter)}
        onChange={(v) => {
          setZoneFilter(v === 'all' ? null : Number(v));
          setSelected(null);
        }}
        options={[
          { value: 'all', label: 'Tất cả' },
          ...zones.data.map((z) => ({ value: String(z.zoneId), label: z.zoneName })),
        ]}
      />
      <SegmentedControl<Mode>
        value={mode}
        onChange={switchMode}
        options={[
          { value: 'slot', label: 'Đặt ô' },
          { value: 'batch', label: 'Rải hàng loạt' },
          { value: 'feature', label: 'Chướng ngại vật' },
        ]}
      />
      <p className="text-body-sm text-muted">
        {mode === 'batch'
          ? 'Chạm điểm đầu rồi điểm cuối của đoạn vỉa hè.'
          : 'Chạm lên bản đồ để đặt vị trí.'}{' '}
        Điểm đỏ: chướng ngại vật cấm kinh doanh; điểm vàng: chướng ngại vật khác.
      </p>

      <Suspense fallback={<LoadingState label="Đang tải bản đồ" />}>
        <SlotGridMap
          slots={data.slots}
          features={data.features}
          selectedSlotId={selected?.slotId ?? null}
          pins={pins}
          candidates={preview?.candidates ?? []}
          onMapClick={onMapClick}
          onSelectSlot={(slot) => {
            if (mode === 'slot') {
              setSelected(slot);
              setPins([]);
            }
          }}
        />
      </Suspense>

      {mode === 'slot' && selected && (
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
      {mode === 'slot' && !selected && pins[0] && (
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
      {mode === 'batch' && (
        <BatchPanel
          pins={pins}
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
      {mode === 'feature' && (
        <FeaturePanel
          point={pins[0] ?? null}
          zones={zones.data}
          defaultZoneId={defaultZone}
          features={data.features}
          onChanged={() => {
            setPins([]);
            void refresh();
          }}
        />
      )}

      <Section title={`Ô trên lưới (${data.slots.length})`}>
        {data.slots.map((slot) => (
          <button
            key={slot.slotId}
            type="button"
            onClick={() => {
              switchMode('slot');
              setSelected(slot);
            }}
            className="flex w-full items-center justify-between gap-sm rounded-sm border border-border bg-card p-sm text-left"
          >
            <span>
              <span className="text-headline-sm text-text">{slot.slotCode}</span>
              <span className="block text-body-sm text-muted">
                {slot.zoneName} · {slot.widthMeters ?? '?'} × {slot.lengthMeters ?? '?'} m
                {slot.source === 'VENDOR_PROPOSED' ? ' · do hộ kinh doanh đề xuất' : ''}
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
        ))}
      </Section>
    </Screen>
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
          {slot.canHardDelete ? (
            <Button label="Xóa ô" variant="danger" onPress={() => setConfirmDelete(true)} />
          ) : (
            !readOnly && (
              <p className="text-body-sm text-muted">
                Ô đã có lịch sử (đơn, hợp đồng, vi phạm…) nên không xóa được; dùng Tạm ngưng.
              </p>
            )
          )}
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

function BatchPanel({
  pins,
  zones,
  defaultZoneId,
  preview,
  onPreview,
  onCreated,
}: {
  pins: MapPoint[];
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
          <p className="text-body-sm text-muted">
            {pins.length < 2 ? `Đã chọn ${pins.length}/2 điểm.` : 'Đã chọn đoạn vỉa hè.'} Tối đa 50
            ô mỗi lần.
          </p>
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
            disabled={pins.length < 2 || w == null || l == null || !gapValid}
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
  onChanged,
}: {
  point: MapPoint | null;
  zones: WardZone[];
  defaultZoneId: number;
  features: WardStreetFeature[];
  onChanged: () => void;
}) {
  const [zoneId, setZoneId] = useState(defaultZoneId);
  const [type, setType] = useState<StreetFeatureType>('HYDRANT');
  const [label, setLabel] = useState('');
  const [blocks, setBlocks] = useState(true);
  const [note, setNote] = useState('');
  const [toDelete, setToDelete] = useState<WardStreetFeature | null>(null);

  const create = useMutation({
    mutationFn: () =>
      wardConfigApi.createFeature({
        zoneId,
        featureType: type,
        label: label.trim(),
        latitude: point!.latitude,
        longitude: point!.longitude,
        blocksBusiness: blocks,
        note: note.trim() || null,
      }),
    onSuccess: (result) => {
      showToast(
        result.affectedSlots.length
          ? `Đã thêm. Lưu ý ${result.affectedSlots.length} ô hiện có nằm quá gần chướng ngại vật này.`
          : 'Đã thêm chướng ngại vật',
      );
      setLabel('');
      setNote('');
      onChanged();
    },
    onError: (error) => showToast(errorMessage(error)),
  });
  const remove = useMutation({
    mutationFn: (feature: WardStreetFeature) => wardConfigApi.deleteFeature(feature),
    onSuccess: () => {
      showToast('Đã xóa chướng ngại vật');
      onChanged();
    },
    onError: (error) => showToast(errorMessage(error)),
  });

  return (
    <Section title="Chướng ngại vật">
      <Card>
        <div className="flex flex-col gap-sm">
          {!point && (
            <p className="text-body-sm text-muted">Chạm bản đồ để chọn vị trí chướng ngại vật.</p>
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
          <Button
            label="Thêm chướng ngại vật"
            variant="approve"
            disabled={!point || !label.trim()}
            loading={create.isPending}
            onPress={() => create.mutate()}
          />
        </div>
      </Card>
      {features.map((f) => (
        <Card key={f.featureId}>
          <div className="flex items-center justify-between gap-sm">
            <span>
              <span className="text-body-md text-text">{f.label}</span>
              <span className="block text-body-sm text-muted">
                {featureTypeLabels[f.featureType]}
                {f.blocksBusiness ? ' · cấm kinh doanh' : ''}
                {f.clearanceMeters ? ` · khoảng cách cấu hình ${f.clearanceMeters} m` : ''}
              </span>
            </span>
            <Button
              label="Xóa"
              size="sm"
              variant="ghost"
              fullWidth={false}
              onPress={() => setToDelete(f)}
            />
          </div>
        </Card>
      ))}
      <ConfirmDialog
        visible={!!toDelete}
        title="Xóa chướng ngại vật?"
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
