import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Button, Icon } from '@/components/common';
import { ConfirmDialog, showToast } from '@/components/feedback';
import { TextField } from '@/components/forms';
import { useAuthStore } from '@/store/auth-store';
import { Checkbox } from '../../ConfigFields';
import type { MapPoint } from '../../SlotGridMap';
import {
  errorMessage,
  featureTypeLabels,
  isConflict,
  wardConfigApi,
  type StreetFeatureType,
  type WardStreetFeature,
  type WardZone,
} from '../../../ward-config-api';
import { FeatureTypePicker, InspectorCard, ZoneSelect } from './fields';
import { FEATURE_BLOCK_COLOR, FEATURE_OTHER_COLOR, featureIcon } from './tokens';

export function FeaturePanel({
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
  const position =
    point ?? (editing ? { latitude: editing.latitude, longitude: editing.longitude } : null);
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
    <>
      <InspectorCard
        title={editing ? `Sửa chướng ngại vật: ${editing.label}` : 'Thêm chướng ngại vật'}
        action={
          editing ? (
            <Button label="Hủy sửa" variant="ghost" fullWidth={false} onPress={resetForm} />
          ) : undefined
        }
      >
        {!editing && !point && (
          <p className="flex items-center gap-xs rounded-[12px] bg-sunken px-sm py-xs text-body-md text-text">
            <Icon name="map-marker-outline" size={18} color="currentColor" className="shrink-0" />
            Chạm bản đồ để chọn vị trí chướng ngại vật.
          </p>
        )}
        {!editing && point && (
          <p className="flex items-center gap-xs rounded-[12px] bg-tint-primary px-sm py-xs font-tabular text-body-md font-semibold text-primary">
            <Icon name="map-marker" size={18} color="currentColor" className="shrink-0" />
            {point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}
          </p>
        )}
        {editing && (
          <p
            className={`flex items-start gap-xs rounded-[12px] px-sm py-xs text-body-md ${
              point ? 'bg-tint-primary font-semibold text-primary' : 'bg-sunken text-text'
            }`}
          >
            <Icon
              name="map-marker-outline"
              size={18}
              color="currentColor"
              className="mt-0.5 shrink-0"
            />
            {point
              ? 'Đã chọn vị trí mới trên bản đồ; bấm Lưu để dời chướng ngại vật tới đó.'
              : 'Giữ nguyên vị trí cũ. Chạm bản đồ nếu muốn dời chướng ngại vật.'}
          </p>
        )}
        <ZoneSelect zones={zones} value={zoneId} onChange={setZoneId} />
        <FeatureTypePicker value={type} onChange={setType} />
        <TextField label="Tên / mô tả ngắn" value={label} onChangeText={setLabel} maxLength={150} />
        <div className="rounded-[12px] bg-[#FDEBEA]/60 px-sm ring-1 ring-[#B42318]/15 dark:bg-[#3A1414]/60">
          <Checkbox label="Cấm đặt ô sạp đè lên vị trí này" checked={blocks} onChange={setBlocks} />
        </div>
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
      </InspectorCard>

      {features.length > 0 && (
        <section className="flex flex-col gap-xs">
          <h3 className="text-label text-text">Chướng ngại vật hiện có ({features.length})</h3>
          <ul
            className={`flex flex-col gap-xs ${features.length > 8 ? 'max-h-[320px] overflow-y-auto pr-1' : ''}`}
          >
            {features.map((f) => {
              const isEditing = editing?.featureId === f.featureId;
              return (
                <li
                  key={f.featureId}
                  className={`flex flex-wrap items-center gap-xs rounded-[14px] bg-card p-xs pl-sm shadow-card ring-1 ${
                    isEditing ? 'ring-2 ring-primary' : 'ring-border'
                  }`}
                >
                  <button
                    type="button"
                    className="flex min-h-12 min-w-0 flex-1 items-center gap-sm rounded-[10px] text-left"
                    onClick={() => onFocus(f)}
                  >
                    <span
                      aria-hidden="true"
                      className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-sunken text-text"
                    >
                      <Icon name={featureIcon(f.featureType)} size={20} color="currentColor" />
                      <span
                        className="absolute -right-0.5 -top-0.5 h-3 w-3 rotate-45 rounded-[2px] ring-2 ring-card"
                        style={{
                          background: f.blocksBusiness ? FEATURE_BLOCK_COLOR : FEATURE_OTHER_COLOR,
                        }}
                      />
                    </span>
                    <span className="min-w-0">
                      <span className="block break-words text-body-md font-semibold text-text">
                        {f.label}
                      </span>
                      <span className="block text-body-sm text-muted">
                        {featureTypeLabels[f.featureType]}
                        {f.blocksBusiness ? ' · cấm kinh doanh' : ''}
                        {f.clearanceMeters ? ` · khoảng cách cấu hình ${f.clearanceMeters} m` : ''}
                        {f.note ? ` · ${f.note}` : ''}
                      </span>
                    </span>
                  </button>
                  <div className="flex gap-1">
                    <Button
                      label={isEditing ? 'Đang sửa' : 'Sửa'}
                      variant="ghost"
                      fullWidth={false}
                      disabled={isEditing}
                      onPress={() => startEdit(f)}
                    />
                    <Button
                      label="Xóa"
                      variant="ghost"
                      fullWidth={false}
                      onPress={() => setToDelete(f)}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
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
    </>
  );
}
