import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import { Button, Icon } from '@/components/common';
import { showToast } from '@/components/feedback';
import { TextField } from '@/components/forms';
import { Checkbox } from '../../ConfigFields';
import type { MapPoint } from '../../SlotGridMap';
import {
  batchSlotCount,
  distanceMeters,
  errorMessage,
  MAX_BATCH_SLOTS,
  wardConfigApi,
  type BatchPreview,
  type SlotFacilities,
  type WardZone,
} from '../../../ward-config-api';
import { BatchStrip } from './BatchStrip';
import { AckBox, FacilitiesFields, InspectorCard, SheetRule, SizeGrid, ZoneSelect } from './fields';
import { ProhibitSign, WarnSign } from './PlacementVerdict';
import { hasBlock, sizeValue, type RulerInfo } from './placement';

/** The two ends of the kerb run, filled in as they are tapped. */
function PinSteps({ count }: { count: number }) {
  return (
    <ol aria-hidden="true" className="flex items-center gap-xs">
      {['Điểm đầu', 'Điểm cuối'].map((label, i) => {
        const done = count > i;
        return (
          <li key={label} className="flex items-center gap-xs">
            {i > 0 && (
              <span className={`h-0.5 w-6 rounded-full ${count > 1 ? 'bg-brand' : 'bg-border'}`} />
            )}
            <span
              className={`flex h-8 items-center gap-1 rounded-full px-2.5 text-body-sm font-semibold ${
                done ? 'bg-primary text-on-primary' : 'bg-sunken text-muted'
              }`}
            >
              <Icon name={done ? 'check' : 'map-marker-outline'} size={15} color="currentColor" />
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function BatchPanel({
  pins,
  onResetPins,
  zones,
  defaultZoneId,
  preview,
  onPreview,
  onCreated,
  onRuler,
}: {
  pins: MapPoint[];
  onResetPins: () => void;
  zones: WardZone[];
  defaultZoneId: number;
  preview: BatchPreview | null;
  onPreview: (p: BatchPreview | null) => void;
  onCreated: () => void;
  /** Display only: hands the measured segment to the map's tape label. */
  onRuler: (ruler: RulerInfo | null) => void;
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

  // Same numbers as the sentence below, drawn on the map; nothing is sent anywhere.
  useEffect(() => {
    onRuler(segment != null ? { meters: segment, slots: estimate, tooShort } : null);
  }, [segment, estimate, tooShort, onRuler]);
  useEffect(() => () => onRuler(null), [onRuler]);

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
    <InspectorCard
      title="Rải ô hàng loạt"
      action={
        pins.length > 0 ? (
          <Button label="Chọn lại đoạn" variant="ghost" fullWidth={false} onPress={onResetPins} />
        ) : undefined
      }
    >
      <div className="flex flex-col gap-xs">
        <PinSteps count={pins.length} />
        <p className="text-body-sm text-muted">
          {pins.length < 2 ? `Đã chọn ${pins.length}/2 điểm.` : 'Đã chọn đoạn vỉa hè.'} Tối đa{' '}
          {MAX_BATCH_SLOTS} ô mỗi lần.
        </p>
      </div>
      {segment != null && (
        <div
          className={`relative overflow-hidden rounded-[14px] px-sm pb-sm pt-md ring-1 ${
            tooShort ? 'bg-[#FDEBEA] ring-[#8F1717]/25 dark:bg-[#3A1414]' : 'bg-card ring-brand/40'
          }`}
        >
          {/* Tape-measure ticks along the top edge. */}
          <span
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-2"
            style={{
              backgroundImage: `repeating-linear-gradient(90deg, ${tooShort ? '#8F1717' : 'rgb(var(--c-brand))'} 0 1.5px, transparent 1.5px 10px)`,
            }}
          />
          <p
            className={`text-body-md ${tooShort ? 'font-medium text-[#8F1717] dark:text-[#FF9A90]' : 'text-text'}`}
            aria-live="polite"
          >
            Đoạn dài khoảng{' '}
            <strong className="font-sign text-[20px] font-extrabold font-tabular">
              {segment < 10 ? segment.toFixed(1) : Math.round(segment)} m
            </strong>
            {tooShort
              ? ` — ngắn hơn chiều dài một ô (${l} m). Hãy chọn điểm cuối xa hơn hoặc giảm chiều dài ô.`
              : estimate != null
                ? ` → rải được khoảng ${estimate} ô${estimate === MAX_BATCH_SLOTS ? ' (đã chạm giới hạn, phần còn lại rải ở lượt sau)' : ''}.`
                : '.'}
          </p>
        </div>
      )}
      <ZoneSelect zones={zones} value={zoneId} onChange={setZoneId} />
      <SizeGrid columns={3}>
        <TextField label="Rộng (m)" value={width} onChangeText={setWidth} keyboardType="numeric" />
        <TextField label="Dài (m)" value={length} onChangeText={setLength} keyboardType="numeric" />
        <TextField
          label="Khoảng cách (m)"
          value={gap}
          onChangeText={setGap}
          keyboardType="numeric"
        />
      </SizeGrid>
      <SheetRule>Tiện ích cho cả dãy</SheetRule>
      <FacilitiesFields value={facilities} onChange={setFacilities} />
      <Button
        label="Xem trước"
        variant="outline"
        icon={<Icon name="eye-outline" size={18} color="currentColor" />}
        disabled={pins.length < 2 || w == null || l == null || !gapValid || tooShort}
        loading={run.isPending}
        onPress={() => run.mutate()}
      />
      {preview && (
        <>
          <SheetRule>Xem trước dãy ô</SheetRule>
          <p className="text-body-md font-semibold text-text">
            {preview.candidates.length} vị trí đề xuất, chọn {chosen.length} ô để tạo.
          </p>
          <BatchStrip candidates={preview.candidates} excluded={excluded} />
          <ul className="flex max-h-72 flex-col gap-xs overflow-auto pr-1">
            {preview.candidates.map((c) => {
              const blocked = hasBlock(c.issues);
              return (
                <li
                  key={c.index}
                  className={`rounded-[12px] border px-sm py-1 ${
                    blocked
                      ? 'border-[#B42318]/40 bg-[#FDEBEA] dark:bg-[#3A1414]'
                      : c.issues.length
                        ? 'border-[#C98A04]/50 bg-[#FFF3D1] dark:bg-[#3A2A08]'
                        : 'border-border bg-card'
                  }`}
                >
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
                    <p
                      key={i}
                      className={`flex items-start gap-xs pb-1 text-body-sm ${
                        issue.severity === 'BLOCK'
                          ? 'text-[#8F1717] dark:text-[#FF9A90]'
                          : 'text-[#6B4100] dark:text-[#FFD27A]'
                      }`}
                    >
                      {issue.severity === 'BLOCK' ? (
                        <ProhibitSign size={18} />
                      ) : (
                        <WarnSign size={18} />
                      )}
                      <span className="min-w-0">{issue.message}</span>
                    </p>
                  ))}
                </li>
              );
            })}
          </ul>
          {warned && (
            <AckBox>
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
            </AckBox>
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
    </InspectorCard>
  );
}
