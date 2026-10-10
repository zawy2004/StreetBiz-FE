import { useEffect, useState, type ReactNode } from 'react';

import { Icon, type IconName } from '@/components/common';
import { VERDICT_TONES } from '@/components/illustrations';
import type { StatusTone } from '@/theme';
import { canAnimate } from './format';

/**
 * A figure that counts up from 0 once when it first mounts. The real value is
 * always in the DOM for screen readers; the counting layer is aria-hidden.
 */
export function CountUp({
  value,
  format = (n) => n.toLocaleString('vi-VN'),
  duration = 600,
}: {
  value: number;
  format?: (n: number) => string;
  duration?: number;
}) {
  const [shown, setShown] = useState(() => (canAnimate() ? 0 : value));
  useEffect(() => {
    if (!canAnimate()) {
      setShown(value);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // ease-out cubic, close to --ease-out
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(value * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);
  return (
    <>
      <span className="sr-only">{format(value)}</span>
      <span aria-hidden="true">{format(shown)}</span>
    </>
  );
}

/**
 * A light slot plate for large slot codes: card ground, ink rule, condensed
 * Archivo figures. (`KerbTag` stays the small dark plate.)
 */
export function SlotPlate({
  code,
  size = 'md',
  className = '',
}: {
  code: string;
  size?: 'md' | 'lg';
  className?: string;
}) {
  const sizing =
    size === 'lg'
      ? 'h-10 px-sm text-[26px] ring-[2.5px] md:text-[28px]'
      : 'h-9 px-2.5 text-[21px] ring-2';
  return (
    <span
      title={`Ô ${code}`}
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[8px] bg-card font-sign font-extrabold leading-none tracking-[0.02em] text-text ring-text [font-stretch:68%] font-tabular ${sizing} ${className}`}
    >
      <span className="text-[0.62em] font-bold text-muted [font-stretch:100%]">Ô</span>
      {code}
    </span>
  );
}

export type Fact = { label: string; value: ReactNode; wide?: boolean; emphasis?: boolean };

function renderFact(fact: Fact) {
  return (
    <div
      key={fact.label}
      className={`flex min-w-0 flex-col gap-1 bg-card px-md py-sm ${fact.wide ? 'sm:col-span-full' : ''}`}
    >
      <dt className="text-body-sm text-muted">{fact.label}</dt>
      <dd
        className={`break-words text-[16px] leading-[24px] text-text ${fact.emphasis ? 'font-semibold' : 'font-medium'}`}
      >
        {fact.value}
      </dd>
    </div>
  );
}

/** Label / value facts as a ruled grid; labels small and muted, values 16px. */
export function FactGrid({ facts, columns = 2 }: { facts: Fact[]; columns?: 2 | 3 }) {
  const grid = columns === 3 ? 'sm:grid-cols-2 xl:grid-cols-3' : 'sm:grid-cols-2';
  // Put wide facts last so the fillers below close the ruled grid's last row.
  const ordered = [...facts.filter((f) => !f.wide), ...facts.filter((f) => f.wide)];
  const narrow = facts.filter((f) => !f.wide).length;
  const fillers: string[] = [];
  if (narrow % 2 === 1)
    fillers.push(columns === 3 ? 'hidden sm:block xl:hidden' : 'hidden sm:block');
  if (columns === 3) {
    for (let i = 0; i < (3 - (narrow % 3)) % 3; i += 1) fillers.push('hidden xl:block');
  }
  return (
    <dl
      className={`grid grid-cols-1 gap-px overflow-hidden rounded-[16px] bg-border ring-1 ring-border ${grid}`}
    >
      {ordered.slice(0, narrow).map(renderFact)}
      {fillers.map((cls, i) => (
        <div key={`filler-${i}`} aria-hidden="true" className={`bg-card ${cls}`} />
      ))}
      {ordered.slice(narrow).map(renderFact)}
    </dl>
  );
}

/** A thin indeterminate bar along the top of the content while a record loads. */
export function LoadingBar({ label = 'Đang tải hồ sơ…' }: { label?: string }) {
  return (
    <div role="status" className="flex flex-col gap-1">
      <div aria-hidden="true" className="h-[3px] overflow-hidden rounded-full bg-sunken">
        <div className="sb-shimmer h-full w-full" />
      </div>
      <span className="text-body-sm text-muted">{label}</span>
    </div>
  );
}

/** Legal basis as a quiet note with a ruled left edge (not a big card). */
export function LegalNote({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-xs border-l-[3px] border-border pl-md">
      <h2 className="flex items-center gap-xs text-[15px] font-semibold text-text">
        <Icon name="gavel" size={18} color="currentColor" className="text-muted" />
        {title}
      </h2>
      <div className="max-w-[78ch] text-[14px] leading-[22px] text-muted">{children}</div>
    </section>
  );
}

/** A titled block of the dossier; light card, title in the signage face. */
export function DossierBlock({
  id,
  title,
  icon,
  aside,
  children,
}: {
  id?: string;
  title: string;
  icon?: IconName;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="flex scroll-mt-md flex-col gap-sm">
      <div className="flex flex-wrap items-end justify-between gap-xs">
        <h2 className="flex min-w-0 items-center gap-xs font-sign text-[19px] font-bold leading-tight tracking-[-0.01em] text-text">
          {icon ? (
            <Icon name={icon} size={20} color="currentColor" className="shrink-0 text-primary" />
          ) : null}
          <span className="min-w-0">{title}</span>
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** A pale wash of a verdict tone with ink words (each pair ≥ 7:1). */
export function ToneBox({
  tone,
  icon,
  title,
  children,
  className = '',
}: {
  tone: StatusTone;
  icon?: IconName;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const t = VERDICT_TONES[tone];
  return (
    <div className={`rounded-[16px] p-md ${t.wash} ${t.ink} ${className}`}>
      {title ? (
        <div className="flex items-start gap-xs font-semibold">
          <Icon
            name={icon ?? t.icon}
            size={20}
            color="currentColor"
            weight="fill"
            className="mt-0.5 shrink-0"
          />
          <div className="min-w-0 text-[16px] leading-[24px]">{title}</div>
        </div>
      ) : null}
      {children ? (
        <div className={`${title ? 'mt-xs' : ''} text-[14px] leading-[22px]`}>{children}</div>
      ) : null}
    </div>
  );
}

/** The decision a reviewer already recorded (BR-46): reason, who, when. */
export function RecordedDecision({
  reason,
  officer,
  at,
}: {
  reason: string | null | undefined;
  officer: string | null | undefined;
  at: string | null | undefined;
}) {
  return (
    <div className="relative overflow-hidden rounded-[16px] bg-card p-md ring-1 ring-border">
      <div aria-hidden="true" className="absolute inset-y-0 left-0 w-[4px] bg-indigo" />
      <p className="flex items-center gap-xs text-body-sm font-semibold text-indigo">
        <Icon name="clipboard-text-outline" size={17} color="currentColor" />
        Quyết định đã ghi nhận
      </p>
      {reason ? <p className="mt-1 text-[16px] leading-[24px] text-text">{reason}</p> : null}
      <p className="mt-1 text-body-sm text-muted">
        Cán bộ: {officer ?? '-'}
        {at ? ` · ${at}` : ''}
      </p>
    </div>
  );
}
