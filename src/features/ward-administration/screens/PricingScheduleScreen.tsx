import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button, Card, Money } from '@/components/common';
import { ConfirmDialog, showToast } from '@/components/feedback';
import { SelectField, TextField } from '@/components/forms';
import { AppHeader, Screen, Section } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { useAuthStore } from '@/store/auth-store';
import { DateInput, MoneyInput, TimeInput } from '../components/ConfigFields';
import { WardGate } from '../components/WardGate';
import {
  errorMessage,
  hhmm,
  isConflict,
  toApiTime,
  wardConfigApi,
  type UpsertZoneRequest,
  type WardZone,
  type ZoneFeeComponentInput,
  type ZoneImpactPreview,
} from '../ward-config-api';

/** WARD-02: price per day, trading hours, permitting document and reference fees of each zone. */
export function PricingScheduleScreen() {
  return (
    <WardGate>
      <PricingContent />
    </WardGate>
  );
}

function PricingContent() {
  const userId = useAuthStore((state) => state.user?.id);
  const queryKey = ['ward', userId, 'zones'];
  const zones = useQuery({ queryKey, queryFn: wardConfigApi.listZones });
  const [selected, setSelected] = useState<number | 'new' | null>(null);

  if (zones.isPending)
    return (
      <Screen>
        <p role="status">Đang tải khu vực…</p>
      </Screen>
    );
  if (zones.error)
    return (
      <Screen>
        <AppHeader title="Giá & khung giờ" back />
        <p role="alert" className="text-error">
          {errorMessage(zones.error)}
        </p>
        <Button label="Thử lại" onPress={() => void zones.refetch()} />
      </Screen>
    );

  const zone =
    typeof selected === 'number' ? zones.data.find((z) => z.zoneId === selected) : undefined;

  return (
    <Screen>
      <AppHeader title="Giá & khung giờ" back subtitle="WARD-02 · Theo từng khu vực" />
      <Card>
        <p className="text-body-sm text-text">
          Giá thuê tính theo khu vực. Muốn định giá khác nhau theo vị trí (ví dụ đoạn gần ngã tư và
          đoạn trong hẻm), hãy chia thành nhiều khu vực nhỏ theo đoạn đường. Mỗi khu vực chỉ được mở
          khi có văn bản cho phép.
        </p>
      </Card>

      <Section
        title={`Khu vực (${zones.data.length})`}
        action={
          <Button
            label="Tạo khu vực"
            size="sm"
            fullWidth={false}
            variant="civic"
            onPress={() => setSelected('new')}
          />
        }
      >
        {zones.data.map((z) => (
          <button
            key={z.zoneId}
            type="button"
            onClick={() => setSelected(z.zoneId)}
            className={`w-full rounded-sm border p-sm text-left ${selected === z.zoneId ? 'border-primary' : 'border-border'} bg-card`}
          >
            <div className="flex flex-wrap items-center justify-between gap-sm">
              <span className="text-headline-sm text-text">{z.zoneName}</span>
              <Money amountVnd={z.pricePerDay} />
            </div>
            <p className="text-body-sm text-muted">
              {z.zoneCode} ·{' '}
              {z.availableFrom
                ? `${hhmm(z.availableFrom)} – ${hhmm(z.availableTo)}`
                : 'Không giới hạn giờ'}
              {z.isOvernight ? ' (qua đêm)' : ''} · {z.activeSlotCount}/{z.slotCount} ô đang cho
              thuê
            </p>
            <p className="text-body-sm text-muted">
              Văn bản cho phép: {z.regulationRef ?? '⚠️ chưa có'}
            </p>
          </button>
        ))}
      </Section>

      {selected === 'new' && (
        <ZoneEditor
          key="new"
          zone={null}
          onClose={() => setSelected(null)}
          onSaved={(id) => {
            setSelected(id);
            void zones.refetch();
          }}
        />
      )}
      {zone && (
        <ZoneEditor
          key={`${zone.zoneId}-${zone.versionToken}`}
          zone={zone}
          onClose={() => setSelected(null)}
          onSaved={() => void zones.refetch()}
        />
      )}
    </Screen>
  );
}

