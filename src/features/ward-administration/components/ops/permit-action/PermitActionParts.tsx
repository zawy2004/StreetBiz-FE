import type { ReactNode } from 'react';

import { Icon, type IconName } from '@/components/common';
import { VERDICT_TONES } from '@/components/illustrations';

export type PermitActionKind = 'SUSPEND' | 'REVOKE';

const DANGER = VERDICT_TONES.danger;

const STAMP_WORDS: Record<PermitActionKind, string> = {
  SUSPEND: 'TẠM ĐÌNH CHỈ',
  REVOKE: 'THU HỒI VĨNH VIỄN',
};

/**
 * What is about to happen, drawn: a faded permit pass (kerb along the top, the
 * slot plate, ruled lines standing in for the text) with the chosen action
 * stamped across it. It only illustrates the action being chosen; it says
 * nothing about the permit's current state. Hidden from screen readers, which
 * get the one sentence in `spoken` instead.
 */
export function StampPreview({
  action,
  permitLabel,
  slotCode,
  vendorName,
  spoken,
}: {
  action: PermitActionKind;
  permitLabel: string;
  slotCode: string | null;
  vendorName: string | null;
  spoken: string;
}) {
  return (
    <figure className="relative">
      <figcaption className="sr-only">{spoken}</figcaption>
      <div
        aria-hidden="true"
        className="relative mx-auto flex h-[150px] w-full max-w-[420px] items-center justify-center overflow-hidden rounded-[28px] bg-[#FFF3E8] p-md md:h-[200px] xl:h-[300px] dark:bg-[#2A2420]"
      >
        <div className="relative h-full w-full max-w-[340px] rotate-2 overflow-hidden rounded-[18px] bg-card shadow-sheet ring-1 ring-border">
          <div className="sb-kerb sb-kerb-thin" />
          <div className="flex h-full flex-col gap-sm p-sm md:p-md">
            <div className="flex items-center gap-xs">
              <span className="flex h-8 shrink-0 items-center rounded-[6px] bg-card px-xs font-sign text-[17px] font-extrabold leading-none text-text ring-2 ring-text [font-stretch:68%] md:h-9 md:text-[20px]">
                Ô {slotCode ?? '—'}
              </span>
              <span className="min-w-0 truncate text-body-xs font-semibold uppercase tracking-[0.06em] text-muted">
                Giấy phép sử dụng hè phố
              </span>
            </div>
            <p className="truncate font-sign text-[15px] font-bold text-text/70 md:text-[17px]">
              {vendorName ?? permitLabel}
            </p>
            <div className="flex flex-col gap-1.5 opacity-80">
              <span className="h-2 w-11/12 rounded-full bg-sunken" />
              <span className="h-2 w-9/12 rounded-full bg-sunken" />
              <span className="hidden h-2 w-10/12 rounded-full bg-sunken md:block" />
              <span className="hidden h-2 w-7/12 rounded-full bg-sunken xl:block" />
              <span className="hidden h-2 w-8/12 rounded-full bg-sunken xl:block" />
            </div>
          </div>
          {action === 'REVOKE' ? (
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full"
            >
              <path
                d="M4 92 L96 8"
                strokeWidth="2.2"
                vectorEffect="non-scaling-stroke"
                className={`${DANGER.stroke} [stroke-width:5px]`}
              />
            </svg>
          ) : null}
        </div>

        {/* A new key per action, so the old stamp lifts and the new one comes down. */}
        <div key={action} className="sb-stamp absolute inset-0 flex items-center justify-center">
          <span
            className={`rounded-[10px] border-[4px] border-double border-current px-sm py-1.5 text-center font-sign text-[22px] font-extrabold leading-none tracking-[0.04em] [font-stretch:72%] md:text-[28px] ${DANGER.ink} bg-[#FDEBEA]/55 dark:bg-[#3A1414]/55`}
          >
            {STAMP_WORDS[action]}
          </span>
        </div>
      </div>
    </figure>
  );
}

const CHOICES: {
  value: PermitActionKind;
  label: string;
  description: string;
  icon: IconName;
}[] = [
  {
    value: 'SUSPEND',
    label: 'Tạm đình chỉ giấy phép',
    description: 'Áp dụng cho vi phạm trật tự hè phố chờ khắc phục hoặc chậm nộp phí',
    icon: 'timer-outline',
  },
  {
    value: 'REVOKE',
    label: 'Thu hồi vĩnh viễn giấy phép',
    description: 'Vi phạm nghiêm trọng, tái phạm nhiều lần hoặc chuyển nhượng trái phép',
    icon: 'block-helper',
  },
];

/**
 * The two actions as large cards in a radio group (same roles as SelectField),
 * so the weight of each is compared before choosing. Revoke has the heavier edge.
 */
