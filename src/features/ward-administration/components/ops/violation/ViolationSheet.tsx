import { useEffect, useState, type ReactNode } from 'react';

import { Icon, type IconName } from '@/components/common';
import { PermitStamp, VERDICT_TONES } from '@/components/illustrations';
import { prefersReducedMotion } from './violation-utils';

const PENDING = VERDICT_TONES.pending;

type SheetProps = {
  /** The record number once the server has issued it (bienBanSo, or "#id"); null before. */
  recordNumber: string | null;
  /** Lines under the sheet title (status, place, download) once recorded. */
  headDetails?: ReactNode;
  /** A submit is running: the sheet reads as busy to assistive tech. */
  busy?: boolean;
  children: ReactNode;
};

/**
 * The record as a numbered paper form: the kerb along its top edge, the form
 * name and decree reference, and a number box that stays dashed and empty until
 * the server issues the number. Then the number is typed in and the ward stamp
 * "ĐÃ LẬP · CHỜ RA QUYẾT ĐỊNH" comes down beside it, saying in plain words that
 * this is not yet a fine.
 */
export function ViolationSheet({ recordNumber, headDetails, busy, children }: SheetProps) {
  return (
    <article
      aria-label="Biên bản vi phạm hành chính"
      aria-busy={busy || undefined}
      className="min-w-0 overflow-hidden rounded-[28px] bg-card shadow-sheet ring-1 ring-border"
    >
      <div aria-hidden="true" className="sb-kerb sb-kerb-thin" />
      <header className="flex flex-col gap-md border-b-2 border-dashed border-border px-md pb-md pt-md md:px-lg md:pb-lg md:pt-lg">
        <div className="flex flex-wrap items-start justify-between gap-md">
          <div className="min-w-0 flex-1 basis-[260px]">
            <p className="font-sign text-[26px] font-extrabold leading-[1.08] tracking-[-0.01em] text-text [font-stretch:88%] md:text-[28px]">
              Biên bản vi phạm hành chính
            </p>
            <p className="mt-1 text-body-md text-muted">
              Mẫu 01, Nghị định 118/2021/NĐ-CP · Trật tự hè phố
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-sm">
            <NumberSlot recordNumber={recordNumber} />
            {recordNumber ? (
              <PermitStamp
                icon="clock-outline"
                inkClass={PENDING.ink}
                strokeClass={PENDING.stroke}
                ringText="ĐÃ LẬP ★ CHỜ RA QUYẾT ĐỊNH ★"
                className="h-[92px] w-[92px] shrink-0 [animation-delay:520ms] motion-reduce:[animation-delay:0ms] md:h-[108px] md:w-[108px]"
              />
            ) : null}
          </div>
        </div>
        {headDetails}
        <p className="sr-only" aria-live="polite">
          {recordNumber ? `Đã lập biên bản số ${recordNumber}` : ''}
        </p>
      </header>
      <div className="flex flex-col divide-y divide-border">{children}</div>
    </article>
  );
}

/** Types the issued number into its box, one character every ≤24ms (≤500ms in all). */
function useTypedText(text: string) {
  const [count, setCount] = useState(() => (prefersReducedMotion() ? text.length : 0));
  useEffect(() => {
    if (!text || prefersReducedMotion()) {
      setCount(text.length);
      return;
    }
    setCount(0);
    const step = Math.max(8, Math.min(24, Math.floor(500 / text.length)));
    const timer = window.setInterval(() => {
      setCount((c) => {
        if (c + 1 >= text.length) window.clearInterval(timer);
        return Math.min(c + 1, text.length);
      });
    }, step);
    return () => window.clearInterval(timer);
  }, [text]);
  return text.slice(0, count);
}

function NumberSlot({ recordNumber }: { recordNumber: string | null }) {
  const typed = useTypedText(recordNumber ?? '');
  if (!recordNumber) {
    return (
      <div className="flex min-h-[76px] min-w-[200px] flex-col justify-center rounded-[14px] border-2 border-dashed border-muted/45 bg-sunken/50 px-md py-sm">
        <span className="text-body-sm font-semibold text-muted">Số biên bản</span>
        <span className="text-body-md text-muted">Sẽ được cấp khi lập</span>
      </div>
    );
  }
  return (
    <div className="flex min-h-[76px] min-w-[200px] flex-col justify-center rounded-[14px] border-2 border-text/80 bg-card px-md py-sm">
      <span className="text-body-sm font-semibold text-muted">Số biên bản</span>
      <span
        aria-hidden="true"
        className="font-tabular font-sign break-all text-[24px] font-extrabold leading-[1.1] tracking-[0.01em] text-text [font-stretch:80%] sm:text-[28px] md:text-[32px]"
      >
        {typed}
        {typed.length < recordNumber.length ? (
          <span className="ml-0.5 inline-block h-[0.9em] w-[3px] translate-y-[2px] bg-brand align-baseline" />
        ) : null}
      </span>
    </div>
  );
}

type SectionProps = {
  /** The item's place in Mẫu 01; shown in a ring at the margin as part of the heading. */
  index?: number;
  /** Used instead of a number for the follow-up parts after the record is made. */
  icon?: IconName;
  id: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
};

/** One numbered part of the sheet, its content set in from the number like a form's margin. */
export function SheetSection({
  index,
  icon,
  id,
  title,
  description,
  action,
  children,
}: SectionProps) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-md px-md py-lg md:px-lg">
      <div className="flex flex-wrap items-start justify-between gap-sm">
        <div className="flex min-w-0 flex-1 items-start gap-sm">
          <span
            aria-hidden="true"
            className="mt-[-1px] flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-text font-sign text-[15px] font-bold text-card"
          >
            {icon ? <Icon name={icon} size={16} color="currentColor" weight="fill" /> : index}
          </span>
          <div className="min-w-0">
            <h2
              id={id}
              className="font-heading text-[19px] font-bold leading-[1.25] tracking-[-0.01em] text-text md:text-[20px]"
            >
              {index !== undefined ? <span className="sr-only">Mục {index}. </span> : null}
              {title}
            </h2>
            {description ? <p className="mt-0.5 text-body-md text-muted">{description}</p> : null}
          </div>
        </div>
        {action}
      </div>
      <div className="flex min-w-0 flex-col gap-md md:pl-[40px]">{children}</div>
    </section>
  );
}
