import { ReactNode } from 'react';

type Props = {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
};

export function Section({ title, description, action, children }: Props) {
  return (
    <section className="flex flex-col gap-sm">
      {title ? (
        <div className="flex items-end justify-between gap-sm">
          <div className="min-w-0">
            <h2 className="text-headline-md text-text">{title}</h2>
            {description ? <p className="mt-0.5 text-body-sm text-muted">{description}</p> : null}
          </div>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}
