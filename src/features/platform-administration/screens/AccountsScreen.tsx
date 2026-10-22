import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { OVERVIEW_REFRESH_MS } from '@/core/config/refresh';

import { Button, Icon, Pagination } from '@/components/common';
import { ConfirmDialog, ErrorState, Skeleton, showToast } from '@/components/feedback';
import { FilterChips, TextField } from '@/components/forms';
import { AppHeader, Screen } from '@/components/layout';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { PanelButton } from '../components/AdminParts';
import { AccountsTable, type AccountRowData } from '../components/AccountsTable';
import { formatDateTime } from '../components/admin-format';
import { PlatformConnection } from '../components/PlatformConnection';
import { platformApi, PlatformApiError, type AccountListParams } from '../platform-api';

type RoleFilter = 'ALL' | NonNullable<AccountListParams['role']>;
type StatusFilter = 'ALL' | NonNullable<AccountListParams['status']>;
type Action = { account: AccountRowData; mode: 'suspend' | 'reactivate' };

const PAGE_SIZE = 20;
const REASON_MIN = 3;
const REASON_MAX = 500;

export function AccountsScreen() {
  return (
    <PlatformConnection>
      <AccountsContent />
    </PlatformConnection>
  );
}

function AccountsContent() {
  const queryClient = useQueryClient();
  const [role, setRole] = useState<RoleFilter>('ALL');
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<Action>();
  const [detail, setDetail] = useState<AccountRowData>();
  const [announcement, setAnnouncement] = useState('');

  const q = useDebouncedValue(search.trim(), 300);
  const params: AccountListParams = {
    role: role === 'ALL' ? undefined : role,
    status: status === 'ALL' ? undefined : status,
    q: q || undefined,
    page,
    pageSize: PAGE_SIZE,
  };
  const accounts = useQuery({
    queryKey: ['platform', 'accounts', params],
    queryFn: () => platformApi.accounts(params),
    placeholderData: keepPreviousData,
    refetchInterval: OVERVIEW_REFRESH_MS,
  });

  // A filter change always starts again at page one: page 3 of a smaller list may not exist.
  const changeFilter = <T,>(set: (value: T) => void) => (value: T) => {
    set(value);
    setPage(1);
  };

  const data = accounts.data;
  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / data.pageSize)) : 1;

  const body = accounts.isPending ? (
    <AccountsSkeleton />
  ) : accounts.isError ? (
    <ErrorState
      message={
        accounts.error instanceof PlatformApiError
          ? accounts.error.message
          : 'Không tải được danh sách tài khoản.'
      }
      onRetry={() => void accounts.refetch()}
    />
  ) : null;

  return (
    <Screen width="wide">
      <AppHeader
        title="Quản lý tài khoản"
        subtitle="ADM-02 · Khoá hoặc mở lại tài khoản người mua và hộ kinh doanh."
      />

      <AccountsTable
        rows={data?.items ?? []}
        status={body}
        toolbar={
          <>
            <div className="min-w-0 flex-1 lg:max-w-[420px]">
              <TextField
                value={search}
                onChangeText={changeFilter(setSearch)}
                placeholder="Tìm theo tên hoặc số điện thoại"
                maxLength={100}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-xs lg:flex-row lg:items-center">
              <FilterChips
                value={role}
                onChange={changeFilter(setRole)}
                options={[
                  { value: 'ALL', label: 'Mọi vai trò' },
                  { value: 'CUSTOMER', label: 'Người mua' },
                  { value: 'VENDOR', label: 'Hộ kinh doanh' },
                ]}
              />
              <FilterChips
                value={status}
                onChange={changeFilter(setStatus)}
                options={[
                  { value: 'ALL', label: 'Mọi trạng thái' },
                  { value: 'ACTIVE', label: 'Hoạt động' },
                  { value: 'SUSPENDED', label: 'Đã khoá' },
                ]}
              />
            </div>
          </>
        }
        empty={{
          title: 'Không có tài khoản nào khớp',
          action:
            q || role !== 'ALL' || status !== 'ALL' ? (
              <Button
                label="Xoá bộ lọc"
                variant="outline"
                fullWidth={false}
                onPress={() => {
                  setSearch('');
                  setRole('ALL');
                  setStatus('ALL');
                  setPage(1);
                }}
              />
            ) : undefined,
        }}
        renderAction={(account, nameId) => (
          <div className="flex items-center justify-end gap-xs">
            <PanelButton
              size="sm"
              label="Chi tiết"
              variant="outline"
              describedBy={nameId}
              onPress={() => setDetail(account)}
            />
            {account.accountStatus === 'DEACTIVATED' ? null : (
              <PanelButton
                size="sm"
                className={`min-w-[132px] ${account.accountStatus === 'ACTIVE' ? 'hover:ring-error/40 [&:hover_svg]:text-error' : ''}`}
                label={account.accountStatus === 'ACTIVE' ? 'Khoá tài khoản' : 'Mở khoá'}
                variant={account.accountStatus === 'ACTIVE' ? 'outline' : 'approve'}
                describedBy={nameId}
                icon={
                  <Icon
                    name={account.accountStatus === 'ACTIVE' ? 'lock-outline' : 'check-circle-outline'}
                    size={17}
                    color="currentColor"
                    className="transition-colors"
                  />
                }
                onPress={() =>
                  setAction({
                    account,
                    mode: account.accountStatus === 'ACTIVE' ? 'suspend' : 'reactivate',
                  })
                }
              />
            )}
          </div>
        )}
      />

      {data && data.totalCount > 0 ? (
        <Pagination
          page={page}
          totalPages={totalPages}
          onChange={setPage}
          busy={accounts.isFetching}
          caption={`Tài khoản ${(page - 1) * data.pageSize + 1}–${(page - 1) * data.pageSize + data.items.length} trên ${data.totalCount}`}
        />
      ) : null}

      {action ? (
        <AccountActionDialog
          key={`${action.account.userId}-${action.mode}`}
          action={action}
          onClose={() => setAction(undefined)}
          onDone={(message) => {
            setAction(undefined);
            setAnnouncement(message);
            showToast(message);
            void queryClient.invalidateQueries({ queryKey: ['platform', 'accounts'] });
          }}
          onStale={() => void queryClient.invalidateQueries({ queryKey: ['platform', 'accounts'] })}
        />
      ) : null}
      {detail ? <AccountDetailDialog account={detail} onClose={() => setDetail(undefined)} /> : null}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </Screen>
  );
}

