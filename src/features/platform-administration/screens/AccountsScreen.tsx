import { useState } from 'react';

import { Avatar, Button } from '@/components/common';
import { DataTable, type Column } from '@/components/data';
import { FilterChips } from '@/components/forms';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { ROLE_LABELS, type RoleCode } from '@/core/types/role';
import { useMockDb } from '@/mocks/db';

type Filter = 'ALL' | RoleCode;
type User = ReturnType<typeof useMockDb.getState>['users'][number];

export function AccountsScreen() {
  const users = useMockDb((s) => s.users);
  const setAccountStatus = useMockDb((s) => s.setAccountStatus);
  const [filter, setFilter] = useState<Filter>('ALL');

  const visible = filter === 'ALL' ? users : users.filter((u) => u.role_code === filter);
  const count = (role: RoleCode) => users.filter((u) => u.role_code === role).length;

  const columns: Column<User>[] = [
    {
      key: 'name',
      header: 'Họ tên',
      render: (u) => (
        <span className="flex min-w-0 items-center gap-sm">
          <Avatar name={u.fullName} size={32} />
          <span className="truncate">{u.fullName}</span>
        </span>
      ),
    },
    { key: 'role', header: 'Vai trò', render: (u) => ROLE_LABELS[u.role_code] },
    { key: 'phone', header: 'Số điện thoại', render: (u) => <span className="font-tabular">{u.phone}</span> },
    {
      key: 'status',
      header: 'Trạng thái',
      width: '140px',
      render: (u) => (
        <StatusChip
          label={u.account_status === 'ACTIVE' ? 'Hoạt động' : 'Đã khoá'}
          tone={u.account_status === 'ACTIVE' ? 'ok' : 'danger'}
        />
      ),
    },
    {
      key: 'action',
      header: 'Thao tác',
      align: 'right',
      width: '180px',
      render: (u) =>
        u.role_code === 'CUSTOMER' || u.role_code === 'VENDOR' ? (
          <Button
            size="sm"
            fullWidth={false}
            label={u.account_status === 'ACTIVE' ? 'Khoá tài khoản' : 'Mở khoá'}
            variant={u.account_status === 'ACTIVE' ? 'outline' : 'approve'}
            onPress={() => setAccountStatus(u.id, u.account_status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE')}
          />
        ) : (
          <span className="text-body-sm text-muted">Không áp dụng</span>
        ),
    },
  ];

  return (
    <Screen width="wide">
      <AppHeader title="Quản lý tài khoản" subtitle="Khoá hoặc mở lại tài khoản người mua và hộ kinh doanh." />
      <DataTable
        caption="Danh sách tài khoản"
        rows={visible}
        columns={columns}
        rowKey={(u) => u.id}
        toolbar={
          <FilterChips
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'ALL', label: 'Tất cả', count: users.length },
              { value: 'CUSTOMER', label: 'Người mua', count: count('CUSTOMER') },
              { value: 'VENDOR', label: 'Hộ kinh doanh', count: count('VENDOR') },
            ]}
          />
        }
        empty={{ icon: 'account-group-outline', title: 'Không có tài khoản nào trong nhóm này' }}
      />
    </Screen>
  );
}
