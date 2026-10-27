import { useEffect, useId, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { Button, formatVnd, KerbTag } from '@/components/common';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { ErrorState, Skeleton, showToast } from '@/components/feedback';
import {
  ApiError,
  errorMessage,
  financeApi,
  type FeeItemDetailDto,
  type FeeItemDto,
} from '@/core/api';
import { isLiveApi } from '@/core/config/env';
import { saveFile } from '@/core/utils/save-file';
import { useMockDb } from '@/mocks/db';
import { isSandboxPaymentUrl, redirectToPayment } from '@/features/orders/payment-redirect';
import { rememberFinancePayment, useFinancePaymentReturn } from '../useFinancePaymentReturn';
import { isPayableFee } from '../finance-view';
import { useFeeItems, usePayFeeCheckout } from '../useFinance';
import { useFeeItemDetail } from '../useFeeSchedules';
import { formatDay, paidShare } from '../schedule-progress';
import { ProgressBar } from '../components/ScheduleComponents';
import { PaidStamp, ReceiptFoot, ReceiptPaper, ReceiptRow } from '../components/Receipt';
import { LoadingBlock } from '../components/FinanceParts';
import {
  CheckoutError,
  FeeSlip,
  PayBar,
  SafePaySteps,
  WalletPicker,
} from '../components/PaymentParts';
import { ReturnCheckTrack } from '../components/ReturnCheckTrack';

type Provider = 'MOMO' | 'ZALOPAY';

export function FeePaymentScreen() {
  return isLiveApi ? <LiveFeePaymentScreen /> : <MockFeePaymentScreen />;
}

function LiveFeePaymentScreen() {
  const { id } = useParams<{ id: string }>();
  const feeItemId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [provider, setProvider] = useState<Provider>('MOMO');
  const idempotencyKey = useRef<string | null>(null);
  const submitting = useRef(false);
  // The fee list is enough to pay. The instalment's own detail adds the contract's progress and,
  // once paid, the receipt; if that read fails the vendor can still pay.
  const { feeItems, isLoading, isError, error, refetch } = useFeeItems();
  const detail = useFeeItemDetail(feeItemId);
  const checkout = usePayFeeCheckout();
  const { pathname } = useLocation();
  // Every finance view (lists, summary, schedules, this item) re-reads after a payment. A read
  // still in flight is cancelled first: back from MoMo, the page's first read of this instalment
  // can start before the sync applied the payment, and an invalidation would otherwise just wait
  // for that stale read instead of asking again.
  const refreshAll = async () => {
    await queryClient.cancelQueries({ queryKey: ['finance'] });
    await queryClient.invalidateQueries({ queryKey: ['finance'] });
  };
  // Paid with the receipt available: show it here. Without the detail read there is no
  // receipt to show, so fall back to the finance home as before.
  const afterPaid = async (message: string) => {
    await refreshAll();
    showToast(message);
    if (detail.isError) navigate('/vendor/finance', { replace: true });
  };
  // Back from MoMo on this page: the backend checks with MoMo, then the receipt shows.
  const momoReturn = useFinancePaymentReturn(() => afterPaid('MoMo đã xác nhận thanh toán'));
  const fee = feeItems.find((f) => f.feeItemId === feeItemId);

  useEffect(() => {
    idempotencyKey.current = null;
    submitting.current = false;
  }, [feeItemId]);

  const pay = () => {
    if (!fee || !isPayableFee(fee) || submitting.current || checkout.isPending) return;
    submitting.current = true;
    idempotencyKey.current ??= crypto.randomUUID();
    checkout.mutate(
      { feeItemId, provider, idempotencyKey: idempotencyKey.current },
      {
        onSuccess: async (result) => {
          // A configured MoMo merchant returns a real https payment page: go there.
          if (!isSandboxPaymentUrl(result.paymentUrl)) {
            rememberFinancePayment(result.transactionId, pathname);
            showToast('Đang chuyển đến cổng thanh toán MoMo.');
            redirectToPayment(result.paymentUrl);
            return;
          }
          try {
            // Development-only: no real MoMo/ZaloPay sandbox account is wired up, so
            // confirm here instead of letting the redirect below hit a dead custom-scheme URL.
            // The instalment re-reads as PAID, so this page turns into its receipt.
            await financeApi.sandboxConfirmPayment(result.transactionId);
            await afterPaid('Thanh toán thành công');
          } catch (err) {
            if (err instanceof ApiError && err.status === 404) {
              showToast('Đang chuyển đến cổng thanh toán.');
              redirectToPayment(result.paymentUrl);
              return;
            }
            // e.g. already paid from another tab: refresh so the item stops looking payable.
            await refreshAll();
            submitting.current = false;
            showToast(errorMessage(err));
          }
        },
        onError: () => {
          submitting.current = false;
        },
      },
    );
  };

  // The detail is waited for while it is on its way, so a paid instalment opens on its receipt
  // instead of flashing the pay button; once it has failed it no longer holds the page up.
  if (isLoading || detail.isLoading) {
    return (
      <Screen>
        <AppHeader title="Thanh toán phí thuê ô" back />
        <PaymentSkeleton />
      </Screen>
    );
  }
  if (isError) {
    return (
      <Screen>
        <AppHeader title="Thanh toán phí thuê ô" back />
        <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
      </Screen>
    );
  }
  if (detail.data?.item.itemStatus === 'PAID') return <PaidReceipt detail={detail.data} />;
  if (!fee) return <ErrorState message="Không tìm thấy khoản phí." />;
  // The list already knows the instalment is settled (paid, cancelled): the server would refuse
  // a checkout, so there is no pay button to offer. The receipt needs the detail read, which
  // failed to get here, so it can be asked for again.
  if (!isPayableFee(fee)) {
    return (
      <SettledFee fee={fee} retryReceipt={detail.isError ? () => detail.refetch() : undefined} />
    );
  }

  return (
    <Screen
      footer={
        <StickyActions>
          <PayBar amount={fee.amount}>
            <Button
              label={
                checkout.isPending ? 'Đang khởi tạo thanh toán…' : 'Thanh toán qua MoMo / ZaloPay'
              }
              loading={checkout.isPending}
              disabled={checkout.isPending}
              onPress={pay}
            />
          </PayBar>
        </StickyActions>
      }
    >
      <AppHeader title="Thanh toán phí thuê ô" back />
      <ReturnCheckTrack state={momoReturn.state} onRetry={momoReturn.retry} />
      <div className="grid gap-lg xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
        <div className="flex min-w-0 max-w-[640px] flex-col gap-md">
          <FeeSlip
            periodLabel={fee.periodLabel}
            amount={fee.amount}
            dueDate={fee.dueDate}
            slotCode={fee.slotCode}
            status={fee.itemStatus}
          />
          {detail.data ? <ContractProgress detail={detail.data} /> : null}
        </div>
        <div className="flex min-w-0 max-w-[640px] flex-col gap-md">
          <WalletPicker value={provider} onChange={setProvider} disabled={checkout.isPending} />
          {checkout.isError ? <CheckoutError message={errorMessage(checkout.error)} /> : null}
          <SafePaySteps />
        </div>
      </div>
    </Screen>
  );
}

/**
 * An instalment the vendor can no longer pay, shown from the fee list alone: paid (the receipt's
 * detail read is unavailable), cancelled, or any other settled state.
 */
function SettledFee({ fee, retryReceipt }: { fee: FeeItemDto; retryReceipt?: () => void }) {
  const navigate = useNavigate();
  const paid = fee.itemStatus === 'PAID';
  const cancelled = fee.itemStatus === 'CANCELLED';
  const title = paid ? 'Đã thanh toán' : cancelled ? 'Kỳ phí đã huỷ' : 'Không cần thanh toán';
  const note = paid
    ? 'Kỳ phí này đã được thanh toán. Hoá đơn nằm trong mục Hoá đơn.'
    : cancelled
      ? 'Kỳ phí này đã bị huỷ nên không cần thanh toán.'
      : 'Kỳ phí này không còn ở trạng thái cần thanh toán.';
  return (
    <Screen
      footer={
        <StickyActions>
          <Button
            label="Về trang Tài chính"
            variant="outline"
            onPress={() => navigate('/vendor/finance')}
          />
        </StickyActions>
      }
    >
      <AppHeader title={title} back />
      <div className="flex min-w-0 max-w-[640px] flex-col gap-md">
        <FeeSlip
          periodLabel={fee.periodLabel}
          amount={fee.amount}
          dueDate={fee.dueDate}
          slotCode={fee.slotCode}
          status={fee.itemStatus}
        />
        <p role="status" className="text-body-md text-muted">
          {note}
        </p>
        {paid ? (
          <div className="flex flex-wrap gap-xs">
            <Button
              label="Xem hoá đơn"
              size="sm"
              fullWidth={false}
              onPress={() => navigate('/vendor/finance/invoices')}
            />
            {retryReceipt ? (
              <Button
                label="Tải lại biên nhận"
                size="sm"
                variant="outline"
                fullWidth={false}
                onPress={retryReceipt}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </Screen>
  );
}

/**
 * Where this instalment sits in its contract: how many are paid and what is still owed. Read
 * from the instalment's own detail; if that read fails the slip still has everything needed to
 * pay, so this simply stays away.
 */
function ContractProgress({ detail }: { detail: FeeItemDetailDto }) {
  const { contract } = detail;
  return (
    <section
      aria-label={`Hợp đồng thuê ô ${contract.slotCode}`}
      className="rounded-[20px] bg-card p-md ring-1 ring-border/80"
    >
      <div className="mb-xs flex flex-wrap items-baseline justify-between gap-x-sm gap-y-1 text-body-md">
        <span className="text-text">
          Hợp đồng đã nộp {contract.paidCount}/{contract.instalmentCount} kỳ
        </span>
        <span className="text-muted">
          Còn lại{' '}
          <span className="font-semibold tabular-nums text-text">
            {formatVnd(contract.outstandingAmount)}
          </span>
        </span>
      </div>
      <ProgressBar value={paidShare(contract)} label="Tiến độ đóng phí của hợp đồng" />
    </section>
  );
}

/**
 * After paying: a receipt, not a bounce back to the list. The vendor sees the money was taken,
 * which invoice it produced, and can open or download it straight away.
 */
function PaidReceipt({ detail }: { detail: FeeItemDetailDto }) {
  const navigate = useNavigate();
  const titleId = useId();
  const [downloading, setDownloading] = useState(false);
  const { item, contract } = detail;

  const download = async () => {
    if (!item.invoiceId || !item.invoiceNumber) return;
    setDownloading(true);
    try {
      saveFile(await financeApi.invoicePdf(item.invoiceId), `${item.invoiceNumber}.pdf`);
    } catch (err) {
      showToast(errorMessage(err));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Screen
      footer={
        <StickyActions>
          <Button
            label="Về trang Tài chính"
            variant="outline"
            onPress={() => navigate('/vendor/finance')}
          />
        </StickyActions>
      }
    >
      <AppHeader title="Đã thanh toán" back />
      <div className="grid gap-lg xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
        <ReceiptPaper labelledBy={titleId}>
          <div className="relative py-sm text-center">
            {item.paidAt ? <PaidStamp /> : null}
            <h2 id={titleId} className="font-sign text-[20px] font-bold leading-7 text-text">
              Thanh toán thành công
            </h2>
            <p className="mt-xs whitespace-nowrap font-sign text-[clamp(32px,10.5vw,44px)] font-bold leading-none tabular-nums text-text [font-stretch:88%]">
              {formatVnd(item.amount)}
            </p>
          </div>
          <dl className="border-t border-border pt-xs">
            <ReceiptRow label="Kỳ phí">{item.periodLabel}</ReceiptRow>
            <ReceiptRow label="Ô">
              <KerbTag code={contract.slotCode} />
            </ReceiptRow>
            {item.paidAt ? (
              <ReceiptRow label="Thanh toán lúc">
                <span className="tabular-nums">
                  {new Date(item.paidAt).toLocaleString('vi-VN', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </span>
              </ReceiptRow>
            ) : null}
            {item.invoiceNumber ? (
              <ReceiptRow label="Hoá đơn">
                <span className="break-all tabular-nums">{item.invoiceNumber}</span>
              </ReceiptRow>
            ) : null}
          </dl>
          {item.invoiceId && item.invoiceNumber ? (
            <div className="mt-md flex flex-wrap gap-xs">
              <Button
                label="Xem hoá đơn"
                size="sm"
                fullWidth={false}
                onPress={() => navigate(`/vendor/finance/invoices/${item.invoiceId}`)}
              />
              <Button
                label="Tải PDF"
                size="sm"
                variant="outline"
                fullWidth={false}
                loading={downloading}
                disabled={downloading}
                onPress={() => void download()}
              />
            </div>
          ) : (
            <p role="status" className="mt-md text-center text-body-sm text-muted">
              Hoá đơn đang được phát hành…
            </p>
          )}
          <ReceiptFoot />
        </ReceiptPaper>
        {contract.nextDue ? (
          <button
            type="button"
            onClick={() => navigate(`/vendor/finance/contracts/${contract.contractId}`)}
            className="flex items-center justify-between gap-sm rounded-[20px] bg-card p-md text-left ring-1 ring-border/80 transition-transform duration-150 active:scale-[.98]"
          >
            <span className="min-w-0">
              <span className="block text-body-sm text-muted">Kỳ tiếp theo</span>
              <span className="block text-headline-sm text-text">
                {contract.nextDue.periodLabel}
              </span>
              <span className="mt-2xs block text-body-sm text-muted">
                Hạn {formatDay(contract.nextDue.dueDate)}
              </span>
            </span>
            <span className="shrink-0 font-semibold tabular-nums text-text">
              {formatVnd(contract.nextDue.amount)}
            </span>
          </button>
        ) : null}
      </div>
    </Screen>
  );
}

function MockFeePaymentScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fee = useMockDb((s) => s.feeItems.find((f) => f.id === id));
  const payFee = useMockDb((s) => s.payFee);
  const [processing, setProcessing] = useState(false);

  if (!fee) return <ErrorState message="Không tìm thấy khoản phí." />;

  const pay = () => {
    setProcessing(true);
    setTimeout(() => {
      payFee(fee.id);
      setProcessing(false);
      showToast('Thanh toán thành công');
      navigate(-1);
    }, 900);
  };

  return (
    <Screen
      footer={
        <StickyActions>
          <PayBar amount={fee.amount}>
            <Button label="Thanh toán qua MoMo / ZaloPay" onPress={pay} loading={processing} />
          </PayBar>
        </StickyActions>
      }
    >
      <AppHeader title="Thanh toán phí thuê ô" back />
      <FeeSlip
        periodLabel={fee.period_label}
        amount={fee.amount}
        dueDate={fee.due_date}
        status={fee.item_status}
      />
    </Screen>
  );
}

/** The slip and the two wallet cards in outline while the fee list loads. */
function PaymentSkeleton() {
  return (
    <LoadingBlock>
      <div className="grid gap-lg xl:grid-cols-[minmax(0,1fr)_360px]">
        <Skeleton className="h-[300px] w-full max-w-[640px] !rounded-[20px]" />
        <div className="grid max-w-[640px] grid-cols-2 gap-sm self-start">
          <Skeleton className="h-20 w-full !rounded-[16px]" />
          <Skeleton className="h-20 w-full !rounded-[16px]" />
        </div>
      </div>
    </LoadingBlock>
  );
}
