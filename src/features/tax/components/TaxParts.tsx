import { useId, type ReactNode } from 'react';

import { Icon, formatVnd } from '@/components/common';
import { EmptyState } from '@/components/feedback';
import { Field, TextField, inputShellClass, SegmentedControl } from '@/components/forms';
import { BottomSheet } from '@/components/layout';
import { StatusChip } from '@/components/status';
import type { TaxMonthRevenueDto, ThresholdLevel } from '@/core/api';
import { colors } from '@/theme';
import {
  LEVEL_LABEL,
  LEVEL_TONE,
  formatCompactVnd,
  groupDigits,
  parseDigits,
  taxYears,
} from '../tax-format';

/** Shown instead of the tax screens when the app runs on the demo database. */
export function TaxNeedsServer() {
  return (
    <EmptyState
      icon="information-outline"
      title="Phần thuế chỉ có khi kết nối máy chủ"
      description="Số liệu doanh thu và thuế lấy từ máy chủ StreetBiz nên không có trong bản demo."
    />
  );
}

/** The standing reminder that StreetBiz computes references, never filings. */
export function Disclaimer({ text }: { text: string }) {
  return (
    <p className="flex gap-xs rounded-[14px] bg-sunken px-md py-sm text-body-sm text-muted">
      <Icon name="information-outline" size={18} color={colors.muted} className="mt-0.5 shrink-0" />
      <span>{text}</span>
    </p>
  );
}

export function LevelChip({ level }: { level: ThresholdLevel }) {
  return <StatusChip label={LEVEL_LABEL[level]} tone={LEVEL_TONE[level]} />;
}

/** Year picker; draws nothing while only one tax year exists. */
export function YearTabs({ year, onChange }: { year: number; onChange: (year: number) => void }) {
  const years = taxYears();
  if (years.length < 2) return null;
  return (
    <SegmentedControl
      options={years.map((value) => ({ value: String(value), label: `Năm ${value}` }))}
      value={String(year)}
      onChange={(value) => onChange(Number(value))}
    />
  );
}

const LEVEL_COLOR: Record<ThresholdLevel, string> = {
  SAFE: colors.tertiary,
  NEAR: colors.secondary,
  OVER: colors.error,
};

type GaugeProps = {
  revenue: number;
  threshold: number;
  level: ThresholdLevel;
  /** Forecast for the whole year, drawn as a lighter extension; omitted when there is no forecast. */
  projected?: number;
};

/**
 * Revenue against the no-tax threshold. The bar's scale stretches to fit the forecast, so a
 * household heading past the threshold sees where it will land, and the threshold itself is a
 * ruled mark with its label rather than a colour alone.
 */
export function ThresholdGauge({ revenue, threshold, level, projected }: GaugeProps) {
  const top = Math.max(threshold, revenue, projected ?? 0) * 1.08;
  const pct = (amount: number) => `${Math.min(100, (amount / top) * 100)}%`;
  const label =
    `Doanh thu ${formatVnd(revenue)}, ngưỡng ${formatVnd(threshold)}` +
    (projected ? `, dự báo cả năm ${formatVnd(projected)}` : '');

  return (
    <div className="flex flex-col gap-xs">
      <div role="img" aria-label={label} className="relative h-4 w-full rounded-full bg-sunken">
        {projected && projected > revenue ? (
          <span
            className="absolute inset-y-0 left-0 rounded-full opacity-30"
            style={{ width: pct(projected), backgroundColor: LEVEL_COLOR[level] }}
          />
        ) : null}
        <span
          className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700"
          style={{ width: pct(revenue), backgroundColor: LEVEL_COLOR[level] }}
        />
        <span
          aria-hidden="true"
          className="absolute -inset-y-1.5 w-0.5 rounded-full bg-text"
          style={{ left: pct(threshold) }}
        />
      </div>
      <div className="relative h-5 text-body-xs text-muted">
        <span>0</span>
        <span
          className="absolute -translate-x-1/2 whitespace-nowrap font-semibold text-text"
          style={{ left: pct(threshold) }}
        >
          Ngưỡng {formatCompactVnd(threshold)}
        </span>
      </div>
    </div>
  );
}

