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
    'rounded-md border border-border bg-card shadow-card',
    padded ? 'p-md' : '',
  ].join(' ');

  if (onPress) {
    return (
      <button
        type="button"
        data-testid={testID}
        onClick={onPress}
        style={style}
        className={`${className} block w-full text-left transition-opacity active:opacity-90`}
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
