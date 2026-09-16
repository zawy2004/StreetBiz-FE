import { useNavigate } from 'react-router-dom';

import { Button, Card, IconButton, Money } from '@/components/common';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { EmptyState } from '@/components/feedback';
import { useMockDb } from '@/mocks/db';
import { useCartStore } from '../cart-store';

export function CartScreen() {
  const navigate = useNavigate();
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const menuItems = useMockDb((s) => s.menuItems);
  const storefronts = useMockDb((s) => s.storefronts);

  const rows = items.flatMap((cartItem) => {
    const menuItem = menuItems.find((m) => m.id === cartItem.menuItemId);
    return menuItem ? [{ cartItem, menuItem }] : [];
  });

  const storefront = storefronts.find((st) => st.id === items[0]?.storefrontId);
  const total = rows.reduce((sum, r) => sum + r.menuItem.price * r.cartItem.quantity, 0);

  return (
    <Screen
      footer={
        rows.length > 0 ? (
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
