import { Icon } from '@/components/common';
import { colors } from '@/theme';
import { Field } from './Field';

export type SelectOption<T extends string> = { value: T; label: string; description?: string };

type Props<T extends string> = {
  label?: string;
  value?: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  layout?: 'inline' | 'cards';
};

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  layout = 'cards',
}: Props<T>) {
  return (
    <Field label={label} alignCenter={layout === 'inline'}>
      <div
        role="radiogroup"
        aria-label={label}
        className={
          layout === 'cards'
            ? 'grid grid-cols-1 gap-sm sm:grid-cols-[repeat(auto-fit,minmax(220px,1fr))]'
            : 'flex flex-wrap gap-xs'
        }
      >
        {options.map((opt) => {
          const selected = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              role="radio"
              aria-checked={selected}
              className={[
                'flex items-center text-left transition-colors',
                layout === 'cards'
                  ? 'gap-sm rounded-[16px] border-[1.5px] p-md'
                  : 'h-11 gap-xs rounded-full border px-md',
                selected
                  ? 'border-primary bg-tint-primary shadow-[0_8px_20px_-14px_rgb(var(--c-primary)/0.9)]'
                  : 'border-border bg-card hover:border-text/25',
              ].join(' ')}
            >
              <div className="min-w-0 flex-1">
                <div className={`text-headline-sm ${selected ? 'text-primary' : 'text-text'}`}>
                  {opt.label}
                </div>
                {opt.description ? (
                  <div className="mt-0.5 text-body-sm text-muted">{opt.description}</div>
                ) : null}
              </div>
              {layout === 'cards' ? (
                <Icon
                  name={selected ? 'check-circle' : 'circle-outline'}
                  size={20}
                  color={selected ? colors.primary : colors.border}
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </Field>
  );
}
