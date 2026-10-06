import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, Card, Divider, Money } from '@/components/common';
import { AppHeader, Screen, Section } from '@/components/layout';
import { SegmentedControl } from '@/components/forms';
import { StatusChip } from '@/components/status';
import { EmptyState, ErrorState, LoadingState, showToast } from '@/components/feedback';
import { errorMessage, financeApi } from '@/core/api';
import { isLiveApi } from '@/core/config/env';
import { saveFile } from '@/core/utils/save-file';
import { alpha, colors } from '@/theme';
import { ContractProgressCard, InstalmentRow } from '../components/ScheduleComponents';
import { InvoiceList } from '../components/InvoiceList';
import { byUrgency, localToday, withDueDays } from '../schedule-progress';
import { useFeeItems, useFinanceSummary, useInvoices, usePenalties } from '../useFinance';
import { useVendorContracts } from '../useFeeSchedules';

type Tab = 'FEES' | 'PENALTIES' | 'INVOICES';

export function FinanceHomeScreen() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('FEES');
  const [downloading, setDownloading] = useState(false);

  const summary = useFinanceSummary();
  const fees = useFeeItems();
  const contracts = useVendorContracts();
  const penalties = usePenalties();
  const invoices = useInvoices();

  const today = localToday();
  // Every unpaid instalment across contracts, the most urgent first, ready for the due badges.
  const outstanding = fees.feeItems
    .filter((f) => f.itemStatus !== 'PAID')
    .map((f) => ({
      ...withDueDays(f, today),
      ordinal: 0,
      ofCount: 0,
      invoiceId: null,
      invoiceNumber: null,
    }))
    .sort(byUrgency);
  const mostUrgent = outstanding[0];

  const totals = summary.summary;
  const summaryHint = totals
    ? [
        totals.overdueCount > 0 ? `${totals.overdueCount} kỳ quá hạn` : null,
        totals.nextDueDate
          ? `Hạn kế tiếp ${new Date(totals.nextDueDate).toLocaleDateString('vi-VN')}`
          : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : '';

  const downloadStatement = async () => {
    const year = new Date().getFullYear();
    if (!isLiveApi) {
      showToast('Sao kê chỉ có khi kết nối máy chủ (đang ở chế độ demo).');
      return;
    }
    setDownloading(true);
    try {
      saveFile(await financeApi.statementXlsx(year), `sao-ke-phi-${year}.xlsx`);
    } catch (err) {
      showToast(errorMessage(err));
    } finally {
      setDownloading(false);
    }
  };

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
          {mostUrgent ? (
            <div className="mt-sm">
              <Button
                label={
                  mostUrgent.daysOverdue != null ? 'Thanh toán kỳ quá hạn' : 'Thanh toán kỳ gần nhất'
                }
                fullWidth={false}
                size="sm"
                onPress={() => navigate(`/vendor/finance/fees/${mostUrgent.feeItemId}/payment`)}
              />
            </div>
          ) : null}
        </div>
      </Card>

      <SegmentedControl
        value={tab}
        onChange={setTab}
        options={[
          { value: 'FEES', label: 'Phí thuê ô' },
          { value: 'PENALTIES', label: 'Tiền phạt' },
          { value: 'INVOICES', label: 'Hoá đơn' },
        ]}
      />

      {tab === 'FEES' ? (
        fees.isLoading || contracts.isLoading ? (
          <LoadingState />
        ) : fees.isError || contracts.isError ? (
          <ErrorState
            message={errorMessage(fees.error ?? contracts.error)}
            onRetry={() => {
              void fees.refetch();
              void contracts.refetch();
            }}
          />
        ) : contracts.contracts.length === 0 ? (
          <EmptyState icon="cash-multiple" title="Chưa có khoản phí nào" />
        ) : (
          <>
            <Section title="Cần thanh toán">
              {outstanding.length === 0 ? (
                <EmptyState compact icon="check-circle-outline" title="Bạn đã nộp đủ các kỳ phí" />
              ) : (
                <Card padded={false}>
                  <div className="px-md">
                    {outstanding.map((item, index) => (
                      <div key={item.feeItemId}>
                        {index ? <Divider /> : null}
                        <InstalmentRow
                          item={item}
                          slotCode={item.slotCode}
                          onPay={() => navigate(`/vendor/finance/fees/${item.feeItemId}/payment`)}
                        />
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </Section>
            <Section title="Hợp đồng thuê ô">
              {contracts.contracts.map((contract) => (
                <ContractProgressCard
                  key={contract.contractId}
                  contract={contract}
                  onOpen={() => navigate(`/vendor/finance/contracts/${contract.contractId}`)}
                />
              ))}
            </Section>
          </>
        )
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
        invoices.isLoading ? (
          <LoadingState />
        ) : invoices.isError ? (
          <ErrorState message={errorMessage(invoices.error)} onRetry={() => invoices.refetch()} />
        ) : (
          <InvoiceList
            invoices={invoices.invoices}
            onOpen={(invoiceId) => navigate(`/vendor/finance/invoices/${invoiceId}`)}
          />
        )
      ) : null}

      <div className="flex flex-col gap-xs">
        <Button
          label="Lịch sử thanh toán"
          variant="outline"
          onPress={() => navigate('/vendor/finance/payments')}
        />
        <Button
          label={`Tải sao kê năm ${new Date().getFullYear()} (Excel)`}
          variant="outline"
          loading={downloading}
          disabled={downloading}
          onPress={() => void downloadStatement()}
        />
        <Button
          label="Lịch sử vi phạm"
          variant="ghost"
          onPress={() => navigate('/vendor/finance/violations')}
        />
      </div>
    </Screen>
  );
}
