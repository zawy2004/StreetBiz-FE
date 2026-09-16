import { ReactNode } from 'react';

type Props = {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
};

export function Section({ title, action, children }: Props) {
  return (
    <div className="flex flex-col gap-sm">
      {title ? (
        <div className="flex items-center justify-between">
          <h2 className="text-headline-sm text-text">{title}</h2>
          {action}
        </div>
      ) : null}
      {children}
    </div>
  );
}
