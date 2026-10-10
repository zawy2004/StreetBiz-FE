import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';

import { Button, Icon } from '@/components/common';
import { ErrorState, showToast } from '@/components/feedback';
import { AppHeader, Screen } from '@/components/layout';
import { commerceApi, errorMessage } from '@/core/api';
import { env, isDev } from '@/core/config/env';
import { orderApi } from '../api/orderApi';
import { OfflineNotice } from '../components/OrderShapes';
import { formatClock, providerName } from '../components/order-display';
import {
  PaymentHandshake,
  PaymentReceiptStrip,
  PaymentSignal,
  PaymentSkeleton,
  SandboxPanel,
} from '../components/payment/PaymentParts';
import { SIGNAL_TONE, type SignalState } from '../components/payment/payment-tones';
import { useCustomerOrder, useRefreshAfterOrderMutation } from '../hooks/useOrders';

/** Only Development has the sandbox confirm/fail endpoints; elsewhere a real gateway is used. */
const sandboxPayments = isDev && env.enablePaymentSandbox;

export function OrderPaymentScreen() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const order = useCustomerOrder(orderId);
  const queryClient = useQueryClient();
  const refresh = useRefreshAfterOrderMutation('customer', Number(orderId));

  const options = useQuery({
    queryKey: ['orders', 'payment-options'],
    queryFn: commerceApi.paymentOptions,
    staleTime: 5 * 60_000,
  });

  const action = useMutation({
    mutationFn: (kind: 'pay' | 'fail' | 'cancel' | 'sync') => {
      const id = Number(orderId);
      if (kind === 'pay') return orderApi.confirmSandboxPayment(id);
      if (kind === 'fail') return orderApi.failSandboxPayment(id);
      if (kind === 'sync') return orderApi.syncPayment(id);
      return orderApi.cancel(id);
    },
    onSuccess: async (next, kind) => {
      await refresh.update(next);
      // Paying consumes the cart; failing or cancelling unfreezes it.
      await queryClient.invalidateQueries({ queryKey: ['commerce', 'cart'] });
      if (kind === 'sync') {
        if (next.orderStatus === 'PLACED') showToast('MoMo đã xác nhận thanh toán');
        return;
      }
      showToast(
        kind === 'pay'
          ? 'Thanh toán thành công'
          : kind === 'fail'
            ? 'Đã giả lập thanh toán thất bại'
            : 'Đã huỷ đơn',
      );
    },
    onError: (error) => refresh.handleError(error),
  });

  // Back from MoMo (or reopened later): ask the backend to check with MoMo once. The
  // query string MoMo appends is ignored; only the backend's answer counts.
  const pendingOnLoad = order.data?.orderStatus === 'PENDING_PAYMENT';
  const synced = useRef(false);
  useEffect(() => {
    if (pendingOnLoad && !synced.current) {
      synced.current = true;
      action.mutate('sync');
    }
  }, [pendingOnLoad, action]);

  if (order.isPending) {
    return (
      <Screen width="narrow">
        <AppHeader title="Trạng thái thanh toán" back />
        <div className="mx-auto w-full max-w-[560px]">
          <PaymentSkeleton />
        </div>
      </Screen>
    );
  }
  if (order.isError || !order.data) {
    return (
      <Screen width="narrow">
        <AppHeader title="Trạng thái thanh toán" back />
        <ErrorState
          message="Không tải được trạng thái thanh toán."
          onRetry={() => order.refetch()}
        />
      </Screen>
    );
  }

  const data = order.data;
  const pending = data.orderStatus === 'PENDING_PAYMENT';
  const placed = data.orderStatus === 'PLACED';
  const cancelled = data.orderStatus === 'CANCELLED';
  // An order sent to MoMo's gateway is settled by MoMo, not by the in-app simulator.
  const viaMomo = data.paymentProvider === 'MOMO' && options.data?.mode === 'LIVE';
  const showSandbox = sandboxPayments && !viaMomo;

  // The lamp follows the order status the server returned, nothing else.
  const signal: SignalState = pending
    ? 'pending'
    : placed
      ? 'placed'
      : cancelled
        ? 'failed'
        : 'confirmed';
  const tone = SIGNAL_TONE[signal];
  const gateway = providerName(data.paymentProvider);
  const syncing = action.isPending && action.variables === 'sync';
  const serverNote = options.data?.message?.trim();

  const checkAgain = pending ? (
    <Button
      label="Kiểm tra lại"
      loading={action.isPending && action.variables === 'sync'}
      disabled={action.isPending}
      onPress={() => action.mutate('sync')}
    />
  ) : null;
  const toCart = cancelled ? (
    <Button label="Về giỏ hàng" onPress={() => navigate('/customer/explore/cart')} />
  ) : null;
  const toDetail = (
    <Button
      label="Xem chi tiết đơn hàng"
      variant={pending || cancelled ? 'outline' : 'primary'}
      onPress={() => navigate(`/customer/orders/${data.orderId}`, { replace: true })}
    />
  );

  return (
    <Screen width="narrow">
      <AppHeader title="Trạng thái thanh toán" back subtitle={`#${data.orderCode}`} />
      <OfflineNotice message="Mất kết nối. Chưa kiểm tra được với cổng thanh toán." />
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-lg pb-md">
        <div className="flex flex-col items-center gap-md pt-xs text-center">
          <PaymentSignal state={signal} />
          <div role="status" aria-live="polite" className="flex min-h-[132px] flex-col gap-xs">
            {pending ? (
              <>
                <p
                  className={`font-editorial text-[26px] font-semibold leading-[1.18] md:text-[32px] ${tone.ink}`}
                >
                  Đang chờ cổng thanh toán xác nhận
                </p>
                <p className="text-body-lg text-text/80">
                  {viaMomo
                    ? 'Nếu bạn đã thanh toán trên MoMo, bấm "Kiểm tra lại" để hệ thống hỏi MoMo kết quả.'
                    : showSandbox
                      ? 'Môi trường thử nghiệm chưa nối cổng thanh toán thật. Chọn kết quả thanh toán bên dưới.'
                      : 'Trang này tự kiểm tra trạng thái từ backend. Tham số trên URL quay lại không được dùng làm bằng chứng thanh toán thành công.'}
                </p>
                <p className="flex items-center justify-center gap-1.5 text-body-sm text-muted">
                  <Icon name="lock-outline" size={15} color="currentColor" />
                  Giỏ hàng bị khoá cho tới khi đơn được thanh toán hoặc huỷ.
                </p>
              </>
            ) : placed ? (
              <>
                <p
                  className={`font-editorial text-[26px] font-semibold leading-[1.18] md:text-[32px] ${tone.ink}`}
                >
                  Đặt món thành công
                </p>
                <p className="text-body-lg text-text/80">
                  Backend đã xác nhận thanh toán và chuyển đơn cho người bán.
                </p>
              </>
            ) : cancelled ? (
              <>
                <p
                  className={`font-editorial text-[26px] font-semibold leading-[1.18] md:text-[32px] ${tone.ink}`}
                >
                  Thanh toán thất bại hoặc đơn đã bị huỷ
                </p>
                <p className="text-body-lg text-text/80">
                  Giỏ hàng vẫn được giữ để bạn kiểm tra và đặt lại.
                </p>
              </>
            ) : (
              <p className={`text-[17px] font-semibold leading-7 ${tone.ink}`}>
                Thanh toán đã được backend xác nhận.
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-xs rounded-[20px] bg-sunken/60 px-md py-md">
          <PaymentHandshake gateway={gateway ?? 'thanh toán'} state={signal} />
          <p className="mt-xs flex min-h-5 flex-wrap items-center justify-center gap-x-sm text-center font-sign text-[13px] tabular-nums text-muted">
            {order.dataUpdatedAt ? (
              <span>Lần kiểm tra gần nhất lúc {formatClock(order.dataUpdatedAt)}</span>
            ) : null}
            {syncing ? (
              <span className="inline-flex items-center gap-1.5 font-semibold text-[#6B4100] dark:text-[#FFD27A]">
                <span
                  aria-hidden="true"
                  className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"
                />
                {data.paymentProvider === 'MOMO'
                  ? 'Đang hỏi MoMo kết quả…'
                  : 'Đang hỏi cổng thanh toán…'}
              </span>
            ) : null}
          </p>
          {serverNote ? <p className="text-center text-body-xs text-muted">{serverNote}</p> : null}
        </div>

        <PaymentReceiptStrip order={data} gateway={gateway} />

        <div className="flex flex-col gap-sm">
          {checkAgain}
          {toCart}
          {pending ? (
            <div className="grid gap-sm sm:grid-cols-2">
              {toDetail}
              <Button
                label="Huỷ đơn này"
                variant="ghost"
                loading={action.isPending && action.variables === 'cancel'}
                disabled={action.isPending}
                onPress={() => action.mutate('cancel')}
              />
            </div>
          ) : (
            toDetail
          )}
          {pending && showSandbox ? (
            <SandboxPanel>
              <Button
                label="Thanh toán thử (thành công)"
                loading={action.isPending && action.variables === 'pay'}
                disabled={action.isPending}
                onPress={() => action.mutate('pay')}
              />
              <Button
                label="Giả lập thanh toán thất bại"
                variant="outline"
                loading={action.isPending && action.variables === 'fail'}
                disabled={action.isPending}
                onPress={() => action.mutate('fail')}
              />
            </SandboxPanel>
          ) : null}
          {action.isError ? (
            <p
              role="alert"
              className="flex items-start gap-1.5 rounded-[14px] bg-[#FDEBEA] px-sm py-xs text-body-md font-medium text-[#B42318] dark:bg-[#3A1414] dark:text-[#FF9A90]"
            >
              <Icon
                name="alert-circle-outline"
                size={18}
                color="currentColor"
                className="mt-0.5 shrink-0"
              />
              <span className="text-error">{errorMessage(action.error)}</span>
            </p>
          ) : null}
        </div>
      </div>
    </Screen>
  );
}
