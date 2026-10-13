import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { Button, Icon } from '@/components/common';
import { ErrorState, showToast } from '@/components/feedback';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { commerceApi, errorMessage } from '@/core/api';
import { isLiveApi } from '@/core/config/env';
import { useIsDesktop } from '@/hooks/useBreakpoint';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';
import { useCartStore } from '../cart-store';
import { useCheckoutOrder } from '@/features/orders/hooks/useOrders';
import { OfflineNotice } from '@/features/orders/components/OrderShapes';
import { isSandboxPaymentUrl, redirectToPayment } from '@/features/orders/payment-redirect';
import { CheckoutBlockReason, TrayMessage } from '../components/CartParts';
import { checkoutBlockReason, dishPhotos } from '../components/cart-display';
import {
  AfterPayNote,
  CheckoutBoard,
  CheckoutLine,
  CheckoutSkeleton,
  PickupPoint,
  PickupPointArt,
  ProviderTiles,
} from '../components/CheckoutParts';

type Provider = 'MOMO' | 'ZALOPAY';

export function CheckoutScreen() {
  return isLiveApi ? <LiveCheckoutScreen /> : <MockCheckoutScreen />;
}

const FOOTNOTE = 'Giá và tên món được lưu tại thời điểm đặt · Nhận trực tiếp tại quầy';

/** Board on the right once both columns have room; above the content on a phone. */
const LAYOUT =
  'grid items-start gap-lg lg:grid-cols-[minmax(0,1fr)_356px] xl:grid-cols-[minmax(0,1fr)_380px] xl:gap-xl';

function LiveCheckoutScreen() {
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
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
          if (isSandboxPaymentUrl(checkout.paymentUrl)) {
            navigate(`/customer/orders/${checkout.orderId}/payment`, { replace: true });
            return;
          }
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
        <div className="mx-auto flex w-full max-w-[460px] flex-col items-center px-md py-xl text-center">
          <PickupPointArt className="w-[220px] opacity-80" />
          <p className="mt-md font-editorial text-[24px] font-semibold leading-tight text-text">
            Đăng nhập để đặt hàng
          </p>
          <div className="mt-lg w-full max-w-[280px]">
            <Button label="Đăng nhập" onPress={() => navigate('/auth/sign-in')} />
          </div>
        </div>
      </Screen>
    );
  }
  if (cart.isPending) {
    return (
      <Screen>
        <AppHeader title="Thanh toán" back />
        <CheckoutSkeleton />
      </Screen>
    );
  }
  if (cart.isError) {
    return (
      <Screen>
        <AppHeader title="Thanh toán" back />
        <ErrorState message={errorMessage(cart.error)} onRetry={() => cart.refetch()} />
      </Screen>
    );
  }
  const items = cart.data?.items ?? [];
  if (!cart.data || items.length === 0) {
    return (
      <Screen>
        <AppHeader title="Thanh toán" back />
        <TrayMessage title="Giỏ hàng trống" />
      </Screen>
    );
  }

  const data = cart.data;
  if (data.pendingOrderId) {
    const pendingOrderId = data.pendingOrderId;
    return (
      <Screen width="narrow">
        <AppHeader title="Thanh toán" back />
        <div className="sb-pop relative mx-auto mt-md flex w-full max-w-[520px] flex-col items-center gap-sm rounded-[28px] bg-[#FFF3D1] px-lg pb-lg pt-xl text-center text-[#6B4100] ring-1 ring-[#6B4100]/20 dark:bg-[#3A2A08] dark:text-[#FFD27A]">
          <span
            aria-hidden="true"
            className="absolute -top-2 left-1/2 h-4 w-12 -translate-x-1/2 rounded-[4px] bg-[#FFB703]/70"
          />
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-card/80">
            <Icon name="clock-outline" size={30} color="currentColor" weight="fill" />
          </span>
          <p className="font-editorial text-[24px] font-semibold leading-tight">
            Bạn có một đơn đang chờ thanh toán
          </p>
          <p className="max-w-[40ch] text-body-md">
            Thanh toán hoặc huỷ đơn đó trước khi đặt đơn mới từ giỏ này.
          </p>
          <div className="mt-xs w-full max-w-[300px]">
            <Button
              label="Tiếp tục thanh toán"
              onPress={() => navigate(`/customer/orders/${pendingOrderId}/payment`)}
            />
          </div>
        </div>
      </Screen>
    );
  }

  const blocked =
    data.storefrontStatus !== 'OPEN' ||
    items.some((item) => item.availabilityStatus !== 'AVAILABLE');
  const reason = blocked
    ? checkoutBlockReason(
        data.storefrontStatus,
        items.map((item) => item.availabilityStatus),
      )
    : null;
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  const caption = `${count.toLocaleString('vi-VN')} món · ${data.storefrontName}`;

  // One button for the whole screen: in the board on a desktop, in the thumb bar on a phone.
  const submit = (
    <div className="flex w-full flex-col gap-xs">
      {reason ? <CheckoutBlockReason reason={reason} /> : null}
      {place.isError ? (
        <p
          role="alert"
          className="flex items-start gap-1.5 rounded-[12px] bg-[#FDEBEA] px-sm py-xs text-body-md font-medium text-[#B42318] dark:bg-[#3A1414] dark:text-[#FF9A90]"
        >
          <Icon
            name="alert-circle-outline"
            size={18}
            color="currentColor"
            className="mt-0.5 shrink-0"
          />
          <span className="text-error">{errorMessage(place.error)}</span>
        </p>
      ) : null}
      <Button
        label={place.isPending ? 'Đang khởi tạo thanh toán…' : 'Thanh toán và đặt món'}
        loading={place.isPending}
        disabled={place.isPending || blocked}
        onPress={startCheckout}
      />
      {/* The shared button draws only a spinner while loading, so the words go here. */}
      <p
        role="status"
        className="flex min-h-5 items-center justify-center gap-xs text-body-sm text-muted"
      >
        {place.isPending ? (
          <>
            <span
              aria-hidden="true"
              className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent"
            />
            Đang khởi tạo thanh toán…
          </>
        ) : null}
      </p>
    </div>
  );

  const lines = (
    <section aria-label="Các món" className="flex flex-col gap-sm">
      <p className="text-label text-text">Món của bạn</p>
      <ul className="flex flex-col divide-y divide-border">
        {items.map((item) => (
          <CheckoutLine
            key={item.cartItemId}
            title={`${item.quantity}× ${item.itemName}`}
            note={item.note}
            photos={dishPhotos(item.itemName, item.imageUrl)}
            amount={item.unitPrice * item.quantity}
          />
        ))}
      </ul>
    </section>
  );
  const providers = (
    <ProviderTiles value={provider} onChange={setProvider} disabled={place.isPending} />
  );
  const pickup = (
    <PickupPoint
      address={data.storefrontAddress || 'Địa chỉ điểm bán chưa được cập nhật'}
      tall={items.length === 1}
    />
  );

  return (
    <Screen footer={isDesktop ? undefined : <StickyActions>{submit}</StickyActions>}>
      <AppHeader title="Thanh toán" back subtitle={data.storefrontName} />
      <OfflineNotice message="Mất kết nối. Cần có mạng để thanh toán." />
      <div className={LAYOUT}>
        <div className="flex min-w-0 flex-col gap-lg rounded-[20px] bg-card p-md shadow-card ring-1 ring-border/80 md:p-lg">
          {isDesktop ? (
            <>
              {pickup}
              <hr className="border-border" />
              {lines}
              <hr className="border-border" />
              {providers}
            </>
          ) : (
            <>
              {providers}
              <hr className="border-border" />
              {lines}
              <hr className="border-border" />
              {pickup}
              <hr className="border-border" />
              <AfterPayNote provider={provider} amount={data.subtotal} />
              <p className="text-center text-body-sm text-muted">{FOOTNOTE}</p>
            </>
          )}
        </div>
        <div className="order-first lg:sticky lg:top-0 lg:order-none">
          <CheckoutBoard
            label="Tổng thanh toán"
            amount={data.subtotal}
            caption={caption}
            running={place.isPending}
            compact={!isDesktop}
          >
            {isDesktop ? (
              <>
                {submit}
                <AfterPayNote provider={provider} amount={data.subtotal} />
                <p className="border-t border-[#FFD9BF] pt-sm text-body-sm text-muted dark:border-white/10">
                  {FOOTNOTE}
                </p>
              </>
            ) : null}
          </CheckoutBoard>
        </div>
      </div>
    </Screen>
  );
}

