import type { ReactNode } from 'react';

import { Icon } from '@/components/common';

export type Choice = {
  value: string;
  label: string;
  /** Secondary words after the label on the same line (e.g. the owner's name). */
  aside?: string;
  detail?: ReactNode;
  /** `warn` marks a choice that can be recorded but not fined (no legal basis). */
  tone?: 'default' | 'warn';
};

export type ChoiceGroup = { title?: string; note?: string; choices: Choice[] };

type Props = {
  value: string;
  onChange: (value: string) => void;
  groups: ChoiceGroup[];
  /** Id of the visible heading that names the group (the numbered section title). */
  labelledBy: string;
  /** Long lists scroll inside the sheet instead of pushing the rest of it down. */
  scroll?: boolean;
};

/**
 * One choice per row, read top to bottom like the lines of a form: the same
 * radiogroup / radio semantics as SelectField, laid out as full-width rows
 * (56px+) so a long list stays easy to hit with a thumb outdoors.
 */
export function ChoiceList({ value, onChange, groups, labelledBy, scroll }: Props) {
  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      className={[
        'flex flex-col gap-md',
        scroll ? 'max-h-[360px] overflow-y-auto overscroll-contain rounded-[16px] pr-1' : '',
      ].join(' ')}
    >
      {groups.map((group, gi) => (
        <div key={group.title ?? gi} className="flex flex-col gap-xs">
          {group.title ? (
            <p className="flex flex-wrap items-baseline gap-x-xs text-label text-text">
              {group.title}
              {group.note ? (
                <span className="text-body-sm font-normal text-muted">{group.note}</span>
              ) : null}
            </p>
          ) : null}
          {group.choices.map((choice) => {
            const selected = choice.value === value;
            return (
              <button
                key={choice.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onChange(choice.value)}
                className={[
                  'group flex min-h-14 w-full items-start gap-sm rounded-[14px] border-[1.5px] px-sm py-sm text-left transition-[border-color,background-color,box-shadow] duration-150',
                  selected
                    ? 'border-primary bg-tint-primary shadow-[0_8px_20px_-14px_rgb(var(--c-primary)/0.9)]'
                    : 'border-border bg-card hover:border-text/30',
                ].join(' ')}
              >
                <span
                  aria-hidden="true"
                  className={[
                    'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                    selected ? 'border-primary' : 'border-muted/60 group-hover:border-text/50',
                  ].join(' ')}
                >
                  {selected ? <span className="h-2.5 w-2.5 rounded-full bg-primary" /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={`block text-[16px] font-semibold leading-snug ${selected ? 'text-primary' : 'text-text'}`}
                  >
                    {choice.label}
                    {choice.aside ? (
                      <span className="font-normal text-muted"> {choice.aside}</span>
                    ) : null}
                  </span>
                  {choice.detail ? (
                    <span
                      className={[
                        'mt-0.5 flex items-start gap-1 text-body-sm',
                        choice.tone === 'warn'
                          ? 'text-[#8F1717] dark:text-[#FF9A90]'
                          : 'text-muted',
                      ].join(' ')}
                    >
                      {choice.tone === 'warn' ? (
                        <Icon
                          name="alert-circle-outline"
                          size={15}
                          color="currentColor"
                          className="mt-0.5 shrink-0"
                        />
                      ) : null}
                      <span className="line-clamp-2">{choice.detail}</span>
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
