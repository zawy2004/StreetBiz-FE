import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';

import { Button } from '@/components/common';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { ErrorState, LoadingState, showToast } from '@/components/feedback';
import { ApiError, errorMessage, financeApi } from '@/core/api';
import { isLiveApi } from '@/core/config/env';
import { useMockDb } from '@/mocks/db';
import { PaymentProviderSelector } from '@/features/orders/components';
import { redirectToPayment } from '@/features/orders/payment-redirect';
import { PaymentSummary } from '../components/PaymentSummary';
import { FINANCE_KEYS, useFeeItems, usePayFeeCheckout } from '../useFinance';

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
        <LoadingState />
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
      <PaymentSummary title={fee.periodLabel} amount={fee.amount} dueDate={fee.dueDate} />
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
