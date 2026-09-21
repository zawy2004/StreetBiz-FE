type Props = {
  code: string;
  /** Street or zone the slot sits on, shown after the code. */
  place?: string;
  className?: string;
};

/**
 * A sidewalk slot code drawn like the painted slot outline on the pavement.
 * Use it wherever a slot code appears so buyers, vendors and officers all learn
 * to read the same mark.
 */
export function KerbTag({ code, place, className }: Props) {
  return (
    <span className={`kerb-tag ${className ?? ''}`} title={place ? `Ô ${code}, ${place}` : `Ô ${code}`}>
      Ô {code}
      {place ? <span className="max-w-[140px] truncate font-medium opacity-80">{place}</span> : null}
    </span>
  );
}
