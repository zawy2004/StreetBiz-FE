import { useState } from 'react';

import { Button, Card } from '@/components/common';
import { FilterChips } from '@/components/forms';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { ROLE_LABELS, type RoleCode } from '@/core/types/role';
import { useMockDb } from '@/mocks/db';

type Filter = 'ALL' | RoleCode;

export function AccountsScreen() {
  const users = useMockDb((s) => s.users);
  const setAccountStatus = useMockDb((s) => s.setAccountStatus);
  const [filter, setFilter] = useState<Filter>('ALL');

  const visible = filter === 'ALL' ? users : users.filter((u) => u.role_code === filter);

  return (
    <Screen>
      <AppHeader title="Quản lý tài khoản" />
      <FilterChips
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'ALL', label: 'Tất cả' },
          { value: 'CUSTOMER', label: 'Người mua' },
          { value: 'VENDOR', label: 'Hộ kinh doanh' },
        ]}
      />
      {visible.map((u) => (
        <Card key={u.id}>
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-headline-sm text-text">{u.fullName}</span>
              <span className="text-body-sm text-muted">
                {ROLE_LABELS[u.role_code]} · {u.phone}
              </span>
            </div>
            <StatusChip
              label={u.account_status === 'ACTIVE' ? 'Hoạt động' : 'Đã khoá'}
              tone={u.account_status === 'ACTIVE' ? 'ok' : 'danger'}
            />
          </div>
          {u.role_code === 'CUSTOMER' || u.role_code === 'VENDOR' ? (
            <div className="mt-sm">
              <Button
                label={u.account_status === 'ACTIVE' ? 'Khoá tài khoản' : 'Mở khoá tài khoản'}
                variant={u.account_status === 'ACTIVE' ? 'danger' : 'approve'}
                onPress={() =>
                  setAccountStatus(u.id, u.account_status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE')
                }
              />
            </div>
          ) : null}
        </Card>
      ))}
    </Screen>
  );
}
