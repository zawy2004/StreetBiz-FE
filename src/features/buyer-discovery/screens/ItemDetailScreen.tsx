import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';

import { Button, Card, IconButton, Money } from '@/components/common';
import { ConfirmDialog, ErrorState, LoadingState, showToast } from '@/components/feedback';
import { TextField } from '@/components/forms';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { commerceApi, errorMessage } from '@/core/api';
import { isLiveApi } from '@/core/config/env';
import { useCartStore } from '@/features/cart/cart-store';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';

export function ItemDetailScreen() {
  return isLiveApi ? <LiveItemDetailScreen /> : <MockItemDetailScreen />;
}

function LiveItemDetailScreen() {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');
  const [confirmCartReplacement, setConfirmCartReplacement] = useState(false);
  const item = useQuery({
    queryKey: ['commerce', 'menu-item', itemId],
    queryFn: () => commerceApi.menuItem(itemId!),
    enabled: Boolean(itemId),
  });
  const add = useMutation({
    mutationFn: () => commerceApi.addCartItem(item.data!.menuItemId, quantity, note.trim()),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['commerce', 'cart'] });
      showToast('Đã thêm vào giỏ');
      navigate('/customer/explore/cart');
    },
  });
  const cart = useQuery({
    queryKey: ['commerce', 'cart'],
    queryFn: commerceApi.cart,
    enabled: user?.role_code === 'CUSTOMER',
  });

  if (item.isPending) return <LoadingState />;
  if (item.isError || !item.data) {
    return <ErrorState message={errorMessage(item.error)} onRetry={() => item.refetch()} />;
  }

  const soldOut = item.data.availabilityStatus !== 'AVAILABLE';
  return (
    <Screen
      footer={
        <StickyActions>
          <Button
            label={
              user
                ? `Thêm vào giỏ · ${(item.data.unitPrice * quantity).toLocaleString('vi-VN')} đ`
                : 'Đăng nhập để thêm vào giỏ'
            }
            disabled={
              soldOut || add.isPending || (user?.role_code === 'CUSTOMER' && cart.isPending)
            }
            loading={add.isPending}
            onPress={() =>
              user?.role_code === 'CUSTOMER'
                ? cart.data && cart.data.storefrontId !== item.data.storefrontId
                  ? setConfirmCartReplacement(true)
                  : add.mutate()
                : navigate('/auth/sign-in')
            }
          />
        </StickyActions>
      }
    >
      <AppHeader title={item.data.itemName} back subtitle={item.data.storefrontName} />
      <Card>
        <div className="flex items-center justify-between">
          <Money amountVnd={item.data.unitPrice} size="lg" />
          <StatusChip code={item.data.availabilityStatus} />
        </div>
        <p className="mt-sm text-body-md text-muted">{item.data.description}</p>
      </Card>
      <Button
        label="Xem quán"
        variant="outline"
        fullWidth={false}
        onPress={() => navigate(`/customer/explore/stores/${item.data.storefrontId}`)}
      />
      {!soldOut ? (
        <>
          <div className="mx-auto flex items-center gap-md">
            <IconButton
              icon="minus"
              accessibilityLabel="Giảm số lượng"
              onPress={() => setQuantity((value) => Math.max(1, value - 1))}
            />
            <span className="text-headline-lg text-text">{quantity}</span>
            <IconButton
              icon="plus"
              accessibilityLabel="Tăng số lượng"
              onPress={() => setQuantity((value) => Math.min(99, value + 1))}
            />
          </div>
          <TextField
            label="Ghi chú cho món (không bắt buộc)"
            value={note}
            onChangeText={(value) => setNote(value.slice(0, 300))}
            placeholder="VD: không ớt, ít đá..."
          />
        </>
      ) : null}
      {add.isError ? <p className="text-body-md text-error">{errorMessage(add.error)}</p> : null}
      {cart.isError ? <p className="text-body-md text-error">{errorMessage(cart.error)}</p> : null}
      <ConfirmDialog
        visible={confirmCartReplacement}
        title="Thay giỏ hàng hiện tại?"
        description={`Giỏ tại ${cart.data?.storefrontName ?? 'cửa hàng khác'} sẽ được thay bằng món từ ${item.data.storefrontName}.`}
        confirmLabel="Thay giỏ hàng"
        confirmVariant="danger"
        onConfirm={() => {
          setConfirmCartReplacement(false);
          add.mutate();
        }}
        onCancel={() => setConfirmCartReplacement(false)}
      />
    </Screen>
  );
}

function MockItemDetailScreen() {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const item = useMockDb((state) => state.menuItems.find((row) => row.id === itemId));
  const storefront = useMockDb((state) =>
    state.storefronts.find((row) => row.id === item?.storefrontId),
  );
  const addToCart = useCartStore((state) => state.add);
  const [quantity, setQuantity] = useState(1);
  if (!item || !storefront) return <ErrorState message="Không tìm thấy món." />;
  const soldOut = item.availability_status === 'SOLD_OUT';

  return (
    <Screen
      footer={
        <StickyActions>
          <Button
            label={`Thêm vào giỏ · ${(item.price * quantity).toLocaleString('vi-VN')} đ`}
            disabled={soldOut}
            onPress={() => {
              addToCart({ menuItemId: item.id, storefrontId: storefront.id, quantity });
              showToast('Đã thêm vào giỏ');
              navigate(-1);
            }}
          />
        </StickyActions>
      }
    >
      <AppHeader title={item.name} back subtitle={storefront.name} />
      <Card>
        <div className="flex items-center justify-between">
          <Money amountVnd={item.price} size="lg" />
          <StatusChip code={item.availability_status} />
        </div>
        <p className="mt-sm text-body-md text-muted">{item.description}</p>
      </Card>
      {!soldOut ? (
        <div className="mx-auto flex items-center gap-md">
          <IconButton
            icon="minus"
            accessibilityLabel="Giảm số lượng"
            onPress={() => setQuantity((value) => Math.max(1, value - 1))}
          />
          <span className="text-headline-lg text-text">{quantity}</span>
          <IconButton
            icon="plus"
            accessibilityLabel="Tăng số lượng"
            onPress={() => setQuantity((value) => value + 1)}
          />
        </div>
      ) : null}
    </Screen>
  );
}
