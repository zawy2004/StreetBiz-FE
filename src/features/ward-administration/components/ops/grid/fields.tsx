import { Children, type ReactNode } from 'react';

import { Icon, type IconName } from '@/components/common';
import { SelectField, TextField } from '@/components/forms';
import { Checkbox } from '../../ConfigFields';
import {
  businessCategoryLabels,
  featureTypeLabels,
  type PlacementIssue,
  type SlotFacilities,
  type StreetFeatureType,
  type WardZone,
} from '../../../ward-config-api';
import { hasBlock, zoneMeta } from './placement';
import { featureIcon } from './tokens';

/**
 * One work sheet of the inspector: a title row (with its own close / cancel on
 * the right) over the fields. `cq` makes the fields lay out for the sheet's
 * width, not the screen's, so labels stack inside the 400px column.
 */
export function InspectorCard({
  title,
  eyebrow,
  action,
  header,
  children,
  id,
}: {
  title?: ReactNode;
  eyebrow?: string;
  action?: ReactNode;
  /** Replaces the plain title row (the slot sheet draws its plate there). */
  header?: ReactNode;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section
      id={id}
      className="cq sb-pop flex flex-col overflow-hidden rounded-[20px] bg-card shadow-card ring-1 ring-border"
    >
      {header ?? (
        <div className="flex items-start justify-between gap-sm border-b border-border px-md py-sm">
          <div className="min-w-0 pt-1">
            {eyebrow ? (
              <p className="text-body-xs font-semibold uppercase tracking-[0.06em] text-muted">
                {eyebrow}
              </p>
            ) : null}
            <h2 className="break-words font-sign text-[22px] font-extrabold leading-tight tracking-[-0.01em] text-text [font-stretch:90%]">
              {title}
            </h2>
          </div>
          {action}
        </div>
      )}
      <div className="flex flex-col gap-md p-md">{children}</div>
    </section>
  );
}

/** Small uppercase caption between groups of fields inside a sheet. */
export function SheetRule({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-center gap-xs text-body-xs font-semibold uppercase tracking-[0.06em] text-muted after:h-px after:flex-1 after:bg-border">
      {children}
    </p>
  );
}

/**
 * Zone choice as chips that carry the zone's day price and hours, which the
 * screen has already loaded. Same `.field` frame as the other inputs, so the
 * label moves beside the chips on wide sheets exactly like theirs.
 */
