import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, Card, Icon, Money, formatVnd, type IconName } from '@/components/common';
import { ErrorState, LoadingState, showToast } from '@/components/feedback';
import { AppHeader, Screen, Section } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { errorMessage, taxApi, type TaxObligationDto, type TaxOverviewDto } from '@/core/api';
import { isLiveApi } from '@/core/config/env';
import { saveFile } from '@/core/utils/save-file';
import { colors } from '@/theme';
import { Disclaimer, LevelChip, MonthBars, TaxNeedsServer, ThresholdGauge, YearTabs } from '../components/TaxParts';
import {
  GROUP_LABEL,
  PERIOD_STATUS_LABEL,
  PERIOD_STATUS_TONE,
  currentTaxYear,
  formatCompactVnd,
  formatDay,
} from '../tax-format';
import { useTaxOverview } from '../useTax';

function Standing({ overview }: { overview: TaxOverviewDto }) {
  const { revenue, policy, level, projection } = overview;
  const over = level === 'OVER';
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-sm">
        <div>
          <p className="text-body-sm text-muted">Doanh thu năm {overview.taxYear} đến nay</p>
          <Money amountVnd={revenue.total} size="lg" />
        </div>
        <div className="flex flex-wrap items-center gap-xs">
          <StatusChip label={GROUP_LABEL[overview.group]} tone="neutral" />
          <LevelChip level={level} />
        </div>
      </div>
      <p className="mt-2xs text-body-sm text-muted">{overview.groupDescription}</p>

      <div className="mt-md">
        <ThresholdGauge
          revenue={revenue.total}
          threshold={policy.revenueThreshold}
          level={level}
          projected={projection.enough ? projection.projectedRevenue : undefined}
        />
      </div>

      <p className="text-body-md text-text">
        {over
          ? `Đã vượt ngưỡng ${formatVnd(policy.revenueThreshold)} khoảng ${formatVnd(-overview.remainingToThreshold)}.`
          : `Còn ${formatVnd(overview.remainingToThreshold)} nữa là chạm ngưỡng ${formatVnd(policy.revenueThreshold)}/năm.`}
      </p>

      <dl className="mt-sm grid grid-cols-2 gap-sm border-t border-border pt-sm">
        <div>
          <dt className="text-body-xs text-muted">Từ đơn hàng StreetBiz</dt>
          <dd className="font-tabular text-body-lg text-text">{formatVnd(revenue.online)}</dd>
        </div>
        <div>
          <dt className="text-body-xs text-muted">Bán trực tiếp do hộ ghi</dt>
          <dd className="font-tabular text-body-lg text-text">{formatVnd(revenue.recorded)}</dd>
        </div>
      </dl>
    </Card>
  );
}

function Forecast({ overview }: { overview: TaxOverviewDto }) {
  const { projection } = overview;
  if (overview.yearEnded) return null;
  return (
    <Card>
      <div className="flex items-center gap-xs">
        <Icon name="chart-line" size={20} color={colors.primary} />
        <h2 className="text-headline-sm text-text">Dự báo cả năm</h2>
      </div>
      {projection.enough ? (
        <>
          <p className="mt-xs text-body-md text-text">
            Với mức bán trung bình {formatVnd(Math.round(projection.dailyRate))}/ngày, cả năm khoảng{' '}
            <strong className="font-tabular">{formatVnd(Math.round(projection.projectedRevenue))}</strong>{' '}
            (<span>{GROUP_LABEL[projection.projectedGroup]}</span>).
          </p>
          {projection.willCross && projection.crossingDate ? (
            <p className="mt-xs text-body-md font-semibold text-error">
              Dự kiến vượt ngưỡng vào {formatDay(projection.crossingDate)}.
            </p>
          ) : null}
          <p className="mt-xs text-body-xs text-muted">
            Tính từ {projection.daysOfData} ngày có bán hàng. Chỉ là dự đoán theo mức bán hiện tại.
          </p>
        </>
      ) : (
        <p className="mt-xs text-body-md text-muted">
          Chưa đủ dữ liệu để dự báo: cần ít nhất 14 ngày kể từ ngày bán đầu tiên (hiện có{' '}
          {projection.daysOfData} ngày).
        </p>
      )}
    </Card>
  );
}

function NextDeadline({ overview }: { overview: TaxOverviewDto }) {
  const navigate = useNavigate();
  const deadline = overview.nextDeadline;
  if (!deadline) return null;
  const late = deadline.daysLeft < 0;
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-sm">
        <div className="min-w-0">
          <p className="text-body-sm text-muted">Kỳ tiếp theo</p>
          <h2 className="text-headline-sm text-text">{deadline.label}</h2>
          <p className="text-body-md text-text">
            Hạn {formatDay(deadline.dueDate)} ·{' '}
            {late ? `quá hạn ${-deadline.daysLeft} ngày` : `còn ${deadline.daysLeft} ngày`}
          </p>
        </div>
        <StatusChip label={PERIOD_STATUS_LABEL[deadline.status]} tone={PERIOD_STATUS_TONE[deadline.status]} />
      </div>
      <p className="mt-xs text-body-sm text-muted">
        Bạn tự nộp trên cổng của cơ quan thuế; sau đó xác nhận ở đây để StreetBiz ngừng nhắc.
      </p>
      <div className="mt-sm">
        <Button
          label="Xem kỳ khai và xác nhận đã nộp"
          variant="outline"
          fullWidth={false}
          onPress={() => navigate('/vendor/tax/filings')}
        />
      </div>
    </Card>
  );
}

