import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';

import { Button, Card, Money } from '@/components/common';
import { ErrorState, LoadingState, showToast } from '@/components/feedback';
import { AppHeader, Screen } from '@/components/layout';
import { commerceApi, errorMessage } from '@/core/api';
import { env, isDev } from '@/core/config/env';
import { orderApi } from '../api/orderApi';
import { OrderStatusBadge } from '../components';
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

  if (order.isPending) return <LoadingState />;
  if (order.isError || !order.data) {
    return (
      <ErrorState message="Không tải được trạng thái thanh toán." onRetry={() => order.refetch()} />
    );
  }

  const data = order.data;
  const pending = data.orderStatus === 'PENDING_PAYMENT';
  const placed = data.orderStatus === 'PLACED';
  const cancelled = data.orderStatus === 'CANCELLED';
  // An order sent to MoMo's gateway is settled by MoMo, not by the in-app simulator.
  const viaMomo = data.paymentProvider === 'MOMO' && options.data?.mode === 'LIVE';
  const showSandbox = sandboxPayments && !viaMomo;

  return (
    <Screen>
      <AppHeader title="Trạng thái thanh toán" back subtitle={`#${data.orderCode}`} />
      <Card>
        <div className="flex items-center justify-between gap-sm">
          <div>
            <p className="text-headline-sm text-text">{data.storefront.storefrontName}</p>
            <p className="mt-2xs text-body-sm text-muted">{data.paymentProvider}</p>
          </div>
          <OrderStatusBadge status={data.orderStatus} />
        </div>
        <div className="mt-sm">
          <Money amountVnd={data.totalAmount} size="lg" />
        </div>
      </Card>

      <Card>
        {pending ? (
          <>
            <p className="text-headline-sm text-text">Đang chờ cổng thanh toán xác nhận</p>
            <p className="mt-xs text-body-md text-muted">
              {viaMomo
                ? 'Nếu bạn đã thanh toán trên MoMo, bấm "Kiểm tra lại" để hệ thống hỏi MoMo kết quả.'
                : showSandbox
                  ? 'Môi trường thử nghiệm chưa nối cổng thanh toán thật. Chọn kết quả thanh toán bên dưới.'
                  : 'Trang này tự kiểm tra trạng thái từ backend. Tham số trên URL quay lại không được dùng làm bằng chứng thanh toán thành công.'}
            </p>
            <p className="mt-xs text-body-sm text-muted">
              Giỏ hàng bị khoá cho tới khi đơn được thanh toán hoặc huỷ.
            </p>
          </>
        ) : placed ? (
          <>
            <p className="text-headline-sm text-tertiary">Đặt món thành công</p>
            <p className="mt-xs text-body-md text-muted">
              Backend đã xác nhận thanh toán và chuyển đơn cho người bán.
            </p>
          </>
        ) : cancelled ? (
          <>
            <p className="text-headline-sm text-error">Thanh toán thất bại hoặc đơn đã bị huỷ</p>
            <p className="mt-xs text-body-md text-muted">
              Giỏ hàng vẫn được giữ để bạn kiểm tra và đặt lại.
            </p>
          </>
        ) : (
          <p className="text-body-md text-muted">Thanh toán đã được backend xác nhận.</p>
        )}
      </Card>

      {pending && showSandbox ? (
        <>
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
        </>
      ) : null}
      {pending ? (
        <>
          <Button
            label="Kiểm tra lại"
            variant="outline"
            loading={action.isPending && action.variables === 'sync'}
            disabled={action.isPending}
            onPress={() => action.mutate('sync')}
          />
          <Button
            label="Huỷ đơn này"
            variant="ghost"
            loading={action.isPending && action.variables === 'cancel'}
            disabled={action.isPending}
            onPress={() => action.mutate('cancel')}
          />
        </>
      ) : null}
      {action.isError ? (
        <p className="text-body-md text-error">{errorMessage(action.error)}</p>
      ) : null}
      {cancelled ? (
        <Button
          label="Về giỏ hàng"
          variant="outline"
          onPress={() => navigate('/customer/explore/cart')}
        />
      ) : null}
      <Button
        label="Xem chi tiết đơn hàng"
        onPress={() => navigate(`/customer/orders/${data.orderId}`, { replace: true })}
      />
    </Screen>
  );
}
