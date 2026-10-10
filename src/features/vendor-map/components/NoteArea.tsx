import { useId, useLayoutEffect, useRef, type CSSProperties } from 'react';

import { Field, inputShellClass } from '@/components/forms';

type Props = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  /** Shown in place of the counter, exactly as a text field shows its error. */
  error?: string;
  /** The counter line, word for word (e.g. "12/1000 ký tự"). */
  counter: string;
  /** A small ring filling up towards the limit (decoration; the counter says it in words). */
  ring?: { ratio: number; warn: boolean };
  /** Ruled like a sheet of paper, one rule per 28px line (the report form). */
  lined?: boolean;
  rows?: number;
  /** Grows with the text up to this many lines, then scrolls. */
  maxRows?: number;
};

const LINE = 28;

/**
 * A multi-line field for the buyer's own words: the same label, error and
 * helper wiring as `TextField`, plus a fill ring beside the counter and a field
 * that grows as one writes. Every keystroke goes straight to `onChangeText`
 * (the screen applies its own length cap, as before).
 */
export function NoteArea({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  counter,
  ring,
  lined = false,
  rows = 4,
  maxRows = 10,
}: Props) {
  const id = useId();
  const messageId = `${id}-message`;
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    const max = maxRows * LINE + 24;
    el.style.height = `${Math.min(Math.max(el.scrollHeight, rows * LINE + 24), max)}px`;
    el.style.overflowY = el.scrollHeight > max ? 'auto' : 'hidden';
  }, [value, rows, maxRows]);

  const paper: CSSProperties | undefined = lined
    ? {
        backgroundImage: `repeating-linear-gradient(to bottom, transparent 0 ${LINE - 1}px, rgb(var(--c-border) / 0.75) ${LINE - 1}px ${LINE}px)`,
        backgroundPosition: '0 11px',
        backgroundAttachment: 'local',
      }
    : undefined;

  return (
    <Field htmlFor={id} label={label} error={error} messageId={messageId}>
      <textarea
        ref={ref}
        id={id}
        value={value}
        onChange={(e) => onChangeText(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={messageId}
        style={paper}
        className={`${inputShellClass(error)} w-full resize-none px-sm py-[11px] text-body-lg leading-[28px] text-text placeholder:text-muted/80`}
      />
      {!error ? (
        <span id={messageId} className="flex items-center gap-xs text-body-sm text-muted">
          {ring ? <CharRing ratio={ring.ratio} warn={ring.warn} /> : null}
          {counter}
        </span>
      ) : null}
    </Field>
  );
}

function CharRing({ ratio, warn }: { ratio: number; warn: boolean }) {
  const r = 8;
  const length = 2 * Math.PI * r;
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-5 w-5 -rotate-90">
      <circle
        cx="10"
        cy="10"
        r={r}
        fill="none"
        strokeWidth="2.5"
        style={{ stroke: 'rgb(var(--c-border))' }}
      />
      <circle
        cx="10"
        cy="10"
        r={r}
        fill="none"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={length}
        strokeDashoffset={length * (1 - Math.min(Math.max(ratio, 0), 1))}
        className="transition-[stroke-dashoffset,stroke] duration-200"
        style={{ stroke: warn ? 'rgb(var(--c-on-secondary))' : 'rgb(var(--c-primary))' }}
      />
    </svg>
  );
}
