import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button, Card, Money } from '@/components/common';
import { TextField } from '@/components/forms';
import { AppHeader, Screen, Section } from '@/components/layout';
import { AiHint, StatusChip } from '@/components/status';
import { EmptyState, showToast } from '@/components/feedback';
import { env } from '@/core/config/env';
import { colors, spacing, typography } from '@/theme';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';

export function MenuScreen() {
  const user = useAuthStore((s) => s.user);
  const storefront = useMockDb((s) => s.storefronts.find((st) => st.vendorId === user?.vendorId));
  const menuItems = useMockDb((s) => s.menuItems).filter((m) => m.storefrontId === storefront?.id);
  const addMenuItem = useMockDb((s) => s.addMenuItem);
  const updateMenuItem = useMockDb((s) => s.updateMenuItem);
  const removeMenuItem = useMockDb((s) => s.removeMenuItem);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');

  if (!storefront) {
    return (
      <Screen>
        <AppHeader title="Thực đơn" back />
        <EmptyState icon="silverware-fork-knife" title="Cần tạo gian hàng trước" />
      </Screen>
    );
  }

  const submit = () => {
    const amount = Number(price);
    if (!name.trim() || !amount) return;
    addMenuItem({
      storefrontId: storefront.id,
      name,
      price: amount,
      description: '',
      categoryId: 'CAT-05',
      availability_status: 'AVAILABLE',
    });
    setName('');
    setPrice('');
    showToast('Đã thêm món');
  };

  return (
    <Screen>
      <AppHeader title="Thực đơn" back />
      {env.enableAiCompliance ? (
        <AiHint title="Gợi ý mô tả &amp; danh mục món">
          Thêm ảnh món ăn để hệ thống tự viết mô tả và đề xuất danh mục, giá tham khảo.
        </AiHint>
      ) : null}

      <Section title="Thêm món mới">
        <TextField label="Tên món" value={name} onChangeText={setName} />
        <TextField label="Giá (đ)" value={price} onChangeText={setPrice} keyboardType="numeric" />
        <Button label="Thêm vào thực đơn" onPress={submit} disabled={!name.trim() || !price} />
      </Section>

      <Section title={`Món hiện có (${menuItems.length})`}>
        {menuItems.length === 0 ? (
          <EmptyState icon="silverware-fork-knife" title="Chưa có món nào" />
        ) : (
          menuItems.map((item) => (
            <Card key={item.id}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={[typography.headlineSm, { color: colors.text }]}>{item.name}</Text>
                  <Money amountVnd={item.price} />
                </View>
                <StatusChip code={item.availability_status} />
              </View>
              <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Button
                    label={
                      item.availability_status === 'AVAILABLE'
                        ? 'Đánh dấu hết món'
                        : 'Còn hàng trở lại'
                    }
                    variant="outline"
                    onPress={() =>
                      updateMenuItem(item.id, {
                        availability_status:
                          item.availability_status === 'AVAILABLE' ? 'SOLD_OUT' : 'AVAILABLE',
                      })
                    }
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button label="Gỡ món" variant="ghost" onPress={() => removeMenuItem(item.id)} />
                </View>
              </View>
            </Card>
          ))
        )}
      </Section>
    </Screen>
  );
}
