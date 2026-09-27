import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, Card, Money } from '@/components/common';
import { AppHeader, Screen, Section } from '@/components/layout';
import { SegmentedControl } from '@/components/forms';
import { StatusChip } from '@/components/status';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { errorMessage } from '@/core/api';
import { alpha, colors } from '@/theme';
import { useFeeItems, useFinanceSummary, useInvoices, usePenalties } from '../useFinance';

type Tab = 'FEES' | 'PENALTIES' | 'INVOICES';

export function FinanceHomeScreen() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('FEES');

  const summary = useFinanceSummary();
  const fees = useFeeItems();
  const penalties = usePenalties();
  const invoices = useInvoices();

  const totals = summary.summary;
  const summaryHint = totals
    ? [
        totals.overdueCount > 0 ? `${totals.overdueCount} khoản quá hạn` : null,
        totals.nextDueDate
          ? `Hạn kế tiếp ${new Date(totals.nextDueDate).toLocaleDateString('vi-VN')}`
          : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : '';

  return (
    <Screen>
      <AppHeader title="Tài chính" />
      <Card className="!border-transparent !bg-indigo">
        <div className="flex flex-col gap-2xs">
          <span className="text-body-md" style={{ color: alpha(colors.onIndigo, 0.72) }}>
            Tổng cần thanh toán
          </span>
          {/* A debt figure must never flash "0 đ" while it is still loading or failed to load. */}
          {summary.isLoading ? (
            <span className="text-money-lg" style={{ color: alpha(colors.onIndigo, 0.5) }}>
              …
            </span>
          ) : summary.isError || !totals ? (
            <span className="text-body-md" style={{ color: colors.onIndigo }}>
              Chưa tải được tổng số tiền cần thanh toán.
            </span>
          ) : (
            <>
              <Money amountVnd={totals.totalDue} size="lg" color={colors.onIndigo} />
              {summaryHint ? (
                <span className="text-body-sm" style={{ color: alpha(colors.onIndigo, 0.72) }}>
                  {summaryHint}
                </span>
              ) : null}
            </>
          )}
        </div>
      </Card>

      <SegmentedControl
        value={tab}
        onChange={setTab}
        options={[
          { value: 'FEES', label: 'Phí thuê ô' },
          { value: 'PENALTIES', label: 'Biên bản phạt' },
          { value: 'INVOICES', label: 'Hoá đơn' },
        ]}
      />

      {tab === 'FEES' ? (
        <Section>
          {fees.isLoading ? (
            <LoadingState />
          ) : fees.isError ? (
            <ErrorState message={errorMessage(fees.error)} onRetry={() => fees.refetch()} />
          ) : fees.feeItems.length === 0 ? (
            <EmptyState icon="cash-multiple" title="Chưa có khoản phí nào" />
          ) : (
            fees.feeItems.map((f) => (
              <Card
                key={f.feeItemId}
                onPress={
                  f.itemStatus === 'PENDING' || f.itemStatus === 'OVERDUE'
                    ? () => navigate(`/vendor/finance/fees/${f.feeItemId}/payment`)
                    : undefined
                }
              >
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-2xs">
                    <span className="text-headline-sm text-text">{f.periodLabel}</span>
                    <span className="text-body-sm text-muted">
                      Hạn {new Date(f.dueDate).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-2xs">
                    <Money amountVnd={f.amount} />
                    <StatusChip code={f.itemStatus} />
                  </div>
                </div>
              </Card>
            ))
          )}
        </Section>
      ) : null}

      {tab === 'PENALTIES' ? (
        <Section>
          {penalties.isLoading ? (
            <LoadingState />
          ) : penalties.isError ? (
            <ErrorState
              message={errorMessage(penalties.error)}
              onRetry={() => penalties.refetch()}
            />
          ) : penalties.penalties.length === 0 ? (
            <EmptyState icon="alert-octagon-outline" title="Không có biên bản phạt" />
          ) : (
            penalties.penalties.map((p) => (
              <Card
                key={p.penaltyId}
                onPress={
                  p.penaltyStatus === 'UNPAID'
                    ? () => navigate(`/vendor/finance/penalties/${p.penaltyId}/payment`)
                    : undefined
                }
              >
                <div className="flex items-center justify-between">
                  <div className="flex flex-1 flex-col gap-2xs pr-sm">
                    <span className="line-clamp-2 text-headline-sm text-text">
                      {p.violationLabel}
                    </span>
                    <span className="text-body-sm text-muted">
                      {new Date(p.issuedAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-2xs">
                    <Money amountVnd={p.amount} />
                    <StatusChip code={p.penaltyStatus} />
                  </div>
                </div>
              </Card>
            ))
          )}
        </Section>
      ) : null}

      {tab === 'INVOICES' ? (
        <Section>
          {invoices.isLoading ? (
            <LoadingState />
          ) : invoices.isError ? (
            <ErrorState message={errorMessage(invoices.error)} onRetry={() => invoices.refetch()} />
          ) : invoices.invoices.length === 0 ? (
            <EmptyState icon="receipt" title="Chưa có hoá đơn nào" />
          ) : (
            invoices.invoices.map((inv) => (
              <Card
                key={inv.invoiceId}
                onPress={() => navigate(`/vendor/finance/invoices/${inv.invoiceId}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-2xs">
                    <span className="text-headline-sm text-text">{inv.invoiceNumber}</span>
                    <span className="text-body-sm text-muted">
                      {new Date(inv.issuedAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                  <Money amountVnd={inv.amount} />
                </div>
              </Card>
            ))
          )}
        </Section>
      ) : null}

      <Button
        label="Lịch sử thanh toán"
        variant="outline"
        onPress={() => navigate('/vendor/finance/payments')}
      />
      <Button
        label="Lịch sử vi phạm"
        variant="ghost"
        onPress={() => navigate('/vendor/finance/violations')}
      />
    </Screen>
  );
}
