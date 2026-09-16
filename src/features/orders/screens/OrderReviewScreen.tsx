import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Button, Icon } from '@/components/common';
import { TextField } from '@/components/forms';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { ErrorState, showToast } from '@/components/feedback';
import { colors } from '@/theme';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';

export function OrderReviewScreen() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
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
              navigate(-1);
            }}
          />
        </StickyActions>
      }
    >
      <AppHeader title="Đánh giá đơn hàng" back subtitle={`#${order.order_code}`} />
      <div className="flex justify-center gap-xs">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => setRating(n)}>
            <Icon name={n <= rating ? 'star' : 'star-outline'} size={32} color={colors.secondary} />
          </button>
        ))}
      </div>
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
