import { useId, useState } from 'react';

import { Button, Icon } from '@/components/common';
import { FilterChips } from '@/components/forms';
import { AppHeader, Screen } from '@/components/layout';
import { type RoleCode } from '@/core/types/role';
import { useMockDb } from '@/mocks/db';
import { InfoBand, PanelButton, RoleMixBar } from '../components/AdminParts';
import { fold, ROLE_ORDER } from '../components/admin-format';
import { AccountsTable } from '../components/AccountsTable';

type Filter = 'ALL' | RoleCode;

export function AccountsScreen() {
  const users = useMockDb((s) => s.users);
  const setAccountStatus = useMockDb((s) => s.setAccountStatus);
  const [filter, setFilter] = useState<Filter>('ALL');
  // Display only: an in-memory search over the rows already shown, and what screen readers hear after a lock.
  const [query, setQuery] = useState('');
  const [announcement, setAnnouncement] = useState('');

  const visible = filter === 'ALL' ? users : users.filter((u) => u.role_code === filter);
  const count = (role: RoleCode) => users.filter((u) => u.role_code === role).length;

  const text = fold(query);
  const digits = query.replace(/\D/g, '');
  const searched = text
    ? visible.filter(
        (u) =>
          fold(u.fullName).includes(text) ||
          (digits.length > 0 && u.phone.replace(/\D/g, '').includes(digits)),
      )
    : visible;

  const roleCounts = Object.fromEntries(ROLE_ORDER.map((role) => [role, count(role)])) as Record<
    RoleCode,
    number
  >;
  const suspended = users.filter((u) => u.account_status === 'SUSPENDED').length;

  return (
    <Screen width="wide">
      <AppHeader
        title="Quản lý tài khoản"
        subtitle="Khoá hoặc mở lại tài khoản người mua và hộ kinh doanh."
      />
      <InfoBand>Khoá ở đây chỉ lưu trong trình duyệt này và mất khi tải lại trang.</InfoBand>

      <section
        aria-label="Cơ cấu tài khoản"
        className="rounded-[20px] bg-card p-md shadow-card ring-1 ring-border/80"
      >
        <RoleMixBar counts={roleCounts} suspended={suspended} />
      </section>

      <AccountsTable
        rows={searched}
        toolbar={
          <>
            <label className="input-shell flex h-11 min-w-0 flex-1 items-center gap-xs rounded-[10px] border border-border bg-card px-sm hover:border-muted/50 lg:max-w-[420px]">
              <span className="sr-only">Tìm tài khoản</span>
              <Icon name="magnify" size={18} color="currentColor" className="shrink-0 text-muted" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm theo tên hoặc số điện thoại"
                className="h-full min-w-0 flex-1 bg-transparent text-body-md text-text outline-none placeholder:text-muted/80 [&::-webkit-search-cancel-button]:hidden"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Xoá chữ tìm kiếm"
                  className="-mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted hover:bg-sunken hover:text-text"
                >
                  <Icon name="close" size={16} color="currentColor" />
                </button>
              ) : null}
            </label>
            <div className="min-w-0">
              <FilterChips
                value={filter}
                onChange={setFilter}
                options={[
                  { value: 'ALL', label: 'Tất cả', count: users.length },
                  { value: 'CUSTOMER', label: 'Người mua', count: count('CUSTOMER') },
                  { value: 'VENDOR', label: 'Hộ kinh doanh', count: count('VENDOR') },
                ]}
              />
            </div>
          </>
        }
        empty={{
          title: 'Không có tài khoản nào trong nhóm này',
          action:
            query && visible.length > 0 ? (
              <Button
                label="Xoá tìm kiếm"
                variant="outline"
                fullWidth={false}
                onPress={() => setQuery('')}
              />
            ) : undefined,
        }}
        renderAction={(u, nameId) =>
          u.role_code === 'CUSTOMER' || u.role_code === 'VENDOR' ? (
            <PanelButton
              size="sm"
              className={`min-w-[132px] ${u.account_status === 'ACTIVE' ? 'hover:ring-error/40 [&:hover_svg]:text-error' : ''}`}
              label={u.account_status === 'ACTIVE' ? 'Khoá tài khoản' : 'Mở khoá'}
              variant={u.account_status === 'ACTIVE' ? 'outline' : 'approve'}
              describedBy={nameId}
              icon={
                <Icon
                  name={u.account_status === 'ACTIVE' ? 'lock-outline' : 'check-circle-outline'}
                  size={17}
                  color="currentColor"
                  className="transition-colors"
                />
              }
              onPress={() => {
                setAccountStatus(u.id, u.account_status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE');
                setAnnouncement(
                  u.account_status === 'ACTIVE'
                    ? `Đã khoá tài khoản ${u.fullName}`
                    : `Đã mở khoá tài khoản ${u.fullName}`,
                );
              }}
            />
          ) : (
            <NotApplicable />
          )
        }
      />
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </Screen>
  );
}

/** Ward officer and admin accounts are not locked here; say why on hover or focus. */
function NotApplicable() {
  const tipId = useId();
  return (
    <span
      tabIndex={0}
      aria-describedby={tipId}
      className="group relative inline-flex h-11 items-center gap-1.5 rounded-[10px] px-xs text-body-sm text-muted outline-offset-2"
    >
      <span>Không áp dụng</span>
      <Icon name="information-outline" size={16} color="currentColor" />
      <span
        id={tipId}
        role="tooltip"
        className="pointer-events-none absolute bottom-full right-0 z-10 mb-1 hidden w-[240px] rounded-[10px] bg-card px-sm py-xs text-left text-body-xs text-text shadow-sheet ring-1 ring-border group-hover:block group-focus:block"
      >
        Tài khoản cán bộ Phường và quản trị không khoá tại đây.
      </span>
    </span>
  );
}
