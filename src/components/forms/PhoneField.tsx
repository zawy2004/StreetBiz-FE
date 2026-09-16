type Props = {
  value: string;
  onChangeText: (value: string) => void;
  label?: string;
  error?: string;
};

export function PhoneField({ value, onChangeText, label = 'Số điện thoại', error }: Props) {
  return (
    <div className="flex flex-col gap-2xs">
      <span className="text-label text-text">{label}</span>
      <div
        className={`flex h-12 items-center gap-xs rounded-sm border bg-card px-sm ${error ? 'border-error' : 'border-border'}`}
      >
        <span className="text-body-lg text-muted">+84</span>
        <input
          value={value}
          onChange={(e) => onChangeText(e.target.value)}
          inputMode="tel"
          type="tel"
          placeholder="912 345 678"
          className="h-full flex-1 bg-transparent text-body-lg text-text placeholder:text-muted"
        />
      </div>
      {error ? <span className="text-body-sm text-error">{error}</span> : null}
    </div>
  );
}
