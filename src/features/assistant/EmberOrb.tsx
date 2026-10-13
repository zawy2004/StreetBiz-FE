import { useEffect, useRef, type CSSProperties } from 'react';

export type OrbState = 'idle' | 'thinking' | 'listening' | 'speaking' | 'muted' | 'error';

/** The assistant's presence. Decorative only; every state is also written as text next to it. */
export function EmberOrb({
  size = 28,
  state = 'idle',
  level,
  className = '',
}: {
  size?: number;
  state?: OrbState;
  level?: () => number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!level) return;
    let frame = 0;
    let smooth = 0;
    const tick = () => {
      smooth += (level() - smooth) * 0.22;
      ref.current?.style.setProperty('--orb-level', smooth.toFixed(3));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [level]);
  return (
    <span
      ref={ref}
      aria-hidden="true"
      data-state={state}
      className={`sb-orb ${className}`}
      style={{ '--orb-size': `${size}px` } as CSSProperties}
    >
      <span className="sb-orb-glow" />
      <span className="sb-orb-core" />
      <span className="sb-orb-sheen" />
    </span>
  );
}
