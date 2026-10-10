import { useEffect, useId, useState, type CSSProperties } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button, formatVnd, Icon } from '@/components/common';
import { ConfirmDialog, showToast } from '@/components/feedback';
import { SegmentedControl, SelectField, TextField } from '@/components/forms';
import { AppHeader, Screen, Section } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { useAuthStore } from '@/store/auth-store';
import { DateInput, MoneyInput, TimeInput } from '../components/ConfigFields';
import { WardGate } from '../components/WardGate';
import {
  ConflictBand,
  EditorGroup,
  ImpactReceipt,
  IntroNote,
  PricingSummaryLine,
  SaveDock,
  SelectPrompt,
  ZoningGuide,
} from '../components/ops/schedule/PricingParts';
import {
  fullDateVn,
  prefersReducedMotion,
  shortDateVn,
  vndInline,
} from '../components/ops/schedule/schedule-format';
import {
  EmptySignArt,
  SignSkeleton,
  SignTag,
  ZoneTariffSign,
} from '../components/ops/schedule/TariffSign';
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

const INTRO =
  'Giá thuê tính theo khu vực. Muốn định giá khác nhau theo vị trí (ví dụ đoạn gần ngã tư và đoạn trong hẻm), hãy chia thành nhiều khu vực nhỏ theo đoạn đường. Mỗi khu vực chỉ được mở khi có văn bản cho phép.';

/** WARD-02: price per day, trading hours, permitting document and reference fees of each zone. */
export function PricingScheduleScreen() {
  return (
    <WardGate>
      <PricingContent />
    </WardGate>
  );
}

/**
 * The ward's posted tariff board: one sign per zone (price, hours as a 24-hour
 * strip, how full, which document allows it) on the left, the chosen zone's
 * editor on the right from 1280px, below the signs on smaller screens.
 */
