import { Icon, Spinner } from '@/components/common';
import { useRollingNumber } from '../../rolling-number';

type StepperProps = {
  quantity: number;
  onDecrease: () => void;
  onIncrease: () => void;
};

/** − n +, as two 48px round buttons around the count (announced politely when it changes). */
export function QuantityStepper({ quantity, onDecrease, onIncrease }: StepperProps) {
  return (
    <div className="flex h-[56px] shrink-0 items-center gap-0.5 rounded-full bg-card p-1 shadow-card ring-1 ring-border">
      <button
        type="button"
        aria-label="Giảm số lượng"
        onClick={onDecrease}
        className="flex h-12 w-12 items-center justify-center rounded-full text-text transition-[background-color,transform] duration-100 hover:bg-sunken active:scale-[0.94]"
      >
        <Icon name="minus" size={20} color="currentColor" />
      </button>
      <span
        aria-live="polite"
        className="w-8 text-center font-sign text-[20px] font-bold font-tabular leading-none text-text"
      >
        {quantity}
      </span>
      <button
        type="button"
        aria-label="Tăng số lượng"
        onClick={onIncrease}
        className="flex h-12 w-12 items-center justify-center rounded-full text-text transition-[background-color,transform] duration-100 hover:bg-sunken active:scale-[0.94]"
      >
        <Icon name="plus" size={20} color="currentColor" />
      </button>
    </div>
  );
}

type BarProps = {
  /** The button's whole name, word for word (e.g. "Thêm vào giỏ · 90.000 đ"). */
  label: string;
  /** Total to show running on the button; null when the button asks to sign in instead. */
  total: number | null;
  disabled: boolean;
  loading?: boolean;
  onPress: () => void;
  stepper: React.ReactNode;
  /** A line above the bar (guest hint, errors). */
  note?: React.ReactNode;
};

/**
 * The order slip's foot: the stepper beside the one orange button whose total
 * runs to the new amount as the count changes. There is only ever one such
 * button on the page (it lives in the footer on phones, in the column on desktop).
 */
export function OrderBar({
  label,
  total,
  disabled,
  loading = false,
  onPress,
  stepper,
  note,
}: BarProps) {
  return (
    <div className="flex w-full flex-col gap-xs">
      {note}
      <div className="flex w-full items-center gap-sm">
        {stepper}
        <button
          type="button"
          aria-label={label}
          onClick={onPress}
          disabled={disabled || loading}
          aria-busy={loading || undefined}
          className="flex h-[52px] min-w-0 flex-1 items-center justify-center gap-xs rounded-[14px] bg-primary px-sm text-[15px] font-semibold text-on-primary sm:px-md sm:text-[16px] shadow-[0_12px_26px_-12px_rgb(var(--c-primary)/0.9)] transition-[background-color,transform,opacity] duration-150 hover:bg-primary-pressed active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45"
        >
          {loading ? (
            <Spinner size={20} />
          ) : total != null ? (
            <span
              aria-hidden="true"
              className="flex min-w-0 flex-wrap items-center justify-center gap-x-xs text-center leading-tight"
            >
              <Icon
                name="cart-outline"
                size={20}
                color="currentColor"
                className="hidden sm:block"
              />
              <span>Thêm vào giỏ</span>
              <span className="opacity-70">·</span>
              <RollingPrice value={total} />
            </span>
          ) : (
            <span
              aria-hidden="true"
              className="flex min-w-0 flex-wrap items-center justify-center gap-x-xs text-center leading-tight"
            >
              <Icon name="login" size={20} color="currentColor" className="hidden sm:block" />
              {label}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

/** The total in signage figures, fixed-width digits so the button never jitters as it runs. */
function RollingPrice({ value }: { value: number }) {
  const shown = useRollingNumber(value);
  return (
    <span className="font-sign text-[17px] font-bold font-tabular">
      {`${shown.toLocaleString('vi-VN')} đ`}
    </span>
  );
}
