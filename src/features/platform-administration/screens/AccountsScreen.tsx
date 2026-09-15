import { Text, View } from 'react-native';

import { Button, Card } from '@/components/common';
import { FilterChips } from '@/components/forms';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { useState } from 'react';
import { ROLE_LABELS, type RoleCode } from '@/core/types/role';
import { colors, spacing, typography } from '@/theme';
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
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}
          >
            <View style={{ gap: 4 }}>
              <Text style={[typography.headlineSm, { color: colors.text }]}>{u.fullName}</Text>
              <Text style={[typography.bodySm, { color: colors.muted }]}>
                {ROLE_LABELS[u.role_code]} · {u.phone}
              </Text>
            </View>
            <StatusChip
              label={u.account_status === 'ACTIVE' ? 'Hoạt động' : 'Đã khoá'}
              tone={u.account_status === 'ACTIVE' ? 'ok' : 'danger'}
            />
          </View>
          {u.role_code === 'CUSTOMER' || u.role_code === 'VENDOR' ? (
            <View style={{ marginTop: spacing.sm }}>
              <Button
                label={u.account_status === 'ACTIVE' ? 'Khoá tài khoản' : 'Mở khoá tài khoản'}
                variant={u.account_status === 'ACTIVE' ? 'danger' : 'approve'}
                onPress={() =>
                  setAccountStatus(u.id, u.account_status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE')
                }
              />
            </View>
          ) : null}
        </Card>
      ))}
    </Screen>
  );
}
