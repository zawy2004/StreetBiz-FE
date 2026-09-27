import { useMemo, useState } from 'react';

import { Card, formatVnd, Money } from '@/components/common';
import { SegmentedControl } from '@/components/forms';
import { AppHeader, Screen, Section } from '@/components/layout';
import { AiHint } from '@/components/status';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { errorMessage } from '@/core/api';
import { env } from '@/core/config/env';
import { useCollectionReport, type ReportPeriod } from '../useWardReports';

type PeriodKey = 'THIS_MONTH' | 'LAST_MONTH' | 'LAST_90_DAYS';

/** Local calendar date, not toISOString(): that is UTC and would be yesterday before 07:00. */
function isoDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function periodFor(key: PeriodKey, today: Date): ReportPeriod {
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

export function CollectionReportScreen() {
  const [periodKey, setPeriodKey] = useState<PeriodKey>('THIS_MONTH');
  const period = useMemo(() => periodFor(periodKey, new Date()), [periodKey]);
  const { report, isLoading, isError, error, refetch } = useCollectionReport(period);
  const subtitle = `${displayDay(period.from)} – ${displayDay(period.to)}`;

  const periodControl = (
    <SegmentedControl
      value={periodKey}
      onChange={setPeriodKey}
      options={[
        { value: 'THIS_MONTH', label: 'Tháng này' },
        { value: 'LAST_MONTH', label: 'Tháng trước' },
        { value: 'LAST_90_DAYS', label: '90 ngày' },
      ]}
    />
  );

  if (isLoading) {
    return (
      <Screen>
        <AppHeader title="Báo cáo thu phí" subtitle={subtitle} />
        {periodControl}
        <LoadingState />
      </Screen>
    );
  }
  if (isError || !report) {
    return (
      <Screen>
        <AppHeader title="Báo cáo thu phí" subtitle={subtitle} />
        {periodControl}
        <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader title="Báo cáo thu phí" subtitle={subtitle} />
      {periodControl}

      <div className="flex flex-row gap-sm">
        <Card style={{ flex: 1 }}>
          <p className="text-body-sm text-muted">Phí đã thu</p>
          <Money amountVnd={report.feeCollected} size="lg" />
        </Card>
        <Card style={{ flex: 1 }}>
          <p className="text-body-sm text-muted">Phạt đã thu</p>
          <Money amountVnd={report.penaltyCollected} size="lg" />
        </Card>
      </div>
      {/* Debt is a snapshot as of now, not tied to the selected period. */}
      <div className="flex flex-row gap-sm">
        <Card style={{ flex: 1 }}>
          <p className="text-body-sm text-muted">Phí còn nợ</p>
          <Money amountVnd={report.feePending + report.feeOverdue} />
          {report.feeOverdue > 0 ? (
            <p className="mt-2xs text-body-sm text-error">
              Quá hạn: {formatVnd(report.feeOverdue)}
            </p>
          ) : null}
        </Card>
        <Card style={{ flex: 1 }}>
          <p className="text-body-sm text-muted">Phạt còn nợ</p>
          <Money amountVnd={report.penaltyPending} />
        </Card>
      </div>
      <p className="text-body-sm text-muted">
        {report.invoiceCount} hoá đơn đã phát hành trong kỳ · Số nợ tính đến thời điểm hiện tại
      </p>

      {env.enableAiCompliance ? (
        <AiHint title="Tóm tắt tự động">
          Đã ghi nhận {report.recentViolations.length} vi phạm gần đây, chủ yếu là bày biện vượt
          vạch quy định. Tỷ lệ thu phí đúng hạn đạt mức khá; đề xuất nhắc thanh toán sớm hơn 3 ngày
          cho các hộ có lịch sử nộp trễ.
        </AiHint>
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
