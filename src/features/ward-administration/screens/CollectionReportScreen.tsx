import { useMemo, useState } from 'react';

import { SegmentedControl } from '@/components/forms';
import { AppHeader, Screen, Section } from '@/components/layout';
import { AiHint } from '@/components/status';
import { ErrorState } from '@/components/feedback';
import { errorMessage } from '@/core/api';
import { env, isLiveApi } from '@/core/config/env';
import {
  CollectedHero,
  DebtColumn,
  InvoiceLine,
  PeriodRuler,
  ReportSkeleton,
  TopViolations,
  ViolationLedger,
} from '../components/ops/report/ReportParts';
import { daysInMonth, periodDays } from '../components/ops/report/report-model';
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

/**
 * W19: the ward's collection book. One large figure for what the period took
 * in, beside it what is owed right now (a snapshot, not tied to the period),
 * then recent violations as receipt lines. Read-only; one request per period.
 */
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

  // Display only, from the period already asked for: its length, and how far into this month.
  const days = periodDays(period.from, period.to);
  const monthProgress =
    periodKey === 'THIS_MONTH'
      ? { done: Number(period.to.slice(8, 10)), total: daysInMonth(period.to) }
      : null;

  const head = (
    <div className="flex flex-col gap-sm md:flex-row md:items-end md:justify-between md:gap-lg">
      <div className="flex min-w-0 flex-col gap-1">
        <AppHeader title="Báo cáo thu phí" subtitle={subtitle} />
        <PeriodRuler days={days} monthProgress={monthProgress} />
      </div>
      <div className="shrink-0 md:pb-1 [&_[role=tab]]:h-10">{periodControl}</div>
    </div>
  );

  if (isLoading) {
    return (
      <Screen width="wide">
        {head}
        <ReportSkeleton />
      </Screen>
    );
  }
  if (isError || !report) {
    return (
      <Screen width="wide">
        {head}
        <div className="rounded-[24px] bg-card shadow-card ring-1 ring-border">
          <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
        </div>
      </Screen>
    );
  }

  const violations = report.recentViolations;

  return (
    <Screen width="wide">
      {head}

      <div
        aria-live="polite"
        className="sb-pop grid items-stretch gap-md xl:grid-cols-[minmax(0,1fr)_400px]"
      >
        <CollectedHero report={report} />
        {/* Debt is a snapshot as of now, not tied to the selected period. */}
        <DebtColumn report={report} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-sm">
        <InvoiceLine count={report.invoiceCount} />
        {!isLiveApi ? (
          <p className="rounded-full bg-sunken px-sm py-1 text-body-xs font-medium text-muted">
            Dữ liệu mẫu: số không đổi theo kỳ
          </p>
        ) : null}
      </div>

      {env.enableAiCompliance ? (
        <AiHint title="Tóm tắt tự động">
          Đã ghi nhận {report.recentViolations.length} vi phạm gần đây, chủ yếu là bày biện vượt
          vạch quy định. Tỷ lệ thu phí đúng hạn đạt mức khá; đề xuất nhắc thanh toán sớm hơn 3 ngày
          cho các hộ có lịch sử nộp trễ.
        </AiHint>
      ) : null}

      <div
        className={`grid items-start gap-lg ${violations.length >= 2 ? 'xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]' : ''}`}
      >
        <Section title="Vi phạm gần đây">
          <ViolationLedger items={violations} />
        </Section>
        {violations.length >= 2 ? (
          <Section title="Hành vi hay gặp" description="Đếm trong danh sách vi phạm gần đây.">
            <TopViolations items={violations} />
          </Section>
        ) : null}
      </div>
    </Screen>
  );
}