function PricingContent() {
  const userId = useAuthStore((state) => state.user?.id);
  const queryKey = ['ward', userId, 'zones'];
  const zones = useQuery({ queryKey, queryFn: wardConfigApi.listZones });
  const [selected, setSelected] = useState<number | 'new' | null>(null);
  // Display only: the zone whose save just hit a 409, so its reloaded editor can say why.
  const [conflictZone, setConflictZone] = useState<number | null>(null);
  const headingId = useId();

  // Opening an editor moves focus to its title; below 1280px the editor sits under
  // the signs, so it is also scrolled into view.
  useEffect(() => {
    if (selected == null) return;
    const heading = document.getElementById(headingId);
    if (!heading) return;
    heading.focus({ preventScroll: true });
    const wide =
      typeof window.matchMedia === 'function' && window.matchMedia('(min-width: 1280px)').matches;
    if (!wide)
      heading.scrollIntoView?.({
        block: 'start',
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      });
  }, [selected, headingId]);

  if (zones.isPending)
    return (
      <Screen width="wide">
        <p role="status" className="text-body-md text-muted">
          Đang tải khu vực…
        </p>
        <div aria-hidden="true" className="flex flex-wrap gap-md">
          <div className="sb-shimmer h-7 w-24 rounded-sm" />
          <div className="sb-shimmer h-7 w-28 rounded-sm" />
          <div className="sb-shimmer h-7 w-56 rounded-sm" />
        </div>
        <div className="grid gap-md sm:grid-cols-2 xl:w-[420px] xl:grid-cols-1">
          <SignSkeleton />
          <SignSkeleton />
          <SignSkeleton />
        </div>
      </Screen>
    );
  if (zones.error)
    return (
      <Screen width="wide">
        <AppHeader title="Giá & khung giờ" back />
        <div className="flex flex-col items-start gap-md rounded-[20px] bg-[#FDEBEA] p-md md:p-lg dark:bg-[#3A1414]">
          <p
            role="alert"
            className="flex items-start gap-xs text-body-lg font-semibold text-[#8F1717] dark:text-[#FF9A90]"
          >
            <Icon
              name="alert-circle-outline"
              size={22}
              color="currentColor"
              className="mt-0.5 shrink-0"
            />
            {errorMessage(zones.error)}
          </p>
          <Button label="Thử lại" fullWidth={false} onPress={() => void zones.refetch()} />
        </div>
      </Screen>
    );

  const zone =
    typeof selected === 'number' ? zones.data.find((z) => z.zoneId === selected) : undefined;
  const choose = (next: number | 'new' | null) => {
    setConflictZone(null);
    setSelected(next);
  };
  const slotCount = zones.data.reduce((sum, z) => sum + z.slotCount, 0);
  const activeSlots = zones.data.reduce((sum, z) => sum + z.activeSlotCount, 0);
  const missingDocs = zones.data.filter((z) => z.regulationRef === null).length;
  const count = zones.data.length;

  const editor =
    selected === 'new' ? (
      <ZoneEditor
        key="new"
        zone={null}
        headingId={headingId}
        onClose={() => choose(null)}
        onSaved={(id) => {
          setSelected(id);
          void zones.refetch();
        }}
        onConflict={() => undefined}
      />
    ) : zone ? (
      <ZoneEditor
        key={`${zone.zoneId}-${zone.versionToken}`}
        zone={zone}
        headingId={headingId}
        conflictNotice={conflictZone === zone.zoneId}
        onClose={() => choose(null)}
        onSaved={() => {
          setConflictZone(null);
          void zones.refetch();
        }}
        onConflict={() => setConflictZone(zone.zoneId)}
      />
    ) : null;

  return (
    <Screen width="wide">
      <AppHeader title="Giá & khung giờ" back subtitle="WARD-02 · Theo từng khu vực" />
      <PricingSummaryLine
        zoneCount={count}
        slotCount={slotCount}
        activeSlots={activeSlots}
        missingDocs={missingDocs}
      />
      {count !== 1 && <IntroNote>{INTRO}</IntroNote>}

      <div className="grid items-start gap-lg xl:grid-cols-[420px_minmax(0,1fr)] xl:gap-xl">
        <div className="flex min-w-0 flex-col xl:sticky xl:top-0 xl:-m-1 xl:max-h-[calc(100dvh-120px)] xl:overflow-y-auto xl:p-1">
          <Section
            title={`Khu vực (${count})`}
            action={
              <Button
                label="Tạo khu vực"
                fullWidth={false}
                variant="civic"
                icon={<Icon name="plus-circle-outline" size={18} color="currentColor" />}
                onPress={() => choose('new')}
              />
            }
          >
            {count === 0 ? (
              <div className="flex flex-col items-center gap-sm rounded-[20px] bg-card px-md py-xl text-center shadow-card ring-1 ring-border">
                <EmptySignArt />
                <p className="font-sign text-[20px] font-bold text-text">Chưa có khu vực nào</p>
                <p className="max-w-[40ch] text-body-md text-muted">
                  Tạo khu vực đầu tiên để niêm yết giá thuê và khung giờ kinh doanh.
                </p>
                <Button label="Tạo khu vực" fullWidth={false} onPress={() => choose('new')} />
              </div>
            ) : (
              <ul className="grid gap-md sm:grid-cols-2 xl:grid-cols-1">
                {zones.data.map((z, i) => (
                  <li
                    key={z.zoneId}
                    className="sb-rise min-w-0"
                    style={{ '--delay': `${Math.min(i, 8) * 50}ms` } as CSSProperties}
                  >
                    <ZoneTariffSign
                      name={z.zoneName}
                      code={z.zoneCode}
                      price={z.pricePerDay}
                      from={z.availableFrom}
                      to={z.availableTo}
                      overnight={z.isOvernight}
                      occupancy={{ active: z.activeSlotCount, total: z.slotCount }}
                      regulationRef={z.regulationRef}
                      selected={selected === z.zoneId}
                      onPress={() => choose(z.zoneId)}
                      tags={<ZoneTags zone={z} />}
                    />
                  </li>
                ))}
                {count === 1 && (
                  <li className="min-w-0">
                    <ZoningGuide>{INTRO}</ZoningGuide>
                  </li>
                )}
              </ul>
            )}
          </Section>
        </div>

        <div className="min-w-0">{editor ?? <SelectPrompt />}</div>
      </div>
    </Screen>
  );
}

