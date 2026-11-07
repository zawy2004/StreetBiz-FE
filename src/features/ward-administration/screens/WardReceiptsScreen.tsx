import { useMemo, useState } from 'react';

import { Button, formatVnd } from '@/components/common';
import { ErrorState, showToast } from '@/components/feedback';
import { FilterChips, SegmentedControl, TextField } from '@/components/forms';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { errorMessage, wardReportApi, type WardReceiptDto } from '@/core/api';
import { saveFile } from '@/core/utils/save-file';
import { WardGate } from '../components/WardGate';
import { FinanceSkeleton, Ledger, LedgerEmpty, LedgerRow } from '../components/finance/FinanceParts';
import {
  filterReceipts,
  methodLabel,
  methodOptions,
  receiptMoment,
  receiptState,
  receiptTotals,
  referenceLabel,
  type ReceiptKindFilter,
} from '../components/finance/receipt-view';
import {
  displayDay,
  PERIOD_OPTIONS,
  periodFor,
  type PeriodKey,
} from '../components/ops/report/report-model';
import { useWardReceipts, type ReportPeriod } from '../useWardReports';

const KIND_OPTIONS: { value: ReceiptKindFilter; label: string }[] = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'FEE', label: 'Phí thuê ô' },
  { value: 'PENALTY', label: 'Tiền phạt' },
];

/**
 * "Lịch sử thu": every receipt of the ward in a period, one by one, newest first: who paid, for
 * what, how (payOS, the Treasury, in person) and the reference to check it against, with the
 * receipt's PDF. Money owed back or returned stays on the list but outside the total.
 */
export function WardReceiptsScreen() {
  return (
    <WardGate>
      <WardReceiptsContent />
    </WardGate>
  );
}

