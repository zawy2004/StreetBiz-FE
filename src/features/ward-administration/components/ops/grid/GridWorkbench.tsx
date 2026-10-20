import type { ReactNode } from 'react';

import { Icon } from '@/components/common';
import { prefersReducedMotion } from './placement';

/**
 * The survey desk. From 1280px the map is the table on the left (sticky,
 * nearly the full height of the window) with the mode board and the work sheet
 * in a 400px column on the right. Narrower, everything stacks: modes, then the
 * map, then the sheet, so the map is never below the fold on a phone.
 */
export function GridWorkbench({
  palette,
  map,
  inspector,
}: {
  palette: ReactNode;
  map: ReactNode;
  inspector: ReactNode;
}) {
  return (
    <div className="grid gap-md xl:grid-cols-[minmax(0,1fr)_400px] xl:grid-rows-[auto_1fr] xl:gap-x-lg">
      <div className="min-w-0 xl:col-start-2 xl:row-start-1">{palette}</div>
      <div className="min-w-0 xl:sticky xl:top-md xl:col-start-1 xl:row-span-2 xl:row-start-1 xl:self-start">
        {map}
      </div>
      <div
        id="grid-inspector"
        tabIndex={-1}
        className="flex min-w-0 scroll-mt-md flex-col gap-md outline-none xl:col-start-2 xl:row-start-2 xl:self-start"
      >
        {inspector}
      </div>
    </div>
  );
}

/** A faint survey grid on the sunken ground, seen until (or instead of) the base tiles. */
const SURVEY_GRID = {
  backgroundImage:
    'linear-gradient(rgb(var(--c-border)) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--c-border)) 1px, transparent 1px)',
  backgroundSize: '32px 32px',
};

/**
 * Fixed-size frame for the map, so nothing moves when the map chunk arrives
 * (CLS 0). Bleeds to the screen edge on phones; overlays sit above it.
 */
export function MapFrame({ children }: { children: ReactNode }) {
  return (
    <div
      style={SURVEY_GRID}
      className="relative -mx-md h-[58dvh] min-h-[320px] overflow-hidden bg-sunken md:mx-0 md:h-[400px] md:min-h-0 md:rounded-[20px] md:shadow-card md:ring-1 md:ring-border lg:h-[440px] xl:h-[calc(100dvh-160px)] xl:min-h-[520px]"
    >
      {children}
    </div>
  );
}

/** Map chunk still loading: the frame keeps its size, shimmering under the label. */
export function MapLoading({ label }: { label: ReactNode }) {
  return (
    <div className="sb-shimmer absolute inset-0 flex items-center justify-center opacity-90">
      <div className="rounded-[16px] bg-card px-lg shadow-card ring-1 ring-border">{label}</div>
    </div>
  );
}

/** An empty grid: the first instruction printed large on the map itself. */
export function EmptyMapHint({ text }: { text: string }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-1/2 z-10 flex -translate-y-1/2 justify-center px-lg"
    >
      <p className="sb-pop max-w-[22ch] rounded-[20px] bg-card/90 px-lg py-md text-center font-sign text-[24px] font-extrabold leading-tight text-text shadow-sheet backdrop-blur-md [font-stretch:90%]">
        {text}
      </p>
    </div>
  );
}

/**
 * Below 1280px the new-slot sheet is under the map; this bar, attached to the
 * map's bottom edge, takes the thumb straight to it once a point is set.
 */
export function NewSlotJump({ latitude, longitude }: { latitude: number; longitude: number }) {
  const jump = () => {
    const target = document.getElementById('grid-inspector');
    if (!target) return;
    target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
    target.focus({ preventScroll: true });
  };
  return (
    <button
      type="button"
      onClick={jump}
      aria-label="Tới biểu mẫu ô mới"
      className="sb-pop -mx-md flex min-h-12 w-[calc(100%+32px)] items-center gap-sm bg-primary px-md text-left text-on-primary md:mx-0 md:mt-xs md:w-full md:rounded-[14px] xl:hidden"
    >
      <Icon name="map-marker" size={20} color="currentColor" />
      <span className="min-w-0 flex-1">
        <span className="block text-label font-semibold">Ô mới</span>
        <span className="block truncate font-tabular text-body-xs opacity-90">
          {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </span>
      </span>
      <span className="flex items-center gap-1 text-label font-semibold">
        Mở biểu mẫu
        <Icon name="chevron-down" size={18} color="currentColor" />
      </span>
    </button>
  );
}
