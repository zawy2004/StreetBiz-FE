import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, Money } from '@/components/common';
import { ErrorState, LoadingState, showToast } from '@/components/feedback';
import { AppHeader, Screen } from '@/components/layout';
import { commerceApi, errorMessage } from '@/core/api';

export function OrderPaymentScreen() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const cache = useQueryClient();
  const order = useQuery({
    queryKey: ['commerce', 'customer-order', orderId],
    queryFn: () => commerceApi.customerOrder(orderId!),
    enabled: Boolean(orderId),
    refetchInterval: 5000,
  });
  const options = useQuery({
    queryKey: ['commerce', 'payment-options'],
    queryFn: commerceApi.paymentOptions,
  });
  const pay = useMutation({
    mutationFn: (success: boolean) =>
      success
        ? commerceApi.confirmSandboxPayment(order.data!.orderId)
        : commerceApi.failSandboxPayment(order.data!.orderId),
    onSuccess: async (next) => {
      cache.setQueryData(['commerce', 'customer-order', orderId], next);
      await cache.invalidateQueries({ queryKey: ['commerce', 'customer-orders'] });
      if (next.paymentStatus === 'SUCCESS') {
        showToast('Thanh toán thử nghiệm thành công');
        navigate(`/customer/orders/${next.orderId}`, { replace: true });
      }
    },
    onError: () => {
      void order.refetch();
    },
  });
  if (order.isPending || options.isPending) return <LoadingState />;
  if (order.isError || options.isError || !order.data)
    return (
      <ErrorState
        message={errorMessage(order.error ?? options.error)}
        onRetry={() => {
          void order.refetch();
          void options.refetch();
        }}
      />
    );
  const data = order.data;
  const pending = data.orderStatus === 'PENDING_PAYMENT';
  return (
    <Screen>
      <AppHeader title="Thanh toán đơn hàng" back subtitle={`#${data.orderCode}`} />
      <Card>
        <p className="text-headline-sm">{data.storefrontName}</p>
        <Money amountVnd={data.totalAmount} size="lg" />
        <p className="mt-sm text-muted">{data.paymentProvider}</p>
      </Card>
      {pending ? (
        <>
          <Card>
            <p>
              {data.paymentStatus === 'FAILED'
                ? 'Lần thanh toán trước thất bại. Bạn có thể thử lại cho đơn này.'
                : 'Đơn đang chờ thanh toán. Người bán sẽ nhận đơn khi thanh toán thành công.'}
            </p>
          </Card>
          <p className="text-body-sm text-muted">{options.data?.message}</p>
          {options.data?.mode === 'SANDBOX' ? (
            <>
              <Button
                label={
                  data.paymentStatus === 'FAILED'
                    ? 'Thử lại thanh toán sandbox'
                    : 'Xác nhận thanh toán sandbox'
                }
                loading={pay.isPending}
                disabled={pay.isPending}
                onPress={() => pay.mutate(true)}
              />
              <Button
                label="Mô phỏng thanh toán thất bại"
                variant="outline"
                disabled={pay.isPending}
                onPress={() => pay.mutate(false)}
              />
            </>
          ) : null}
        </>
      ) : (
        <Card>
          <p>
            {data.paymentStatus === 'SUCCESS'
              ? 'Thanh toán đã được xác nhận.'
              : 'Đơn đã kết thúc, không thể tiếp tục thanh toán.'}
          </p>
        </Card>
      )}
      {pay.isError ? (
        <p role="alert" className="text-error">
          {errorMessage(pay.error)}
        </p>
      ) : null}
      <Button
        label="Xem đơn hàng"
        variant="outline"
        onPress={() => navigate(`/customer/orders/${data.orderId}`, { replace: true })}
      />
    </Screen>
  );
}
