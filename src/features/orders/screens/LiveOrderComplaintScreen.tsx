import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { Button, Icon, Money } from '@/components/common';
import { ErrorState, showToast } from '@/components/feedback';
import { SelectField, TextField } from '@/components/forms';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { commerceApi, errorMessage } from '@/core/api';
import { FoodImage } from '@/features/buyer-discovery/components/FoodImage';
import { storefrontPhotos } from '@/features/buyer-discovery/food-photos';
import {
  ComplaintCase,
  ComplaintCaseFile,
  ComplaintSheet,
  ComplaintSkeleton,
  LengthCounter,
  RefundAmountMeter,
} from '../components/complaint/ComplaintParts';
import { OfflineNotice } from '../components/OrderShapes';
import { providerName, refundPresentation } from '../components/order-display';

const TYPE_HINT: Record<string, string> = {
  COMPLAINT: 'Báo món sai, thiếu, hoặc chất lượng không như mô tả.',
  REFUND_REQUEST: 'Xin hoàn lại một phần hoặc toàn bộ số tiền đã trả cho đơn.',
};

export function LiveOrderComplaintScreen() {
  const { orderId } = useParams();
  const cache = useQueryClient();
  const order = useQuery({
    queryKey: ['commerce', 'customer-order', orderId],
    queryFn: () => commerceApi.customerOrder(orderId!),
  });
  const complaints = useQuery({
    queryKey: ['commerce', 'complaints', orderId],
    queryFn: () => commerceApi.complaints(orderId!),
    refetchInterval: 10000,
  });
  const [type, setType] = useState('COMPLAINT');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const send = useMutation({
    mutationFn: () =>
      commerceApi.complain(Number(orderId), {
        complaintType: type,
        description: description.trim(),
        requestedRefundAmount: type === 'REFUND_REQUEST' ? Number(amount) : null,
      }),
    onSuccess: async () => {
      setDescription('');
      setAmount('');
      await cache.invalidateQueries({ queryKey: ['commerce', 'complaints', orderId] });
      showToast('Đã gửi khiếu nại tới quản trị viên');
    },
  });
  if (order.isPending || complaints.isPending) {
    return (
      <Screen>
        <AppHeader title="Khiếu nại đơn hàng" back />
        <ComplaintSkeleton />
      </Screen>
    );
  }
  if (order.isError || complaints.isError || !order.data)
    return (
      <Screen>
        <AppHeader title="Khiếu nại đơn hàng" back />
        <ErrorState
          message={errorMessage(order.error ?? complaints.error)}
          onRetry={() => {
            void order.refetch();
            void complaints.refetch();
          }}
        />
      </Screen>
    );
  const open = complaints.data.some((c) => c.status === 'OPEN' || c.status === 'UNDER_REVIEW');
  const eligible =
    order.data.paymentStatus === 'SUCCESS' &&
    !['PENDING_PAYMENT', 'PLACED'].includes(order.data.orderStatus);
  const validAmount =
    type !== 'REFUND_REQUEST' ||
    (Number.isSafeInteger(Number(amount)) &&
      Number(amount) > 0 &&
      Number(amount) <= order.data.totalAmount);

  const data = order.data;
  const photos = storefrontPhotos({
    storefrontId: data.storefrontId,
    storefrontName: data.storefrontName,
  });
  const dishes = data.items.map((item) => `${item.quantity}× ${item.itemName}`).join(' · ');
  const refund = data.refundStatus ? refundPresentation(data.refundStatus) : null;
  const gateway = providerName(data.paymentProvider);

  return (
    <Screen>
      <AppHeader title="Khiếu nại đơn hàng" back subtitle={`#${data.orderCode}`} />
      <OfflineNotice message="Mất kết nối. Yêu cầu chưa gửi được; kết quả sẽ cập nhật khi có mạng." />

      <section
        aria-label="Đơn đang phản ánh"
        className="flex flex-wrap items-center gap-sm rounded-[18px] bg-card px-md py-sm shadow-card ring-1 ring-border/80"
      >
        <span title={photos[0]?.illustrative ? 'Ảnh minh họa' : undefined}>
          <FoodImage
            photos={photos}
            icon="storefront-outline"
            iconSize={16}
            iconColor="rgb(var(--c-primary))"
            className="h-9 w-9 shrink-0 rounded-full"
            placeholderClassName="bg-tint-primary"
          />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-editorial text-[18px] font-semibold leading-6 text-text">
            {data.storefrontName}
          </p>
          <p className="truncate text-body-sm text-muted" title={dishes}>
            {dishes}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-xs">
          <Money amountVnd={data.totalAmount} className="whitespace-nowrap" />
          {gateway ? <span className="text-body-sm text-muted">{gateway}</span> : null}
          <StatusChip code={data.orderStatus} />
          {refund ? <StatusChip label={refund.label} tone={refund.tone} /> : null}
        </div>
      </section>

      <div className="grid items-start gap-lg lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px]">
        {eligible && !open ? (
          <ComplaintSheet orderCode={data.orderCode}>
            <div className="flex flex-col gap-xs [&_[role=radio]]:h-14 [&_[role=radio]]:rounded-[14px] [&_[role=radio]]:px-md">
              <SelectField
                label="Loại yêu cầu"
                value={type}
                onChange={setType}
                layout="inline"
                options={[
                  { value: 'COMPLAINT', label: 'Khiếu nại' },
                  { value: 'REFUND_REQUEST', label: 'Yêu cầu hoàn tiền' },
                ]}
              />
              <p className="text-body-sm text-muted">{TYPE_HINT[type]}</p>
            </div>
            <div className="flex flex-col gap-xs">
              <TextField
                label="Mô tả chi tiết"
                value={description}
                onChangeText={setDescription}
                multiline
                maxLength={1000}
                placeholder="Mô tả vấn đề bạn gặp phải..."
              />
              <div className="flex items-start justify-between gap-sm">
                <p className="text-body-sm text-muted">Nêu món nào, vấn đề gì, lúc mấy giờ.</p>
                <LengthCounter length={description.length} max={1000} />
              </div>
            </div>
            {type === 'REFUND_REQUEST' ? (
              <div className="sb-pop flex flex-col gap-xs">
                <TextField
                  label="Số tiền yêu cầu hoàn (đ)"
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="numeric"
                />
                <div className="flex items-center gap-sm">
                  <RefundAmountMeter amount={amount} max={data.totalAmount} />
                  <span className="shrink-0 text-body-sm text-muted">
                    Tối đa {data.totalAmount.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>
            ) : null}
            <Button
              label="Gửi khiếu nại"
              loading={send.isPending}
              disabled={!description.trim() || !validAmount || send.isPending}
              onPress={() => send.mutate()}
            />
            {send.isError ? (
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
                <span className="text-error">{errorMessage(send.error)}</span>
              </p>
            ) : null}
          </ComplaintSheet>
        ) : (
          <div
            className={`sb-pop flex items-start gap-sm rounded-[20px] p-md md:p-lg ${
              open
                ? 'bg-[#FFF3D1] text-[#6B4100] ring-1 ring-[#6B4100]/15 dark:bg-[#3A2A08] dark:text-[#FFD27A]'
                : 'bg-[#EEF1F4] text-[#2B3640] dark:bg-[#1D2833] dark:text-[#C5D0DA]'
            }`}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card/80">
              <Icon
                name={open ? 'clock-outline' : 'information-outline'}
                size={22}
                color="currentColor"
                weight={open ? 'fill' : 'regular'}
              />
            </span>
            <div className="min-w-0">
              <p className="text-[17px] font-semibold leading-7">
                {open
                  ? 'Khiếu nại đang được xử lý. Kết quả sẽ hiển thị tại đây.'
                  : 'Đơn hàng chưa đủ điều kiện gửi khiếu nại.'}
              </p>
              {!open ? (
                <div className="mt-xs">
                  <StatusChip code={data.orderStatus} />
                </div>
              ) : null}
            </div>
          </div>
        )}

        <ComplaintCaseFile empty={complaints.data.length === 0}>
          {complaints.data.map((c) => (
            <ComplaintCase key={c.complaintId} complaint={c} />
          ))}
        </ComplaintCaseFile>
      </div>
    </Screen>
  );
}
