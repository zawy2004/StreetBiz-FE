import { type ReactNode } from 'react';

import { formatVnd, Icon } from '@/components/common';
import { parseVndAmount } from '../../new-registration-store';
import type { OwnerSection } from './owner-progress';

/* -------------------------------------------------------------- ID card art */

/**
 * The empty face of an ID card slot: faint text lines labelled with what that
 * side carries (taken from the step's own instructions). A neutral drawing,
 * "Hình minh họa" — no emblem, no real layout.
 */
export function IdCardFace({ side }: { side: 'front' | 'back' }) {
  const fields =
    side === 'front'
      ? ['Số', 'Họ tên', 'Ngày sinh', 'Giới tính · Quốc tịch', 'Địa chỉ']
      : ['Dân tộc', 'Ngày cấp', 'Nơi cấp'];
  return (
    <span className="flex h-full w-full flex-col justify-between p-xs text-left sm:p-sm">
      <span className="flex items-center justify-between gap-xs">
        <span className="text-[12px] font-bold uppercase leading-4 tracking-[0.04em] text-primary">
          {side === 'front' ? 'Mặt trước' : 'Mặt sau'}
        </span>
        <Icon name="camera-plus-outline" size={20} color="currentColor" className="text-primary" />
      </span>
      <span className="flex flex-1 items-center gap-sm py-1">
        {side === 'front' ? (
          <span className="hidden h-full max-h-[64px] w-[22%] shrink-0 rounded-[6px] bg-brand/15 ring-1 ring-brand/30 sm:block" />
        ) : (
          <span className="hidden h-7 w-9 shrink-0 rounded-[5px] bg-accent/60 ring-1 ring-on-secondary/30 sm:block" />
        )}
        <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
          {fields.map((f) => (
            <span key={f} className="flex items-center gap-1.5">
              <span className="h-[5px] w-6 shrink-0 rounded-full bg-text/15" />
              <span className="truncate text-[11px] font-medium leading-[14px] text-text/60">
                {f}
              </span>
            </span>
          ))}
        </span>
      </span>
      <span className="text-[10.5px] leading-3 text-muted">Hình minh họa · bấm để chọn ảnh</span>
    </span>
  );
}

/** The round portrait slot when empty. */
export function PortraitFace() {
  return (
    <span className="flex flex-col items-center gap-0.5 text-center">
      <svg viewBox="0 0 40 40" aria-hidden="true" className="h-10 w-10 text-text/45">
        <circle cx="20" cy="15" r="7" fill="currentColor" />
        <path d="M7 36 a13 11 0 0 1 26 0 z" fill="currentColor" />
      </svg>
      <span className="text-[11.5px] font-semibold leading-4 text-primary">Ảnh chân dung</span>
    </span>
  );
}

/* --------------------------------------------------------------- AI marks */

/** "[AI] điền từ CCCD": marks a field OCR filled, until the person edits it (BR-42). */
export function AiFilledTag({ delayMs = 0 }: { delayMs?: number }) {
  return (
    <span
      className="sb-pop inline-flex h-6 w-fit items-center gap-1 rounded-full bg-secondary-bg px-2 text-[12px] font-bold text-on-secondary ring-1 ring-secondary/40"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <Icon name="creation" size={12} color="currentColor" weight="fill" />
      [AI] điền từ CCCD
    </span>
  );
}

/** Wraps a field OCR filled: the tag above it and a mango rule down its left edge. */
export function AiField({
  filled,
  order,
  children,
}: {
  filled: boolean;
  /** Position in the form, so the tags pop in top to bottom. */
  order: number;
  children: ReactNode;
}) {
  if (!filled) return <div className="min-w-0">{children}</div>;
  return (
    <div className="flex min-w-0 flex-col gap-1 border-l-[3px] border-secondary pl-sm">
      <AiFilledTag delayMs={order * 70} />
      {children}
    </div>
  );
}

/* --------------------------------------------------------------- sections */

/** One part of the Mẫu số 01 form: its real sequence number, a heading, the fields. */
export function FormSheet({
  id,
  number,
  title,
  description,
  children,
}: {
  id: string;
  number?: number;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-[72px] rounded-[24px] bg-card p-md shadow-card ring-1 ring-border md:p-lg xl:scroll-mt-md"
    >
      <div className="mb-md flex items-start gap-sm">
        {number ? (
          <span
            aria-hidden="true"
            className="font-sign text-[28px] font-extrabold leading-[30px] text-muted/70 font-tabular"
          >
            {number}
          </span>
        ) : null}
        <div className="min-w-0">
          <h2
            id={`${id}-title`}
            className="font-sign text-[20px] font-extrabold leading-[26px] tracking-[-0.01em] text-text md:text-[24px] md:leading-[30px]"
          >
            {title}
          </h2>
          {description ? <p className="mt-1 text-body-md text-muted">{description}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

export type RailItem = {
  id: string;
  section: OwnerSection;
  label: string;
  state: 'done' | 'todo' | 'error' | 'optional';
};

const DOT = {
  done: 'bg-tertiary',
  todo: 'bg-card ring-2 ring-border',
  error: 'bg-error',
  optional: 'border-2 border-dashed border-muted/50 bg-card',
} as const;

/** "8/12" with a small ring, read out politely as it changes. */
export function RequiredCounter({ filled, total }: { filled: number; total: number }) {
  const r = 15;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex items-center gap-sm">
      <svg viewBox="0 0 40 40" aria-hidden="true" className="h-10 w-10 shrink-0 -rotate-90">
        <circle cx="20" cy="20" r={r} fill="none" strokeWidth="5" className="stroke-sunken" />
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - filled / total)}
          className={`transition-[stroke-dashoffset] duration-300 ${filled === total ? 'stroke-tertiary' : 'stroke-brand'}`}
        />
      </svg>
      <p aria-live="polite" className="leading-none">
        <span className="sr-only">
          {filled} trên {total} mục bắt buộc đã điền
        </span>
        <span
          aria-hidden="true"
          className="font-sign text-[28px] font-extrabold text-text font-tabular"
        >
          {filled}/{total}
        </span>
        <span aria-hidden="true" className="mt-1 block text-[12px] font-semibold text-muted">
          mục bắt buộc
        </span>
      </p>
    </div>
  );
}

