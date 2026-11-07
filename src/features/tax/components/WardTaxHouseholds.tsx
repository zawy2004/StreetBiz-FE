import { useMemo, useState } from 'react';

import { Icon, formatVnd } from '@/components/common';
import { DataTable, type Column } from '@/components/data';
import { ErrorState } from '@/components/feedback';
import { FilterChips, TextField } from '@/components/forms';
import { StatusChip } from '@/components/status';
import { errorMessage, type WardTaxHouseholdDto } from '@/core/api';
import { colors } from '@/theme';
import {
  GROUP_LABEL,
  HOUSEHOLD_STATUS_LABEL,
  HOUSEHOLD_STATUS_TONE,
} from '../tax-format';
import { useWardTaxHouseholds } from '../useTax';

type Filter = 'ALL' | 'NO_CODE' | 'NOT_FILED' | 'ACTIVE' | 'ENDED';

/** Lower-case and strip Vietnamese marks so “banh mi” finds “Bánh mì”. */
function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase();
}

const matches: Record<Filter, (h: WardTaxHouseholdDto) => boolean> = {
  ALL: () => true,
  NO_CODE: (h) => !h.hasTaxCode,
  NOT_FILED: (h) => !h.noticeFiled,
  ACTIVE: (h) => h.status === 'ACTIVE',
  ENDED: (h) => h.status === 'ENDED',
};

const COLUMNS: Column<WardTaxHouseholdDto>[] = [
  {
    key: 'name',
    header: 'Hộ kinh doanh',
    render: (h) => (
      <div className="min-w-0">
        <p className="truncate font-semibold text-text">{h.displayName}</p>
        <p className="truncate text-body-sm font-normal text-muted">
          {h.ownerName}
          {h.phone ? ` · ${h.phone}` : ''}
        </p>
      </div>
    ),
  },
  {
    key: 'slots',
    header: 'Ô thuê',
    hideOnMobile: false,
    render: (h) => (h.slotCodes.length ? h.slotCodes.join(', ') : '—'),
  },
  {
    key: 'status',
    header: 'Tình trạng',
    render: (h) => <StatusChip label={HOUSEHOLD_STATUS_LABEL[h.status]} tone={HOUSEHOLD_STATUS_TONE[h.status]} />,
  },
  {
    key: 'tax',
    header: 'Mã số thuế',
    render: (h) => (h.hasTaxCode ? <span className="font-tabular">{h.taxCodeMasked}</span> : <span className="text-muted">Chưa khai</span>),
  },
  {
    key: 'notice',
    header: 'Thông báo doanh thu năm',
    render: (h) => <StatusChip label={h.noticeFiled ? 'Đã thông báo' : 'Chưa'} tone={h.noticeFiled ? 'ok' : 'neutral'} />,
  },
  {
    key: 'revenue',
    header: 'Doanh thu năm',
    align: 'right',
    render: (h) =>
      h.sharesRevenue && h.revenue !== null ? (
        <span className="font-tabular">
          {formatVnd(h.revenue)}
          {h.group ? <span className="ml-1 text-body-xs text-muted">· {GROUP_LABEL[h.group]}</span> : null}
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-body-sm text-muted">
          <Icon name="lock-outline" size={14} color={colors.muted} />
          Không chia sẻ
        </span>
      ),
  },
];

/**
 * The ward's households as it keeps them for the tax office. Revenue and group show only for
 * households that agreed to share them; the tax code is always masked.
 */
export function WardTaxHouseholds() {
  const households = useWardTaxHouseholds();
  const [filter, setFilter] = useState<Filter>('ALL');
  const [search, setSearch] = useState('');
  const rows = useMemo(() => households.data?.households ?? [], [households.data]);

  const visible = useMemo(() => {
    const needle = fold(search.trim());
    return rows.filter(
      (h) =>
        matches[filter](h) &&
        (needle === '' || fold(`${h.displayName} ${h.ownerName} ${h.slotCodes.join(' ')}`).includes(needle)),
    );
  }, [rows, filter, search]);

  if (households.isError) {
    return <ErrorState message={errorMessage(households.error)} onRetry={() => households.refetch()} />;
  }

  const count = (f: Filter) => rows.filter(matches[f]).length;

  return (
    <DataTable
      caption="Hộ kinh doanh của phường"
      rows={visible}
      columns={COLUMNS}
      rowKey={(h) => String(h.vendorId)}
      loading={households.isLoading}
      empty={{ icon: 'storefront-outline', title: 'Không có hộ nào khớp bộ lọc' }}
      toolbar={
        <div className="flex w-full flex-col gap-sm">
          <FilterChips
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'ALL', label: 'Tất cả', count: rows.length },
              { value: 'ACTIVE', label: 'Đang hoạt động', count: count('ACTIVE') },
              { value: 'NO_CODE', label: 'Chưa có mã số thuế', count: count('NO_CODE') },
              { value: 'NOT_FILED', label: 'Chưa thông báo năm', count: count('NOT_FILED') },
              { value: 'ENDED', label: 'Đã ngừng', count: count('ENDED') },
            ]}
          />
          <TextField label="Tìm theo tên hộ, chủ hộ hoặc ô" value={search} onChangeText={setSearch} maxLength={60} />
        </div>
      }
    />
  );
}
