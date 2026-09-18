import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';

import { Button, Card, Divider, ListRow, Money } from '@/components/common';
import { ErrorState, LoadingState, showToast } from '@/components/feedback';
import { TextField } from '@/components/forms';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { PlatformConnection } from '../components/PlatformConnection';
import { platformApi, PlatformApiError } from '../platform-api';

export function OrderComplaintReviewScreen() {
  return (
    <PlatformConnection>
      <OrderComplaintReviewContent />
    </PlatformConnection>
  );
}

function OrderComplaintReviewContent() {
  const { complaintId } = useParams<{ complaintId: string }>();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState('');
  const [refund, setRefund] = useState('');
  const complaint = useQuery({
    queryKey: ['platform', 'order-complaints', complaintId],
    queryFn: () => platformApi.complaintDetail(complaintId!),
    enabled: Boolean(complaintId),
  });
  const decide = useMutation({
    mutationFn: (decision: 'RESOLVE' | 'REJECT') => {
      const amount = refund ? Number(refund) : undefined;
      return platformApi.decideComplaint(complaintId!, {
        decision,
        notes: notes.trim(),
        expectedStatus: complaint.data!.status,
        approvedRefundAmount: decision === 'RESOLVE' && amount ? amount : undefined,
      });
    },
    onSuccess: async (_, decision) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['platform', 'order-complaints'] }),
        queryClient.invalidateQueries({
          queryKey: ['platform', 'order-complaints', complaintId],
        }),
      ]);
      showToast(decision === 'RESOLVE' ? 'Đã giải quyết khiếu nại' : 'Đã từ chối khiếu nại');
    },
  });

  if (complaint.isPending) return <LoadingState />;
  if (complaint.isError || !complaint.data) {
    return (
      <ErrorState
        message={
          complaint.error instanceof PlatformApiError
            ? complaint.error.message
            : 'Không tìm thấy khiếu nại.'
        }
        onRetry={() => complaint.refetch()}
      />
    );
  }

  const data = complaint.data;
  const editable = data.status === 'OPEN' || data.status === 'UNDER_REVIEW';
  const requestedRemaining = Math.max(0, (data.requestedRefundAmount ?? 0) - data.refundedAmount);
  const paidRemaining = Math.max(0, (data.paymentAmount ?? 0) - data.refundedAmount);
  const maximumRefund = Math.min(requestedRemaining, paidRemaining);
  const refundNumber = refund ? Number(refund) : undefined;
  const refundInvalid =
    refundNumber !== undefined &&
    (!Number.isSafeInteger(refundNumber) || refundNumber <= 0 || refundNumber > maximumRefund);

  return (
    <Screen
      footer={
        editable ? (
          <StickyActions>
            <div className="flex w-full gap-sm">
              <div className="flex-1">
                <Button
                  label="Từ chối"
                  variant="outline"
                  loading={decide.isPending && decide.variables === 'REJECT'}
                  disabled={!notes.trim() || decide.isPending}
                  onPress={() => decide.mutate('REJECT')}
                />
              </div>
              <div className="flex-1">
                <Button
                  label="Giải quyết"
                  variant="approve"
                  loading={decide.isPending && decide.variables === 'RESOLVE'}
                  disabled={!notes.trim() || refundInvalid || decide.isPending}
                  onPress={() => decide.mutate('RESOLVE')}
                />
              </div>
            </div>
          </StickyActions>
        ) : undefined
      }
    >
      <AppHeader title="Xử lý khiếu nại" back subtitle={data.orderCode} />
      <Card>
        <div className="flex items-start justify-between gap-sm">
          <div>
            <span className="text-body-sm text-muted">
              {data.complaintType === 'REFUND_REQUEST' ? 'Yêu cầu hoàn tiền' : 'Khiếu nại'}
            </span>
            <h2 className="text-headline-md text-text">{data.storefrontName}</h2>
          </div>
          <StatusChip code={data.status} />
        </div>
        <p className="mt-sm text-body-md text-muted">{data.description}</p>
      </Card>
      <Card padded={false}>
        <div className="px-md">
          <ListRow title="Khách hàng" subtitle={data.customerName} />
          <Divider />
          <ListRow title="Trạng thái đơn" trailing={<StatusChip code={data.orderStatus} />} />
          {data.paymentAmount != null ? (
            <>
              <Divider />
              <ListRow
                title={`Thanh toán ${data.paymentProvider ?? ''}`}
                trailing={<Money amountVnd={data.paymentAmount} />}
              />
            </>
          ) : null}
          {data.requestedRefundAmount != null ? (
            <>
              <Divider />
              <ListRow
                title="Số tiền yêu cầu"
                trailing={<Money amountVnd={data.requestedRefundAmount} />}
              />
            </>
          ) : null}
          {data.refundedAmount > 0 ? (
            <>
              <Divider />
              <ListRow
                title="Đã/đang hoàn"
                subtitle={data.latestRefundStatus ?? undefined}
                trailing={<Money amountVnd={data.refundedAmount} />}
              />
            </>
          ) : null}
        </div>
      </Card>
      {editable ? (
        <>
          <TextField
            label="Ghi chú xử lý"
            value={notes}
            onChangeText={(value) => setNotes(value.slice(0, 1_000))}
            multiline
            helperText={`${notes.length}/1000 ký tự`}
            placeholder="Nêu kết quả xác minh và căn cứ quyết định..."
          />
          {data.complaintType === 'REFUND_REQUEST' ? (
            <TextField
              label="Số tiền hoàn được duyệt (không bắt buộc)"
              value={refund}
              onChangeText={(value) => setRefund(value.replace(/\D/g, '').slice(0, 18))}
              keyboardType="number-pad"
              helperText={`Tối đa ${maximumRefund.toLocaleString('vi-VN')}₫; để trống nếu không hoàn tiền`}
              error={refundInvalid ? 'Số tiền hoàn không hợp lệ hoặc vượt mức còn lại.' : undefined}
            />
          ) : null}
          {decide.error instanceof PlatformApiError ? (
            <p role="alert" className="text-body-md text-error">
              {decide.error.message}
            </p>
          ) : null}
        </>
      ) : data.resolutionNotes ? (
        <Card>
          <span className="text-label text-text">Kết quả xử lý</span>
          <p className="mt-1 text-body-md text-muted">{data.resolutionNotes}</p>
          {data.resolvedAt ? (
            <p className="mt-1 text-body-sm text-muted">
              {data.resolvedByName ?? 'Platform Admin'} ·{' '}
              {new Date(data.resolvedAt).toLocaleString('vi-VN')}
            </p>
          ) : null}
        </Card>
      ) : null}
    </Screen>
  );
}
