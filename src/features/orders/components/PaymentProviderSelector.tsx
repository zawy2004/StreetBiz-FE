import type { PaymentProvider } from '../types/order.types';

const PROVIDERS: { value: PaymentProvider; label: string; description: string }[] = [
  { value: 'MOMO', label: 'MoMo', description: 'Thanh toán qua ví MoMo' },
  { value: 'ZALOPAY', label: 'ZaloPay', description: 'Thanh toán qua ví ZaloPay' },
];

export function PaymentProviderSelector({
  value,
  onChange,
  disabled,
}: {
  value: PaymentProvider;
  onChange: (provider: PaymentProvider) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset>
      <legend className="mb-xs text-label text-text">Phương thức thanh toán</legend>
      <div className="grid grid-cols-2 gap-sm">
        {PROVIDERS.map((provider) => (
          <label
            key={provider.value}
            className={[
              'flex min-h-16 cursor-pointer flex-col rounded-sm border p-sm',
              value === provider.value ? 'border-primary bg-primary/5' : 'border-border bg-card',
              disabled ? 'cursor-not-allowed opacity-50' : '',
            ].join(' ')}
          >
            <span className="flex items-center gap-xs text-headline-sm text-text">
              <input
                type="radio"
                name="paymentProvider"
                value={provider.value}
                checked={value === provider.value}
                disabled={disabled}
                onChange={() => onChange(provider.value)}
              />
              {provider.label}
            </span>
            <span className="mt-2xs text-body-sm text-muted">{provider.description}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
