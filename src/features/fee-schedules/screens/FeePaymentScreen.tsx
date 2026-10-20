import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { Button, Card, Icon, Money } from '@/components/common';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { ErrorState, Skeleton, showToast } from '@/components/feedback';
import { ApiError, errorMessage, financeApi, type FeeItemDetailDto } from '@/core/api';
import { isLiveApi } from '@/core/config/env';
import { saveFile } from '@/core/utils/save-file';
import { useMockDb } from '@/mocks/db';
import { colors } from '@/theme';
import { isSandboxPaymentUrl, redirectToPayment } from '@/features/orders/payment-redirect';
import { rememberFinancePayment, useFinancePaymentReturn } from '../useFinancePaymentReturn';
import { FINANCE_KEYS, useFeeItems, usePayFeeCheckout } from '../useFinance';
import { LoadingBlock } from '../components/FinanceParts';
import {
  CheckoutError,
  FeeSlip,
  PayBar,
  SafePaySteps,
  WalletPicker,
} from '../components/PaymentParts';
import { ReturnCheckTrack } from '../components/ReturnCheckTrack';
import { ProgressBar } from '../components/ScheduleComponents';
import { formatDay, paidShare } from '../schedule-progress';
import { useFeeItemDetail } from '../useFeeSchedules';

type Provider = 'MOMO' | 'ZALOPAY';

export function FeePaymentScreen() {
  return isLiveApi ? <LiveFeePaymentScreen /> : <MockFeePaymentScreen />;
}

/**
 * Where this instalment sits in its contract. Read from the instalment's own detail; if that
 * read fails the slip above still has everything needed to pay, so this simply stays away.
 */
function ContractProgress({ detail }: { detail: FeeItemDetailDto }) {
  const { contract } = detail;
  return (
    <Card>
      <div className="mb-2xs flex justify-between gap-sm text-body-sm text-muted">
        <span>
          Hợp đồng đã nộp {contract.paidCount}/{contract.instalmentCount} kỳ
        </span>
        <span>
          Còn lại <Money amountVnd={contract.outstandingAmount} />
        </span>
      </div>
      <ProgressBar value={paidShare(contract)} label="Tiến độ đóng phí của hợp đồng" />
    </Card>
  );
}

/**
 * After paying: a receipt, not a bounce back to the list. The vendor sees the money was taken,
 * which invoice it produced, and can open or download it straight away.
 */
function PaidReceipt({ detail }: { detail: FeeItemDetailDto }) {
  const navigate = useNavigate();
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
          <Button label="Về trang Tài chính" variant="outline" onPress={() => navigate('/vendor/finance')} />
        </StickyActions>
      }
    >
      <AppHeader title="Đã thanh toán" back />
      <Card className="sb-fade-in">
        <div className="flex flex-col items-center gap-xs py-sm text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-tint-tertiary">
            <Icon name="check-circle" size={32} color={colors.tertiary} />
          </span>
          <p className="text-headline-sm text-text">Thanh toán thành công</p>
          <Money amountVnd={item.amount} size="lg" />
          <p className="text-body-sm text-muted">
            {item.periodLabel} · Ô {contract.slotCode}
          </p>
          {item.paidAt ? (
            <p className="text-body-sm text-muted">
              Lúc {new Date(item.paidAt).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}
            </p>
          ) : null}
        </div>
      </Card>
      {item.invoiceId && item.invoiceNumber ? (
        <Card>
          <p className="text-body-sm text-muted">Hoá đơn đã phát hành</p>
          <p className="text-headline-sm text-text">{item.invoiceNumber}</p>
          <div className="mt-sm flex flex-wrap gap-xs">
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
        </Card>
      ) : (
        <p className="text-center text-body-sm text-muted">Hoá đơn đang được phát hành…</p>
      )}
      {contract.nextDue ? (
        <Card onPress={() => navigate(`/vendor/finance/contracts/${contract.contractId}`)}>
          <div className="flex items-center justify-between gap-sm">
            <div>
              <p className="text-body-sm text-muted">Kỳ tiếp theo</p>
              <p className="text-headline-sm text-text">{contract.nextDue.periodLabel}</p>
              <p className="mt-2xs text-body-sm text-muted">Hạn {formatDay(contract.nextDue.dueDate)}</p>
            </div>
            <Money amountVnd={contract.nextDue.amount} />
          </div>
        </Card>
      ) : null}
    </Screen>
  );
}

function LiveFeePaymentScreen() {
  const { id } = useParams<{ id: string }>();
  const feeItemId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [provider, setProvider] = useState<Provider>('MOMO');
  const idempotencyKey = useRef<string | null>(null);
  const submitting = useRef(false);
  const { feeItems, isLoading, isError, error, refetch } = useFeeItems();
  const detail = useFeeItemDetail(feeItemId);
  const checkout = usePayFeeCheckout();
  const { pathname } = useLocation();
  // Every finance view re-reads after a payment. A read still in flight is cancelled first:
  // back from MoMo, this page's first read can start before the sync applied the payment.
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
    if (!fee || submitting.current || checkout.isPending) return;
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
            await financeApi.sandboxConfirmPayment(result.transactionId);
            await afterPaid('Thanh toán thành công');
          } catch (err) {
            if (err instanceof ApiError && err.status === 404) {
              showToast('Đang chuyển đến cổng thanh toán.');
              redirectToPayment(result.paymentUrl);
              return;
            }
            // e.g. already paid from another tab: refresh so the item stops looking payable.
            await Promise.all([
              queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.fees() }),
              queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.summary }),
            ]);
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

  if (isLoading) {
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
        <FeeSlip
          periodLabel={fee.periodLabel}
          amount={fee.amount}
          dueDate={fee.dueDate}
          slotCode={fee.slotCode}
          status={fee.itemStatus}
        />
        <div className="flex min-w-0 max-w-[640px] flex-col gap-md">
          {detail.data ? <ContractProgress detail={detail.data} /> : null}
          <WalletPicker value={provider} onChange={setProvider} disabled={checkout.isPending} />
          {checkout.isError ? <CheckoutError message={errorMessage(checkout.error)} /> : null}
          <SafePaySteps />
        </div>
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
