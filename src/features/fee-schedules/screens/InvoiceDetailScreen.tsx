import { useId } from 'react';
import { useParams } from 'react-router-dom';

import { Button, formatVnd, KerbTag } from '@/components/common';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { ErrorState, showToast } from '@/components/feedback';
import { errorMessage } from '@/core/api';
import { useInvoiceDetail } from '../useFinance';
import { PROVIDER_LABEL } from '../finance-view';
import { LoadingBlock } from '../components/FinanceParts';
import {
  InvoiceAbout,
  PaidStamp,
  ReceiptFoot,
  ReceiptPaper,
  ReceiptRow,
  ReceiptSkeleton,
} from '../components/Receipt';

/**
 * V29 Chi tiết hoá đơn, drawn as one receipt: number, the amount large, what
 * it was for, slot, wallet, when it was paid and its status. The green stamp
 * only appears when the server returned `paidAt`.
 */
export function InvoiceDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const invoiceId = Number(id);
  const { invoice, isLoading, isError, error, refetch } = useInvoiceDetail(invoiceId);
  const numberId = useId();

  if (isLoading) {
    return (
      <Screen>
        <AppHeader title="Hoá đơn" back />
        <LoadingBlock>
          <ReceiptSkeleton />
        </LoadingBlock>
      </Screen>
    );
  }
  if (isError) {
    return (
      <Screen>
        <AppHeader title="Hoá đơn" back />
        <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
      </Screen>
    );
  }
  if (!invoice) return <ErrorState message="Không tìm thấy hoá đơn." />;

  const itemLabel = invoice.kind === 'PENALTY' ? 'Biên bản phạt' : 'Khoản phí';
  const itemSubtitle = invoice.kind === 'PENALTY' ? invoice.violationLabel : invoice.periodLabel;
  const provider = invoice.paymentProvider
    ? (PROVIDER_LABEL[invoice.paymentProvider] ?? invoice.paymentProvider)
    : null;

  return (
    <Screen
      footer={
        <StickyActions>
          <Button
            label="Tải hoá đơn (PDF)"
            variant="outline"
            onPress={() => showToast('Đã lưu hoá đơn vào thiết bị (demo)')}
          />
        </StickyActions>
      }
    >
      <AppHeader title={invoice.invoiceNumber} back />
      <div className="grid gap-lg xl:grid-cols-[minmax(0,1fr)_300px] xl:items-start">
        <ReceiptPaper labelledBy={numberId}>
          <header>
            <p className="flex items-baseline gap-xs">
              <span className="font-sign text-[15px] font-bold text-text">StreetBiz</span>
              <span className="text-[13px] text-muted">Hoá đơn</span>
            </p>
            <h2
              id={numberId}
              className="mt-1 break-all font-sign text-[20px] font-semibold leading-7 tracking-[0.02em] tabular-nums text-text"
            >
              {invoice.invoiceNumber}
            </h2>
          </header>

          <div className="relative py-lg text-center">
            {invoice.paidAt ? <PaidStamp /> : null}
            <p className="relative whitespace-nowrap font-sign text-[clamp(32px,10.5vw,44px)] font-bold leading-none tracking-[-0.01em] tabular-nums text-text [font-stretch:88%] md:text-[56px]">
              {formatVnd(invoice.amount)}
            </p>
            <p className="relative mt-xs text-body-md text-muted">
              Xuất ngày {new Date(invoice.issuedAt).toLocaleDateString('vi-VN')}
            </p>
          </div>

          <dl className="border-t border-border pt-xs">
            {itemSubtitle ? (
              <ReceiptRow label={itemLabel}>
                <span title={itemSubtitle} className="line-clamp-3">
                  {itemSubtitle}
                </span>
              </ReceiptRow>
            ) : null}
            {invoice.slotCode ? (
              <ReceiptRow label="Ô">
                <KerbTag code={invoice.slotCode} />
              </ReceiptRow>
            ) : null}
            {provider ? <ReceiptRow label="Thanh toán qua">{provider}</ReceiptRow> : null}
            {invoice.paidAt ? (
              <ReceiptRow label="Thanh toán lúc">
                <span className="tabular-nums">
                  {new Date(invoice.paidAt).toLocaleString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </ReceiptRow>
            ) : null}
            <ReceiptRow label="Trạng thái">
              <StatusChip code={invoice.paidAt ? 'PAID' : 'PENDING'} />
            </ReceiptRow>
          </dl>

          <ReceiptFoot />
        </ReceiptPaper>
        <InvoiceAbout />
      </div>
    </Screen>
  );
}
