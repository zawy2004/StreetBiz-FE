export type AuthProgress = { current: number; labels: string[] };

/**
 * Where the user is in a short auth flow: one painted bar per step, the
 * current one in kerb orange with its label in ink. Read out as an ordered
 * list with the current step marked.
 */
export function AuthSteps({ current, labels }: AuthProgress) {
  const total = labels.length;
  return (
    <div className="mb-md flex items-end gap-sm">
      <ol
        aria-label="Các bước"
        className="grid min-w-0 flex-1 gap-xs"
        style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}
      >
        {labels.map((label, index) => {
          const step = index + 1;
          const isCurrent = step === current;
          const reached = step <= current;
          return (
            <li key={label} aria-current={isCurrent ? 'step' : undefined} className="min-w-0">
              <span
                aria-hidden="true"
                className={`block h-1 rounded-[2px] ${reached ? 'bg-brand' : 'bg-border'}`}
              />
              <span
                className={`mt-1.5 block truncate text-body-xs ${isCurrent ? 'font-semibold text-text' : 'text-muted'}`}
              >
                {label}
              </span>
              {isCurrent ? (
                <span className="sr-only">{`, bước ${current} trên ${total}`}</span>
              ) : null}
            </li>
          );
        })}
      </ol>
      <span
        aria-hidden="true"
        className="shrink-0 pb-[1px] font-sign text-body-xs font-semibold tracking-[0.04em] text-muted"
      >
        {current}/{total}
      </span>
    </div>
  );
}
