import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Button, Icon } from '@/components/common';
import { ConfirmDialog, showToast } from '@/components/feedback';
import { TextField } from '@/components/forms';
import { useAuthStore } from '@/store/auth-store';
import type { MapPoint } from '../../SlotGridMap';
import {
  errorMessage,
  isConflict,
  wardConfigApi,
  type SlotFacilities,
  type WardSlot,
  type WardZone,
} from '../../../ward-config-api';
import {
  FacilitiesFields,
  InspectorCard,
  SheetRule,
  SizeGrid,
  WarningAck,
  ZoneSelect,
} from './fields';
import { CheckingLine, PlacementVerdict, VerdictSlip } from './PlacementVerdict';
import { hasBlock, sizeValue, usePlacementCheck } from './placement';
import { SlotHistory } from './SlotHistory';
import { SlotInspectorHeader } from './SlotInspectorHeader';

/** A muted explanation line inside the sheet, with an info glyph. */
function Note({ children }: { children: string }) {
  return (
    <p className="flex items-start gap-xs rounded-[12px] bg-sunken px-sm py-xs text-body-md text-text">
      <Icon
        name="information-outline"
        size={18}
        color="currentColor"
        className="mt-0.5 shrink-0 text-muted"
      />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

export function SlotPanel({
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
  // Display only: the conflict message stays on the sheet (the toast goes away) while it is stale.
  const [conflictNote, setConflictNote] = useState<string | null>(null);
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
    if (isConflict(error)) {
      setConflictNote(errorMessage(error));
      void client.invalidateQueries({ queryKey: ['ward', userId] });
    }
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
    <InspectorCard
      header={
        <SlotInspectorHeader
          slot={slot}
          action={<Button label="Đóng" variant="ghost" fullWidth={false} onPress={onClose} />}
        />
      }
    >
      {conflictNote && (
        <p
          role="alert"
          className="flex items-start gap-xs rounded-[12px] bg-[#FDEBEA] px-sm py-xs text-body-md font-semibold text-[#8F1717] dark:bg-[#3A1414] dark:text-[#FF9A90]"
        >
          <Icon
            name="alert-octagon-outline"
            size={18}
            color="currentColor"
            className="mt-0.5 shrink-0"
          />
          <span className="min-w-0">{conflictNote}</span>
        </p>
      )}
      {readOnly && (
        <Note>
          Ô do hộ kinh doanh đề xuất, được xử lý ở luồng duyệt đề xuất và không sửa tại đây.
        </Note>
      )}
      {!readOnly && !slot.canEditGeometry && (
        <Note>Ô không ở trạng thái Trống nên chỉ sửa được tiện ích và ngành hàng.</Note>
      )}
      {slot.canEditGeometry && (
        <>
          <p
            className={`flex items-center gap-xs rounded-[12px] px-sm py-xs text-body-md ${
              newPosition ? 'bg-tint-primary font-semibold text-primary' : 'bg-sunken text-text'
            }`}
          >
            <Icon name="map-marker-outline" size={18} color="currentColor" className="shrink-0" />
            <span>Chạm bản đồ để dời ô. {newPosition ? 'Đã chọn vị trí mới.' : ''}</span>
          </p>
          <TextField label="Mã ô" value={code} onChangeText={setCode} maxLength={30} />
          <ZoneSelect zones={zones} value={zoneId} onChange={setZoneId} />
          <SizeGrid columns={2}>
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
          </SizeGrid>
        </>
      )}
      {!readOnly && (
        <>
          <SheetRule>Tiện ích</SheetRule>
          <FacilitiesFields value={facilities} onChange={setFacilities} />
        </>
      )}
      {geometryChanged && (check.isFetching || check.data) && (
        <VerdictSlip>
          {check.isFetching && <CheckingLine />}
          <PlacementVerdict check={check.data} />
        </VerdictSlip>
      )}
      <WarningAck issues={issues} ack={ack} reason={reason} onAck={setAck} onReason={setReason} />
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
        <div className="flex flex-col gap-sm border-t border-border pt-md">
          <SheetRule>
            {slot.status === 'AVAILABLE'
              ? 'Tạm ngưng ô (thi công, sửa vỉa hè…)'
              : 'Mở lại ô cho thuê'}
          </SheetRule>
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
            onPress={() => status.mutate(slot.status === 'AVAILABLE' ? 'SUSPENDED' : 'AVAILABLE')}
          />
        </div>
      )}
      {slot.status === 'PENDING_APPLICATION' && (
        <div className="border-t border-border pt-md">
          <Note>
            Ô đang có đơn thuê chờ xử lý nên chưa tạm ngưng được. Hãy duyệt hoặc từ chối đơn ở Hộp
            duyệt trước; hệ thống không tự hủy đơn của hộ kinh doanh.
          </Note>
        </div>
      )}
      {slot.status === 'ACTIVE' && (
        <div className="border-t border-border pt-md">
          <Note>
            Ô đang có hợp đồng. Muốn dừng kinh doanh tại ô này, hãy đình chỉ hoặc thu hồi giấy phép
            ở mục Tuần tra để hộ kinh doanh được thông báo và có căn cứ.
          </Note>
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

      <div className="flex flex-col gap-sm border-t border-border pt-sm">
        <Button
          label={showHistory ? 'Ẩn lịch sử thay đổi' : 'Lịch sử thay đổi'}
          variant="ghost"
          fullWidth={false}
          icon={<Icon name="history" size={18} color="currentColor" />}
          onPress={() => setShowHistory(!showHistory)}
        />
        {showHistory && <SlotHistory slotId={slot.slotId} zones={zones} />}
      </div>
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
    </InspectorCard>
  );
}
