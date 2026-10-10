import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { Button, Icon } from '@/components/common';
import { ConfirmDialog, ErrorState, showToast } from '@/components/feedback';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { commerceApi, errorMessage } from '@/core/api';
import { isLiveApi } from '@/core/config/env';
import { useIsDesktop } from '@/hooks/useBreakpoint';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';
import { OfflineNotice } from '@/features/orders/components/OrderShapes';
import { useCartStore } from '../cart-store';
import {
  CartLine,
  CartLockNotice,
  CartSkeleton,
  CartSummary,
  CartTray,
  CheckoutBlockReason,
  QtyStepper,
  TrayMessage,
} from '../components/CartParts';
import { cartLineNameId, checkoutBlockReason, dishPhotos } from '../components/cart-display';

export function CartScreen() {
  return isLiveApi ? <LiveCartScreen /> : <MockCartScreen />;
}

/** Two columns once the slip has room beside the dishes (≥ 1024px). */
const LAYOUT =
  'grid items-start gap-lg lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px]';

function LiveCartScreen() {
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [confirmClear, setConfirmClear] = useState(false);
  const cart = useQuery({
    queryKey: ['commerce', 'cart'],
    queryFn: commerceApi.cart,
    enabled: user?.role_code === 'CUSTOMER',
  });
  const update = useMutation({
    mutationFn: ({
      menuItemId,
      quantity,
      note,
    }: {
      menuItemId: number;
      quantity: number;
      note: string | null;
    }) =>
      quantity > 0
        ? commerceApi.updateCartItem(menuItemId, quantity, note)
        : commerceApi.removeCartItem(menuItemId),
    onSuccess: (next) => queryClient.setQueryData(['commerce', 'cart'], next),
  });
  const clear = useMutation({
    mutationFn: commerceApi.clearCart,
    onSuccess: () => {
      setConfirmClear(false);
      queryClient.setQueryData(['commerce', 'cart'], null);
      showToast('Đã xoá giỏ hàng');
    },
  });

  if (user?.role_code !== 'CUSTOMER') {
    return (
      <Screen>
        <AppHeader title="Giỏ hàng" back />
        <TrayMessage
          title="Đăng nhập bằng tài khoản người mua"
          description="Giỏ hàng gắn với tài khoản, để món bạn chọn vẫn còn khi quay lại."
          action={<Button label="Đăng nhập" onPress={() => navigate('/auth/sign-in')} />}
        />
      </Screen>
    );
  }
  if (cart.isPending) {
    return (
      <Screen>
        <AppHeader title="Giỏ hàng" back />
        <CartSkeleton />
      </Screen>
    );
  }
  if (cart.isError) {
    return (
      <Screen>
        <AppHeader title="Giỏ hàng" back />
        <ErrorState message={errorMessage(cart.error)} onRetry={() => cart.refetch()} />
      </Screen>
    );
  }

  const data = cart.data;
  const items = data?.items ?? [];
  // An order from this cart is awaiting payment: the backend refuses every edit until
  // it is paid or cancelled, so say so and offer the way out instead of failing on tap.
  const pendingOrderId = data?.pendingOrderId ?? null;
  const locked = pendingOrderId !== null;
  const canCheckout =
    !locked &&
    data?.storefrontStatus === 'OPEN' &&
    items.length > 0 &&
    items.every((item) => item.availabilityStatus === 'AVAILABLE');
  const blockReason = locked
    ? null
    : checkoutBlockReason(
        data?.storefrontStatus,
        items.map((item) => item.availabilityStatus),
      );
  const count = items.reduce((sum, item) => sum + item.quantity, 0);

  // Rendered once, in the slip on a desktop and in the thumb bar on a phone.
  const action = locked ? (
    <Button
      label="Tiếp tục thanh toán đơn đang chờ"
      onPress={() => navigate(`/customer/orders/${pendingOrderId}/payment`)}
    />
  ) : (
    <Button
      label={`Thanh toán · ${(data?.subtotal ?? 0).toLocaleString('vi-VN')} đ`}
      disabled={!canCheckout || update.isPending}
      onPress={() => navigate('/customer/checkout')}
    />
  );
  const reason = blockReason ? <CheckoutBlockReason reason={blockReason} /> : null;

  return (
    <Screen
      footer={
        items.length && !isDesktop ? (
          <StickyActions>
            <div className="flex w-full flex-col gap-xs">
              {reason}
              <div className="flex items-baseline justify-between text-body-md text-muted">
                <span>{count.toLocaleString('vi-VN')} món · Tạm tính</span>
                <span className="font-sign text-[17px] font-bold tabular-nums text-text">
                  {(data?.subtotal ?? 0).toLocaleString('vi-VN')} đ
                </span>
              </div>
              {action}
            </div>
          </StickyActions>
        ) : undefined
      }
    >
      <AppHeader title="Giỏ hàng" back />
      <OfflineNotice message="Mất kết nối. Đổi số lượng và thanh toán cần có mạng." />
      {items.length === 0 || !data ? (
        <TrayMessage
          title="Giỏ hàng trống"
          description="Chọn món ở trang Khám phá rồi quay lại đây."
          action={
            <Button
              label="Khám phá quán"
              variant="outline"
              onPress={() => navigate('/customer/explore')}
            />
          }
        />
      ) : (
        <>
          <div className="sb-rise">
            <CartTray
              dishes={items.map((item) => ({
                key: String(item.cartItemId),
                name: item.itemName,
                photos: dishPhotos(item.itemName, item.imageUrl),
              }))}
              storefrontName={data.storefrontName}
              storefrontStatus={data.storefrontStatus}
              count={count}
              address={data.storefrontAddress}
            />
          </div>
          {locked ? <CartLockNotice /> : null}
          <div className={LAYOUT}>
            <section
              aria-label="Các món trong giỏ"
              className="min-w-0 rounded-[20px] bg-card p-md shadow-card ring-1 ring-border/80 md:p-lg"
            >
              <ul className="flex flex-col divide-y divide-border">
                {items.map((item) => {
                  const id = String(item.cartItemId);
                  return (
                    <CartLine
                      key={item.cartItemId}
                      id={id}
                      name={item.itemName}
                      photos={dishPhotos(item.itemName, item.imageUrl)}
                      unitPrice={item.unitPrice}
                      quantity={item.quantity}
                      note={item.note}
                      unavailable={item.availabilityStatus !== 'AVAILABLE'}
                      stepper={
                        <QtyStepper
                          quantity={item.quantity}
                          describedBy={cartLineNameId(id)}
                          busy={
                            update.isPending && update.variables?.menuItemId === item.menuItemId
                          }
                          decreaseDisabled={locked || update.isPending}
                          increaseDisabled={locked || update.isPending || item.quantity >= 99}
                          onDecrease={() =>
                            update.mutate({
                              menuItemId: item.menuItemId,
                              quantity: item.quantity - 1,
                              note: item.note,
                            })
                          }
                          onIncrease={() =>
                            update.mutate({
                              menuItemId: item.menuItemId,
                              quantity: item.quantity + 1,
                              note: item.note,
                            })
                          }
                        />
                      }
                    />
                  );
                })}
              </ul>
              {update.isError ? (
                <p className="mt-md text-body-md text-error">{errorMessage(update.error)}</p>
              ) : null}
              {clear.isError ? (
                <p className="mt-md text-body-md text-error">{errorMessage(clear.error)}</p>
              ) : null}
              <div className="mt-md flex flex-wrap items-center justify-between gap-sm border-t border-border pt-md">
                <button
                  type="button"
                  onClick={() => navigate(`/customer/explore/stores/${data.storefrontId}`)}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-sm text-label text-primary transition-colors hover:bg-tint-primary"
                >
                  <Icon name="plus-circle-outline" size={18} color="currentColor" />
                  Thêm món từ quán này
                </button>
                {!locked ? (
                  <div className="[&>button]:text-error [&>button]:hover:bg-tint-error">
                    <Button
                      label="Xoá toàn bộ giỏ hàng"
                      variant="ghost"
                      fullWidth={false}
                      size="sm"
                      loading={clear.isPending}
                      disabled={update.isPending}
                      onPress={() => setConfirmClear(true)}
                    />
                  </div>
                ) : null}
              </div>
            </section>
            {isDesktop ? (
              <aside aria-label="Phiếu tạm tính" className="sticky top-0">
                <CartSummary count={count} subtotal={data.subtotal}>
                  {reason}
                  {action}
                </CartSummary>
              </aside>
            ) : null}
          </div>
        </>
      )}
      <ConfirmDialog
        visible={confirmClear}
        title="Xoá toàn bộ giỏ hàng?"
        description="Tất cả món và ghi chú trong giỏ hiện tại sẽ bị xoá."
        confirmLabel="Xoá giỏ hàng"
        confirmVariant="danger"
        onConfirm={() => clear.mutate()}
        onCancel={() => setConfirmClear(false)}
      />
    </Screen>
  );
}

