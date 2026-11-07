import { useMemo, useState } from 'react';

import { Card, formatVnd } from '@/components/common';
import { ErrorState, LoadingState } from '@/components/feedback';
import { SegmentedControl, TextField } from '@/components/forms';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { errorMessage, type TaxEstimateDto } from '@/core/api';
import { isLiveApi } from '@/core/config/env';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { Disclaimer, FactRow, MoneyInput, TaxNeedsServer, YearTabs } from '../components/TaxParts';
import {
  ESTIMATE_BASIS_OPTIONS,
  GROUP_LABEL,
  currentTaxYear,
  formatPercent,
  parseDigits,
} from '../tax-format';
import { useTaxEstimate, type TaxEstimateQuery } from '../useTax';

type Basis = (typeof ESTIMATE_BASIS_OPTIONS)[number]['value'];

function RevenueMethod({ estimate }: { estimate: TaxEstimateDto }) {
  return (
    <Card>
      <h2 className="text-headline-sm text-text">Tính theo tỷ lệ trên doanh thu</h2>
      <p className="text-body-sm text-muted">Cách áp dụng cho hộ có doanh thu trên ngưỡng không chịu thuế.</p>
      <div className="mt-xs divide-y divide-border">
        <FactRow label="Doanh thu tính thuế" value={formatVnd(estimate.revenue)} />
        <FactRow
          label={`Thuế GTGT (${formatPercent(estimate.vatRate)})`}
          hint="Tính trên toàn bộ doanh thu"
          value={formatVnd(estimate.vat)}
        />
        <FactRow
          label={`Thuế TNCN (${formatPercent(estimate.pitRate)})`}
          hint={
            estimate.pitDeductsThreshold
              ? `Tính trên phần doanh thu vượt ${formatVnd(estimate.revenueThreshold)}: ${formatVnd(estimate.pitBase)}`
              : `Tính trên doanh thu: ${formatVnd(estimate.pitBase)}`
          }
          value={formatVnd(estimate.pitOnRevenue)}
        />
        <FactRow
          label="Tổng thuế tham khảo"
          hint={`Khoảng ${formatPercent(estimate.effectiveRate, 2)} doanh thu`}
          value={formatVnd(estimate.totalOnRevenue)}
          strong
        />
      </div>
    </Card>
  );
}

function ProfitMethod({ estimate }: { estimate: TaxEstimateDto }) {
  if (estimate.costRatio === null || estimate.profit === null) return null;
  return (
    <Card>
      <h2 className="text-headline-sm text-text">Tính theo lợi nhuận</h2>
      <p className="text-body-sm text-muted">
        Có sổ sách đầy đủ thì thuế TNCN tính trên lợi nhuận (doanh thu trừ chi phí) thay vì trên doanh thu.
      </p>
      <div className="mt-xs divide-y divide-border">
        <FactRow label={`Chi phí giả định (${formatPercent(estimate.costRatio, 0)})`} value={formatVnd(estimate.revenue - estimate.profit)} />
        <FactRow label="Lợi nhuận" value={formatVnd(estimate.profit)} />
        <FactRow
          label={`Thuế TNCN (${formatPercent(estimate.pitProfitRate ?? 0, 0)})`}
          value={formatVnd(estimate.pitOnProfit ?? 0)}
        />
        <FactRow label="Thuế GTGT" value={formatVnd(estimate.vat)} />
        <FactRow label="Tổng thuế tham khảo" value={formatVnd(estimate.totalOnProfit ?? 0)} strong />
      </div>
      {estimate.cheaper ? (
        <p className="mt-sm text-body-md text-text">
          Với giả định này, cách{' '}
          <strong>{estimate.cheaper === 'PROFIT' ? 'tính theo lợi nhuận' : 'tính theo doanh thu'}</strong> ít thuế hơn.
        </p>
      ) : null}
    </Card>
  );
}