function ObligationList({ items }: { items: TaxObligationDto[] }) {
  return (
    <ul className="divide-y divide-border">
      {items.map((item) => (
        <li key={item.code} className="flex gap-sm py-sm">
          <span aria-hidden="true" className="mt-0.5 shrink-0">
            <Icon
              name={item.done ? 'check-circle' : item.kind === 'TODO' ? 'circle-outline' : 'information-outline'}
              size={22}
              color={item.done ? colors.tertiary : colors.muted}
            />
          </span>
          <div className="min-w-0">
            <p className="text-body-lg font-medium text-text">
              {item.title}
              {item.done ? <span className="sr-only"> (đã xong)</span> : null}
            </p>
            <p className="text-body-sm text-muted">{item.detail}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

const LINKS: { icon: IconName; label: string; hint: string; path: string }[] = [
  { icon: 'receipt-text-outline', label: 'Sổ doanh thu', hint: 'Xem từng ngày, ghi bán trực tiếp', path: '/vendor/tax/ledger' },
  { icon: 'clipboard-text-outline', label: 'Thông báo & kê khai', hint: 'Các kỳ phải làm, xác nhận đã nộp', path: '/vendor/tax/filings' },
  { icon: 'calculator', label: 'Ước tính thuế', hint: 'Số tham khảo theo doanh thu', path: '/vendor/tax/estimate' },
  { icon: 'cog-outline', label: 'Mã số thuế & quyền riêng tư', hint: 'Phường chỉ thấy doanh thu khi bạn đồng ý', path: '/vendor/tax/settings' },
];

function Links() {
  const navigate = useNavigate();
  return (
    <div className="grid gap-sm sm:grid-cols-2">
      {LINKS.map((link) => (
        <Card key={link.path} onPress={() => navigate(link.path)}>
          <div className="flex items-center gap-sm">
            <Icon name={link.icon} size={28} color={colors.primary} weight="duotone" />
            <div className="min-w-0 flex-1">
              <p className="text-headline-sm text-text">{link.label}</p>
              <p className="text-body-sm text-muted">{link.hint}</p>
            </div>
            <Icon name="chevron-right" size={20} color={colors.muted} />
          </div>
        </Card>
      ))}
    </div>
  );
}

function Exports({ year }: { year: number }) {
  const [busy, setBusy] = useState<'xlsx' | 'pdf' | null>(null);
  const download = async (kind: 'xlsx' | 'pdf') => {
    setBusy(kind);
    try {
      const blob = await (kind === 'xlsx' ? taxApi.exportRevenueBook(year) : taxApi.exportSummary(year));
      saveFile(blob, kind === 'xlsx' ? `so-doanh-thu-${year}.xlsx` : `tong-hop-doanh-thu-${year}.pdf`);
    } catch (error) {
      showToast(errorMessage(error));
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="flex flex-wrap gap-sm">
      <Button
        label="Tải sổ doanh thu (Excel)"
        variant="outline"
        fullWidth={false}
        loading={busy === 'xlsx'}
        disabled={busy !== null}
        icon={<Icon name="file-document-outline" size={18} />}
        onPress={() => void download('xlsx')}
      />
      <Button
        label="Tải bản tổng hợp (PDF)"
        variant="outline"
        fullWidth={false}
        loading={busy === 'pdf'}
        disabled={busy !== null}
        icon={<Icon name="file-document-outline" size={18} />}
        onPress={() => void download('pdf')}
      />
    </div>
  );
}

/**
 * The household's tax home: revenue against the no-tax threshold, the forecast, what it has to do
 * and the next date. StreetBiz keeps the numbers; the household files with the tax office itself.
 */
export function TaxHomeScreen() {
  const [year, setYear] = useState(currentTaxYear());
  const overview = useTaxOverview(year);
  const data = overview.data;

  return (
    <Screen>
      <AppHeader
        title="Thuế & doanh thu"
        subtitle="Số liệu tham khảo. StreetBiz không khai và không nộp thuế thay hộ."
        back
      />
      {!isLiveApi ? (
        <TaxNeedsServer />
      ) : (
        <>
          <YearTabs year={year} onChange={setYear} />
          {overview.isLoading ? (
            <LoadingState />
          ) : overview.isError || !data ? (
            <ErrorState message={errorMessage(overview.error)} onRetry={() => overview.refetch()} />
          ) : (
            <>
              <Standing overview={data} />
              <div className="grid gap-md md:grid-cols-2">
                <Forecast overview={data} />
                <NextDeadline overview={data} />
              </div>

              <Section title="Việc cần làm">
                <Card>
                  <ObligationList items={data.obligations} />
                </Card>
                {data.obligationsOnceOver.length > 0 ? (
                  <details className="group rounded-[20px] bg-card p-md shadow-card ring-1 ring-border/80">
                    <summary className="cursor-pointer list-none text-headline-sm text-text">
                      Nếu doanh thu vượt ngưỡng, bạn còn phải làm gì?
                    </summary>
                    <div className="mt-sm">
                      <ObligationList items={data.obligationsOnceOver} />
                    </div>
                  </details>
                ) : null}
              </Section>

              <Section title="Doanh thu theo tháng">
                <Card>
                  <MonthBars months={data.months} />
                </Card>
              </Section>

              <Links />
              <Exports year={data.taxYear} />

              <Disclaimer text={data.disclaimer} />
              <p className="text-body-xs text-muted">
                Căn cứ áp dụng: {data.policy.legalBasis} · phiên bản {data.policy.versionNo}
                {data.policy.inherited ? ` (quy định năm ${data.policy.taxYear}, chưa có quy định riêng cho năm ${data.taxYear})` : ''}
                . Ngưỡng không chịu thuế {formatCompactVnd(data.policy.revenueThreshold)}/năm.
              </p>
            </>
          )}
        </>
      )}
    </Screen>
  );
}
