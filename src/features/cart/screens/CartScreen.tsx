import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button, Card, IconButton, Money } from '@/components/common';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { EmptyState } from '@/components/feedback';
import { colors, spacing, typography } from '@/theme';
import { useMockDb } from '@/mocks/db';
import { useCartStore } from '../cart-store';

export function CartScreen() {
  const router = useRouter();
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
              onPress={() => router.push('/customer/checkout')}
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
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={[typography.headlineSm, { color: colors.text }]}>{menuItem.name}</Text>
                <Money amountVnd={menuItem.price} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <IconButton
                  icon="minus"
                  accessibilityLabel="Giảm số lượng"
                  onPress={() => updateQuantity(cartItem.menuItemId, cartItem.quantity - 1)}
                />
                <Text style={[typography.headlineSm, { color: colors.text }]}>
                  {cartItem.quantity}
                </Text>
                <IconButton
                  icon="plus"
                  accessibilityLabel="Tăng số lượng"
                  onPress={() => updateQuantity(cartItem.menuItemId, cartItem.quantity + 1)}
                />
              </View>
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}
