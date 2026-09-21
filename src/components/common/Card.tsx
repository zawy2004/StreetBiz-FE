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
    'rounded-md border border-border bg-card shadow-card',
    onPress
      ? 'cursor-pointer transition-[box-shadow,border-color] duration-150 hover:border-muted/40 hover:shadow-card-hover'
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
