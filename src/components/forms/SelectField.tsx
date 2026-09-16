import { Icon } from '@/components/common';
import { colors } from '@/theme';

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
    <div className="flex flex-col gap-xs">
      {label ? <span className="text-label text-text">{label}</span> : null}
      <div className={layout === 'cards' ? 'flex flex-col gap-sm' : 'flex flex-wrap gap-xs'}>
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
                'flex items-center border-[1.5px] text-left transition-colors',
                layout === 'cards'
                  ? 'gap-sm rounded-md p-sm'
                  : 'h-12 gap-xs rounded-sm px-sm',
                selected ? 'border-primary bg-tint-primary' : 'border-border bg-card',
              ].join(' ')}
            >
              <div className="flex-1">
                <div className={`text-headline-sm ${selected ? 'text-primary' : 'text-text'}`}>
                  {opt.label}
                </div>
                {opt.description ? (
                  <div className="mt-0.5 text-body-sm text-muted">{opt.description}</div>
                ) : null}
              </div>
              {selected ? <Icon name="check-circle" size={20} color={colors.primary} /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
