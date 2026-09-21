import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { Button, Card, Divider, ListRow, Money } from '@/components/common';
import { EmptyState, ErrorState, LoadingState, showToast } from '@/components/feedback';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { commerceApi, errorMessage } from '@/core/api';
import { isLiveApi } from '@/core/config/env';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';
import { colors } from '@/theme';
import { useCartStore } from '../cart-store';
import { useCheckoutOrder } from '@/features/orders/hooks/useOrders';
import { PaymentProviderSelector } from '@/features/orders/components';
import { redirectToPayment } from '@/features/orders/payment-redirect';

type Provider = 'MOMO' | 'ZALOPAY';

export function CheckoutScreen() {
  return isLiveApi ? <LiveCheckoutScreen /> : <MockCheckoutScreen />;
}

function LiveCheckoutScreen() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [provider, setProvider] = useState<Provider>('MOMO');
  const idempotencyKey = useRef<string | null>(null);
  const submitting = useRef(false);
  const cart = useQuery({
    queryKey: ['commerce', 'cart'],
    queryFn: commerceApi.cart,
    enabled: user?.role_code === 'CUSTOMER',
  });
  const place = useCheckoutOrder();
  useEffect(() => {
    idempotencyKey.current = null;
    submitting.current = false;
  }, [cart.data?.cartId]);
  const startCheckout = () => {
    if (!cart.data || submitting.current || place.isPending) return;
    submitting.current = true;
    idempotencyKey.current ??= crypto.randomUUID();
    place.mutate(
      {
        cartId: cart.data.cartId,
        provider,
        idempotencyKey: idempotencyKey.current,
      },
      {
        onSuccess: async (checkout) => {
          sessionStorage.setItem('streetbiz.pendingOrderId', String(checkout.orderId));
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['commerce', 'cart'] }),
            queryClient.invalidateQueries({ queryKey: ['orders', 'customer', 'list'] }),
          ]);
          showToast('Đang chuyển đến cổng thanh toán.');
          redirectToPayment(checkout.paymentUrl);
        },
        onError: () => {
          submitting.current = false;
        },
      },
    );
  };
  if (user?.role_code !== 'CUSTOMER') {
    return (
      <Screen>
        <AppHeader title="Thanh toán" back />
        <EmptyState
          icon="login"
          title="Đăng nhập để đặt hàng"
          action={<Button label="Đăng nhập" onPress={() => navigate('/auth/sign-in')} />}
        />
      </Screen>
    );
  }
  if (cart.isPending) return <LoadingState />;
  if (cart.isError) {
    return <ErrorState message={errorMessage(cart.error)} onRetry={() => cart.refetch()} />;
  }
  const items = cart.data?.items ?? [];
  if (!cart.data || items.length === 0) {
    return (
      <Screen>
        <AppHeader title="Thanh toán" back />
        <EmptyState icon="cart-outline" title="Giỏ hàng trống" />
      </Screen>
    );
  }

  const data = cart.data;
  return (
    <Screen
      footer={
        <StickyActions>
          <Button
            label={
              place.isPending ? 'Đang khởi tạo thanh toán…' : 'Thanh toán và đặt món'
            }
            loading={place.isPending}
            disabled={
              place.isPending ||
              data.storefrontStatus !== 'OPEN' ||
              items.some((item) => item.availabilityStatus !== 'AVAILABLE')
            }
            onPress={startCheckout}
          />
        </StickyActions>
      }
    >
      <AppHeader title="Thanh toán" back subtitle={data.storefrontName} />
      <Card>
        <p className="text-label text-text">Điểm nhận món</p>
        <p className="mt-2xs text-body-md text-muted">
          {data.storefrontAddress || 'Địa chỉ điểm bán chưa được cập nhật'}
        </p>
        <p className="mt-xs text-body-sm text-primary">Nhận món trực tiếp tại điểm bán</p>
      </Card>
      <Card padded={false}>
        <div className="px-md">
          {items.map((item, index) => (
            <div key={item.cartItemId}>
              {index ? <Divider /> : null}
              <ListRow
                title={`${item.quantity}× ${item.itemName}`}
                subtitle={item.note ?? undefined}
                trailing={<Money amountVnd={item.unitPrice * item.quantity} />}
              />
            </div>
          ))}
        </div>
      </Card>
      <PaymentProviderSelector value={provider} onChange={setProvider} disabled={place.isPending} />
      <Card>
        <div className="flex items-center justify-between">
          <span className="text-headline-sm text-text">Tổng thanh toán</span>
          <Money amountVnd={data.subtotal} size="lg" />
        </div>
      </Card>
      <p className="text-center text-body-sm text-muted">
        Giá và tên món được lưu tại thời điểm đặt · Nhận trực tiếp tại quầy
      </p>
      {place.isError ? (
        <p className="text-body-md text-error">{errorMessage(place.error)}</p>
      ) : null}
    </Screen>
  );
}

