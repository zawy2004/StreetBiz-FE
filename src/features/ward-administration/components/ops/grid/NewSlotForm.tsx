import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import { Button, Icon } from '@/components/common';
import { showToast } from '@/components/feedback';
import { TextField } from '@/components/forms';
import type { MapPoint } from '../../SlotGridMap';
import {
  errorMessage,
  wardConfigApi,
  type SlotFacilities,
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

/** A dashed, unpainted slot outline: a slot that does not exist yet. */
function DraftPlate() {
  return (
    <span
      aria-hidden="true"
      className="flex h-12 w-[64px] shrink-0 items-center justify-center rounded-[8px] border-[2.5px] border-dashed border-brand bg-[rgb(var(--c-brand)/0.08)] text-primary"
    >
      <Icon name="plus" size={22} color="currentColor" />
    </span>
  );
}

export function NewSlotForm({
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

  const slipHasContent = check.isFetching || !!check.error || !!check.data;

  return (
    <InspectorCard
      header={
        <div className="flex items-center gap-sm border-b border-border bg-[#FFF3E8] px-md py-sm dark:bg-[#2A2420]">
          <DraftPlate />
          <div className="min-w-0">
            <h2 className="font-sign text-[22px] font-extrabold leading-tight text-text [font-stretch:90%]">
              Ô mới
            </h2>
            <p className="flex items-center gap-1 font-tabular text-body-md text-text/80">
              <Icon name="map-marker-outline" size={16} color="currentColor" className="shrink-0" />
              Vị trí: {point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}
            </p>
          </div>
        </div>
      }
    >
      <ZoneSelect zones={zones} value={zoneId} onChange={setZoneId} />
      <SizeGrid columns={2}>
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
      </SizeGrid>
      <TextField
        label="Mã ô (để trống để hệ thống tự đặt)"
        value={code}
        onChangeText={setCode}
        maxLength={30}
      />
      <SheetRule>Tiện ích</SheetRule>
      <FacilitiesFields value={facilities} onChange={setFacilities} />
      {slipHasContent && (
        <VerdictSlip>
          {check.isFetching && <CheckingLine />}
          {check.error && (
            <p role="alert" className="text-body-md text-error">
              {errorMessage(check.error)}
            </p>
          )}
          <PlacementVerdict check={check.data} />
        </VerdictSlip>
      )}
      <WarningAck issues={issues} ack={ack} reason={reason} onAck={setAck} onReason={setReason} />
      <Button
        label="Thêm ô"
        variant="approve"
        disabled={!canSave}
        loading={create.isPending}
        onPress={() => create.mutate()}
      />
    </InspectorCard>
  );
}
