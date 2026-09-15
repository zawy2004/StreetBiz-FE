import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Button } from '@/components/common';
import { TextField } from '@/components/forms';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { ErrorState, showToast } from '@/components/feedback';
import { colors, spacing } from '@/theme';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';

export function OrderReviewScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const order = useMockDb((s) => s.orders.find((o) => o.id === orderId));
  const addReview = useMockDb((s) => s.addReview);
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');

  if (!order || !user) return <ErrorState message="Không tìm thấy đơn hàng." />;

  return (
    <Screen
      footer={
        <StickyActions>
          <Button
            label="Gửi đánh giá"
            onPress={() => {
              addReview({
                orderId: order.id,
                customerId: user.id,
                storefrontId: order.storefrontId,
                rating,
                text,
              });
              showToast('Cảm ơn bạn đã đánh giá');
              router.back();
            }}
          />
        </StickyActions>
      }
    >
      <AppHeader title="Đánh giá đơn hàng" back subtitle={`#${order.order_code}`} />
      <View style={{ flexDirection: 'row', gap: spacing.xs, justifyContent: 'center' }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => setRating(n)} hitSlop={6}>
            <MaterialCommunityIcons
              name={n <= rating ? 'star' : 'star-outline'}
              size={32}
              color={colors.secondary}
            />
          </Pressable>
        ))}
      </View>
      <TextField
        label="Nhận xét"
        value={text}
        onChangeText={setText}
        multiline
        placeholder="Món ăn thế nào?"
      />
    </Screen>
  );
}