function Result({ estimate, asked }: { estimate: TaxEstimateDto; asked: Basis }) {
  return (
    <>
      {asked === 'PROJECTED' && estimate.basis === 'ACTUAL' ? (
        <p className="rounded-[14px] bg-secondary-bg px-md py-sm text-body-sm text-on-secondary">
          Chưa đủ dữ liệu để dự báo cả năm (cần ít nhất 14 ngày bán), nên đang tính theo doanh thu thực tế đến nay.
        </p>
      ) : null}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-sm">
          <div>
            <p className="text-body-sm text-muted">
              {estimate.industryName} · {GROUP_LABEL[estimate.group]}
            </p>
            <p className="text-body-md text-text">{estimate.groupDescription}</p>
          </div>
          <StatusChip label={estimate.taxable ? 'Có thuế' : 'Chưa phải nộp thuế'} tone={estimate.taxable ? 'pending' : 'ok'} />
        </div>
        {!estimate.taxable ? (
          <p className="mt-xs text-body-md text-text">
            Với doanh thu này, hộ chưa vượt ngưỡng {formatVnd(estimate.revenueThreshold)} nên chưa phải nộp thuế GTGT và TNCN.
          </p>
        ) : null}
      </Card>
      {estimate.taxable ? (
        <div className="grid gap-md md:grid-cols-2">
          <RevenueMethod estimate={estimate} />
          <ProfitMethod estimate={estimate} />
        </div>
      ) : null}
      <p className="text-body-xs text-muted">Căn cứ: {estimate.legalBasis}</p>
      <Disclaimer text={estimate.disclaimer} />
    </>
  );
}

/**
 * What the household would owe at its revenue so far, at the forecast for the year, or at a figure
 * it tries. Always a reference: the tax office's own assessment is what counts.
 */
export function TaxEstimateScreen() {
  const [year, setYear] = useState(currentTaxYear());
  const [basis, setBasis] = useState<Basis>('ACTUAL');
  const [custom, setCustom] = useState('');
  const [costText, setCostText] = useState('');

  const costRatio = costText.trim() === '' ? undefined : Number(costText.replace(',', '.')) / 100;
  const costError =
    costRatio !== undefined && (Number.isNaN(costRatio) || costRatio < 0 || costRatio > 0.99)
      ? 'Nhập tỷ lệ từ 0 đến 99.'
      : undefined;

  const query = useMemo<TaxEstimateQuery>(() => {
    const ratio = costError ? undefined : costRatio;
    return basis === 'CUSTOM'
      ? { year, basis: 'ACTUAL', revenue: parseDigits(custom), costRatio: ratio }
      : { year, basis, costRatio: ratio };
  }, [basis, costError, costRatio, custom, year]);
  const debounced = useDebouncedValue(query, 400);
  const estimate = useTaxEstimate(debounced, basis !== 'CUSTOM' || debounced.revenue !== undefined && debounced.revenue > 0);

  return (
    <Screen>
      <AppHeader title="Ước tính thuế" subtitle="Số tham khảo, không phải số thuế phải nộp" back />
      {!isLiveApi ? (
        <TaxNeedsServer />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-sm">
            <YearTabs year={year} onChange={setYear} />
            <SegmentedControl options={[...ESTIMATE_BASIS_OPTIONS]} value={basis} onChange={setBasis} />
          </div>

          <Card>
            <div className="grid gap-md md:grid-cols-2">
              {basis === 'CUSTOM' ? (
                <MoneyInput
                  label="Doanh thu cả năm muốn thử (đồng)"
                  value={custom}
                  onChange={setCustom}
                  placeholder="Ví dụ: 1.200.000.000"
                />
              ) : null}
              <TextField
                label="Chi phí ước tính (% doanh thu, không bắt buộc)"
                helperText="Điền để so sánh với cách tính theo lợi nhuận."
                keyboardType="numeric"
                value={costText}
                onChangeText={setCostText}
                error={costError}
                maxLength={5}
                placeholder="Ví dụ: 60"
              />
            </div>
          </Card>

          {basis === 'CUSTOM' && parseDigits(custom) === 0 ? (
            <p className="text-body-md text-muted">Nhập doanh thu cả năm muốn thử để xem số thuế tham khảo.</p>
          ) : estimate.isLoading ? (
            <LoadingState />
          ) : estimate.isError || !estimate.data ? (
            <ErrorState message={errorMessage(estimate.error)} onRetry={() => estimate.refetch()} />
          ) : (
            <Result estimate={estimate.data} asked={basis} />
          )}
        </>
      )}
    </Screen>
  );
}