/**
 * Where you are in this long step: a vertical list beside the form on wide
 * screens, a sticky row of chips on smaller ones. Pressing one scrolls to that
 * part; it does not change the URL or the history.
 */
export function SectionRail({
  items,
  activeId,
  filled,
  total,
  onJump,
  variant,
}: {
  items: RailItem[];
  activeId: string | null;
  filled: number;
  total: number;
  onJump: (id: string) => void;
  variant: 'column' | 'chips';
}) {
  if (variant === 'chips') {
    return (
      <nav
        aria-label="Các mục trong bước"
        className="no-scrollbar sticky top-0 z-10 -mx-md flex h-14 shrink-0 items-center gap-xs overflow-x-auto border-b border-border bg-bg/90 px-md backdrop-blur md:-mx-lg md:px-lg lg:-mx-xl lg:px-xl xl:hidden"
      >
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-card px-sm py-1 font-sign text-[17px] font-extrabold text-text shadow-card ring-1 ring-border font-tabular">
          <span className="sr-only">Đã điền </span>
          {filled}/{total}
        </span>
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onJump(item.id)}
            aria-current={activeId === item.id ? 'location' : undefined}
            className={`flex h-10 shrink-0 items-center gap-1.5 rounded-full px-sm text-[14px] font-semibold transition-colors ${
              activeId === item.id
                ? 'bg-tint-primary text-primary ring-1 ring-brand/50'
                : 'bg-card text-text ring-1 ring-border hover:bg-sunken'
            }`}
          >
            <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${DOT[item.state]}`} />
            {item.label}
          </button>
        ))}
      </nav>
    );
  }

  return (
    <nav
      aria-label="Các mục trong bước"
      className="flex flex-col gap-md rounded-[20px] bg-card p-md shadow-card ring-1 ring-border"
    >
      <p className="text-label text-muted">Trong bước này</p>
      <RequiredCounter filled={filled} total={total} />
      <ul className="flex flex-col gap-1">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onJump(item.id)}
              aria-current={activeId === item.id ? 'location' : undefined}
              className={`flex min-h-11 w-full items-center gap-sm rounded-[12px] px-sm text-left text-[15px] font-semibold transition-colors ${
                activeId === item.id ? 'bg-tint-primary text-primary' : 'text-text hover:bg-sunken'
              }`}
            >
              <span
                aria-hidden="true"
                className={`h-3 w-3 shrink-0 rounded-full ${activeId === item.id && item.state !== 'error' ? 'bg-brand' : DOT[item.state]}`}
              />
              <span className="min-w-0 flex-1">{item.label}</span>
              {item.state === 'done' ? (
                <Icon name="check" size={16} color="currentColor" className="text-tertiary" />
              ) : item.state === 'error' ? (
                <span className="text-[12px] font-bold text-error">Cần sửa</span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/* ------------------------------------------------------------------ helpers */

/** "Sẽ ghi nhận: 20.000.000 đ" — what `parseVndAmount` will actually send. */
export function MoneyEcho({ text }: { text: string }) {
  if (!text.trim()) return null;
  const value = parseVndAmount(text);
  return (
    <p className="-mt-xs flex items-center gap-1.5 text-body-sm text-muted">
      <Icon name="cash-multiple" size={15} color="currentColor" className="shrink-0" />
      Sẽ ghi nhận:{' '}
      <span className="font-sign font-bold text-text font-tabular">
        {value != null ? formatVnd(value) : 'chưa có số'}
      </span>
    </p>
  );
}

/**
 * A real checkbox in a 56px row the whole of which can be pressed; long legal
 * text at a readable 15/23.
 */
export function ConsentRow({
  checked,
  onChange,
  children,
  invalid,
  aside,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  invalid?: boolean;
  aside?: ReactNode;
}) {
  return (
    <label
      data-field-error={invalid ? 'true' : undefined}
      className={`flex min-h-14 cursor-pointer items-start gap-sm rounded-[16px] p-sm transition-colors ${
        invalid
          ? 'bg-[#FDEBEA] ring-2 ring-[#8F1717] dark:bg-[#3A1414] dark:ring-[#FF9A90]'
          : checked
            ? 'bg-[#E6F6EC] ring-1 ring-tertiary/40 dark:bg-[#10301F]'
            : 'bg-card ring-1 ring-border hover:ring-text/25'
      }`}
    >
      <input
        type="checkbox"
        className="mt-0.5 h-6 w-6 shrink-0 cursor-pointer accent-[rgb(var(--c-primary))]"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="min-w-0 flex-1 text-[15px] leading-[23px] text-text">
        {children}
        {aside ? <span className="mt-xs block">{aside}</span> : null}
      </span>
    </label>
  );
}
