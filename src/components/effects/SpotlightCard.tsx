import type { PointerEvent, ReactNode } from 'react';

type Props = {
  children: ReactNode;
  className?: string;
};

/**
 * A card that tilts toward the pointer in 3D while its border and surface
 * light up under it (`.sb-spotlight` in index.css).
 */
export function SpotlightCard({ children, className = '' }: Props) {
  const track = (event: PointerEvent<HTMLDivElement>) => {
    const el = event.currentTarget;
    const box = el.getBoundingClientRect();
    const x = event.clientX - box.left;
    const y = event.clientY - box.top;
    el.style.setProperty('--sx', `${x}px`);
    el.style.setProperty('--sy', `${y}px`);
    el.style.setProperty('--ry', `${((x / box.width) * 2 - 1) * 7}deg`);
    el.style.setProperty('--rx', `${((y / box.height) * 2 - 1) * -7}deg`);
  };
  const reset = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.style.setProperty('--rx', '0deg');
    event.currentTarget.style.setProperty('--ry', '0deg');
  };

  return (
    <div onPointerMove={track} onPointerLeave={reset} className={`sb-spotlight ${className}`}>
      {children}
    </div>
  );
}
