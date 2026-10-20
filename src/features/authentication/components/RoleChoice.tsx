import { useRef, type KeyboardEvent, type ReactNode } from 'react';

import { Icon } from '@/components/common';
import { FoodPhoto } from './FoodPhoto';

export type RoleChoiceOption<T extends string> = {
  value: T;
  label: string;
  description: string;
  art: 'customer' | 'vendor';
};

type Props<T extends string> = {
  label: string;
  value: T;
  options: RoleChoiceOption<T>[];
  onChange: (value: T) => void;
};

/**
 * "Bạn là": two picture cards in a radio group, same meaning and values as
 * the select it replaces. One Tab stop; arrow keys move the choice (roving
 * tabindex, per the ARIA radio group pattern).
 */
export function RoleChoice<T extends string>({ label, value, options, onChange }: Props<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? -1
          : 0;
    if (!step) return;
    event.preventDefault();
    const next = (index + step + options.length) % options.length;
    onChange(options[next]!.value);
    refs.current[next]?.focus();
  };

  return (
    <div className="flex flex-col gap-xs">
      <span className="text-label text-text">{label}</span>
      <div role="radiogroup" aria-label={label} className="grid grid-cols-1 gap-sm sm:grid-cols-2">
        {options.map((opt, index) => {
          const selected = opt.value === value;
          return (
            <button
              key={opt.value}
              ref={(node) => {
                refs.current[index] = node;
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(opt.value)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={[
                'group relative flex min-h-[88px] items-center gap-sm rounded-[16px] p-sm text-left transition-[background-color,box-shadow] duration-150 sm:min-h-[172px] sm:flex-col sm:items-start sm:p-md',
                selected
                  ? 'bg-tint-primary shadow-[0_10px_24px_-16px_rgb(var(--c-primary)/0.9)] ring-2 ring-inset ring-primary'
                  : 'bg-card ring-[1.5px] ring-inset ring-border hover:ring-text/25',
              ].join(' ')}
            >
              <RoleArt art={opt.art} selected={selected} />
              <span className="min-w-0 flex-1">
                <span
                  className={`block text-[17px] font-bold leading-6 ${selected ? 'text-primary' : 'text-text'}`}
                >
                  {opt.label}
                </span>
                <span className="mt-0.5 block text-body-md text-muted">{opt.description}</span>
              </span>
              <span aria-hidden="true" className="absolute right-sm top-sm sm:right-md sm:top-md">
                {selected ? (
                  <span key="on" className="sb-pop block text-primary">
                    <Icon name="check-circle" size={22} color="currentColor" />
                  </span>
                ) : (
                  <span className="block text-border">
                    <Icon name="circle-outline" size={22} color="currentColor" />
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RoleArt({ art, selected }: { art: 'customer' | 'vendor'; selected: boolean }): ReactNode {
  if (art === 'customer') {
    return (
      <span aria-hidden="true" className="relative block h-14 w-[84px] shrink-0 sm:h-16 sm:w-24">
        <FoodPhoto
          dish="banh-mi"
          width={64}
          height={64}
          glyphSize={20}
          className="absolute left-0 top-0 h-14 w-14 rounded-full ring-[3px] ring-card sm:h-16 sm:w-16"
        />
        <FoodPhoto
          dish="ca-phe"
          width={64}
          height={64}
          glyphSize={20}
          className={`absolute left-7 top-0 h-14 w-14 rounded-full ring-[3px] ring-card transition-transform duration-200 sm:left-8 sm:h-16 sm:w-16 ${selected ? 'translate-y-0' : 'translate-y-1'}`}
        />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`relative flex h-14 w-[84px] shrink-0 items-end rounded-[10px] border-2 border-dashed p-1.5 transition-colors duration-200 sm:h-16 sm:w-24 ${selected ? 'border-brand bg-brand/10' : 'border-brand/60 bg-[#FFF8F2] dark:bg-sunken'}`}
    >
      <span className="kerb-tag origin-bottom-left scale-[0.82]">Ô của bạn</span>
    </span>
  );
}
