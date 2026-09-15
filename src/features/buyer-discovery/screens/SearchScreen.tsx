import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Card, Money } from '@/components/common';
import { TextField } from '@/components/forms';
import { AppHeader, Screen } from '@/components/layout';
import { AiHint } from '@/components/status';
import { EmptyState } from '@/components/feedback';
import { env } from '@/core/config/env';
import { colors, typography } from '@/theme';
import { useMockDb } from '@/mocks/db';

export function SearchScreen() {
  const router = useRouter();
  const menuItems = useMockDb((s) => s.menuItems);
  const storefronts = useMockDb((s) => s.storefronts);
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return menuItems.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        storefronts
          .find((st) => st.id === item.storefrontId)
          ?.name.toLowerCase()
          .includes(q),
    );
  }, [query, menuItems, storefronts]);

  return (
    <Screen>
      <AppHeader title="Tìm kiếm" back />
      <TextField
        value={query}
        onChangeText={setQuery}
        placeholder="Tìm món ăn hoặc quán, VD: xôi gà giá rẻ"
        autoFocus
      />
      {env.enableAiCompliance && query.length > 3 ? (
        <AiHint title="Hiểu theo ngôn ngữ tự nhiên">
          Đang tìm theo từ khoá &ldquo;{query}&rdquo; — kết quả bao gồm cả tên món và tên quán liên
          quan.
        </AiHint>
      ) : null}
      {query && results.length === 0 ? (
        <EmptyState icon="magnify" title="Không tìm thấy kết quả" />
      ) : (
        results.map((item) => {
          const storefront = storefronts.find((st) => st.id === item.storefrontId);
          return (
            <Card key={item.id} onPress={() => router.push(`/customer/explore/items/${item.id}`)}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View>
                  <Text style={[typography.headlineSm, { color: colors.text }]}>{item.name}</Text>
                  <Text style={[typography.bodySm, { color: colors.muted }]}>
                    {storefront?.name}
                  </Text>
                </View>
                <Money amountVnd={item.price} />
              </View>
            </Card>
          );
        })
      )}
    </Screen>
  );
}
