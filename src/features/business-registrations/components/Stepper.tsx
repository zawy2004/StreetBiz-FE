type Props = {
  step: number;
  total: number;
  label: string;
};

export function Stepper({ step, total, label }: Props) {
  return (
    <div className="flex flex-col gap-2xs">
      <div className="flex gap-1">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full ${i < step ? 'bg-primary' : 'bg-border'}`}
          />
        ))}
      </div>
      <span className="text-body-sm text-muted">
        Bước {step}/{total} · {label}
      </span>
    </div>
  );
}