export function ZonePicker({
  label,
  zones,
  value,
  onChange,
  allLabel,
}: {
  label: string;
  zones: WardZone[];
  value: number | null;
  onChange: (zoneId: number | null) => void;
  /** Adds a first "all zones" chip (value null). */
  allLabel?: string;
}) {
  const options: { id: number | null; name: string; meta: string }[] = [
    ...(allLabel ? [{ id: null, name: allLabel, meta: `${zones.length} khu vực` }] : []),
    ...zones.map((z) => ({ id: z.zoneId, name: z.zoneName, meta: zoneMeta(z) })),
  ];
  return (
    <div className="field" data-align="center">
      <span className="field-label text-label text-text">{label}</span>
      <div className="field-control">
        <div
          role="radiogroup"
          aria-label={label}
          className="no-scrollbar -mx-1 flex gap-xs overflow-x-auto px-1 py-0.5 md:flex-wrap md:overflow-visible"
        >
          {options.map((opt) => {
            const selected = opt.id === value;
            return (
              <button
                key={opt.id ?? 'all'}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onChange(opt.id)}
                className={[
                  'flex min-h-12 shrink-0 flex-col justify-center rounded-[12px] border px-sm py-1 text-left transition-colors duration-150',
                  selected
                    ? 'border-primary bg-tint-primary shadow-[0_8px_20px_-14px_rgb(var(--c-primary)/0.9)]'
                    : 'border-border bg-card hover:border-text/30',
                ].join(' ')}
              >
                <span
                  className={`max-w-[220px] truncate text-label font-semibold ${selected ? 'text-primary' : 'text-text'}`}
                >
                  {opt.name}
                </span>
                <span className="font-tabular text-body-xs text-muted">{opt.meta}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** "Thuộc khu vực" inside a work sheet; the panel always has one zone chosen. */
export function ZoneSelect({
  zones,
  value,
  onChange,
}: {
  zones: WardZone[];
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <ZonePicker
      label="Thuộc khu vực"
      zones={zones}
      value={value}
      onChange={(id) => {
        if (id != null) onChange(id);
      }}
    />
  );
}

/** Street feature type as icon chips (same choice as a radio group). */
export function FeatureTypePicker({
  value,
  onChange,
}: {
  value: StreetFeatureType;
  onChange: (v: StreetFeatureType) => void;
}) {
  return (
    <div className="field" data-align="center">
      <span className="field-label text-label text-text">Loại</span>
      <div className="field-control">
        <div role="radiogroup" aria-label="Loại" className="flex flex-wrap gap-xs">
          {(Object.keys(featureTypeLabels) as StreetFeatureType[]).map((k) => {
            const selected = k === value;
            return (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onChange(k)}
                className={[
                  'flex min-h-12 items-center gap-xs rounded-[12px] border px-sm text-label transition-colors duration-150',
                  selected
                    ? 'border-primary bg-tint-primary font-semibold text-primary'
                    : 'border-border bg-card text-text hover:border-text/30',
                ].join(' ')}
              >
                <Icon name={featureIcon(k)} size={18} color="currentColor" />
                {featureTypeLabels[k]}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** A facility as a tile: the native checkbox, its icon, and the same label text as before. */
function FacilityToggle({
  label,
  icon,
  checked,
  onChange,
}: {
  label: string;
  icon: IconName;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      className={[
        'flex min-h-12 cursor-pointer items-center gap-xs rounded-[12px] border px-sm text-body-md transition-colors duration-150 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary',
        checked
          ? 'border-tertiary/50 bg-tint-tertiary font-semibold text-text'
          : 'border-border bg-card text-text hover:border-text/30',
      ].join(' ')}
    >
      <input
        type="checkbox"
        className="h-5 w-5 shrink-0 accent-[rgb(var(--c-tertiary))]"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <Icon
        name={icon}
        size={18}
        color="currentColor"
        weight={checked ? 'fill' : 'regular'}
        className={checked ? 'shrink-0 text-tertiary' : 'shrink-0 text-muted'}
      />
      <span className="min-w-0 leading-tight">{label}</span>
    </label>
  );
}

export function FacilitiesFields({
  value,
  onChange,
}: {
  value: SlotFacilities;
  onChange: (v: SlotFacilities) => void;
}) {
  return (
    <>
      <div className="flex flex-wrap gap-xs">
        <FacilityToggle
          label="Có điện"
          icon="flash-outline"
          checked={value.hasPower}
          onChange={(v) => onChange({ ...value, hasPower: v })}
        />
        <FacilityToggle
          label="Có nước"
          icon="water-outline"
          checked={value.hasWater}
          onChange={(v) => onChange({ ...value, hasWater: v })}
        />
        <FacilityToggle
          label="Có thùng rác"
          icon="trash-can-outline"
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

/** Saving over WARN issues: tick, then give a reason. Nothing to acknowledge when there is a BLOCK. */
export function WarningAck({
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
    <AckBox>
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
    </AckBox>
  );
}

/** Mango-washed frame around a "yes, I have read the warnings" confirmation. */
export function AckBox({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-xs rounded-[14px] bg-[#FFF3D1] px-sm py-xs ring-1 ring-[#C98A04]/35 dark:bg-[#3A2A08]">
      {children}
    </div>
  );
}

/** Width / length (/ gap) side by side; each cell is its own container so its label stacks. */
export function SizeGrid({ columns, children }: { columns: 2 | 3; children: ReactNode }) {
  return (
    <div className={`grid items-end gap-sm ${columns === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
      {Children.map(children, (child) => (
        <div className="cq min-w-0">{child}</div>
      ))}
    </div>
  );
}
