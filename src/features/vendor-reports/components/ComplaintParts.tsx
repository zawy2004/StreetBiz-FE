import { useId } from 'react';

import { formatVnd, Icon } from '@/components/common';
import { Field, inputShellClass } from '@/components/forms';
import { VERDICT_TONES } from '@/components/illustrations';
import type { VendorReportType } from '@/core/api/ai-api';
import type { PriceBoardItem } from '@/core/api/seller-store-api';
import { priceWithUnit } from '@/features/price-board/price-board-format';
import { MAX_QUANTITY, type OverchargeCheck } from '../complaint-math';
import { REPORT_TYPE_ICONS, REPORT_TYPE_LABELS, REPORT_TYPES } from '../report-kinds';

const TYPE_HINTS: Record<VendorReportType, string> = {
  OVERCHARGE: 'Bạn bị tính tiền cao hơn giá trên bảng giá của quầy.',
  PRICE_NOT_POSTED: 'Quầy không treo bảng giá để khách xem trước khi mua.',
  GENERAL: 'Bán sai vị trí, lấn chiếm lối đi, giấy phép bất thường…',
};

/** What the report is about, as three large choices with a line each. */
export function ReportTypePicker({
  value,
  onChange,
}: {
  value: VendorReportType;
  onChange: (type: VendorReportType) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Loại phản ánh" className="grid gap-sm md:grid-cols-3">
      {REPORT_TYPES.map((type) => {
        const selected = type === value;
        return (
          <button
            key={type}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(type)}
            className={[
              'flex items-start gap-sm rounded-[16px] border-[1.5px] p-sm text-left transition-[background-color,border-color,box-shadow] duration-150 md:flex-col md:gap-xs md:p-md',
              selected
                ? 'border-primary bg-tint-primary shadow-[0_8px_20px_-14px_rgb(var(--c-primary)/0.9)]'
                : 'border-border bg-card hover:border-text/25',
            ].join(' ')}
          >
            <span
              aria-hidden="true"
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] ${selected ? 'bg-primary text-on-primary' : 'bg-sunken text-text'}`}
            >
              <Icon name={REPORT_TYPE_ICONS[type]} size={20} color="currentColor" />
            </span>
            <span className="min-w-0">
              <span
                className={`block text-[16px] font-semibold leading-snug ${selected ? 'text-primary' : 'text-text'}`}
              >
                {REPORT_TYPE_LABELS[type]}
              </span>
              <span className="mt-0.5 block text-body-sm text-muted">{TYPE_HINTS[type]}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** The dishes on the live board, one radio each with its price and unit. */
export function DishPicker({
  items,
  value,
  onChange,
}: {
  items: PriceBoardItem[];
  value: number | null;
  onChange: (menuItemId: number) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Món đã mua" className="flex flex-col gap-xs">
      {items.map((item) => {
        const selected = item.menuItemId === value;
        return (
          <button
            key={item.menuItemId}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(item.menuItemId)}
            className={[
              'flex min-h-14 items-center gap-sm rounded-[14px] border-[1.5px] px-md py-xs text-left transition-colors',
              selected
                ? 'border-primary bg-tint-primary'
                : 'border-border bg-card hover:border-text/25',
            ].join(' ')}
          >
            <Icon
              name={selected ? 'check-circle' : 'circle-outline'}
              size={20}
              color="currentColor"
              weight={selected ? 'fill' : 'regular'}
              className={`shrink-0 ${selected ? 'text-primary' : 'text-muted'}`}
            />
            <span className="min-w-0 flex-1">
              <span className="block text-[16px] font-semibold leading-snug text-text">
                {item.name}
              </span>
              {item.nameEn ? (
                <span lang="en" className="block text-body-sm italic text-muted">
                  {item.nameEn}
                </span>
              ) : null}
            </span>
            <span className="shrink-0 font-sign text-[18px] font-bold text-primary font-tabular [font-stretch:94%]">
              {priceWithUnit(item.unitPrice, item.priceUnit)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** How many units were bought: a number field between a minus and a plus (44px each). */
export function QuantityStepper({
  value,
  onChange,
  unit,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  unit?: string;
}) {
  const id = useId();
  const step = (delta: number) =>
    onChange(Math.min(Math.max((value ?? 0) + delta, 1), MAX_QUANTITY));
  const button =
    'flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] bg-card text-text ring-1 ring-inset ring-border transition-colors hover:bg-sunken disabled:opacity-40';
  return (
    <Field htmlFor={id} label={unit ? `Số lượng (${unit})` : 'Số lượng'}>
      <div className="flex items-center gap-xs">
        <button
          type="button"
          aria-label="Bớt một"
          className={button}
          disabled={(value ?? 0) <= 1}
          onClick={() => step(-1)}
        >
          <Icon name="minus" size={18} color="currentColor" />
        </button>
        <input
          id={id}
          inputMode="numeric"
          value={value == null ? '' : String(value)}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
            onChange(digits ? Math.min(Number(digits), MAX_QUANTITY) : null);
          }}
          className={`${inputShellClass()} h-12 w-20 px-sm text-center text-body-lg font-semibold text-text font-tabular`}
        />
        <button
          type="button"
          aria-label="Thêm một"
          className={button}
          disabled={(value ?? 0) >= MAX_QUANTITY}
          onClick={() => step(1)}
        >
          <Icon name="plus" size={18} color="currentColor" />
        </button>
      </div>
    </Field>
  );
}

/** When the buyer paid, as the wall clock in Việt Nam reads it, within the last 7 days. */
export function PurchaseTimeField({
  value,
  onChange,
  min,
  max,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  min: string;
  max: string;
  error?: string;
}) {
  const id = useId();
  const messageId = `${id}-message`;
  return (
    <Field
      htmlFor={id}
      label="Giờ mua"
      error={error}
      helperText="Giờ Việt Nam. Mặc định là bây giờ; chọn được trong 7 ngày gần nhất."
      messageId={messageId}
    >
      <input
        id={id}
        type="datetime-local"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={messageId}
        className={`${inputShellClass(error)} h-12 w-full px-sm text-body-lg text-text`}
      />
    </Field>
  );
}

/**
 * The sum the buyer sees while filling the form: posted price × quantity, the amount
 * charged and the difference. Not above the posted price: this kind cannot be sent, and
 * "Phản ánh khác" is offered instead.
 */
export function OverchargeSum({
  check,
  item,
  quantity,
  onSwitchToGeneral,
}: {
  check: OverchargeCheck;
  item: PriceBoardItem | undefined;
  quantity: number | null;
  onSwitchToGeneral: () => void;
}) {
  const danger = VERDICT_TONES.danger;
  const pending = VERDICT_TONES.pending;
  return (
    <section aria-label="Đối chiếu giá" aria-live="polite" className="flex flex-col gap-sm">
      <dl className="grid gap-px overflow-hidden rounded-[16px] bg-border ring-1 ring-border sm:grid-cols-3">
        <div className="flex flex-col gap-1 bg-card p-sm md:p-md">
          <dt className="text-body-xs text-muted">Giá niêm yết × số lượng</dt>
          <dd className="text-[16px] font-semibold leading-snug text-text font-tabular">
            {item && quantity
              ? `${formatVnd(item.unitPrice)} × ${quantity} ${item.priceUnit}`
              : '—'}
            {check.state !== 'incomplete' ? (
              <span className="block font-sign text-[20px] font-bold [font-stretch:94%]">
                = {formatVnd(check.posted)}
              </span>
            ) : null}
          </dd>
        </div>
        <div className="flex flex-col gap-1 bg-card p-sm md:p-md">
          <dt className="text-body-xs text-muted">Bạn bị tính</dt>
          <dd className="font-sign text-[20px] font-bold leading-snug text-text font-tabular [font-stretch:94%]">
            {check.state !== 'incomplete' ? formatVnd(check.charged) : '—'}
          </dd>
        </div>
        <div
          className={`flex flex-col gap-1 p-sm md:p-md ${check.state === 'above' ? danger.wash : 'bg-card'}`}
        >
          <dt className={`text-body-xs ${check.state === 'above' ? danger.ink : 'text-muted'}`}>
            Chênh lệch
          </dt>
          <dd
            className={`font-sign text-[22px] font-extrabold leading-snug font-tabular [font-stretch:92%] ${check.state === 'above' ? danger.ink : 'text-text'}`}
          >
            {check.state === 'incomplete'
              ? '—'
              : `${check.difference > 0 ? '+' : ''}${formatVnd(check.difference)}`}
          </dd>
        </div>
      </dl>
      {check.state === 'not-above' ? (
        <div
          role="alert"
          className={`flex flex-col gap-sm rounded-[16px] px-md py-sm sm:flex-row sm:items-center sm:justify-between ${pending.wash}`}
        >
          <p className={`text-body-md font-semibold ${pending.ink}`}>
            Số tiền bị tính không cao hơn giá niêm yết, nên không gửi được khiếu nại loại này.
          </p>
          <button
            type="button"
            onClick={onSwitchToGeneral}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-full bg-card px-md text-label font-semibold text-text shadow-card ring-1 ring-border hover:ring-text/25"
          >
            <Icon name="flag-outline" size={16} color="currentColor" />
            Chuyển sang Phản ánh khác
          </button>
        </div>
      ) : null}
      <p className="flex items-start gap-xs text-body-sm text-muted">
        <Icon
          name="shield-check-outline"
          size={16}
          color="currentColor"
          className="mt-0.5 shrink-0 text-tertiary"
        />
        Máy chủ đối chiếu đúng giá niêm yết lúc bạn mua (theo lịch sử bảng giá); bạn không cần tự
        khai giá niêm yết.
      </p>
    </section>
  );
}

/** An overcharge needs the stall's live board: say how to get it when this form has none. */
export function BoardMissingNote({ invalid, onScan }: { invalid: boolean; onScan: () => void }) {
  const tone = VERDICT_TONES.neutral;
  return (
    <div className={`flex flex-col gap-sm rounded-[16px] p-md ${tone.wash}`}>
      <p className={`flex items-start gap-xs text-body-md font-semibold ${tone.ink}`}>
        <Icon
          name="information-outline"
          size={20}
          color="currentColor"
          className="mt-0.5 shrink-0"
        />
        {invalid
          ? 'Quầy này không có bảng giá đang công bố (giấy phép không còn hiệu lực hoặc chưa niêm yết), nên chưa khiếu nại giá được. Bạn vẫn gửi được "Phản ánh khác".'
          : 'Khiếu nại giá cần bảng giá của quầy. Hãy quét mã QR trên bảng giá tại quầy rồi chọn "Bị tính cao hơn giá niêm yết".'}
      </p>
      {!invalid ? (
        <button
          type="button"
          onClick={onScan}
          className="inline-flex h-11 w-fit items-center gap-1.5 rounded-full bg-card px-md text-label font-semibold text-text shadow-card ring-1 ring-border hover:ring-text/25"
        >
          <Icon name="qrcode-scan" size={16} color="currentColor" />
          Quét mã QR
        </button>
      ) : null}
    </div>
  );
}
