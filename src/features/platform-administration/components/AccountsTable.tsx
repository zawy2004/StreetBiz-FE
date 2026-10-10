import { useId, useRef, type ReactNode } from 'react';

import { Avatar, Icon } from '@/components/common';
import { EmptyState } from '@/components/feedback';
import { ROLE_LABELS, type RoleCode } from '@/core/types/role';
import { formatPhone } from '@/core/utils/phone';
import { useMediaQuery } from '@/hooks/useBreakpoint';
import { ROLE_SWATCH } from './admin-format';

export type AccountRowData = {
  id: string;
  fullName: string;
  phone: string;
  role_code: RoleCode;
  account_status: 'ACTIVE' | 'SUSPENDED';
};

type Props = {
  rows: AccountRowData[];
  /** The lock / unlock control for a row, or the "not applicable" note. `nameId` names the row's person. */
  renderAction: (row: AccountRowData, nameId: string) => ReactNode;
  empty: { title: string; action?: ReactNode };
  toolbar: ReactNode;
};

const HEADERS = ['Họ tên', 'Vai trò', 'Số điện thoại', 'Trạng thái', 'Thao tác'] as const;

/**
 * The account book. Same columns as before; a real table from 768px up and a
 * stack of cards below. A suspended account gets a red-and-white barrier down
 * its left edge (it drops in when the account is locked and lifts when it is
 * unlocked), a pale red row and a padlock in its status sign.
 */
export function AccountsTable({ rows, renderAction, empty, toolbar }: Props) {
  const wide = useMediaQuery('(min-width: 768px)');

  return (
    <div className="overflow-hidden rounded-[20px] bg-card shadow-card ring-1 ring-border/80">
      <div className="flex flex-col gap-sm border-b border-border px-md py-sm lg:flex-row lg:items-center">
        {toolbar}
      </div>
      {rows.length === 0 ? (
        <EmptyState
          compact={!wide}
          icon="account-group-outline"
          title={empty.title}
          action={empty.action}
        />
      ) : wide ? (
        <table className="w-full table-fixed border-collapse text-body-md">
          <caption className="sr-only">Danh sách tài khoản</caption>
          <colgroup>
            <col />
            <col className="w-[150px]" />
            <col className="w-[150px] lg:w-[160px]" />
            <col className="w-[150px]" />
            <col className="w-[190px]" />
          </colgroup>
          <thead>
            <tr className="border-b border-border bg-sunken/70">
              {HEADERS.map((header, i) => (
                <th
                  key={header}
                  scope="col"
                  className={`h-10 whitespace-nowrap px-md text-body-sm font-semibold text-muted ${i === 4 ? 'text-right' : 'text-left'}`}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <AccountTableRow key={row.id} row={row} renderAction={renderAction} />
            ))}
          </tbody>
        </table>
      ) : (
        <ul aria-label="Danh sách tài khoản" className="divide-y divide-border">
          {rows.map((row) => (
            <AccountCard key={row.id} row={row} renderAction={renderAction} />
          ))}
        </ul>
      )}
    </div>
  );
}

type RowProps = { row: AccountRowData; renderAction: Props['renderAction'] };

