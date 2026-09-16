import { ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

/** Bottom-pinned action bar for the single primary (and optional secondary) action. */
export function StickyActions({ children }: Props) {
  return (
    <div className="border-t border-border bg-card">
      <div className="flex gap-sm p-md">{children}</div>
    </div>
  );
}
