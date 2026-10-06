import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, Card, Divider, formatVnd, Money } from '@/components/common';
import { ResponsiveGrid, StatCard } from '@/components/data';
import { SegmentedControl } from '@/components/forms';
import { AppHeader, Screen, Section } from '@/components/layout';
import { AiHint, StatusChip } from '@/components/status';
import { EmptyState, ErrorState, LoadingState, showToast } from '@/components/feedback';
import { errorMessage, wardReportApi } from '@/core/api';
import { env, isLiveApi } from '@/core/config/env';
import { saveFile } from '@/core/utils/save-file';
import { CollectionTrendChart } from '../components/CollectionTrendChart';
import {
  useCollectionPerformance,
  useCollectionReport,
  useCollectionTrend,
  useWardDebtors,
  type ReportPeriod,
} from '../useWardReports';

type PeriodKey = 'THIS_MONTH' | 'LAST_MONTH' | 'LAST_90_DAYS' | 'CUSTOM';

/** Local calendar date, not toISOString(): that is UTC and would be yesterday before 07:00. */
function isoDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function periodFor(key: Exclude<PeriodKey, 'CUSTOM'>, today: Date): ReportPeriod {
  const year = today.getFullYear();
  const month = today.getMonth();
  switch (key) {
    case 'LAST_MONTH':
      return { from: isoDay(new Date(year, month - 1, 1)), to: isoDay(new Date(year, month, 0)) };
    case 'LAST_90_DAYS':
      return { from: isoDay(new Date(year, month, today.getDate() - 89)), to: isoDay(today) };
    default:
      return { from: isoDay(new Date(year, month, 1)), to: isoDay(today) };
  }
}

const displayDay = (iso: string) => {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
};

const percent = (rate: number) => `${Math.round(rate * 1000) / 10}`.replace('.', ',') + '%';