function AccountsSkeleton() {
  return (
    <div role="status" aria-label="Đang tải tài khoản" className="flex flex-col gap-sm p-md">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

/** Suspend asks for a reason (3–500 characters, as the server enforces); reactivate takes an optional note. */
function AccountActionDialog({
  action,
  onClose,
  onDone,
  onStale,
}: {
  action: Action;
  onClose: () => void;
  onDone: (message: string) => void;
  onStale: () => void;
}) {
  const { account, mode } = action;
  const suspending = mode === 'suspend';
  const name = account.fullName?.trim() || `#${account.userId}`;
  const [text, setText] = useState('');
  const mutation = useMutation({
    mutationFn: () =>
      suspending
        ? platformApi.suspendAccount(account.userId, text.trim())
        : platformApi.reactivateAccount(account.userId, text.trim() || undefined),
    onSuccess: () =>
      onDone(suspending ? `Đã khoá tài khoản ${name}` : `Đã mở khoá tài khoản ${name}`),
    onError: (error) => {
      // 409: someone else changed this account first. Reload the list behind the dialog.
      if (error instanceof PlatformApiError && error.status === 409) onStale();
    },
  });

  const trimmed = text.trim();
  const reasonInvalid = suspending && (trimmed.length < REASON_MIN || trimmed.length > REASON_MAX);
  const error = mutation.error
    ? mutation.error instanceof PlatformApiError
      ? mutation.error.status === 409
        ? 'Dữ liệu đã thay đổi. Đóng hộp thoại, danh sách đã được tải lại.'
        : mutation.error.message
      : 'Không thể xử lý yêu cầu.'
    : undefined;

  return (
    <ConfirmDialog
      visible
      title={suspending ? `Khoá tài khoản ${name}?` : `Mở khoá tài khoản ${name}?`}
      description={
        suspending
          ? 'Người dùng bị đăng xuất khỏi mọi thiết bị và không đăng nhập lại được. Điểm bán đang mở sẽ tạm dừng. Giấy phép và hợp đồng thuê không bị ảnh hưởng.'
          : 'Người dùng đăng nhập lại được. Điểm bán vẫn tạm dừng cho tới khi chủ điểm bán tự mở lại.'
      }
      confirmLabel={suspending ? 'Khoá tài khoản' : 'Mở khoá'}
      confirmVariant={suspending ? 'danger' : 'approve'}
      confirmDisabled={reasonInvalid}
      busy={mutation.isPending}
      error={error}
      onConfirm={() => mutation.mutate()}
      onCancel={onClose}
    >
      <TextField
        label={suspending ? 'Lý do khoá (bắt buộc)' : 'Ghi chú (không bắt buộc)'}
        value={text}
        onChangeText={setText}
        multiline
        maxLength={REASON_MAX}
        helperText={suspending ? `${REASON_MIN}–${REASON_MAX} ký tự. Người dùng sẽ thấy lý do này.` : undefined}
      />
    </ConfirmDialog>
  );
}

const ACTION_LABEL = {
  ADM_ACCOUNT_SUSPEND: 'Khoá tài khoản',
  ADM_ACCOUNT_REACTIVATE: 'Mở khoá',
} as const;

function AccountDetailDialog({
  account,
  onClose,
}: {
  account: AccountRowData;
  onClose: () => void;
}) {
  const detail = useQuery({
    queryKey: ['platform', 'accounts', 'detail', account.userId],
    queryFn: () => platformApi.accountDetail(account.userId),
  });
  const current = detail.data?.account ?? account;

  return (
    <ConfirmDialog
      visible
      title={current.fullName?.trim() || `Tài khoản #${current.userId}`}
      confirmLabel="Đóng"
      confirmVariant="outline"
      onConfirm={onClose}
      onCancel={onClose}
    >
      <dl className="grid grid-cols-[auto_1fr] gap-x-md gap-y-1.5 text-body-sm">
        <dt className="text-muted">Số điện thoại</dt>
        <dd className="text-right text-text">{current.maskedPhone}</dd>
        <dt className="text-muted">Tạo lúc</dt>
        <dd className="text-right text-text">{formatDateTime(current.createdAt) ?? '—'}</dd>
        <dt className="text-muted">Đăng nhập gần nhất</dt>
        <dd className="text-right text-text">{formatDateTime(current.lastLoginAt) ?? 'Chưa có'}</dd>
        <dt className="text-muted">Phiên đang mở</dt>
        <dd className="text-right text-text">{current.activeSessions}</dd>
        {current.roleCode === 'VENDOR' ? (
          <>
            <dt className="text-muted">Điểm bán</dt>
            <dd className="text-right text-text">{current.storefrontCount}</dd>
          </>
        ) : null}
      </dl>
      <h3 className="mt-md text-label font-semibold text-text">Lịch sử khoá / mở khoá</h3>
      {detail.isPending ? (
        <Skeleton className="mt-xs h-10 w-full" />
      ) : detail.isError ? (
        <p role="alert" className="mt-xs text-body-sm text-error">
          Không tải được lịch sử.
        </p>
      ) : detail.data.history.length === 0 ? (
        <p className="mt-xs text-body-sm text-muted">Chưa từng bị khoá.</p>
      ) : (
        <ul className="mt-xs flex max-h-[200px] flex-col gap-xs overflow-y-auto">
          {detail.data.history.map((event) => (
            <li key={`${event.action}-${event.createdAt}`} className="text-body-sm text-text">
              <span className="font-semibold">{ACTION_LABEL[event.action]}</span>
              <span className="text-muted">
                {' '}
                · {event.actorName} · {formatDateTime(event.createdAt)}
              </span>
              {event.reason ? <p className="text-muted">{event.reason}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </ConfirmDialog>
  );
}
