import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { Button, Card, IconButton, Money } from '@/components/common';
import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  LoadingState,
  showToast,
} from '@/components/feedback';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { commerceApi, errorMessage } from '@/core/api';
import { isLiveApi } from '@/core/config/env';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';
import { useCartStore } from '../cart-store';

export function CartScreen() {
  return isLiveApi ? <LiveCartScreen /> : <MockCartScreen />;
}

function LiveCartScreen() {
  const navigate = useNavigate();
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
        <EmptyState
          icon="login"
          title="Đăng nhập bằng tài khoản người mua"
          action={<Button label="Đăng nhập" onPress={() => navigate('/auth/sign-in')} />}
        />
      </Screen>
    );
  }
  if (cart.isPending) return <LoadingState />;
  if (cart.isError) {
    return <ErrorState message={errorMessage(cart.error)} onRetry={() => cart.refetch()} />;
  }

  const data = cart.data;
  const items = data?.items ?? [];
  const canCheckout =
    data?.storefrontStatus === 'OPEN' &&
    items.length > 0 &&
    items.every((item) => item.availabilityStatus === 'AVAILABLE');
  return (
    <Screen
      footer={
        items.length ? (
          <StickyActions>
            <Button
              label={`Thanh toán · ${(data?.subtotal ?? 0).toLocaleString('vi-VN')} đ`}
              disabled={!canCheckout || update.isPending}
              onPress={() => navigate('/customer/checkout')}
            />
          </StickyActions>
        ) : undefined
      }
    >
      <AppHeader title="Giỏ hàng" back subtitle={data?.storefrontName} />
      {items.length === 0 ? (
        <EmptyState icon="cart-outline" title="Giỏ hàng trống" />
      ) : (
        items.map((item) => (
          <Card key={item.cartItemId}>
            <div className="flex items-center justify-between gap-sm">
              <div className="min-w-0 flex-1">
                <p className="text-headline-sm text-text">{item.itemName}</p>
                <Money amountVnd={item.unitPrice} />
                {item.note ? <p className="text-body-sm text-muted">{item.note}</p> : null}
                {item.availabilityStatus !== 'AVAILABLE' ? (
                  <p className="text-body-sm text-error">Món hiện không còn bán.</p>
                ) : null}
              </div>
              <div className="flex items-center gap-sm">
                <IconButton
                  icon="minus"
                  accessibilityLabel="Giảm số lượng"
                  disabled={update.isPending}
                  onPress={() =>
                    update.mutate({
                      menuItemId: item.menuItemId,
                      quantity: item.quantity - 1,
                      note: item.note,
                    })
                  }
                />
                <span className="text-headline-sm text-text">{item.quantity}</span>
                <IconButton
                  icon="plus"
                  accessibilityLabel="Tăng số lượng"
                  disabled={update.isPending || item.quantity >= 99}
                  onPress={() =>
                    update.mutate({
                      menuItemId: item.menuItemId,
                      quantity: item.quantity + 1,
                      note: item.note,
                    })
                  }
                />
              </div>
            </div>
          </Card>
        ))
      )}
      {items.length ? (
        <Button
          label="Xoá toàn bộ giỏ hàng"
          variant="ghost"
          loading={clear.isPending}
          disabled={update.isPending}
          onPress={() => setConfirmClear(true)}
        />
      ) : null}
      {update.isError ? (
        <p className="text-body-md text-error">{errorMessage(update.error)}</p>
      ) : null}
      {clear.isError ? (
        <p className="text-body-md text-error">{errorMessage(clear.error)}</p>
      ) : null}
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

  return (
    <Screen
      footer={
        rows.length ? (
          <StickyActions>
            <Button
              label={`Thanh toán · ${total.toLocaleString('vi-VN')} đ`}
              onPress={() => navigate('/customer/checkout')}
            />
          </StickyActions>
        ) : undefined
      }
    >
      <AppHeader title="Giỏ hàng" back subtitle={storefront?.name} />
      {rows.length === 0 ? (
        <EmptyState icon="cart-outline" title="Giỏ hàng trống" />
      ) : (
        rows.map(({ cartItem, menuItem }) => (
          <Card key={cartItem.menuItemId}>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-headline-sm text-text">{menuItem.name}</p>
                <Money amountVnd={menuItem.price} />
              </div>
              <div className="flex items-center gap-sm">
                <IconButton
                  icon="minus"
                  accessibilityLabel="Giảm số lượng"
                  onPress={() => updateQuantity(cartItem.menuItemId, cartItem.quantity - 1)}
                />
                <span className="text-headline-sm text-text">{cartItem.quantity}</span>
                <IconButton
                  icon="plus"
                  accessibilityLabel="Tăng số lượng"
                  onPress={() => updateQuantity(cartItem.menuItemId, cartItem.quantity + 1)}
                />
              </div>
            </div>
          </Card>
        ))
      )}
    </Screen>
  );
}
