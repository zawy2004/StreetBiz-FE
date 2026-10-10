import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Button, Icon } from '@/components/common';
import { TextField } from '@/components/forms';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { ErrorState, showToast } from '@/components/feedback';
import { StatusChip } from '@/components/status';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { commerceApi, errorMessage } from '@/core/api';
import { isLiveApi } from '@/core/config/env';
import { useIsDesktop } from '@/hooks/useBreakpoint';
import { menuItemPhotos, storefrontPhotos } from '@/features/buyer-discovery/food-photos';
import { formatOrderDate } from '../components/order-format';
import {
  CharCounter,
  DishPlate,
  OrderRecapStrip,
  RatingWord,
  ReviewSkeleton,
  StarRating,
} from '../components/review/ReviewParts';

export function OrderReviewScreen() {
  return isLiveApi ? <LiveOrderReviewScreen /> : <MockOrderReviewScreen />;
}

const MAX_TEXT = 1000;

function LiveOrderReviewScreen() {
  const cache = useQueryClient();
  const { orderId } = useParams();
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
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
  if (order.isPending || review.isPending) {
    return (
      <Screen width="narrow">
        <AppHeader title="Đánh giá đơn hàng" back />
        <div className="mx-auto w-full max-w-[560px]">
          <ReviewSkeleton />
        </div>
      </Screen>
    );
  }
  if (order.isError || review.isError)
    return (
      <Screen width="narrow">
        <AppHeader title="Đánh giá đơn hàng" back />
        <ErrorState
          message={errorMessage(order.error ?? review.error)}
          onRetry={() => {
            void order.refetch();
            void review.refetch();
          }}
        />
      </Screen>
    );

  const data = order.data;
  const completed = data.orderStatus === 'COMPLETED';
  const firstDish = data.items[0]?.itemName;
  const photos = [
    ...(firstDish ? menuItemPhotos({ itemName: firstDish }) : []),
    ...storefrontPhotos({ storefrontId: data.storefrontId, storefrontName: data.storefrontName }),
  ];
  const dishes = data.items.map((item) => `${item.quantity}× ${item.itemName}`).join(' · ');
  const recap = [
    `#${data.orderCode}`,
    dishes,
    data.completedAt ? `Hoàn tất lúc ${formatOrderDate(data.completedAt)}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const saveButton = (
    <Button
      label="Lưu đánh giá"
      loading={save.isPending}
      disabled={save.isPending}
      onPress={() => save.mutate()}
    />
  );

  return (
    <Screen
      width="narrow"
      footer={completed && !isDesktop ? <StickyActions>{saveButton}</StickyActions> : undefined}
    >
      <AppHeader title="Đánh giá đơn hàng" back subtitle={`#${data.orderCode}`} />
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-md">
        <div className="sb-rise">
          <DishPlate photos={photos} empty={!completed} />
        </div>
        <p className="text-center font-editorial text-[26px] font-semibold leading-tight text-text md:text-[32px]">
          {data.storefrontName}
        </p>
        <OrderRecapStrip title={recap}>{recap}</OrderRecapStrip>

        {!completed ? (
          <div className="flex flex-col items-center gap-sm rounded-[20px] bg-[#EEF1F4] px-md py-lg text-center text-[#2B3640] dark:bg-[#1D2833] dark:text-[#C5D0DA]">
            <Icon name="information-outline" size={26} color="currentColor" />
            <p className="text-[17px] font-semibold">Chỉ đánh giá đơn đã hoàn tất.</p>
            <StatusChip code={data.orderStatus} />
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2xs pt-xs">
              <StarRating value={currentRating} onChange={setRating} />
              <RatingWord value={currentRating} />
            </div>
            <div className="flex flex-col gap-xs">
              <TextField
                label="Nhận xét"
                value={currentText}
                onChangeText={setText}
                multiline
                maxLength={MAX_TEXT}
              />
              <div className="flex items-start justify-between gap-sm">
                <p className="text-body-sm text-muted">
                  {review.data ? 'Đang sửa đánh giá cũ. ' : ''}Bạn có thể sửa đánh giá này sau.
                </p>
                <CharCounter length={currentText.length} max={MAX_TEXT} />
              </div>
            </div>
            {save.isError ? (
              <p
                role="alert"
                className="flex items-start gap-1.5 rounded-[14px] bg-[#FDEBEA] px-sm py-xs text-body-md font-medium text-[#B42318] dark:bg-[#3A1414] dark:text-[#FF9A90]"
              >
                <Icon
                  name="alert-circle-outline"
                  size={18}
                  color="currentColor"
                  className="mt-0.5 shrink-0"
                />
                <span className="text-error">{errorMessage(save.error)}</span>
              </p>
            ) : null}
            {isDesktop ? saveButton : null}
          </>
        )}
      </div>
    </Screen>
  );
}

function MockOrderReviewScreen() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const order = useMockDb((s) => s.orders.find((o) => o.id === orderId));
  const storefront = useMockDb((s) => s.storefronts.find((row) => row.id === order?.storefrontId));
  const addReview = useMockDb((s) => s.addReview);
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');

  if (!order || !user) {
    return (
      <Screen width="narrow">
        <AppHeader title="Đánh giá đơn hàng" back />
        <ErrorState message="Không tìm thấy đơn hàng." />
      </Screen>
    );
  }
  const firstDish = order.items[0]?.name;

  return (
    <Screen
      width="narrow"
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
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-md">
        <DishPlate photos={firstDish ? menuItemPhotos({ itemName: firstDish }) : []} />
        {storefront ? (
          <p className="text-center font-editorial text-[26px] font-semibold leading-tight text-text">
            {storefront.name}
          </p>
        ) : null}
        <StarRating value={rating} onChange={setRating} labelled={false} />
        <RatingWord value={rating} />
        <TextField
          label="Nhận xét"
          value={text}
          onChangeText={setText}
          multiline
          placeholder="Món ăn thế nào?"
        />
      </div>
    </Screen>
  );
}