export function CollectionReportScreen() {
  const navigate = useNavigate();
  const [periodKey, setPeriodKey] = useState<PeriodKey>('THIS_MONTH');
  const [custom, setCustom] = useState<ReportPeriod>(() => periodFor('THIS_MONTH', new Date()));
  const period = useMemo(
    () => (periodKey === 'CUSTOM' ? custom : periodFor(periodKey, new Date())),
    [periodKey, custom],
  );
  const { report, isLoading, isError, error, refetch } = useCollectionReport(period);
  const performance = useCollectionPerformance(period);
  const trend = useCollectionTrend(6);
  const debtors = useWardDebtors();
  const subtitle = `${displayDay(period.from)} – ${displayDay(period.to)}`;
  const [exporting, setExporting] = useState(false);

  const exportXlsx = async () => {
    if (!isLiveApi) {
      showToast('Xuất Excel chỉ có khi kết nối máy chủ (đang ở chế độ demo).');
      return;
    }
    setExporting(true);
    try {
      const fileName = `bao-cao-thu-phi_${period.from.replaceAll('-', '')}-${period.to.replaceAll('-', '')}.xlsx`;
      saveFile(await wardReportApi.collectionReportXlsx(period.from, period.to), fileName);
    } catch (err) {
      showToast(errorMessage(err));
    } finally {
      setExporting(false);
    }
  };

  const header = (
    <AppHeader
      title="Báo cáo thu phí"
      subtitle={subtitle}
      right={
        <Button
          label="Xuất Excel"
          size="sm"
          variant="outline"
          fullWidth={false}
          loading={exporting}
          disabled={exporting}
          onPress={() => void exportXlsx()}
        />
      }
    />
  );

  // Filters sit in one row above everything they scope; the custom range opens beneath it.
  const periodControl = (
    <div className="flex flex-col gap-sm">
      <SegmentedControl
        value={periodKey}
        onChange={setPeriodKey}
        options={[
          { value: 'THIS_MONTH', label: 'Tháng này' },
          { value: 'LAST_MONTH', label: 'Tháng trước' },
          { value: 'LAST_90_DAYS', label: '90 ngày' },
          { value: 'CUSTOM', label: 'Tuỳ chọn' },
        ]}
      />
      {periodKey === 'CUSTOM' ? (
        <div className="grid gap-sm sm:grid-cols-2">
          <label className="flex flex-col gap-2xs text-label text-text">
            Từ ngày
            <input
              type="date"
              value={custom.from}
              max={custom.to}
              onChange={(event) => event.target.value && setCustom((c) => ({ ...c, from: event.target.value }))}
              className="h-12 rounded-sm border border-border bg-card px-sm text-body-md"
            />
          </label>
          <label className="flex flex-col gap-2xs text-label text-text">
            Đến ngày
            <input
              type="date"
              value={custom.to}
              min={custom.from}
              onChange={(event) => event.target.value && setCustom((c) => ({ ...c, to: event.target.value }))}
              className="h-12 rounded-sm border border-border bg-card px-sm text-body-md"
            />
          </label>
        </div>
      ) : null}
    </div>
  );

  if (isLoading) {
    return (
      <Screen width="wide">
        {header}
        {periodControl}
        <LoadingState />
      </Screen>
    );
  }
  if (isError || !report) {
    return (
      <Screen width="wide">
        {header}
        {periodControl}
        <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
      </Screen>
    );
  }

  const perf = performance.data;
  const debtorRows = debtors.data ?? [];
  const owed = report.feePending + report.feeOverdue + report.penaltyPending;

  return (
    <Screen width="wide">
      {header}
      {periodControl}

      <ResponsiveGrid minItemWidth={200} fit>
        <StatCard
          label="Đã thu trong kỳ"
          value={formatVnd(report.feeCollected + report.penaltyCollected)}
          hint={`Phí ${formatVnd(report.feeCollected)} · Phạt ${formatVnd(report.penaltyCollected)}`}
          icon="cash-multiple"
          tone="secondary"
        />
        <StatCard
          label="Nộp phí đúng hạn"
          value={perf?.onTimeRate != null ? percent(perf.onTimeRate) : '—'}
          hint={
            perf
              ? perf.dueCount
                ? `${perf.paidOnTimeCount}/${perf.dueCount} kỳ đến hạn trong kỳ`
                : 'Không có kỳ phí đến hạn trong kỳ'
              : isLiveApi
                ? 'Đang tính…'
                : 'Có khi kết nối máy chủ'
          }
          icon="timer-outline"
          tone="tertiary"
        />
        <StatCard
          label="Còn phải thu"
          value={formatVnd(owed)}
          hint={report.feeOverdue > 0 ? `Quá hạn ${formatVnd(report.feeOverdue)}` : 'Tính đến hiện tại'}
          icon="clock-outline"
          tone="primary"
        />
        <StatCard
          label="Hộ nợ quá hạn"
          value={isLiveApi ? String(debtorRows.length) : '—'}
          hint={debtorRows.length ? 'Bấm để xem và nhắc nợ' : 'Không có hộ nào'}
          icon="account-group-outline"
          tone="indigo"
          onPress={isLiveApi ? () => navigate('/ward/reports/debtors') : undefined}
        />
      </ResponsiveGrid>
      {/* Debt is a snapshot as of now, not tied to the selected period. */}
      <p className="text-body-sm text-muted">
        {report.invoiceCount} hoá đơn đã phát hành trong kỳ · Số nợ tính đến thời điểm hiện tại
      </p>

      {env.enableAiCompliance ? (
        <AiHint title="Tóm tắt tự động">
          {perf?.onTimeRate != null
            ? `Tỷ lệ nộp phí đúng hạn trong kỳ là ${percent(perf.onTimeRate)}. `
            : ''}
          {debtorRows.length
            ? `Có ${debtorRows.length} hộ đang nợ quá hạn; nên nhắc trước những hộ quá hạn lâu nhất.`
            : 'Không có hộ nào nợ phí quá hạn.'}
        </AiHint>
      ) : null}

      <Section title="Thu theo tháng · 6 tháng gần nhất">
        <Card>
          {!isLiveApi ? (
            <EmptyState compact icon="chart-bar" title="Biểu đồ có khi kết nối máy chủ" />
          ) : trend.isLoading ? (
            <LoadingState />
          ) : trend.isError ? (
            <ErrorState message={errorMessage(trend.error)} onRetry={() => trend.refetch()} />
          ) : trend.data && trend.data.some((m) => m.feeCollected + m.penaltyCollected > 0) ? (
            <CollectionTrendChart months={trend.data} refreshing={trend.isFetching} />
          ) : (
            <EmptyState compact icon="chart-bar" title="Chưa có khoản thu nào trong 6 tháng qua" />
          )}
        </Card>
      </Section>

      {debtorRows.length ? (
        <Section title="Hộ nợ phí quá hạn lâu nhất">
          <Card padded={false}>
            <div className="px-md">
              {debtorRows.slice(0, 3).map((debtor, index) => (
                <div key={debtor.contractId}>
                  {index ? <Divider /> : null}
                  <div className="flex items-center justify-between gap-sm py-sm">
                    <div className="min-w-0">
                      <p className="truncate text-headline-sm text-text">
                        {debtor.businessName ?? debtor.vendorName}
                      </p>
                      <p className="text-body-sm text-muted">
                        Ô {debtor.slotCode} · {debtor.overdueCount} kỳ
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2xs">
                      <Money amountVnd={debtor.overdueAmount} />
                      <StatusChip label={`Quá hạn ${debtor.daysOverdue} ngày`} tone="danger" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Button
            label={`Xem tất cả ${debtorRows.length} hộ và nhắc nợ`}
            variant="outline"
            onPress={() => navigate('/ward/reports/debtors')}
          />
        </Section>
      ) : null}

      {perf && perf.byZone.length ? (
        <Section title="Theo khu vực">
          <Card padded={false}>
            <table className="w-full text-body-sm">
              <thead>
                <tr className="text-left text-muted">
                  <th className="px-md py-xs font-normal">Khu vực</th>
                  <th className="px-xs py-xs text-right font-normal">Ô đang thuê</th>
                  <th className="px-xs py-xs text-right font-normal">Đã thu trong kỳ</th>
                  <th className="px-md py-xs text-right font-normal">Còn phải thu</th>
                </tr>
              </thead>
              <tbody>
                {perf.byZone.map((zone) => (
                  <tr key={zone.zoneId} className="border-t border-border text-text">
                    <td className="px-md py-sm">{zone.zoneName}</td>
                    <td className="px-xs py-sm text-right tabular-nums">
                      {zone.rentedSlots}/{zone.slotCount}
                    </td>
                    <td className="px-xs py-sm text-right tabular-nums">{formatVnd(zone.feeCollected)}</td>
                    <td className="px-md py-sm text-right tabular-nums">{formatVnd(zone.outstanding)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </Section>
      ) : null}

      <Section title="Vi phạm gần đây">
        {report.recentViolations.length === 0 ? (
          <EmptyState compact icon="shield-check-outline" title="Không có vi phạm gần đây" />
        ) : (
          report.recentViolations.map((v) => (
            <Card key={`${v.violationId}-${v.recordedAt}`}>
              <div className="flex items-center justify-between gap-sm">
                <p className="text-headline-sm text-text">{v.violationLabel}</p>
                {v.penaltyAmount !== null ? <Money amountVnd={v.penaltyAmount} /> : null}
              </div>
              <p className="mt-2xs text-body-sm text-muted">
                {[v.vendorName, v.slotCode, new Date(v.recordedAt).toLocaleDateString('vi-VN')]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </Card>
          ))
        )}
      </Section>
    </Screen>
  );
}