function WardReceiptsContent() {
  const [periodKey, setPeriodKey] = useState<PeriodKey>('THIS_MONTH');
  const [custom, setCustom] = useState<ReportPeriod>(() => periodFor('THIS_MONTH', new Date()));
  const period = useMemo(
    () => (periodKey === 'CUSTOM' ? custom : periodFor(periodKey, new Date())),
    [periodKey, custom],
  );
  const receipts = useWardReceipts(period);
  const [kind, setKind] = useState<ReceiptKindFilter>('ALL');
  const [method, setMethod] = useState('ALL');
  const [query, setQuery] = useState('');

  const items = receipts.data?.items ?? [];
  const methods = methodOptions(items);
  const shown = filterReceipts(items, { kind, method, query });
  const totals = receiptTotals(shown);
  const filtered = kind !== 'ALL' || method !== 'ALL' || query.trim() !== '';

  const head = (
    <div className="flex flex-col gap-sm md:flex-row md:items-end md:justify-between md:gap-lg">
      <AppHeader
        title="Lịch sử thu"
        subtitle={`${displayDay(period.from)} – ${displayDay(period.to)}`}
        back
      />
      <div className="shrink-0 md:pb-1 [&_[role=tab]]:h-10">
        <SegmentedControl value={periodKey} onChange={setPeriodKey} options={PERIOD_OPTIONS} />
      </div>
    </div>
  );

  const customRange =
    periodKey === 'CUSTOM' ? (
      <div className="grid gap-sm sm:grid-cols-2">
        <label className="flex flex-col gap-2xs text-label text-text">
          Từ ngày
          <input
            type="date"
            value={custom.from}
            max={custom.to}
            onChange={(event) =>
              event.target.value && setCustom((c) => ({ ...c, from: event.target.value }))
            }
            className="h-12 rounded-sm border border-border bg-card px-sm text-body-md"
          />
        </label>
        <label className="flex flex-col gap-2xs text-label text-text">
          Đến ngày
          <input
            type="date"
            value={custom.to}
            min={custom.from}
            onChange={(event) =>
              event.target.value && setCustom((c) => ({ ...c, to: event.target.value }))
            }
            className="h-12 rounded-sm border border-border bg-card px-sm text-body-md"
          />
        </label>
      </div>
    ) : null;

  if (receipts.isPending) {
    return (
      <Screen width="wide">
        {head}
        {customRange}
        <FinanceSkeleton />
      </Screen>
    );
  }
  if (receipts.isError) {
    return (
      <Screen width="wide">
        {head}
        {customRange}
        <div className="rounded-[24px] bg-card shadow-card ring-1 ring-border">
          <ErrorState message={errorMessage(receipts.error)} onRetry={() => void receipts.refetch()} />
        </div>
      </Screen>
    );
  }

  return (
    <Screen width="wide">
      {head}
      {customRange}

      <section
        aria-label="Tổng thu"
        className="flex flex-col gap-2xs rounded-[24px] bg-card p-md shadow-card ring-1 ring-border md:p-lg"
      >
        <p className="text-body-md text-muted">
          {filtered ? 'Đã thu (theo bộ lọc)' : 'Đã thu trong kỳ'}
        </p>
        <p className="font-sign text-[32px] font-bold leading-tight tabular-nums text-text md:text-[40px]">
          {formatVnd(totals.collected)}
        </p>
        <p className="text-body-md text-text/80">{totals.count} khoản</p>
        {totals.returnedCount > 0 ? (
          <p className="text-body-sm text-muted">
            Không tính {formatVnd(totals.returned)} của {totals.returnedCount} khoản đang hoặc đã hoàn
            trả cho hộ.
          </p>
        ) : null}
      </section>

      <div className="flex flex-col gap-sm">
        <div className="flex flex-col gap-sm md:flex-row md:items-center md:justify-between">
          <SegmentedControl value={kind} onChange={setKind} options={KIND_OPTIONS} />
          <div className="md:w-[360px]">
            <TextField
              value={query}
              onChangeText={setQuery}
              placeholder="Tìm theo hộ, ô, số hoá đơn hoặc mã giao dịch"
            />
          </div>
        </div>
        {methods.length > 1 ? (
          <FilterChips
            value={method}
            onChange={setMethod}
            options={[{ value: 'ALL', label: 'Mọi hình thức', count: items.length }, ...methods]}
          />
        ) : null}
      </div>

      {items.length === 0 ? (
        <LedgerEmpty icon="receipt-text-outline" title="Chưa có khoản thu nào trong kỳ này" />
      ) : shown.length === 0 ? (
        <LedgerEmpty icon="magnify" title="Không có khoản thu nào khớp bộ lọc" />
      ) : (
        <Ledger>
          {shown.map((receipt) => (
            <ReceiptLine key={receipt.invoiceId} receipt={receipt} />
          ))}
        </Ledger>
      )}
    </Screen>
  );
}

function ReceiptLine({ receipt }: { receipt: WardReceiptDto }) {
  const [downloading, setDownloading] = useState(false);
  const state = receiptState(receipt);
  const reference = referenceLabel(receipt.provider, receipt.providerReference);

  const download = async () => {
    setDownloading(true);
    try {
      saveFile(await wardReportApi.receiptPdf(receipt.invoiceId), `${receipt.invoiceNumber}.pdf`);
    } catch (error) {
      showToast(errorMessage(error));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <LedgerRow
      lead={receiptMoment(receipt.issuedAt)}
      title={receipt.payerName ?? 'Hộ kinh doanh'}
      amount={receipt.amount}
      status={<StatusChip label={state.label} tone={state.tone} />}
      notes={
        <>
          <p className="text-body-sm text-text/80">{receipt.description}</p>
          <p className="text-body-sm text-muted">
            {methodLabel(receipt.provider)}
            {reference ? ` · ${reference}` : ''}
          </p>
          <p className="text-body-sm text-muted">
            Hoá đơn {receipt.invoiceNumber}
            {receipt.payerPhone ? ` · ${receipt.payerPhone}` : ''}
          </p>
        </>
      }
    >
      <div>
        <Button
          label="Tải hoá đơn PDF"
          size="sm"
          variant="outline"
          fullWidth={false}
          loading={downloading}
          disabled={downloading}
          onPress={() => void download()}
        />
      </div>
    </LedgerRow>
  );
}
