import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, Icon, type IconName } from '@/components/common';
import { AppHeader, Screen } from '@/components/layout';
import { EmptyState, ErrorState, showToast, Skeleton } from '@/components/feedback';
import { errorMessage, financeApi } from '@/core/api';
import { isLiveApi } from '@/core/config/env';
import { saveFile } from '@/core/utils/save-file';
import { useFeeItems, useFinanceSummary, useInvoices, usePenalties } from '../useFinance';
import { useVendorContracts } from '../useFeeSchedules';
import { ContractProgressCard } from '../components/ScheduleComponents';
import { feeUrgency, groupFees } from '../finance-view';
import { DebtBoard } from '../components/DebtBoard';
import { FeeKerbCalendar } from '../components/FeeKerbCalendar';
import { FeeRow, InvoiceRow, PenaltyRow } from '../components/FinanceRows';
import { FinanceTabs, ListHeading, LoadingBlock, RowSkeletons } from '../components/FinanceParts';

type Tab = 'FEES' | 'PENALTIES' | 'INVOICES';

/** Paid instalments shown before "Xem thêm". */
const PAID_PREVIEW = 3;

/**
 * V25 Tài chính. The debt board answers "how much do I owe" first; then tabs
 * for fees (a kerb calendar per slot, what to pay, what is paid), penalty
 * notices and invoices. Under the fees, each rental contract opens its full
 * schedule; the year's statement downloads as Excel.
 */