/** Facts already loaded with the zone that the old list never showed. */
function ZoneTags({ zone }: { zone: WardZone }) {
  return (
    <>
      {zone.isOvernight && <StatusChip label="Qua đêm" tone="pending" />}
      {zone.rentalMode === 'EVENT' && (
        <SignTag tone="mango">
          {zone.eventStartDate && zone.eventEndDate
            ? `Sự kiện ${shortDateVn(zone.eventStartDate)} – ${shortDateVn(zone.eventEndDate)}`
            : 'Sự kiện'}
        </SignTag>
      )}
      {zone.priceDisplayUnit === 'MONTH' && zone.pricePerMonth ? (
        <SignTag>Theo tháng {formatVnd(zone.pricePerMonth)}</SignTag>
      ) : null}
      {zone.feeComponents.length > 0 && (
        <SignTag tone="warm">+{zone.feeComponents.length} phụ phí</SignTag>
      )}
      {zone.applicationDeadline && (
        <SignTag>Hạn nhận đơn {fullDateVn(zone.applicationDeadline)}</SignTag>
      )}
    </>
  );
}

type Draft = {
  zoneName: string;
  zoneCode: string;
  pricePerDay: number | null;
  priceDisplayUnit: 'DAY' | 'MONTH';
  pricePerMonth: number | null;
  rentalMode: 'STANDARD' | 'EVENT';
  eventStartDate: string;
  eventEndDate: string;
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
    priceDisplayUnit: zone?.priceDisplayUnit ?? 'DAY',
    pricePerMonth: zone?.pricePerMonth ?? null,
    rentalMode: zone?.rentalMode ?? 'STANDARD',
    eventStartDate: zone?.eventStartDate ?? '',
    eventEndDate: zone?.eventEndDate ?? '',
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
  headingId,
  conflictNotice,
  onClose,
  onSaved,
  onConflict,
}: {
  zone: WardZone | null;
  headingId: string;
  conflictNotice?: boolean;
  onClose: () => void;
  onSaved: (zoneId: number) => void;
  onConflict: () => void;
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
  const priceReady =
    draft.priceDisplayUnit === 'MONTH'
      ? (draft.pricePerMonth ?? 0) > 0
      : (draft.pricePerDay ?? 0) > 0;
  const eventReady =
    draft.rentalMode === 'STANDARD' ||
    (!!draft.eventStartDate && !!draft.eventEndDate && draft.eventStartDate < draft.eventEndDate);
  const valid =
    draft.zoneName.trim() &&
    /^[A-Z0-9-]+$/.test(draft.zoneCode) &&
    priceReady &&
    eventReady &&
    !hoursError &&
    documentReady &&
    draft.feeComponents.every((c) => c.componentName.trim());
  const feeComponentsKey = JSON.stringify(
    draft.feeComponents.map((c) => ({ ...c, componentName: c.componentName.trim() })),
  );
  const previewKey = `${draft.pricePerDay}|${draft.from}|${draft.to}|${feeComponentsKey}`;
  const previewCurrent = preview?.key === previewKey;
  // Only price, hours or fee components change what a pending application/renewal is billed
  // (BR-32-adjacent: the real fee schedule includes fee components, not just price-per-day) --
  // a pure metadata edit (name, segment, permitting document) needs no impact review or reason.
  const amountOrHoursChanged =
    !isNew &&
    (zone!.pricePerDay !== (draft.pricePerDay ?? 0) ||
      toApiTime(draft.from) !== zone!.availableFrom ||
      toApiTime(draft.to) !== zone!.availableTo ||
      feeComponentsKey !==
        JSON.stringify(
          zone!.feeComponents.map(({ componentName, calcBasis, unitAmount }) => ({
            componentName,
            calcBasis,
            unitAmount,
          })),
        ));

  const request = (): UpsertZoneRequest => ({
    zoneName: draft.zoneName.trim(),
    zoneCode: draft.zoneCode.trim(),
    // price_per_day is ignored server-side when priceDisplayUnit is MONTH (it's derived from
    // pricePerMonth instead) -- see WardConfigurationService.ApplyZoneFields.
    pricePerDay: draft.pricePerDay ?? 0,
    priceDisplayUnit: draft.priceDisplayUnit,
    pricePerMonth: draft.priceDisplayUnit === 'MONTH' ? (draft.pricePerMonth ?? 0) : null,
    rentalMode: draft.rentalMode,
    eventStartDate: draft.rentalMode === 'EVENT' ? draft.eventStartDate || null : null,
    eventEndDate: draft.rentalMode === 'EVENT' ? draft.eventEndDate || null : null,
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
        draft.feeComponents.map((c) => ({ ...c, componentName: c.componentName.trim() })),
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
      if (isConflict(error)) {
        void client.invalidateQueries({ queryKey: ['ward', userId, 'zones'] });
        onConflict();
      }
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

  const monthly = draft.priceDisplayUnit === 'MONTH' && draft.rentalMode === 'STANDARD';

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col rounded-[28px] bg-card shadow-sheet ring-1 ring-border"
    >
      <div aria-hidden="true" className="sb-kerb sb-kerb-thin rounded-t-[28px]" />
      <div className="flex flex-col gap-lg p-md md:p-lg">
        <div className="flex items-start justify-between gap-sm">
          <div className="min-w-0">
            <p className="text-body-sm font-medium text-muted">
              {isNew ? 'Niêm yết khu vực mới' : 'Đang sửa biển giá'}
            </p>
            <h2
              id={headingId}
              tabIndex={-1}
              className="break-words font-sign text-[24px] font-bold leading-tight tracking-[-0.01em] text-text md:text-[26px]"
            >
              {isNew ? 'Tạo khu vực mới' : `Sửa khu vực ${zone.zoneName}`}
            </h2>
          </div>
          <Button label="Đóng" variant="ghost" fullWidth={false} onPress={onClose} />
        </div>

        {conflictNotice && <ConflictBand />}

        <div className="rounded-[24px] bg-[#FFF3E8] p-sm sm:p-md dark:bg-[#2A2420]">
          <p className="mb-xs text-body-xs font-semibold text-[#8A3206] dark:text-[#FFB98F]">
            Xem trước biển giá
          </p>
          <div className="max-w-[420px]">
            <ZoneTariffSign
              name={draft.zoneName.trim()}
              code={draft.zoneCode || null}
              price={monthly ? draft.pricePerMonth : draft.pricePerDay}
              unit={monthly ? 'tháng' : 'ngày'}
              from={draft.from || null}
              to={draft.to || null}
              overnight={overnight}
              tags={
                <>
                  {overnight && <SignTag tone="mango">QUA ĐÊM</SignTag>}
                  {draft.rentalMode === 'EVENT' && <SignTag tone="mango">Sự kiện</SignTag>}
                  {draft.feeComponents.length > 0 && (
                    <SignTag tone="warm">+{draft.feeComponents.length} phụ phí</SignTag>
                  )}
                </>
              }
            />
          </div>
        </div>

        <div className="cq flex flex-col gap-lg">
          <EditorGroup title="Nhận diện" icon="tag-outline">
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
          </EditorGroup>

          <EditorGroup title="Hình thức và giá" icon="cash-multiple">
            <div className="flex flex-col gap-xs">
              <p className="text-label text-text">Hình thức thuê</p>
              <SegmentedControl
                value={draft.rentalMode}
                onChange={(v) => {
                  set('rentalMode', v);
                  // An event's day-by-day pricing has no monthly equivalent worth entering.
                  if (v === 'EVENT') set('priceDisplayUnit', 'DAY');
                }}
                options={[
                  { value: 'STANDARD', label: 'Dài hạn (tháng/quý/năm)' },
                  { value: 'EVENT', label: 'Sự kiện (ngắn hạn, theo ngày)' },
                ]}
              />
            </div>
            {draft.rentalMode === 'EVENT' && (
              <div className="form-grid grid grid-cols-1 gap-sm sm:grid-cols-2">
                <DateInput
                  label="Ngày bắt đầu sự kiện"
                  value={draft.eventStartDate}
                  onChange={(v) => set('eventStartDate', v)}
                />
                <DateInput
                  label="Ngày kết thúc sự kiện"
                  value={draft.eventEndDate}
                  onChange={(v) => set('eventEndDate', v)}
                />
              </div>
            )}

            {draft.rentalMode === 'STANDARD' && (
              <SegmentedControl
                value={draft.priceDisplayUnit}
                onChange={(v) => set('priceDisplayUnit', v)}
                options={[
                  { value: 'DAY', label: 'Giá theo ngày' },
                  { value: 'MONTH', label: 'Giá theo tháng' },
                ]}
              />
            )}
            {monthly ? (
              <MoneyInput
                label="Giá thuê mỗi tháng"
                value={draft.pricePerMonth}
                onChange={(v) => set('pricePerMonth', v)}
                helperText={
                  draft.pricePerMonth
                    ? `≈ ${Math.round(draft.pricePerMonth / 30).toLocaleString('vi-VN')}đ/ngày`
                    : undefined
                }
              />
            ) : (
              <MoneyInput
                label="Giá thuê mỗi ngày"
                value={draft.pricePerDay}
                onChange={(v) => set('pricePerDay', v)}
              />
            )}
          </EditorGroup>

          <EditorGroup title="Khung giờ và đoạn đường" icon="clock-outline">
            <div className="form-grid grid grid-cols-2 gap-sm">
              <TimeInput
                label="Giờ bắt đầu"
                value={draft.from}
                onChange={(v) => set('from', v)}
                error={hoursError}
              />
              <TimeInput label="Giờ kết thúc" value={draft.to} onChange={(v) => set('to', v)} />
            </div>
            {overnight && (
              <StatusChip label="Ca qua đêm: kết thúc vào sáng hôm sau" tone="pending" />
            )}
            <div className="form-grid grid grid-cols-1 gap-sm sm:grid-cols-2">
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
          </EditorGroup>

          <EditorGroup title="Văn bản cho phép mở khu vực" icon="file-document-outline">
            {!isNew && (
              <div className="flex flex-wrap items-center justify-between gap-sm">
                {zone.regulationRef ? (
                  <p className="min-w-0 text-body-md text-muted">
                    Hiện tại: <span className="font-semibold text-text">{zone.regulationRef}</span>
                  </p>
                ) : (
                  <p className="flex items-center gap-1 rounded-[6px] bg-[#FDEBEA] px-2 py-1 text-body-md font-semibold text-[#8F1717] dark:bg-[#3A1414] dark:text-[#FF9A90]">
                    <Icon name="alert-circle-outline" size={17} color="currentColor" />
                    Hiện tại: chưa có
                  </p>
                )}
                <Button
                  label={changeDocument ? 'Giữ văn bản hiện tại' : 'Cập nhật văn bản'}
                  variant="ghost"
                  fullWidth={false}
                  onPress={() => setChangeDocument(!changeDocument)}
                />
              </div>
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
          </EditorGroup>

          <FeeComponentsEditor
            value={draft.feeComponents}
            onChange={(v) => set('feeComponents', v)}
          />
        </div>

        {!isNew && (
          <section className="cq flex flex-col gap-md rounded-[20px] bg-sunken/70 p-md md:p-lg">
            <h3 className="flex items-center gap-xs font-sign text-[15px] font-bold text-text">
              <span className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-card text-primary">
                <Icon name="receipt-text-outline" size={17} color="currentColor" />
              </span>
              Tác động và lý do
            </h3>
            {amountOrHoursChanged && (
              <div className="flex flex-col">
                <Button
                  label="Xem tác động trước khi lưu"
                  variant="outline"
                  disabled={!valid}
                  loading={impact.isPending}
                  icon={<Icon name="receipt-text-outline" size={18} color="currentColor" />}
                  onPress={() => impact.mutate()}
                />
                {previewCurrent && preview && <ImpactReceipt preview={preview.data} />}
              </div>
            )}
            <TextField
              label={amountOrHoursChanged ? 'Lý do thay đổi' : 'Lý do thay đổi (không bắt buộc)'}
              value={reason}
              onChangeText={setReason}
              multiline
              maxLength={500}
            />
          </section>
        )}

        <SaveDock
          hint={
            !isNew && amountOrHoursChanged && !previewCurrent ? (
              <p className="flex items-center gap-xs text-body-sm font-medium text-[#6B4100] dark:text-[#FFD27A]">
                <Icon
                  name="alert-circle-outline"
                  size={16}
                  color="currentColor"
                  className="shrink-0"
                />
                Đổi giá, giờ hoặc phụ phí cố định cần xem tác động trước khi lưu.
              </p>
            ) : null
          }
        >
          <Button
            label={isNew ? 'Tạo khu vực' : 'Lưu thay đổi'}
            variant="approve"
            disabled={
              !valid || (!isNew && amountOrHoursChanged && (!previewCurrent || !reason.trim()))
            }
            loading={save.isPending}
            onPress={() => save.mutate()}
          />
        </SaveDock>

        {!isNew && (
          <div className="flex flex-wrap items-center justify-between gap-sm">
            <Button
              label={showHistory ? 'Ẩn lịch sử' : 'Lịch sử thay đổi'}
              variant="ghost"
              fullWidth={false}
              icon={<Icon name="clock-outline" size={18} color="currentColor" />}
              onPress={() => setShowHistory(!showHistory)}
            />
            {zone.slotCount === 0 && zone.featureCount === 0 && (
              <Button
                label="Xóa khu vực"
                variant="danger"
                fullWidth={false}
                icon={<Icon name="trash-can-outline" size={18} color="currentColor" />}
                onPress={() => setConfirmDelete(true)}
              />
            )}
          </div>
        )}
        {!isNew && showHistory && <ZoneHistory zoneId={zone.zoneId} />}
      </div>
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
    </section>
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
    <EditorGroup
      title="Phụ phí cố định"
      icon="receipt-text-outline"
      description="Các khoản này được cộng thẳng vào hoá đơn chính thức của hộ kinh doanh khi hợp đồng được duyệt (theo ngày × số ngày thuê, hoặc một lần mỗi kỳ) — không phải chỉ để tham khảo."
    >
      {value.map((c, i) => (
        <div
          key={i}
          className="flex flex-col gap-sm rounded-[16px] border border-border bg-bg/60 p-sm md:p-md"
        >
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
          <div className="flex justify-end">
            <Button
              label="Bỏ khoản này"
              variant="ghost"
              fullWidth={false}
              icon={<Icon name="trash-can-outline" size={17} color="currentColor" />}
              onPress={() => onChange(value.filter((_, idx) => idx !== i))}
            />
          </div>
        </div>
      ))}
      {value.length < 20 && (
        <div>
          <Button
            label="Thêm khoản phí"
            variant="outline"
            fullWidth={false}
            icon={<Icon name="plus-circle-outline" size={18} color="currentColor" />}
            onPress={() =>
              onChange([...value, { componentName: '', calcBasis: 'PER_DAY', unitAmount: 0 }])
            }
          />
        </div>
      )}
    </EditorGroup>
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
  if (history.isPending)
    return (
      <p role="status" className="text-body-md text-muted">
        Đang tải lịch sử…
      </p>
    );
  if (history.error)
    return (
      <p role="alert" className="text-body-md text-error">
        {errorMessage(history.error)}
      </p>
    );
  if (history.data.length === 0)
    return <p className="text-body-md text-muted">Chưa có thay đổi nào được ghi nhận.</p>;
  return (
    <ol className="sb-pop ml-xs flex flex-col gap-md border-l-2 border-border pl-md">
      {history.data.map((entry) => {
        const details = parseDetails(entry.details);
        const priceChanged =
          details?.before?.pricePerDay != null &&
          details.after?.pricePerDay != null &&
          details.before.pricePerDay !== details.after.pricePerDay;
        return (
          <li key={entry.auditId} className="relative flex flex-col gap-1 text-body-md">
            <span
              aria-hidden="true"
              className="absolute -left-[23px] top-1.5 h-3 w-3 rounded-full bg-card ring-[3px] ring-brand"
            />
            <p className="text-text">
              <strong>{historyLabels[entry.action] ?? entry.action}</strong>
              <span className="text-muted">
                {' '}
                · {entry.actorName} ·{' '}
                {new Date(entry.createdAt).toLocaleString('vi-VN', {
                  timeZone: 'Asia/Ho_Chi_Minh',
                })}
              </span>
            </p>
            {priceChanged && (
              <p className="w-fit rounded-[6px] bg-[#FFF3E8] px-2 py-0.5 text-body-sm font-semibold text-[#8A3206] font-tabular dark:bg-[#2A2420] dark:text-[#FFB98F]">
                Giá {vndInline(details.before!.pricePerDay!)} →{' '}
                {vndInline(details.after!.pricePerDay!)}
              </p>
            )}
            {details?.reason && <p className="text-body-sm text-muted">Lý do: {details.reason}</p>}
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
