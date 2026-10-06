import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { Button, Card, Icon, Money } from '@/components/common';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { ErrorState, LoadingState, showToast } from '@/components/feedback';
import { ApiError, errorMessage, financeApi, type FeeItemDetailDto } from '@/core/api';
import { isLiveApi } from '@/core/config/env';
import { saveFile } from '@/core/utils/save-file';
import { useMockDb } from '@/mocks/db';
import { colors } from '@/theme';
import { PaymentProviderSelector } from '@/features/orders/components';
import { isSandboxPaymentUrl, redirectToPayment } from '@/features/orders/payment-redirect';
import { rememberFinancePayment, useFinancePaymentReturn } from '../useFinancePaymentReturn';
import { PaymentSummary } from '../components/PaymentSummary';
import { DueBadge, ProgressBar } from '../components/ScheduleComponents';
import { formatDay, paidShare } from '../schedule-progress';
import { usePayFeeCheckout } from '../useFinance';
import { useFeeItemDetail } from '../useFeeSchedules';

type Provider = 'MOMO' | 'ZALOPAY';

export function FeePaymentScreen() {
  return isLiveApi ? <LiveFeePaymentScreen /> : <MockFeePaymentScreen />;
}

/** What is being paid: the instalment, its slot and contract, and how urgent it is. */
function FeeSummary({ detail }: { detail: FeeItemDetailDto }) {
  const { item, contract } = detail;
  return (
    <Card>
      <div className="flex items-start justify-between gap-sm">
        <div className="min-w-0">
          <p className="text-body-md text-muted">Phí thuê ô {contract.slotCode}</p>
          <p className="text-headline-sm text-text">{item.periodLabel}</p>
        </div>
        <DueBadge item={item} />
      </div>
      <div className="mt-sm">
        <Money amountVnd={item.amount} size="lg" />
        <p className="mt-2xs text-body-sm text-muted">Hạn thanh toán {formatDay(item.dueDate)}</p>
      </div>
      <div className="mt-sm border-t border-border pt-sm">
        <div className="mb-2xs flex justify-between text-body-sm text-muted">
          <span>
            Hợp đồng đã nộp {contract.paidCount}/{contract.instalmentCount} kỳ
          </span>
          <span>
            Còn lại <Money amountVnd={contract.outstandingAmount} />
          </span>
        </div>
        <ProgressBar value={paidShare(contract)} label="Tiến độ đóng phí của hợp đồng" />
      </div>
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
  const queryClient = useQueryClient();
  const [provider, setProvider] = useState<Provider>('MOMO');
  const idempotencyKey = useRef<string | null>(null);
  const submitting = useRef(false);
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
  // Back from MoMo on this page: the backend checks with MoMo, then this page shows the receipt.
  const momoReturn = useFinancePaymentReturn(async () => {
    await refreshAll();
    showToast('MoMo đã xác nhận thanh toán');
  });

  useEffect(() => {
    idempotencyKey.current = null;
    submitting.current = false;
  }, [feeItemId]);

  const pay = () => {
    if (!detail.data || submitting.current || checkout.isPending) return;
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
            // Development-only: the local sandbox confirms here instead of a real gateway.
            await financeApi.sandboxConfirmPayment(result.transactionId);
            await refreshAll();
            showToast('Thanh toán thành công');
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

  if (detail.isLoading) {
    return (
      <Screen>
        <AppHeader title="Thanh toán phí thuê ô" back />
        <LoadingState />
      </Screen>
    );
  }
  if (detail.isError || !detail.data) {
    return (
      <Screen>
        <AppHeader title="Thanh toán phí thuê ô" back />
        <ErrorState message={errorMessage(detail.error)} onRetry={() => detail.refetch()} />
      </Screen>
    );
  }
  if (detail.data.item.itemStatus === 'PAID') {
    return <PaidReceipt detail={detail.data} />;
  }

  return (
    <Screen
      footer={
        <StickyActions>
          <Button
            label={
              checkout.isPending ? 'Đang khởi tạo thanh toán…' : 'Thanh toán qua MoMo / ZaloPay'
            }
            loading={checkout.isPending}
            disabled={checkout.isPending}
            onPress={pay}
          />
        </StickyActions>
      }
    >
      <AppHeader title="Thanh toán phí thuê ô" back />
      {momoReturn.state.phase === 'checking' ? (
        <p role="status" className="rounded-md bg-sunken p-md text-body-md text-muted">
          Đang kiểm tra kết quả thanh toán với MoMo…
        </p>
      ) : null}
      {momoReturn.state.phase === 'pending' ? (
        <div role="status" className="rounded-md border border-border bg-tint-secondary p-md">
          <p className="text-headline-sm text-text">MoMo chưa xác nhận thanh toán</p>
          <p className="mt-2xs text-body-md text-muted">
            Nếu bạn đã thanh toán, bấm kiểm tra lại sau vài giây.
          </p>
          <div className="mt-sm">
            <Button
              label="Kiểm tra lại"
              variant="outline"
              fullWidth={false}
              size="sm"
              onPress={() =>
                momoReturn.state.phase === 'pending' &&
                momoReturn.retry(momoReturn.state.transactionId)
              }
            />
          </div>
        </div>
      ) : null}
      {momoReturn.state.phase === 'failed' ? (
        <p role="alert" className="rounded-md bg-error-bg p-md text-body-md text-error">
          {momoReturn.state.message}
        </p>
      ) : null}
      <FeeSummary detail={detail.data} />
      <PaymentProviderSelector
        value={provider}
        onChange={setProvider}
        disabled={checkout.isPending}
      />
      {checkout.isError ? (
        <p className="text-body-md text-error">{errorMessage(checkout.error)}</p>
      ) : null}
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
          <Button label="Thanh toán qua MoMo / ZaloPay" onPress={pay} loading={processing} />
        </StickyActions>
      }
    >
      <AppHeader title="Thanh toán phí thuê ô" back />
      <PaymentSummary title={fee.period_label} amount={fee.amount} dueDate={fee.due_date} />
    </Screen>
  );
}
