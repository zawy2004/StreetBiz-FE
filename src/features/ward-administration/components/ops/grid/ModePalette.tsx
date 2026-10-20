import type { ReactElement } from 'react';

import type { GridMode } from './placement';

/** Pin with a plus: drop one slot. */
function PinPlusGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none">
      <path
        d="M12 21.5s-6.5-6-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 15.5 12 21.5 12 21.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M12 7.2v6.2M8.9 10.3h6.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Three slots in a row along a kerb: lay a run of slots. */
function StripGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none">
      <rect x="1.8" y="6" width="5.6" height="9" rx="1.2" stroke="currentColor" strokeWidth="1.8" />
      <rect x="9.2" y="6" width="5.6" height="9" rx="1.2" stroke="currentColor" strokeWidth="1.8" />
      <rect
        x="16.6"
        y="6"
        width="5.6"
        height="9"
        rx="1.2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path d="M1.8 19h20.4" stroke="currentColor" strokeWidth="1.8" strokeDasharray="3 2.4" />
    </svg>
  );
}

/** Warning triangle: mark something on the pavement slots must keep clear of. */
function TriangleGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none">
      <path
        d="M12 3 21.6 19.8H2.4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M12 9.4v4.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="16.9" r="1.1" fill="currentColor" />
    </svg>
  );
}

const MODES: { value: GridMode; label: string; glyph: () => ReactElement }[] = [
  { value: 'slot', label: 'Đặt ô', glyph: PinPlusGlyph },
  { value: 'batch', label: 'Rải hàng loạt', glyph: StripGlyph },
  { value: 'feature', label: 'Chướng ngại vật', glyph: TriangleGlyph },
];

export function ModeGlyph({ mode }: { mode: GridMode }) {
  const Glyph = MODES.find((m) => m.value === mode)!.glyph;
  return <Glyph />;
}

/**
 * The three ways of working the grid, as three signboards in a row. Same
 * tablist / tab roles and labels as the shared SegmentedControl it replaces,
 * with a drawn glyph per mode and a 48px target for a gloved thumb.
 */
export function ModePalette({
  value,
  onChange,
}: {
  value: GridMode;
  onChange: (mode: GridMode) => void;
}) {
  return (
    <div
      role="tablist"
      className="grid grid-cols-3 gap-1 rounded-[16px] bg-card p-1 shadow-card ring-1 ring-border"
    >
      {MODES.map(({ value: mode, label, glyph: Glyph }) => {
        const active = mode === value;
        return (
          <button
            key={mode}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(mode)}
            className={[
              'flex min-h-12 min-w-0 items-center justify-center gap-xs rounded-[12px] px-xs py-1 text-center text-label leading-tight transition-colors duration-150',
              active
                ? 'bg-primary font-semibold text-on-primary shadow-[0_10px_22px_-12px_rgb(var(--c-primary)/0.9)]'
                : 'text-text hover:bg-sunken',
            ].join(' ')}
          >
            <span className={`shrink-0 ${active ? '' : 'text-primary'}`}>
              <Glyph />
            </span>
            <span className="min-w-0">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
