import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { Button } from '@/components/common';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { ErrorState, LoadingState, showToast } from '@/components/feedback';
import { ApiError, errorMessage, financeApi } from '@/core/api';
import { isLiveApi } from '@/core/config/env';
import { useMockDb } from '@/mocks/db';
import { PaymentProviderSelector } from '@/features/orders/components';
import { isSandboxPaymentUrl, redirectToPayment } from '@/features/orders/payment-redirect';
import { rememberFinancePayment, useFinancePaymentReturn } from '../useFinancePaymentReturn';
import { PaymentSummary } from '../components/PaymentSummary';
import { FINANCE_KEYS, usePenalties, usePayPenaltyCheckout } from '../useFinance';

type Provider = 'MOMO' | 'ZALOPAY';

export function PenaltyPaymentScreen() {
  return isLiveApi ? <LivePenaltyPaymentScreen /> : <MockPenaltyPaymentScreen />;
}

function LivePenaltyPaymentScreen() {
  const { id } = useParams<{ id: string }>();
  const penaltyId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [provider, setProvider] = useState<Provider>('MOMO');
  const idempotencyKey = useRef<string | null>(null);
  const submitting = useRef(false);
  const { penalties, isLoading, isError, error, refetch } = usePenalties();
  const checkout = usePayPenaltyCheckout();
  const { pathname } = useLocation();
  // Back from MoMo on this page: the backend checks with MoMo, then we leave for the finance home.
  const momoReturn = useFinancePaymentReturn(async () => {
    await queryClient.invalidateQueries({ queryKey: ['finance'] });
    showToast('MoMo đã xác nhận thanh toán');
    navigate('/vendor/finance', { replace: true });
  });
  const penalty = penalties.find((p) => p.penaltyId === penaltyId);

  useEffect(() => {
    idempotencyKey.current = null;
    submitting.current = false;
  }, [penaltyId]);

  const pay = () => {
    if (!penalty || submitting.current || checkout.isPending) return;
    submitting.current = true;
    idempotencyKey.current ??= crypto.randomUUID();
    checkout.mutate(
      { penaltyId, provider, idempotencyKey: idempotencyKey.current },
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
              queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.penalties() }),
              queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.summary }),
              queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.payments }),
              queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.violations }),
            ]);
            showToast('Thanh toán thành công');
            navigate(-1);
          } catch (err) {
            if (err instanceof ApiError && err.status === 404) {
              showToast('Đang chuyển đến cổng thanh toán.');
              redirectToPayment(result.paymentUrl);
              return;
            }
            // e.g. already paid from another tab: refresh so the penalty stops looking payable.
            await Promise.all([
              queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.penalties() }),
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
        <AppHeader title="Thanh toán biên bản phạt" back />
        <LoadingState />
      </Screen>
    );
  }
  if (isError) {
    return (
      <Screen>
        <AppHeader title="Thanh toán biên bản phạt" back />
        <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
      </Screen>
    );
  }
  if (!penalty) return <ErrorState message="Không tìm thấy biên bản phạt." />;

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
      <AppHeader title="Thanh toán biên bản phạt" back />
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
      <PaymentSummary title={penalty.violationLabel} amount={penalty.amount} />
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

function MockPenaltyPaymentScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const penalty = useMockDb((s) => s.penalties.find((p) => p.id === id));
  const payPenalty = useMockDb((s) => s.payPenalty);
  const [processing, setProcessing] = useState(false);

  if (!penalty) return <ErrorState message="Không tìm thấy biên bản phạt." />;

  const pay = () => {
    setProcessing(true);
    setTimeout(() => {
      payPenalty(penalty.id);
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
      <AppHeader title="Thanh toán biên bản phạt" back />
      <PaymentSummary title={penalty.reason} amount={penalty.amount} />
    </Screen>
  );
}
