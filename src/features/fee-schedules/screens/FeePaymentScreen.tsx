import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { Button } from '@/components/common';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { ErrorState, Skeleton, showToast } from '@/components/feedback';
import { ApiError, errorMessage, financeApi } from '@/core/api';
import { isLiveApi } from '@/core/config/env';
import { useMockDb } from '@/mocks/db';
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
  const { feeItems, isLoading, isError, error, refetch } = useFeeItems();
  const checkout = usePayFeeCheckout();
  const { pathname } = useLocation();
  // Back from MoMo on this page: the backend checks with MoMo, then we leave for the finance home.
  const momoReturn = useFinancePaymentReturn(async () => {
    await queryClient.invalidateQueries({ queryKey: ['finance'] });
    showToast('MoMo đã xác nhận thanh toán');
    navigate('/vendor/finance', { replace: true });
  });
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
            await Promise.all([
              queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.fees() }),
              queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.summary }),
              queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.payments }),
              queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.invoices }),
            ]);
            showToast('Thanh toán thành công');
            navigate(-1);
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