/** The barrier: a 6px stripe that scales down from the top when the account is locked. */
function Barrier({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute inset-y-0 left-0 w-1.5 origin-top bg-[repeating-linear-gradient(135deg,#B42318_0_8px,#FFFFFF_8px_16px)] transition-transform duration-200 [transition-timing-function:var(--ease-out)] ${on ? 'scale-y-100' : 'scale-y-0'}`}
    />
  );
}

function AccountTableRow({ row, renderAction }: RowProps) {
  const nameId = useId();
  const locked = row.account_status === 'SUSPENDED';
  return (
    <tr
      className={`border-b border-border transition-colors duration-200 last:border-b-0 ${locked ? 'bg-[#FDEBEA]/50 dark:bg-[#3A1414]/50' : 'hover:bg-sunken/70'}`}
    >
      <td className="relative px-md py-sm align-middle">
        <Barrier on={locked} />
        <PersonName row={row} nameId={nameId} />
      </td>
      <td className="px-md py-sm align-middle text-text">{ROLE_LABELS[row.role_code]}</td>
      <td className="px-md py-sm align-middle">
        <Phone value={row.phone} />
      </td>
      <td className="px-md py-sm align-middle">
        <AccountStatus status={row.account_status} />
      </td>
      <td className="px-md py-sm text-right align-middle">{renderAction(row, nameId)}</td>
    </tr>
  );
}

function AccountCard({ row, renderAction }: RowProps) {
  const nameId = useId();
  const locked = row.account_status === 'SUSPENDED';
  return (
    <li
      className={`relative px-md py-sm pl-[22px] transition-colors duration-200 ${locked ? 'bg-[#FDEBEA]/50 dark:bg-[#3A1414]/50' : ''}`}
    >
      <Barrier on={locked} />
      <PersonName row={row} nameId={nameId} wrap />
      <dl className="mt-xs grid grid-cols-[auto_1fr] items-center gap-x-md gap-y-1.5 text-body-sm">
        <dt className="text-muted">Vai trò</dt>
        <dd className="min-w-0 text-right text-text">{ROLE_LABELS[row.role_code]}</dd>
        <dt className="text-muted">Số điện thoại</dt>
        <dd className="min-w-0 text-right">
          <Phone value={row.phone} />
        </dd>
        <dt className="text-muted">Trạng thái</dt>
        <dd className="flex min-w-0 justify-end">
          <AccountStatus status={row.account_status} />
        </dd>
        <dt className="text-muted">Thao tác</dt>
        <dd className="flex min-w-0 justify-end">{renderAction(row, nameId)}</dd>
      </dl>
    </li>
  );
}

function PersonName({
  row,
  nameId,
  wrap,
}: {
  row: AccountRowData;
  nameId: string;
  wrap?: boolean;
}) {
  return (
    <span className="flex min-w-0 items-center gap-sm">
      <span
        aria-hidden="true"
        className={`shrink-0 rounded-full ring-2 ring-offset-2 ring-offset-card ${ROLE_SWATCH[row.role_code].ring}`}
      >
        <Avatar name={row.fullName} size={32} />
      </span>
      <span
        id={nameId}
        title={row.fullName}
        className={`min-w-0 text-[15px] font-semibold leading-[22px] text-text ${wrap ? 'line-clamp-2 break-words' : 'truncate'}`}
      >
        {row.fullName}
      </span>
    </span>
  );
}

function Phone({ value }: { value: string }) {
  return (
    <span className="font-sign text-body-md font-medium text-text font-tabular">
      {formatPhone(value)}
    </span>
  );
}

/**
 * "HOẠT ĐỘNG" / "ĐÃ KHOÁ" in the status-sign shape, the locked one with a padlock.
 * It cross-fades when the status changes while on screen (not on first paint).
 */
function AccountStatus({ status }: { status: AccountRowData['account_status'] }) {
  const first = useRef(status);
  const changed = first.current !== status;
  const locked = status === 'SUSPENDED';
  return (
    <span
      key={status}
      style={changed ? { animation: 'sb-pop 160ms var(--ease-out) both' } : undefined}
      className={`inline-flex h-7 w-fit shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[6px] border px-2 text-badge ${
        locked
          ? 'border-[#8F1717]/30 bg-[#FDEBEA] text-[#8F1717] dark:border-[#FF9A90]/30 dark:bg-[#3A1414] dark:text-[#FF9A90]'
          : 'border-[#0B5D33]/25 bg-[#E6F6EC] text-[#0B5D33] dark:border-[#8BE3B0]/25 dark:bg-[#10301F] dark:text-[#8BE3B0]'
      }`}
    >
      {locked ? (
        <Icon name="lock-outline" size={13} color="currentColor" weight="fill" />
      ) : (
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      )}
      {(locked ? 'Đã khoá' : 'Hoạt động').toUpperCase()}
    </span>
  );
}
