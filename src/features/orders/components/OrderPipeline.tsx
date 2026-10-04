import { Fragment, type KeyboardEvent } from 'react';

import { Icon } from '@/components/common';

/** The colour a stage is drawn in, here and on its tickets. */
export type StageTone = 'chili' | 'ink' | 'turmeric' | 'leaf' | 'quiet';

export type PipelineStage<T extends string> = {
  value: T;
  label: string;
  tone: StageTone;
  /** Undefined while still counting. */
  count?: number;
};

// Full class names, so Tailwind keeps them.
const SELECTED: Record<StageTone, string> = {
  chili: 'border-primary bg-primary/10',
  ink: 'border-indigo bg-indigo/10',
  turmeric: 'border-secondary bg-secondary/15',
  leaf: 'border-tertiary bg-tertiary/10',
  quiet: 'border-muted bg-sunken',
};
const COUNT: Record<StageTone, string> = {
  chili: 'text-primary-ink',
  ink: 'text-indigo',
  turmeric: 'text-on-secondary',
  leaf: 'text-tertiary',
  quiet: 'text-text',
};

/**
 * ORD-04: the order workflow as a row of stages, each with how many orders sit
 * in it. It is the tab bar too: a seller reads "3 new, 2 cooking" and taps the
 * stage they need, rather than opening tabs to find out where the work is.
 *
 * The chevrons are information, not decoration: an order only ever moves left
 * to right along this row. Below 380px they give their room to the stage names,
 * and the left-to-right order alone carries the sequence.
 */
export function OrderPipeline<T extends string>({
  stages,
  value,
  onChange,
  label,
}: {
  stages: PipelineStage<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  // Arrow keys move between stages, as in any tab bar.
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    const index = stages.findIndex((stage) => stage.value === value);
    const next = stages[(index + step + stages.length) % stages.length];
    if (!next) return;
    event.preventDefault();
    onChange(next.value);
    event.currentTarget.querySelector<HTMLButtonElement>(`[data-stage="${next.value}"]`)?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      className="flex items-stretch gap-2xs min-[380px]:gap-0"
      onKeyDown={onKeyDown}
    >
      {stages.map((stage, index) => {
        const selected = stage.value === value;
        const busy = (stage.count ?? 0) > 0;
        return (
          <Fragment key={stage.value}>
            {index > 0 ? (
              <span
                aria-hidden="true"
                className="hidden w-3 shrink-0 items-center justify-center text-muted/60 min-[380px]:flex sm:w-7"
              >
                <Icon name="chevron-right" size={18} />
              </span>
            ) : null}
            <button
              type="button"
              role="tab"
              data-stage={stage.value}
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(stage.value)}
              className={[
                'flex min-w-0 flex-1 flex-col items-start rounded-md border-2 px-[4px] py-xs min-[380px]:px-[6px] text-left transition-colors sm:px-md sm:py-sm',
                selected ? SELECTED[stage.tone] : 'border-transparent bg-card hover:bg-sunken',
              ].join(' ')}
            >
              <span
                className={[
                  'text-display-md tabular-nums sm:text-display-lg',
                  busy ? COUNT[stage.tone] : 'text-muted/70',
                ].join(' ')}
              >
                {stage.count ?? '–'}
              </span>
              <span
                className={[
                  'w-full truncate text-body-xs min-[380px]:text-body-sm sm:text-label',
                  selected ? 'font-semibold text-text' : 'text-muted',
                ].join(' ')}
              >
                {stage.label}
              </span>
            </button>
          </Fragment>
        );
      })}
    </div>
  );
}