/** Twelve stacked bars: StreetBiz orders under, sales the household recorded on top. */
export function MonthBars({ months }: { months: TaxMonthRevenueDto[] }) {
  const max = Math.max(1, ...months.map((month) => month.total));
  const summary = months
    .filter((month) => month.total > 0)
    .map((month) => `tháng ${month.month}: ${formatVnd(month.total)}`)
    .join('; ');
  return (
    <div className="flex flex-col gap-xs">
      <div
        role="img"
        aria-label={`Doanh thu theo tháng. ${summary || 'Chưa có doanh thu.'}`}
        className="flex h-32 items-end gap-1"
      >
        {months.map((month) => (
          <div key={month.month} className="flex h-full min-w-0 flex-1 flex-col justify-end">
            <span
              className="w-full rounded-t-[3px] bg-accent"
              style={{ height: `${(month.recorded / max) * 100}%` }}
            />
            <span
              className={`w-full bg-primary ${month.recorded > 0 ? '' : 'rounded-t-[3px]'}`}
              style={{ height: `${(month.online / max) * 100}%` }}
            />
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="flex gap-1">
        {months.map((month) => (
          <span key={month.month} className="min-w-0 flex-1 text-center text-body-xs text-muted">
            {month.month}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-md gap-y-2xs text-body-sm text-muted">
        <span className="inline-flex items-center gap-xs">
          <span aria-hidden="true" className="h-3 w-3 rounded-[3px] bg-primary" />
          Đơn hàng StreetBiz
        </span>
        <span className="inline-flex items-center gap-xs">
          <span aria-hidden="true" className="h-3 w-3 rounded-[3px] bg-accent" />
          Bán trực tiếp do hộ ghi
        </span>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------------------- inputs

type MoneyInputProps = {
  label: string;
  /** Raw digits, e.g. "1500000". */
  value: string;
  onChange: (digits: string) => void;
  error?: string;
  helperText?: string;
  placeholder?: string;
};

/** A VND amount typed as digits and shown grouped: 1.500.000. */
export function MoneyInput({ label, value, onChange, error, helperText, placeholder }: MoneyInputProps) {
  return (
    <TextField
      label={label}
      keyboardType="numeric"
      value={groupDigits(value)}
      onChangeText={(text) => onChange(String(parseDigits(text) || ''))}
      error={error}
      helperText={helperText}
      placeholder={placeholder}
      maxLength={17}
    />
  );
}

type DateInputProps = {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  min?: string;
  max?: string;
  error?: string;
};

/** The browser's date picker, in the same frame as the other text fields. */
export function DateInput({ label, value, onChange, min, max, error }: DateInputProps) {
  const id = useId();
  return (
    <Field htmlFor={id} label={label} error={error}>
      <input
        id={id}
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(event) => onChange(event.target.value)}
        className={`${inputShellClass(error)} h-12 w-full px-sm text-body-lg text-text`}
      />
    </Field>
  );
}

type ToggleProps = {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

/** An on/off setting with its explanation beside it. */
export function Toggle({ label, description, checked, onChange }: ToggleProps) {
  const id = useId();
  return (
    <div className="flex items-start gap-sm">
      <button
        type="button"
        role="switch"
        id={id}
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        onClick={() => onChange(!checked)}
        className={[
          'relative mt-0.5 inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors',
          checked ? 'border-tertiary bg-tertiary' : 'border-border bg-sunken',
        ].join(' ')}
      >
        <span
          aria-hidden="true"
          className={[
            'inline-block h-5 w-5 rounded-full bg-card shadow-card transition-transform',
            checked ? 'translate-x-[24px]' : 'translate-x-[3px]',
          ].join(' ')}
        />
      </button>
      <div className="min-w-0">
        <p id={`${id}-label`} className="text-body-lg font-medium text-text">
          {label}
        </p>
        {description ? <p className="text-body-sm text-muted">{description}</p> : null}
      </div>
    </div>
  );
}

/** A bottom sheet with a heading and optional lead-in text, for the short forms on these screens. */
export function FormSheet({
  visible,
  title,
  description,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <h2 className="text-headline-md text-text">{title}</h2>
      {description ? <p className="text-body-md text-muted">{description}</p> : null}
      {children}
    </BottomSheet>
  );
}

/** One label/value line of a result card. */
export function FactRow({
  label,
  value,
  strong,
  hint,
}: {
  label: string;
  value: ReactNode;
  strong?: boolean;
  hint?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-md py-1.5">
      <div className="min-w-0">
        <p className={`text-body-md ${strong ? 'font-semibold text-text' : 'text-muted'}`}>{label}</p>
        {hint ? <p className="text-body-xs text-muted">{hint}</p> : null}
      </div>
      <span
        className={`shrink-0 text-right font-tabular ${strong ? 'text-money text-text' : 'text-body-md text-text'}`}
      >
        {value}
      </span>
    </div>
  );
}
