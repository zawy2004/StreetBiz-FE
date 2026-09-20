import { useNavigate, useParams } from 'react-router-dom';

import { Button, Card, Money } from '@/components/common';
import { ErrorState, LoadingState } from '@/components/feedback';
import { AppHeader, Screen } from '@/components/layout';
import { OrderStatusBadge } from '../components';
import { useCustomerOrder } from '../hooks/useOrders';

export function OrderPaymentScreen() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const order = useCustomerOrder(orderId);

  if (order.isPending) return <LoadingState />;
  if (order.isError || !order.data) {
    return (
      <ErrorState
        message="Không tải được trạng thái thanh toán."
        onRetry={() => order.refetch()}
      />
    );
  }

  const data = order.data;
  const pending = data.orderStatus === 'PENDING_PAYMENT';
  const placed = data.orderStatus === 'PLACED';
  const cancelled = data.orderStatus === 'CANCELLED';

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
              Trang này tự kiểm tra trạng thái từ backend. Tham số trên URL quay lại không được dùng
              làm bằng chứng thanh toán thành công.
            </p>
          </>
        ) : placed ? (
          <>
            <p className="text-headline-sm text-tertiary">Đặt món thành công</p>
            <p className="mt-xs text-body-md text-muted">
              Backend đã xác nhận callback thanh toán và chuyển đơn cho người bán.
            </p>
          </>
        ) : cancelled ? (
          <>
            <p className="text-headline-sm text-error">Thanh toán thất bại hoặc đơn đã bị huỷ</p>
            <p className="mt-xs text-body-md text-muted">
              Giỏ hàng vẫn được giữ để bạn kiểm tra và thực hiện một lượt checkout mới.
            </p>
          </>
        ) : (
          <p className="text-body-md text-muted">Thanh toán đã được backend xác nhận.</p>
        )}
      </Card>

      {pending ? (
        <Button label="Kiểm tra lại" variant="outline" onPress={() => void order.refetch()} />
      ) : null}
      <Button
        label="Xem chi tiết đơn hàng"
        onPress={() => navigate(`/customer/orders/${data.orderId}`, { replace: true })}
      />
    </Screen>
  );
}
