import { useRef } from 'react';

import { Icon } from './Icon';
import { pageSlots } from './pagination-slots';

type Props = {
  page: number;
  /** Omit when the API only says whether there is a next page. */
  totalPages?: number;
  /** Used when `totalPages` is unknown. */
  hasNext?: boolean;
  onChange: (page: number) => void;
  /** While the next page loads: the buttons stay put but cannot be pressed twice. */
  busy?: boolean;
  /** e.g. "Đơn 11–20 trên 34". Shown above the controls. */
  caption?: string;
};

/** The nearest ancestor that scrolls: Screen scrolls an inner column, not the window. */
function scrollParent(element: HTMLElement | null): HTMLElement | null {
  for (let node = element?.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) {
      return node;
    }
  }
  return null;
}

const step =
  'inline-flex h-10 items-center justify-center gap-2xs rounded-sm border border-border bg-card px-sm text-label font-semibold text-text transition-colors hover:border-muted/50 hover:bg-sunken disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-card';

export function Pagination({ page, totalPages, hasNext, onChange, busy, caption }: Props) {
  const navRef = useRef<HTMLElement>(null);
  const known = totalPages !== undefined;
  const canPrevious = page > 1;
  const canNext = known ? page < totalPages : Boolean(hasNext);

  const go = (next: number) => {
    if (busy || next === page) return;
    onChange(next);
    // Page two starts at the top of the list, not where page one ended.
    scrollParent(navRef.current)?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <nav ref={navRef} aria-label="Phân trang" className="flex flex-col items-center gap-xs pt-xs">
      {caption ? <p className="text-body-sm text-muted">{caption}</p> : null}
      <div className="flex w-full items-center justify-between gap-xs sm:justify-center">
        <button
          type="button"
          className={step}
          disabled={!canPrevious || busy}
          onClick={() => go(page - 1)}
          aria-label="Trang trước"
        >
          <Icon name="chevron-left" size={20} />
          <span>Trước</span>
        </button>

        {known ? (
          <>
            {/* Every slot on a tablet or wider; a phone gets "3 / 12" instead. */}
            <ol className="hidden items-center gap-2xs sm:flex">
              {pageSlots(page, totalPages).map((slot, index) =>
                slot === 'gap' ? (
                  <li
                    key={`gap-${index}`}
                    aria-hidden="true"
                    className="w-6 text-center text-muted"
                  >
                    …
                  </li>
                ) : (
                  <li key={slot}>
                    <button
                      type="button"
                      onClick={() => go(slot)}
                      disabled={busy && slot !== page}
                      aria-current={slot === page ? 'page' : undefined}
                      aria-label={`Trang ${slot}`}
                      className={[
                        'inline-flex h-10 min-w-10 items-center justify-center rounded-sm px-xs text-label font-semibold tabular-nums transition-colors',
                        slot === page
                          ? 'bg-primary text-on-primary'
                          : 'text-text hover:bg-sunken disabled:opacity-40',
                      ].join(' ')}
                    >
                      {slot}
                    </button>
                  </li>
                ),
              )}
            </ol>
            <p className="text-label tabular-nums text-text sm:hidden" aria-live="polite">
              <span className="font-semibold">{page}</span>
              <span className="text-muted"> / {totalPages}</span>
            </p>
          </>
        ) : (
          <p className="text-label tabular-nums text-text" aria-live="polite">
            Trang <span className="font-semibold">{page}</span>
          </p>
        )}

        <button
          type="button"
          className={step}
          disabled={!canNext || busy}
          onClick={() => go(page + 1)}
          aria-label="Trang sau"
        >
          <span>Sau</span>
          <Icon name="chevron-right" size={20} />
        </button>
      </div>
    </nav>
  );
}
