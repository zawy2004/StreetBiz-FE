import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Button, Icon } from '@/components/common';
import { TextField } from '@/components/forms';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { ErrorState, showToast } from '@/components/feedback';
import { colors } from '@/theme';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { commerceApi, errorMessage } from '@/core/api';
import { isLiveApi } from '@/core/config/env';
import { LoadingState } from '@/components/feedback';

export function OrderReviewScreen() {
  return isLiveApi ? <LiveOrderReviewScreen /> : <MockOrderReviewScreen />;
}

function LiveOrderReviewScreen() {
  const cache = useQueryClient();
  const { orderId } = useParams();
  const navigate = useNavigate();
  const order = useQuery({
    queryKey: ['commerce', 'customer-order', orderId],
    queryFn: () => commerceApi.customerOrder(orderId!),
  });
  const review = useQuery({
    queryKey: ['commerce', 'review', orderId],
    queryFn: () => commerceApi.review(orderId!),
  });
  const [rating, setRating] = useState<number | null>(null);
  const [text, setText] = useState<string | null>(null);
  const currentRating = rating ?? review.data?.rating ?? 5;
  const currentText = text ?? review.data?.text ?? '';
  const save = useMutation({
    mutationFn: () => commerceApi.saveReview(Number(orderId), currentRating, currentText),
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: ['commerce', 'review', orderId] });
      showToast('Đã lưu đánh giá');
      navigate(`/customer/orders/${orderId}`, { replace: true });
    },
  });
  if (order.isPending || review.isPending) return <LoadingState />;
  if (order.isError || review.isError)
    return (
      <ErrorState
        message={errorMessage(order.error ?? review.error)}
        onRetry={() => {
          void order.refetch();
          void review.refetch();
        }}
      />
    );
  return (
    <Screen>
      <AppHeader title="Đánh giá đơn hàng" back subtitle={`#${order.data.orderCode}`} />
      {order.data.orderStatus !== 'COMPLETED' ? (
        <p>Chỉ đánh giá đơn đã hoàn tất.</p>
      ) : (
        <>
          <div className="flex justify-center gap-sm">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-label={`${n} sao`}
                aria-pressed={n === currentRating}
                onClick={() => setRating(n)}
              >
                <Icon
                  name={n <= currentRating ? 'star' : 'star-outline'}
                  size={32}
                  color={colors.secondary}
                />
              </button>
            ))}
          </div>
          <TextField
            label="Nhận xét"
            value={currentText}
            onChangeText={setText}
            multiline
            maxLength={1000}
          />
          <Button
            label="Lưu đánh giá"
            loading={save.isPending}
            disabled={save.isPending}
            onPress={() => save.mutate()}
          />
          {save.isError ? (
            <p role="alert" className="text-error">
              {errorMessage(save.error)}
            </p>
          ) : null}
        </>
      )}
    </Screen>
  );
}

function MockOrderReviewScreen() {
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
