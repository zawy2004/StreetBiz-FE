import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Button, Card, IconButton, Money } from '@/components/common';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { ErrorState, showToast } from '@/components/feedback';
import { useMockDb } from '@/mocks/db';
import { useCartStore } from '@/features/cart/cart-store';

export function ItemDetailScreen() {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const item = useMockDb((s) => s.menuItems.find((m) => m.id === itemId));
  const storefront = useMockDb((s) => s.storefronts.find((st) => st.id === item?.storefrontId));
  const addToCart = useCartStore((s) => s.add);
  const [qty, setQty] = useState(1);

  if (!item || !storefront) return <ErrorState message="Không tìm thấy món." />;

  const soldOut = item.availability_status === 'SOLD_OUT';

  return (
    <Screen
      footer={
        <StickyActions>
          <Button
            label={`Thêm vào giỏ · ${(item.price * qty).toLocaleString('vi-VN')} đ`}
            disabled={soldOut}
            onPress={() => {
              addToCart({ menuItemId: item.id, storefrontId: storefront.id, quantity: qty });
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
            onPress={() => setQty((q) => Math.max(1, q - 1))}
          />
          <span className="text-headline-lg text-text">{qty}</span>
          <IconButton
            icon="plus"
            accessibilityLabel="Tăng số lượng"
            onPress={() => setQty((q) => q + 1)}
          />
        </div>
      ) : null}
    </Screen>
  );
}