function MockCartScreen() {
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const items = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const menuItems = useMockDb((state) => state.menuItems);
  const storefronts = useMockDb((state) => state.storefronts);
  const rows = items.flatMap((cartItem) => {
    const menuItem = menuItems.find((item) => item.id === cartItem.menuItemId);
    return menuItem ? [{ cartItem, menuItem }] : [];
  });
  const storefront = storefronts.find((row) => row.id === items[0]?.storefrontId);
  const total = rows.reduce((sum, row) => sum + row.menuItem.price * row.cartItem.quantity, 0);
  const count = rows.reduce((sum, row) => sum + row.cartItem.quantity, 0);
  const action = (
    <Button
      label={`Thanh toán · ${total.toLocaleString('vi-VN')} đ`}
      onPress={() => navigate('/customer/checkout')}
    />
  );

  return (
    <Screen
      footer={rows.length && !isDesktop ? <StickyActions>{action}</StickyActions> : undefined}
    >
      <AppHeader title="Giỏ hàng" back subtitle={storefront?.name} />
      {rows.length === 0 ? (
        <TrayMessage title="Giỏ hàng trống" />
      ) : (
        <>
          <div className="sb-rise">
            <CartTray
              dishes={rows.map(({ cartItem, menuItem }) => ({
                key: cartItem.menuItemId,
                name: menuItem.name,
                photos: dishPhotos(menuItem.name, menuItem.imageUri),
              }))}
              storefrontName={storefront?.name ?? ''}
              storefrontStatus={storefront?.availability_status}
              count={count}
            />
          </div>
          <div className={LAYOUT}>
            <section
              aria-label="Các món trong giỏ"
              className="min-w-0 rounded-[20px] bg-card p-md shadow-card ring-1 ring-border/80 md:p-lg"
            >
              <ul className="flex flex-col divide-y divide-border">
                {rows.map(({ cartItem, menuItem }) => (
                  <CartLine
                    key={cartItem.menuItemId}
                    id={cartItem.menuItemId}
                    name={menuItem.name}
                    photos={dishPhotos(menuItem.name, menuItem.imageUri)}
                    unitPrice={menuItem.price}
                    quantity={cartItem.quantity}
                    note={cartItem.note}
                    stepper={
                      <QtyStepper
                        quantity={cartItem.quantity}
                        describedBy={cartLineNameId(cartItem.menuItemId)}
                        onDecrease={() =>
                          updateQuantity(cartItem.menuItemId, cartItem.quantity - 1)
                        }
                        onIncrease={() =>
                          updateQuantity(cartItem.menuItemId, cartItem.quantity + 1)
                        }
                      />
                    }
                  />
                ))}
              </ul>
            </section>
            {isDesktop ? (
              <aside aria-label="Phiếu tạm tính" className="sticky top-0">
                <CartSummary count={count} subtotal={total}>
                  {action}
                </CartSummary>
              </aside>
            ) : null}
          </div>
        </>
      )}
    </Screen>
  );
}
