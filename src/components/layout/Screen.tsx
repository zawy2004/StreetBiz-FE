import { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  footer?: ReactNode;
};

/** Base screen container: optional scroll + consistent padding. */
export function Screen({ children, scroll = true, padded = true, footer }: Props) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-bg">
      <div
        className={[
          'flex-1',
          scroll ? 'overflow-y-auto' : 'overflow-hidden',
          padded ? 'flex flex-col gap-md p-md' : '',
        ].join(' ')}
      >
        {children}
      </div>
      {footer}
    </div>
  );
}
