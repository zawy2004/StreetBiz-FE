/** Heat off a bowl: three soft wisps drifting up (`sb-steam`; still under reduced motion). */
export function Steam({ className = '' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 150"
      fill="none"
      className={`sb-steam pointer-events-none blur-[2.5px] ${className}`}
    >
      {[
        'M30 140 C 10 110, 50 95, 30 62 S 40 20, 32 6',
        'M60 142 C 42 112, 80 96, 60 64 S 70 22, 62 8',
        'M90 140 C 72 110, 108 94, 90 62 S 98 22, 92 6',
      ].map((d) => (
        <path
          key={d}
          d={d}
          stroke="white"
          strokeOpacity="0.75"
          strokeWidth="7"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}
