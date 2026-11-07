import { StatCard } from '@/components/data';
import { Card } from '@/components/common';
import { ErrorState, LoadingState } from '@/components/feedback';
import { Section } from '@/components/layout';
import { errorMessage, type TaxGroupCountsDto, type WardTaxDashboardDto } from '@/core/api';
import { Disclaimer } from './TaxParts';
import { formatCompactVnd, formatDay } from '../tax-format';
import { useWardTaxDashboard } from '../useTax';

export type WardTaxTab = 'overview' | 'households' | 'referrals' | 'announcements';

const GROUP_ROWS: { key: keyof TaxGroupCountsDto; label: string; hint: string }[] = [
  { key: 'g1', label: 'Nhóm 1', hint: 'dưới ngưỡng không chịu thuế' },
  { key: 'g2', label: 'Nhóm 2', hint: 'vượt ngưỡng, dưới mức nhóm 3' },
  { key: 'g3', label: 'Nhóm 3', hint: 'doanh thu lớn' },
  { key: 'g4', label: 'Nhóm 4', hint: 'doanh thu rất lớn' },
  { key: 'noRevenue', label: 'Chưa có doanh thu', hint: 'chưa bán hoặc chưa ghi' },
];

function GroupBars({ groups, total }: { groups: TaxGroupCountsDto; total: number }) {
  return (
    <ul className="flex flex-col gap-sm">
      {GROUP_ROWS.map((row) => {
        const count = groups[row.key];
        return (
          <li key={row.key}>
            <div className="flex items-baseline justify-between gap-sm text-body-md">
              <span className="text-text">
                {row.label} <span className="text-body-sm text-muted">· {row.hint}</span>
              </span>
              <span className="font-tabular font-semibold text-text">{count}</span>
            </div>
            <div
              role="img"
              aria-label={`${row.label}: ${count} trên ${total} hộ`}
              className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-sunken"
            >
              <span
                className="block h-full rounded-full bg-primary"
                style={{ width: total > 0 ? `${(count / total) * 100}%` : '0%' }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Body({ data, onOpen }: { data: WardTaxDashboardDto; onOpen: (tab: WardTaxTab) => void }) {
  const noticeTotal = data.noticeFiled + data.noticeNotFiled;
  return (
    <>
      <div className="grid grid-cols-1 gap-sm sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Hộ kinh doanh"
          value={String(data.householdCount)}
          hint={`${data.activeCount} đang hoạt động · ${data.suspendedCount} tạm đình chỉ · ${data.endedCount} đã ngừng`}
          icon="storefront-outline"
          tone="indigo"
          onPress={() => onOpen('households')}
        />
        <StatCard
          label="Đã khai mã số thuế"
          value={`${data.withTaxCode}/${data.householdCount}`}
          hint={`${data.withoutTaxCode} hộ chưa khai`}
          icon="clipboard-text-outline"
          tone="tertiary"
          onPress={() => onOpen('households')}
        />
        <StatCard
          label={`Đã thông báo doanh thu năm ${data.taxYear}`}
          value={`${data.noticeFiled}/${noticeTotal}`}
          hint={`Hạn ${formatDay(data.noticeDueDate)}`}
          icon="check-circle-outline"
          tone="tertiary"
          onPress={() => onOpen('announcements')}
        />
        <StatCard
          label="Gần hoặc vượt ngưỡng"
          value={String(data.nearThresholdCount + data.overThresholdCount)}
          hint={`${data.nearThresholdCount} gần ngưỡng · ${data.overThresholdCount} đã vượt`}
          icon="chart-line"
          tone="primary"
        />
        <StatCard
          label="Đề nghị chờ xử lý"
          value={String(data.pendingReferrals)}
          hint={`${data.reportedReferrals} đã báo cơ quan thuế`}
          icon="send-outline"
          tone="primary"
          onPress={() => onOpen('referrals')}
        />
        <StatCard
          label="Cho phép phường xem doanh thu"
          value={`${data.sharingRevenue}/${data.householdCount}`}
          hint="Các hộ còn lại phường không thấy doanh thu"
          icon="lock-outline"
          tone="secondary"
        />
      </div>

      <Section
        title="Phân nhóm theo doanh thu"
        description={`Số hộ mỗi nhóm theo ngưỡng ${formatCompactVnd(data.policy.revenueThreshold)}/năm. Chỉ là số tổng hợp, không nêu tên hộ.`}
      >
        <Card>
          <GroupBars groups={data.groups} total={data.householdCount} />
        </Card>
      </Section>

      <p className="text-body-xs text-muted">
        Căn cứ: {data.policy.legalBasis} · phiên bản {data.policy.versionNo}. Phường không thu thuế; danh sách này để hỗ trợ hộ và
        cung cấp thông tin cho cơ quan thuế.
      </p>
      <Disclaimer text={data.disclaimer} />
    </>
  );
}

export function WardTaxOverview({ onOpen }: { onOpen: (tab: WardTaxTab) => void }) {
  const dashboard = useWardTaxDashboard();
  if (dashboard.isLoading) return <LoadingState />;
  if (dashboard.isError || !dashboard.data) {
    return <ErrorState message={errorMessage(dashboard.error)} onRetry={() => dashboard.refetch()} />;
  }
  return <Body data={dashboard.data} onOpen={onOpen} />;
}
