import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { Button, Card, Money } from '@/components/common';
import { ErrorState, LoadingState, showToast } from '@/components/feedback';
import { SelectField, TextField } from '@/components/forms';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { commerceApi, errorMessage } from '@/core/api';

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
  if (order.isPending || complaints.isPending) return <LoadingState />;
  if (order.isError || complaints.isError || !order.data)
    return (
      <ErrorState
        message={errorMessage(order.error ?? complaints.error)}
        onRetry={() => {
          void order.refetch();
          void complaints.refetch();
        }}
      />
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
  return (
    <Screen>
      <AppHeader title="Khiếu nại đơn hàng" back subtitle={`#${order.data.orderCode}`} />
      {eligible && !open ? (
        <Card>
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
          <TextField
            label="Mô tả chi tiết"
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={1000}
            placeholder="Mô tả vấn đề bạn gặp phải..."
          />
          {type === 'REFUND_REQUEST' ? (
            <TextField
              label="Số tiền yêu cầu hoàn (đ)"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
            />
          ) : null}
          <Button
            label="Gửi khiếu nại"
            loading={send.isPending}
            disabled={!description.trim() || !validAmount || send.isPending}
            onPress={() => send.mutate()}
          />
          {send.isError ? (
            <p role="alert" className="mt-sm text-error">
              {errorMessage(send.error)}
            </p>
          ) : null}
        </Card>
      ) : (
        <p className="text-muted">
          {open
            ? 'Khiếu nại đang được xử lý. Kết quả sẽ hiển thị tại đây.'
            : 'Đơn hàng chưa đủ điều kiện gửi khiếu nại.'}
        </p>
      )}
      {complaints.data.map((c) => (
        <Card key={c.complaintId}>
          <div className="flex items-center justify-between">
            <h2 className="text-headline-sm">
              {c.complaintType === 'REFUND_REQUEST' ? 'Yêu cầu hoàn tiền' : 'Khiếu nại'}
            </h2>
            <StatusChip code={c.status} />
          </div>
          <p className="my-sm">{c.description}</p>
          {c.requestedRefundAmount !== null ? <Money amountVnd={c.requestedRefundAmount} /> : null}
          {c.resolutionNotes ? (
            <p className="mt-sm text-muted">Phản hồi: {c.resolutionNotes}</p>
          ) : null}
          <p className="mt-sm text-body-sm text-muted">
            {new Date(c.createdAt).toLocaleString('vi-VN')}
          </p>
        </Card>
      ))}
    </Screen>
  );
}
