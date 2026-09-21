import { CSSProperties, ReactNode } from 'react';

type Props = {
  children: ReactNode;
  onPress?: () => void;
  style?: CSSProperties;
  padded?: boolean;
  testID?: string;
};

export function Card({ children, onPress, style, padded = true, testID }: Props) {
  const className = [
    'rounded-md border border-border bg-card shadow-card transition-all duration-200',
    onPress ? 'hover:shadow-card-hover hover:border-gold/50 cursor-pointer active:scale-[0.995]' : '',
    padded ? 'p-md' : '',
  ].join(' ');

  if (onPress) {
    return (
      <button
        type="button"
        data-testid={testID}
        onClick={onPress}
        style={style}
        className={`${className} block w-full text-left`}
      >
        {children}
      </button>
    );
  }

  return (
    <div data-testid={testID} style={style} className={className}>
      {children}
    </div>
  );
}
