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
import { FINANCE_KEYS, usePenalties, usePayPenaltyCheckout } from '../useFinance';
import { LoadingBlock } from '../components/FinanceParts';
import {
  CheckoutError,
  PayBar,
  PenaltyNote,
  PenaltyNotice,
  WalletPicker,
} from '../components/PaymentParts';
import { ReturnCheckTrack } from '../components/ReturnCheckTrack';

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
        <NoticeSkeleton />
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
          <PayBar amount={penalty.amount}>
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
      <AppHeader title="Thanh toán biên bản phạt" back />
      <ReturnCheckTrack state={momoReturn.state} onRetry={momoReturn.retry} />
      <div className="grid gap-lg xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
        <PenaltyNotice
          violationLabel={penalty.violationLabel}
          amount={penalty.amount}
          slotCode={penalty.slotCode}
          issuedAt={penalty.issuedAt}
          status={penalty.penaltyStatus}
        />
        <div className="flex min-w-0 max-w-[640px] flex-col gap-md">
          <WalletPicker value={provider} onChange={setProvider} disabled={checkout.isPending} />
          {checkout.isError ? <CheckoutError message={errorMessage(checkout.error)} /> : null}
          <PenaltyNote />
        </div>
      </div>
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
          <PayBar amount={penalty.amount}>
            <Button label="Thanh toán qua MoMo / ZaloPay" onPress={pay} loading={processing} />
          </PayBar>
        </StickyActions>
      }
    >
      <AppHeader title="Thanh toán biên bản phạt" back />
      <PenaltyNotice
        violationLabel={penalty.reason}
        amount={penalty.amount}
        issuedAt={penalty.issued_at}
        status={penalty.penalty_status}
      />
    </Screen>
  );
}

/** The notice in outline (its red margin already ruled) while the list loads. */
function NoticeSkeleton() {
  return (
    <LoadingBlock>
      <div className="grid gap-lg xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="relative flex max-w-[640px] flex-col gap-md overflow-hidden rounded-[16px] bg-card py-lg pl-xl pr-lg ring-1 ring-border/80">
          <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5 bg-[#B42318]/60" />
          <Skeleton className="h-5 w-2/5" />
          <Skeleton className="h-8 w-4/5" />
          <Skeleton className="h-12 w-3/5" />
        </div>
        <div className="grid max-w-[640px] grid-cols-2 gap-sm self-start">
          <Skeleton className="h-20 w-full !rounded-[16px]" />
          <Skeleton className="h-20 w-full !rounded-[16px]" />
        </div>
      </div>
    </LoadingBlock>
  );
}