export function ActionChoice({
  label,
  value,
  onChange,
  busy,
}: {
  label: string;
  value: PermitActionKind;
  onChange: (next: PermitActionKind) => void;
  /** Dims the cards while the decision is being sent (visual only). */
  busy: boolean;
}) {
  return (
    <fieldset className="flex flex-col gap-sm">
      <legend className="mb-sm font-sign text-[19px] font-bold text-text [font-stretch:92%]">
        {label}
      </legend>
      <div
        role="radiogroup"
        aria-label={label}
        className={`grid gap-sm md:grid-cols-2 ${busy ? 'opacity-60' : ''}`}
      >
        {CHOICES.map((opt) => {
          const selected = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(opt.value)}
              className={[
                'flex min-h-[104px] items-start gap-sm rounded-[18px] p-md text-left transition-[background-color,box-shadow,transform] duration-150 active:translate-y-px',
                selected
                  ? `${DANGER.wash} shadow-[inset_0_0_0_2px_#8F1717] dark:shadow-[inset_0_0_0_2px_#FF9A90]`
                  : `bg-card hover:bg-sunken ${opt.value === 'REVOKE' ? 'shadow-[inset_0_0_0_2px_rgb(var(--c-error)/0.45)]' : 'shadow-[inset_0_0_0_1.5px_rgb(var(--c-border))]'}`,
              ].join(' ')}
            >
              <span
                aria-hidden="true"
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${selected ? 'bg-card' : 'bg-sunken'} ${DANGER.ink}`}
              >
                <Icon
                  name={opt.icon}
                  size={24}
                  color="currentColor"
                  weight={selected ? 'fill' : 'regular'}
                />
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={`block text-[18px] font-semibold leading-snug ${selected ? DANGER.ink : 'text-text'}`}
                >
                  {opt.label}
                </span>
                <span className="mt-1 block text-body-md text-text/75">{opt.description}</span>
              </span>
              <Icon
                name={selected ? 'check-circle' : 'circle-outline'}
                size={22}
                color="currentColor"
                className={`mt-0.5 shrink-0 ${selected ? DANGER.ink : 'text-border'}`}
              />
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

const MIN = 5;
const MAX = 500;

/**
 * A thin ruler under the reason: mango until the 5-character minimum, green
 * inside 5–500, red past 500. It only shows the count; checking still happens
 * when "Xác nhận xử lý" is pressed, as before.
 */
export function ReasonMeter({ length }: { length: number }) {
  const state = length < MIN ? 'short' : length > MAX ? 'over' : 'ok';
  const tone =
    state === 'short' ? VERDICT_TONES.pending : state === 'over' ? DANGER : VERDICT_TONES.ok;
  const bar =
    state === 'short' ? 'bg-[#C98A04]' : state === 'over' ? 'bg-[#B42318]' : 'bg-tertiary';
  const message =
    state === 'short'
      ? `còn thiếu ${MIN - length} ký tự`
      : state === 'over'
        ? `vượt ${length - MAX} ký tự`
        : 'đủ độ dài';
  const announcement =
    state === 'short'
      ? 'Lý do chưa đủ 5 ký tự'
      : state === 'over'
        ? 'Lý do dài quá 500 ký tự'
        : 'Lý do đã đủ độ dài';
  return (
    <div className="-mt-xs flex flex-col gap-1.5">
      <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-sunken">
        <div
          className={`h-full rounded-full transition-[width,background-color] duration-200 ${bar}`}
          style={{ width: `${Math.min(100, Math.max(length ? 2 : 0, (length / MAX) * 100))}%` }}
        />
      </div>
      <p className="flex flex-wrap items-center justify-between gap-xs text-body-sm">
        <span className="font-tabular text-muted">
          <span className="font-semibold text-text">{length}</span>/{MAX} · tối thiểu {MIN}
        </span>
        <span
          aria-hidden="true"
          className={`rounded-full px-2 py-0.5 font-semibold ${tone.wash} ${tone.ink}`}
        >
          {message}
        </span>
      </p>
      {/* Changes only when a threshold is crossed, so it is announced only then. */}
      <span aria-live="polite" className="sr-only">
        {announcement}
      </span>
    </div>
  );
}

/** Static sentence starters that drop into the reason; they never decide anything. */
const REASON_TEMPLATES = ['Theo biên bản số ', 'Chậm nộp phí quá hạn', 'Chuyển nhượng ô trái phép'];

export function ReasonTemplates({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div role="group" aria-label="Mẫu câu lý do" className="flex flex-col gap-xs">
      <span className="text-body-sm font-medium text-muted">Mẫu câu (chèn vào cuối lý do)</span>
      <div className="no-scrollbar -mx-md flex gap-xs overflow-x-auto px-md md:mx-0 md:flex-wrap md:px-0">
        {REASON_TEMPLATES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onPick(t)}
            className="flex h-12 shrink-0 items-center gap-1.5 rounded-full bg-card px-md text-body-md font-medium text-text ring-1 ring-inset ring-border transition-colors hover:bg-sunken"
          >
            <Icon name="plus" size={16} color="currentColor" className="text-primary" />
            {t.trim().endsWith('số') ? `${t.trim()} …` : t}
          </button>
        ))}
      </div>
    </div>
  );
}

const AFTER: { icon: IconName; text: string }[] = [
  { icon: 'cloud-check-outline', text: 'Mã QR của giấy phép chuyển trạng thái ngay trên máy chủ.' },
  {
    icon: 'qrcode-scan',
    text: 'Người dân và lực lượng tuần tra quét mã sẽ thấy cảnh báo không hợp lệ.',
  },
  { icon: 'arrow-left', text: 'Quay lại Tuần tra và bấm Kiểm tra để thấy trạng thái mới.' },
];

/** What happens once confirmed, right above the confirm button, with the rule it rests on. */
export function AfterConfirmList({ footnote }: { footnote: ReactNode }) {
  return (
    <section
      aria-label="Sau khi xác nhận"
      className="flex flex-col gap-sm rounded-[20px] bg-sunken/70 p-md md:p-lg"
    >
      <p className="font-sign text-[18px] font-bold text-text [font-stretch:92%]">
        Sau khi xác nhận
      </p>
      <ul className="flex flex-col gap-sm">
        {AFTER.map((item) => (
          <li key={item.text} className="flex items-start gap-sm">
            <span
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card text-primary shadow-card"
            >
              <Icon name={item.icon} size={19} color="currentColor" />
            </span>
            <span className="pt-1.5 text-body-md leading-snug text-text">{item.text}</span>
          </li>
        ))}
      </ul>
      <p className="border-t border-border pt-sm text-body-sm text-muted">{footnote}</p>
    </section>
  );
}
