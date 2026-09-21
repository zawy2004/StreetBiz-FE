import { KeyboardEvent, ReactNode } from 'react';

import { Icon } from '@/components/common';
import { EmptyState, LoadingState } from '@/components/feedback';
import { useMediaQuery } from '@/hooks/useBreakpoint';
import { colors } from '@/theme';

export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  align?: 'left' | 'right' | 'center';
  /** CSS width for the column on web, e.g. '140px' or '20%'. */
  width?: string;
  /** Leave the value out of the phone card (it is secondary, or already in the title). */
  hideOnMobile?: boolean;
};

type Props<T> = {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  /** Accessible name for the table, and for a row's click target. */
  caption: string;
  rowLabel?: (row: T) => string;
  loading?: boolean;
  empty?: { icon?: string; title: string; description?: string; action?: ReactNode };
  /** Search, filters and bulk actions, drawn in the table's header strip. */
  toolbar?: ReactNode;
};

const alignClass = { left: 'text-left', right: 'text-right', center: 'text-center' } as const;

/**
 * Tabular data for the management screens. A real table from 768px up; below
 * that each row becomes a stacked card so nothing scrolls sideways on a phone.
 * The first column is the row's title in the card layout.
 */
export function DataTable<T>({
  rows,
  columns,
  rowKey,
  onRowClick,
  caption,
  rowLabel,
  loading,
  empty,
  toolbar,
}: Props<T>) {
  const wide = useMediaQuery('(min-width: 768px)');
  const [titleColumn, ...rest] = columns;

  const onKey = (row: T) => (event: KeyboardEvent) => {
    if (!onRowClick) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onRowClick(row);
    }
  };

  const body = loading ? (
    <LoadingState />
  ) : rows.length === 0 ? (
    <EmptyState
      compact={wide ? false : true}
      icon={empty?.icon ?? 'inbox-outline'}
      title={empty?.title ?? 'Chưa có dữ liệu'}
      description={empty?.description}
      action={empty?.action}
    />
  ) : wide ? (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-body-md">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-border bg-sunken/60">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                style={col.width ? { width: col.width } : undefined}
                className={`h-10 whitespace-nowrap px-md text-body-sm font-semibold text-muted ${alignClass[col.align ?? 'left']}`}
              >
                {col.header}
              </th>
            ))}
            {onRowClick ? <th aria-hidden="true" className="w-10" /> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              onKeyDown={onKey(row)}
              tabIndex={onRowClick ? 0 : undefined}
              aria-label={onRowClick && rowLabel ? rowLabel(row) : undefined}
              className={[
                'group border-b border-border last:border-b-0',
                onRowClick ? 'cursor-pointer hover:bg-sunken/70 focus-visible:bg-sunken/70' : '',
              ].join(' ')}
            >
              {columns.map((col, i) => (
                <td
                  key={col.key}
                  className={[
                    'px-md py-sm align-middle',
                    alignClass[col.align ?? 'left'],
                    i === 0 ? 'font-medium text-text' : 'text-text',
                  ].join(' ')}
                >
                  {col.render(row)}
                </td>
              ))}
              {onRowClick ? (
                <td className="pr-sm text-right">
                  <span className="inline-flex opacity-40 transition-opacity group-hover:opacity-100">
                    <Icon name="chevron-right" size={20} color={colors.muted} />
                  </span>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <ul aria-label={caption} className="divide-y divide-border">
      {rows.map((row) => {
        const content = (
          <>
            <div className="flex items-start justify-between gap-sm">
              <div className="min-w-0 flex-1 text-headline-sm text-text">{titleColumn?.render(row)}</div>
              {onRowClick ? <Icon name="chevron-right" size={20} color={colors.muted} /> : null}
            </div>
            <dl className="mt-xs grid grid-cols-[auto_1fr] gap-x-md gap-y-1 text-body-sm">
              {rest
                .filter((col) => !col.hideOnMobile)
                .map((col) => (
                  <div key={col.key} className="contents">
                    <dt className="text-muted">{col.header}</dt>
                    <dd className="min-w-0 text-right text-text">{col.render(row)}</dd>
                  </div>
                ))}
            </dl>
          </>
        );
        return (
          <li key={rowKey(row)}>
            {onRowClick ? (
              <button
                type="button"
                onClick={() => onRowClick(row)}
                aria-label={rowLabel ? rowLabel(row) : undefined}
                className="block w-full px-md py-sm text-left hover:bg-sunken/70"
              >
                {content}
              </button>
            ) : (
              <div className="px-md py-sm">{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="overflow-hidden rounded-md border border-border bg-card shadow-card">
      {toolbar ? (
        <div className="flex flex-wrap items-center gap-sm border-b border-border px-md py-sm">{toolbar}</div>
      ) : null}
      {body}
    </div>
  );
}