function MockCheckoutScreen() {
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
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
        <TrayMessage title="Giỏ hàng trống" />
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

  const count = rows.reduce((sum, row) => sum + row.cartItem.quantity, 0);
  const submit = (
    <Button
      label={failed ? 'Thử lại thanh toán' : 'Thanh toán qua MoMo / ZaloPay'}
      variant={failed ? 'danger' : 'primary'}
      loading={processing}
      onPress={pay}
    />
  );

  return (
    <Screen footer={isDesktop ? undefined : <StickyActions>{submit}</StickyActions>}>
      <AppHeader title="Thanh toán" back subtitle={storefront.name} />
      <div className={LAYOUT}>
        <div className="flex min-w-0 flex-col gap-md rounded-[20px] bg-card p-md shadow-card ring-1 ring-border/80 md:p-lg">
          <ul className="flex flex-col divide-y divide-border">
            {rows.map((row) => (
              <CheckoutLine
                key={row.cartItem.menuItemId}
                title={`${row.cartItem.quantity}× ${row.menuItem.name}`}
                photos={dishPhotos(row.menuItem.name, row.menuItem.imageUri)}
                amount={row.menuItem.price * row.cartItem.quantity}
              />
            ))}
          </ul>
          {failed ? (
            <p className="flex items-start gap-1.5 rounded-[12px] bg-[#FDEBEA] px-sm py-xs text-body-md font-medium text-[#B42318] dark:bg-[#3A1414] dark:text-[#FF9A90]">
              <Icon
                name="alert-circle-outline"
                size={18}
                color="currentColor"
                className="mt-0.5 shrink-0"
              />
              Thanh toán thất bại. Vui lòng thử lại.
            </p>
          ) : null}
        </div>
        <div className="order-first lg:sticky lg:top-0 lg:order-none">
          <CheckoutBoard
            label="Tổng cộng"
            amount={total}
            caption={`${count.toLocaleString('vi-VN')} món · ${storefront.name}`}
            running={processing}
            compact={!isDesktop}
          >
            {isDesktop ? submit : null}
          </CheckoutBoard>
        </div>
      </div>
    </Screen>
  );
}