function MockCheckoutScreen() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const items = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clear);
  const menuItems = useMockDb((state) => state.menuItems);
  const storefronts = useMockDb((state) => state.storefronts);
  const placeOrder = useMockDb((state) => state.placeOrder);
  const [failed, setFailed] = useState(false);
  const [processing, setProcessing] = useState(false);
  const rows = items.flatMap((cartItem) => {
    const menuItem = menuItems.find((item) => item.id === cartItem.menuItemId);
    return menuItem ? [{ cartItem, menuItem }] : [];
  });
  const storefront = storefronts.find((row) => row.id === items[0]?.storefrontId);
  const total = rows.reduce((sum, row) => sum + row.menuItem.price * row.cartItem.quantity, 0);
  if (!rows.length || !storefront) {
    return (
      <Screen>
        <AppHeader title="Thanh toán" back />
        <EmptyState icon="cart-outline" title="Giỏ hàng trống" />
      </Screen>
    );
  }

  const pay = () => {
    if (!user) return navigate('/auth/sign-in');
    setProcessing(true);
    setFailed(false);
    setTimeout(() => {
      setProcessing(false);
      if (Math.random() <= 0.15) return setFailed(true);
      const order = placeOrder({
        customerId: user.id,
        storefrontId: storefront.id,
        items: rows.map((row) => ({
          menuItemId: row.menuItem.id,
          name: row.menuItem.name,
          price: row.menuItem.price,
          quantity: row.cartItem.quantity,
        })),
        total,
      });
      clearCart();
      showToast('Thanh toán thành công, đơn hàng đã được gửi');
      navigate(`/customer/orders/${order.id}`, { replace: true });
    }, 900);
  };

  return (
    <Screen
      footer={
        <StickyActions>
          <Button
            label={failed ? 'Thử lại thanh toán' : 'Thanh toán qua MoMo / ZaloPay'}
            variant={failed ? 'danger' : 'primary'}
            loading={processing}
            onPress={pay}
          />
        </StickyActions>
      }
    >
      <AppHeader title="Thanh toán" back subtitle={storefront.name} />
      <Card padded={false}>
        <div className="px-md">
          {rows.map((row, index) => (
            <div key={row.cartItem.menuItemId}>
              {index ? <Divider /> : null}
              <ListRow
                title={`${row.cartItem.quantity}× ${row.menuItem.name}`}
                trailing={<Money amountVnd={row.menuItem.price * row.cartItem.quantity} />}
              />
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <div className="flex items-center justify-between">
          <span className="text-headline-sm text-text">Tổng cộng</span>
          <Money amountVnd={total} size="lg" />
        </div>
      </Card>
      {failed ? (
        <Card style={{ backgroundColor: 'rgb(var(--c-error) / 0.06)', borderColor: 'rgb(var(--c-error) / 0.25)' }}>
          <p className="text-body-md" style={{ color: colors.error }}>
            Thanh toán thất bại. Vui lòng thử lại.
          </p>
        </Card>
      ) : null}
    </Screen>
  );
}
