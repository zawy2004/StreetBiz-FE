import { ReactNode } from 'react';

type Props = {
  /** Id of the control the label points at; omit for a group of controls. */
  htmlFor?: string;
  label?: string;
  error?: string;
  helperText?: string;
  messageId?: string;
  /** Centre the label against a short control (toggles, chips) instead of top-aligning it. */
  alignCenter?: boolean;
  children: ReactNode;
};

/**
 * Label + control + message. Stacks on phones; when its form container is wide
 * (see `.field` in index.css) the label moves to a left column so web forms read
 * across rather than down.
 */
export function Field({ htmlFor, label, error, helperText, messageId, alignCenter, children }: Props) {
  const message = error ?? helperText;

  return (
    <div className="field" data-align={alignCenter ? 'center' : undefined}>
      {label ? (
        htmlFor ? (
          <label htmlFor={htmlFor} className="field-label text-label text-text">
            {label}
          </label>
        ) : (
          <span className="field-label text-label text-text">{label}</span>
        )
      ) : null}
      <div className="field-control">
        {children}
        {message ? (
          <span id={messageId} className={`text-body-sm ${error ? 'text-error' : 'text-muted'}`}>
            {message}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** Border + focus ring shared by every text-like control. */
export function inputShellClass(error?: string) {
  return [
    'input-shell rounded-sm border bg-card',
    error ? 'border-error' : 'border-border hover:border-muted/50',
  ].join(' ');
}

type GridProps = {
  children: ReactNode;
  /** Columns once the form is wide enough; each column is its own container, so labels still stack when a column is narrow. */
  columns?: 2 | 3;
};

/** Lays form fields out across the page on web, one per row on phones. */
export function FormGrid({ children, columns = 2 }: GridProps) {
  return (
    <div
      className={[
        'form-grid grid grid-cols-1 gap-x-lg gap-y-md',
        columns === 3 ? 'md:grid-cols-2 xl:grid-cols-3' : 'md:grid-cols-2',
      ].join(' ')}
    >
      {children}
    </div>
  );
}

type SectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

/**
 * A titled group of fields. On web the title and description sit in a left
 * rail with the fields to the right — the settings-page pattern.
 */
export function FormSection({ title, description, children }: SectionProps) {
  return (
    <section className="grid gap-md border-b border-border pb-lg last:border-b-0 last:pb-0 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:gap-xl">
      <div>
        <h2 className="text-headline-md text-text">{title}</h2>
        {description ? <p className="mt-1 max-w-[60ch] text-body-sm text-muted">{description}</p> : null}
      </div>
      <div className="cq flex min-w-0 flex-col gap-md">{children}</div>
    </section>
  );
}