type Draft = {
  zoneName: string;
  zoneCode: string;
  pricePerDay: number | null;
  from: string;
  to: string;
  regulationNumber: string;
  regulationIssuedOn: string;
  regulationIssuer: string;
  segmentFrom: string;
  segmentTo: string;
  applicationDeadline: string;
  feeComponents: ZoneFeeComponentInput[];
};

function draftOf(zone: WardZone | null): Draft {
  return {
    zoneName: zone?.zoneName ?? '',
    zoneCode: zone?.zoneCode ?? '',
    pricePerDay: zone?.pricePerDay ?? null,
    from: hhmm(zone?.availableFrom ?? null),
    to: hhmm(zone?.availableTo ?? null),
    regulationNumber: '',
    regulationIssuedOn: '',
    regulationIssuer: '',
    segmentFrom: zone?.segmentFrom ?? '',
    segmentTo: zone?.segmentTo ?? '',
    applicationDeadline: zone?.applicationDeadline ?? '',
    feeComponents:
      zone?.feeComponents.map(({ componentName, calcBasis, unitAmount }) => ({
        componentName,
        calcBasis,
        unitAmount,
      })) ?? [],
  };
}

function ZoneEditor({
  zone,
  onClose,
  onSaved,
}: {
  zone: WardZone | null;
  onClose: () => void;
  onSaved: (zoneId: number) => void;
}) {
  const isNew = zone === null;
  const [draft, setDraft] = useState<Draft>(() => draftOf(zone));
  const [changeDocument, setChangeDocument] = useState(isNew);
  const [reason, setReason] = useState('');
  const [preview, setPreview] = useState<{ key: string; data: ZoneImpactPreview } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const client = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const hoursError =
    (draft.from === '') !== (draft.to === '')
      ? 'Nhập đủ giờ bắt đầu và kết thúc, hoặc để trống cả hai.'
      : draft.from && draft.from === draft.to
        ? 'Giờ bắt đầu và kết thúc không được trùng nhau.'
        : undefined;
  const overnight = !!draft.from && !!draft.to && draft.from > draft.to;
  const documentReady =
    !changeDocument ||
    (draft.regulationNumber.trim() && draft.regulationIssuedOn && draft.regulationIssuer.trim());
  const valid =
    draft.zoneName.trim() &&
    /^[A-Z0-9-]+$/.test(draft.zoneCode) &&
    (draft.pricePerDay ?? 0) > 0 &&
    !hoursError &&
    documentReady &&
    draft.feeComponents.every((c) => c.componentName.trim());
  const previewKey = `${draft.pricePerDay}|${draft.from}|${draft.to}`;
  const previewCurrent = preview?.key === previewKey;

  const request = (): UpsertZoneRequest => ({
    zoneName: draft.zoneName.trim(),
    zoneCode: draft.zoneCode.trim(),
    pricePerDay: draft.pricePerDay ?? 0,
    availableFrom: toApiTime(draft.from),
    availableTo: toApiTime(draft.to),
    regulationNumber: changeDocument ? draft.regulationNumber.trim() : null,
    regulationIssuedOn: changeDocument ? draft.regulationIssuedOn : null,
    regulationIssuer: changeDocument ? draft.regulationIssuer.trim() : null,
    segmentFrom: draft.segmentFrom.trim() || null,
    segmentTo: draft.segmentTo.trim() || null,
    applicationDeadline: draft.applicationDeadline || null,
    feeComponents: draft.feeComponents.map((c) => ({
      ...c,
      componentName: c.componentName.trim(),
    })),
    changeReason: reason.trim() || null,
    versionToken: zone?.versionToken ?? null,
  });

  const impact = useMutation({
    mutationFn: () =>
      wardConfigApi.previewZoneImpact(
        zone!.zoneId,
        draft.pricePerDay ?? 0,
        toApiTime(draft.from),
        toApiTime(draft.to),
      ),
    onSuccess: (data) => setPreview({ key: previewKey, data }),
    onError: (error) => showToast(errorMessage(error)),
  });

  const save = useMutation({
    mutationFn: () =>
      isNew
        ? wardConfigApi.createZone(request())
        : wardConfigApi.updateZone(zone.zoneId, request()),
    onSuccess: (saved) => {
      showToast(isNew ? 'Đã tạo khu vực' : 'Đã lưu thay đổi khu vực');
      void client.invalidateQueries({ queryKey: ['ward', userId] });
      onSaved(saved.zoneId);
    },
    onError: (error) => {
      showToast(errorMessage(error));
      if (isConflict(error)) void client.invalidateQueries({ queryKey: ['ward', userId, 'zones'] });
    },
  });

  const remove = useMutation({
    mutationFn: () => wardConfigApi.deleteZone(zone!),
    onSuccess: () => {
      showToast('Đã xóa khu vực');
      void client.invalidateQueries({ queryKey: ['ward', userId, 'zones'] });
      onClose();
    },
    onError: (error) => showToast(errorMessage(error)),
  });

  return (
    <Section
      title={isNew ? 'Tạo khu vực mới' : `Sửa khu vực ${zone.zoneName}`}
      action={<Button label="Đóng" size="sm" variant="ghost" fullWidth={false} onPress={onClose} />}
    >
      <Card>
        <div className="flex flex-col gap-sm">
          <TextField
            label="Tên khu vực"
            value={draft.zoneName}
            onChangeText={(v) => set('zoneName', v)}
            maxLength={150}
          />
          <TextField
            label="Mã khu vực"
            value={draft.zoneCode}
            maxLength={20}
            onChangeText={(v) => set('zoneCode', v.toUpperCase())}
            helperText="Chữ in hoa, số, dấu gạch ngang. Dùng làm tiền tố mã ô."
          />
          <MoneyInput
            label="Giá thuê mỗi ngày"
            value={draft.pricePerDay}
            onChange={(v) => set('pricePerDay', v)}
          />
          <div className="grid grid-cols-2 gap-sm">
            <TimeInput
              label="Giờ bắt đầu"
              value={draft.from}
              onChange={(v) => set('from', v)}
              error={hoursError}
            />
            <TimeInput label="Giờ kết thúc" value={draft.to} onChange={(v) => set('to', v)} />
          </div>
          {overnight && <StatusChip label="Ca qua đêm: kết thúc vào sáng hôm sau" tone="pending" />}
          <div className="grid grid-cols-2 gap-sm">
            <TextField
              label="Đoạn từ"
              value={draft.segmentFrom}
              onChangeText={(v) => set('segmentFrom', v)}
              maxLength={150}
            />
            <TextField
              label="Đoạn đến"
              value={draft.segmentTo}
              onChangeText={(v) => set('segmentTo', v)}
              maxLength={150}
            />
          </div>
          <DateInput
            label="Hạn nhận đơn (không bắt buộc)"
            value={draft.applicationDeadline}
            onChange={(v) => set('applicationDeadline', v)}
          />

          <p className="text-label text-text">Văn bản cho phép mở khu vực</p>
          {!isNew && (
            <p className="text-body-sm text-muted">
              Hiện tại: {zone.regulationRef ?? '⚠️ chưa có'}
            </p>
          )}
          {!isNew && (
            <Button
              label={changeDocument ? 'Giữ văn bản hiện tại' : 'Cập nhật văn bản'}
              size="sm"
              variant="ghost"
              fullWidth={false}
              onPress={() => setChangeDocument(!changeDocument)}
            />
          )}
          {changeDocument && (
            <>
              <TextField
                label="Số hiệu văn bản"
                value={draft.regulationNumber}
                maxLength={50}
                onChangeText={(v) => set('regulationNumber', v)}
                placeholder="Ví dụ: 15/QĐ-UBND"
              />
              <DateInput
                label="Ngày ban hành"
                value={draft.regulationIssuedOn}
                onChange={(v) => set('regulationIssuedOn', v)}
              />
              <TextField
                label="Cơ quan ban hành"
                value={draft.regulationIssuer}
                maxLength={80}
                onChangeText={(v) => set('regulationIssuer', v)}
                placeholder="Ví dụ: UBND phường Hải Châu"
              />
            </>
          )}

          <FeeComponentsEditor
            value={draft.feeComponents}
            onChange={(v) => set('feeComponents', v)}
          />

          {!isNew && (
            <>
              <Button
                label="Xem tác động trước khi lưu"
                variant="outline"
                disabled={!valid}
                loading={impact.isPending}
                onPress={() => impact.mutate()}
              />
              {previewCurrent && preview && <ImpactPanel preview={preview.data} />}
              <TextField
                label="Lý do thay đổi"
                value={reason}
                onChangeText={setReason}
                multiline
                maxLength={500}
              />
            </>
          )}

          <Button
            label={isNew ? 'Tạo khu vực' : 'Lưu thay đổi'}
            variant="approve"
            disabled={!valid || (!isNew && (!previewCurrent || !reason.trim()))}
            loading={save.isPending}
            onPress={() => save.mutate()}
          />
          {!isNew && !previewCurrent && (
            <p className="text-body-sm text-muted">
              Xem tác động với giá và giờ đang nhập trước khi lưu.
            </p>
          )}

          {!isNew && (
            <div className="flex flex-wrap gap-sm">
              <Button
                label={showHistory ? 'Ẩn lịch sử' : 'Lịch sử thay đổi'}
                size="sm"
                variant="ghost"
                fullWidth={false}
                onPress={() => setShowHistory(!showHistory)}
              />
              {zone.slotCount === 0 && zone.featureCount === 0 && (
                <Button
                  label="Xóa khu vực"
                  size="sm"
                  variant="danger"
                  fullWidth={false}
                  onPress={() => setConfirmDelete(true)}
                />
              )}
            </div>
          )}
          {!isNew && showHistory && <ZoneHistory zoneId={zone.zoneId} />}
        </div>
      </Card>
      <ConfirmDialog
        visible={confirmDelete}
        title="Xóa khu vực?"
        description="Chỉ xóa được khu vực chưa có ô sạp và chướng ngại vật."
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

function FeeComponentsEditor({
  value,
  onChange,
}: {
  value: ZoneFeeComponentInput[];
  onChange: (v: ZoneFeeComponentInput[]) => void;
}) {
  const update = (i: number, patch: Partial<ZoneFeeComponentInput>) =>
    onChange(value.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  return (
    <div className="flex flex-col gap-sm">
      <p className="text-label text-text">Phụ phí tham khảo</p>
      <p className="text-body-sm text-muted">
        Các khoản phụ phí mang tính tham khảo để hộ kinh doanh biết trước; tiền hợp đồng chính thức
        tính bằng giá thuê mỗi ngày × số ngày.
      </p>
      {value.map((c, i) => (
        <div key={i} className="rounded-sm border border-border p-sm">
          <TextField
            label="Tên khoản phí"
            value={c.componentName}
            maxLength={150}
            onChangeText={(v) => update(i, { componentName: v })}
          />
          <SelectField
            label="Cách tính"
            layout="inline"
            value={c.calcBasis}
            onChange={(v) => update(i, { calcBasis: v })}
            options={[
              { value: 'PER_DAY', label: 'Theo ngày' },
              { value: 'PER_TERM', label: 'Một lần mỗi kỳ' },
            ]}
          />
          <MoneyInput
            label="Số tiền"
            value={c.unitAmount}
            onChange={(v) => update(i, { unitAmount: v ?? 0 })}
          />
          <Button
            label="Bỏ khoản này"
            size="sm"
            variant="ghost"
            fullWidth={false}
            onPress={() => onChange(value.filter((_, idx) => idx !== i))}
          />
        </div>
      ))}
      {value.length < 20 && (
        <Button
          label="Thêm khoản phí"
          size="sm"
          variant="outline"
          fullWidth={false}
          onPress={() =>
            onChange([...value, { componentName: '', calcBasis: 'PER_DAY', unitAmount: 0 }])
          }
        />
      )}
    </div>
  );
}

function ImpactPanel({ preview }: { preview: ZoneImpactPreview }) {
  const rows = [...preview.pendingApplications, ...preview.openRenewals];
  return (
    <div className="rounded-sm border border-border bg-sunken p-sm" aria-live="polite">
      <p className="text-label text-text">Tác động nếu lưu</p>
      {!preview.priceChanged && !preview.hoursChanged && (
        <p className="text-body-sm">Giá và khung giờ không đổi.</p>
      )}
      {preview.priceChanged && (
        <>
          <p className="text-body-sm">
            {preview.pendingApplications.length} đơn thuê và {preview.openRenewals.length} đơn gia
            hạn đang chờ sẽ được tính giá mới khi duyệt. Hợp đồng và biểu phí đã phát hành không
            thay đổi.
          </p>
          {rows.length > 0 && (
            <ul className="ml-md list-disc text-body-sm">
              {rows.map((r) => (
                <li key={`${r.kind}-${r.id}`}>
                  {r.kind === 'RENEWAL' ? 'Gia hạn' : 'Đơn thuê'} ô {r.slotCode} · {r.vendorName} ·{' '}
                  {r.termDays} ngày: {r.currentTotal.toLocaleString('vi-VN')}đ →{' '}
                  {r.newTotal.toLocaleString('vi-VN')}đ
                </li>
              ))}
            </ul>
          )}
          <p className="text-body-sm">
            Tổng chênh lệch:{' '}
            <strong>
              {preview.totalDelta >= 0 ? '+' : ''}
              {preview.totalDelta.toLocaleString('vi-VN')}đ
            </strong>
          </p>
        </>
      )}
      {preview.hoursChanged && (
        <p className="text-body-sm">
          {preview.activeContractsAffectedByHours} hộ đang thuê sẽ phải theo khung giờ mới.
        </p>
      )}
      {preview.vendorsToNotify > 0 && (
        <p className="text-body-sm">
          Hệ thống sẽ gửi thông báo cho {preview.vendorsToNotify} hộ kinh doanh liên quan.
        </p>
      )}
    </div>
  );
}

const historyLabels: Record<string, string> = {
  ZONE_CREATED: 'Tạo khu vực',
  ZONE_UPDATED: 'Cập nhật khu vực',
  SLOT_BATCH_CREATED: 'Rải ô hàng loạt',
};

function ZoneHistory({ zoneId }: { zoneId: number }) {
  const userId = useAuthStore((state) => state.user?.id);
  const history = useQuery({
    queryKey: ['ward', userId, 'zone-history', zoneId],
    queryFn: () => wardConfigApi.zoneHistory(zoneId),
  });
  if (history.isPending) return <p role="status">Đang tải lịch sử…</p>;
  if (history.error)
    return (
      <p role="alert" className="text-error">
        {errorMessage(history.error)}
      </p>
    );
  if (history.data.length === 0)
    return <p className="text-body-sm text-muted">Chưa có thay đổi nào được ghi nhận.</p>;
  return (
    <ol className="flex flex-col gap-xs">
      {history.data.map((entry) => {
        const details = parseDetails(entry.details);
        return (
          <li key={entry.auditId} className="text-body-sm">
            <strong>{historyLabels[entry.action] ?? entry.action}</strong> · {entry.actorName} ·{' '}
            {new Date(entry.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
            {details?.before?.pricePerDay != null &&
              details.after?.pricePerDay != null &&
              details.before.pricePerDay !== details.after.pricePerDay && (
                <>
                  {' '}
                  · Giá {details.before.pricePerDay.toLocaleString('vi-VN')}đ →{' '}
                  {details.after.pricePerDay.toLocaleString('vi-VN')}đ
                </>
              )}
            {details?.reason && <> · Lý do: {details.reason}</>}
          </li>
        );
      })}
    </ol>
  );
}

type ZoneAuditDetails = {
  before?: { pricePerDay?: number } | null;
  after?: { pricePerDay?: number } | null;
  reason?: string | null;
};

function parseDetails(raw: string | null): ZoneAuditDetails | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ZoneAuditDetails;
  } catch {
    return null;
  }
}
