import { useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button, Card, IconButton, Money } from '@/components/common';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { ErrorState, showToast } from '@/components/feedback';
import { colors, spacing, typography } from '@/theme';
import { useMockDb } from '@/mocks/db';
import { useCartStore } from '@/features/cart/cart-store';

export function ItemDetailScreen() {
  const { itemId } = useLocalSearchParams<{ itemId: string }>();
  const router = useRouter();
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
              router.back();
            }}
          />
        </StickyActions>
      }
    >
      <AppHeader title={item.name} back subtitle={storefront.name} />
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Money amountVnd={item.price} size="lg" />
          <StatusChip code={item.availability_status} />
        </View>
        <Text style={[typography.bodyMd, { color: colors.muted, marginTop: spacing.sm }]}>
          {item.description}
        </Text>
      </Card>

      {!soldOut ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            alignSelf: 'center',
          }}
        >
          <IconButton
            icon="minus"
            accessibilityLabel="Giảm số lượng"
            onPress={() => setQty((q) => Math.max(1, q - 1))}
          />
          <Text style={[typography.headlineLg, { color: colors.text }]}>{qty}</Text>
          <IconButton
            icon="plus"
            accessibilityLabel="Tăng số lượng"
            onPress={() => setQty((q) => q + 1)}
          />
        </View>
      ) : null}
    </Screen>
  );
}
