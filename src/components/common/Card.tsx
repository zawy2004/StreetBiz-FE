import { CSSProperties, ReactNode } from 'react';

type Props = {
  children: ReactNode;
  onPress?: () => void;
  style?: CSSProperties;
  padded?: boolean;
  className?: string;
  testID?: string;
};

export function Card({ children, onPress, style, padded = true, className, testID }: Props) {
  const classes = [
    'rounded-[20px] bg-card shadow-card ring-1 ring-border/80',
    onPress
      ? 'cursor-pointer transition-[box-shadow,transform] duration-200 [transition-timing-function:var(--ease-out)] hover:-translate-y-0.5 hover:shadow-card-hover active:translate-y-0'
      : '',
    padded ? 'p-md' : '',
    className ?? '',
  ].join(' ');

  if (onPress) {
    return (
      <button
        type="button"
        data-testid={testID}
        onClick={onPress}
        style={style}
        className={`${classes} block w-full text-left`}
      >
        {children}
      </button>
    );
  }

  return (
    <div data-testid={testID} style={style} className={classes}>
      {children}
    </div>
  );
}