export function FinanceHomeScreen() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('FEES');
  const [showAllPaid, setShowAllPaid] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const summary = useFinanceSummary();
  const fees = useFeeItems();
  const penalties = usePenalties();
  const invoices = useInvoices();
  const contracts = useVendorContracts();

  const now = new Date();
  const { due, settled } = groupFees(fees.feeItems);
  const paidShown = showAllPaid ? settled : settled.slice(0, PAID_PREVIEW);
  const unpaidPenalties = penalties.penalties.filter((p) => p.penaltyStatus === 'UNPAID').length;

  const openPayments = () => navigate('/vendor/finance/payments');
  const openViolations = () => navigate('/vendor/finance/violations');
  const year = now.getFullYear();
  const downloadStatement = async () => {
    if (!isLiveApi) {
      showToast('Sao kê chỉ có khi kết nối máy chủ (đang ở chế độ demo).');
      return;
    }
    if (downloading) return;
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
      <AppHeader
        title="Tài chính"
        right={
          <div className="hidden gap-xs lg:flex">
            <Button
              label="Lịch sử thanh toán"
              variant="outline"
              fullWidth={false}
              icon={<Icon name="history" size={18} color="currentColor" />}
              onPress={openPayments}
            />
            <Button
              label="Lịch sử vi phạm"
              variant="outline"
              fullWidth={false}
              icon={<Icon name="gavel" size={18} color="currentColor" />}
              onPress={openViolations}
            />
            <Button
              label={`Tải sao kê ${year} (Excel)`}
              variant="outline"
              fullWidth={false}
              loading={downloading}
              disabled={downloading}
              icon={<Icon name="file-document-outline" size={18} color="currentColor" />}
              onPress={() => void downloadStatement()}
            />
          </div>
        }
      />

      <DebtBoard
        summary={summary.summary}
        isLoading={summary.isLoading}
        isError={summary.isError}
      />

      <div className="grid grid-cols-2 gap-sm sm:grid-cols-3 lg:hidden">
        <ShortcutTile icon="history" label="Lịch sử thanh toán" onPress={openPayments} />
        <ShortcutTile icon="gavel" label="Lịch sử vi phạm" onPress={openViolations} />
        <ShortcutTile
          icon="file-document-outline"
          label={downloading ? 'Đang tải sao kê…' : `Tải sao kê ${year} (Excel)`}
          onPress={() => void downloadStatement()}
          className="col-span-2 sm:col-span-1"
        />
      </div>

      <FinanceTabs
        value={tab}
        onChange={setTab}
        options={[
          {
            value: 'FEES',
            label: 'Phí thuê ô',
            count: !fees.isLoading && !fees.isError && due.length > 0 ? due.length : undefined,
          },
          {
            value: 'PENALTIES',
            label: 'Biên bản phạt',
            count:
              !penalties.isLoading && !penalties.isError && unpaidPenalties > 0
                ? unpaidPenalties
                : undefined,
          },
          {
            value: 'INVOICES',
            label: 'Hoá đơn',
            count:
              !invoices.isLoading && !invoices.isError && invoices.invoices.length > 0
                ? invoices.invoices.length
                : undefined,
          },
        ]}
      />

      {tab === 'FEES' ? (
        <section className="flex min-h-[320px] flex-col gap-sm">
          {fees.isLoading ? (
            <LoadingBlock>
              <Skeleton className="h-[120px] w-full !rounded-[20px]" />
              <RowSkeletons />
            </LoadingBlock>
          ) : fees.isError ? (
            <ErrorState message={errorMessage(fees.error)} onRetry={() => fees.refetch()} />
          ) : fees.feeItems.length === 0 ? (
            <EmptyState icon="cash-multiple" title="Chưa có khoản phí nào" />
          ) : (
            <>
              <FeeKerbCalendar fees={fees.feeItems} now={now} />
              {due.length > 0 ? (
                <>
                  <ListHeading>Cần thanh toán</ListHeading>
                  {due.map((f) => (
                    <FeeRow
                      key={f.feeItemId}
                      fee={f}
                      urgency={feeUrgency(f, now)}
                      onPress={
                        f.itemStatus === 'PENDING' || f.itemStatus === 'OVERDUE'
                          ? () => navigate(`/vendor/finance/fees/${f.feeItemId}/payment`)
                          : undefined
                      }
                    />
                  ))}
                </>
              ) : null}
              {settled.length > 0 ? (
                <>
                  <ListHeading
                    aside={
                      settled.length > PAID_PREVIEW ? (
                        <button
                          type="button"
                          onClick={() => setShowAllPaid((v) => !v)}
                          className="min-h-12 rounded-[10px] px-sm text-[15px] font-semibold text-primary hover:bg-tint-primary"
                        >
                          {showAllPaid
                            ? 'Thu gọn'
                            : `Xem thêm ${settled.length - PAID_PREVIEW} khoản`}
                        </button>
                      ) : null
                    }
                  >
                    Đã thanh toán
                  </ListHeading>
                  {paidShown.map((f) => (
                    <FeeRow
                      key={f.feeItemId}
                      fee={f}
                      urgency={feeUrgency(f, now)}
                      onPress={
                        f.itemStatus === 'PENDING' || f.itemStatus === 'OVERDUE'
                          ? () => navigate(`/vendor/finance/fees/${f.feeItemId}/payment`)
                          : undefined
                      }
                    />
                  ))}
                </>
              ) : null}
              {contracts.contracts.length > 0 ? (
                <>
                  <ListHeading>Hợp đồng thuê ô</ListHeading>
                  {contracts.contracts.map((contract) => (
                    <ContractProgressCard
                      key={contract.contractId}
                      contract={contract}
                      onOpen={() => navigate(`/vendor/finance/contracts/${contract.contractId}`)}
                    />
                  ))}
                </>
              ) : null}
            </>
          )}
        </section>
      ) : null}

      {tab === 'PENALTIES' ? (
        <section className="flex min-h-[320px] flex-col gap-sm">
          {penalties.isLoading ? (
            <LoadingBlock>
              <RowSkeletons />
            </LoadingBlock>
          ) : penalties.isError ? (
            <ErrorState
              message={errorMessage(penalties.error)}
              onRetry={() => penalties.refetch()}
            />
          ) : penalties.penalties.length === 0 ? (
            <EmptyState icon="alert-octagon-outline" title="Không có biên bản phạt" />
          ) : (
            penalties.penalties.map((p) => (
              <PenaltyRow
                key={p.penaltyId}
                penalty={p}
                onPress={
                  p.penaltyStatus === 'UNPAID'
                    ? () => navigate(`/vendor/finance/penalties/${p.penaltyId}/payment`)
                    : undefined
                }
              />
            ))
          )}
        </section>
      ) : null}

      {tab === 'INVOICES' ? (
        <section className="flex min-h-[320px] flex-col gap-sm">
          {invoices.isLoading ? (
            <LoadingBlock>
              <RowSkeletons height="h-[76px]" />
            </LoadingBlock>
          ) : invoices.isError ? (
            <ErrorState message={errorMessage(invoices.error)} onRetry={() => invoices.refetch()} />
          ) : invoices.invoices.length === 0 ? (
            <EmptyState icon="receipt" title="Chưa có hoá đơn nào" />
          ) : (
            invoices.invoices.map((inv) => (
              <InvoiceRow
                key={inv.invoiceId}
                invoice={inv}
                onPress={() => navigate(`/vendor/finance/invoices/${inv.invoiceId}`)}
              />
            ))
          )}
        </section>
      ) : null}
    </Screen>
  );
}

/** A 56px shortcut under the debt board on phones and tablets. */
function ShortcutTile({
  icon,
  label,
  onPress,
  className = '',
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      className={`${className} flex min-h-14 items-center gap-xs rounded-[16px] bg-card px-sm text-left text-[15px] font-semibold leading-tight text-text shadow-card ring-1 ring-border/80 transition-transform duration-150 active:scale-[.98]`}
    >
      <span
        aria-hidden="true"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-tint-primary text-primary"
      >
        <Icon name={icon} size={20} color="currentColor" />
      </span>
      {label}
    </button>
  );
}
