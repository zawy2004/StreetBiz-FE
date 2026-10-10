import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';

import { Button, formatVnd, Icon } from '@/components/common';
import { showToast } from '@/components/feedback';
import { TextField } from '@/components/forms';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { DetailLoadError, PanelCard, Timeline } from '../components/AdminParts';
import { formatDateTime, waitText } from '../components/admin-format';
import {
  ComplaintSkeleton,
  DecisionSummary,
  RefundReceipt,
  ResolutionCard,
  type ReceiptLine,
} from '../components/ComplaintParts';
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

  // Display only: the brief wash on the amount field after "Điền mức tối đa", and the long-description toggle.
  const [flash, setFlash] = useState(false);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => setFlash(false), 400);
    return () => clearTimeout(timer);
  }, [flash]);

  if (complaint.isPending) return <ComplaintSkeleton />;
  if (complaint.isError || !complaint.data) {
    return (
      <Screen>
        <DetailLoadError
          message={
            complaint.error instanceof PlatformApiError
              ? complaint.error.message
              : 'Không tìm thấy khiếu nại.'
          }
          onRetry={() => complaint.refetch()}
        />
      </Screen>
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

  const isRefundRequest = data.complaintType === 'REFUND_REQUEST';
  const lines: ReceiptLine[] = [];
  if (data.paymentAmount != null) {
    lines.push({
      key: 'paid',
      label: `Thanh toán ${data.paymentProvider ?? ''}`,
      amount: data.paymentAmount,
    });
  }
  if (data.requestedRefundAmount != null) {
    lines.push({ key: 'requested', label: 'Số tiền yêu cầu', amount: data.requestedRefundAmount });
  }
  if (data.refundedAmount > 0) {
    lines.push({
      key: 'refunded',
      label: 'Đã/đang hoàn',
      note: data.latestRefundStatus,
      amount: data.refundedAmount,
    });
  }

  // What the bar will send, said before it is pressed (the same amount the request would carry).
  const summary = refundInvalid
    ? 'Số tiền chưa hợp lệ.'
    : `${refundNumber ? `Giải quyết: duyệt hoàn ${formatVnd(refundNumber)}.` : 'Giải quyết: không kèm hoàn tiền.'} Từ chối: không hoàn tiền.`;
  const longDescription = data.description.length > 500;
  const wait = waitText(data.createdAt);

  return (
    <Screen
      width="wide"
      footer={
        editable ? (
          <StickyActions>
            <div className="flex w-full flex-col gap-xs lg:!w-full lg:!flex-1 lg:flex-row lg:items-center lg:gap-md">
              <div className="min-w-0 lg:flex-1">
                <DecisionSummary text={summary} />
              </div>
              <div className="flex w-full gap-sm lg:w-auto">
                <div className="flex-1 lg:w-[200px] lg:flex-none">
                  <Button
                    label="Từ chối"
                    variant="outline"
                    loading={decide.isPending && decide.variables === 'REJECT'}
                    disabled={!notes.trim() || decide.isPending}
                    onPress={() => decide.mutate('REJECT')}
                  />
                </div>
                <div className="flex-1 lg:w-[200px] lg:flex-none">
                  <Button
                    label="Giải quyết"
                    variant="approve"
                    loading={decide.isPending && decide.variables === 'RESOLVE'}
                    disabled={!notes.trim() || refundInvalid || decide.isPending}
                    onPress={() => decide.mutate('RESOLVE')}
                  />
                </div>
              </div>
            </div>
          </StickyActions>
        ) : undefined
      }
    >
      <AppHeader
        title="Xử lý khiếu nại"
        back
        subtitle={data.orderCode}
        right={<StatusChip code={data.status} />}
      />

      <div className="grid items-start gap-lg xl:grid-cols-[minmax(0,1fr)_448px]">
        <div className="flex min-w-0 flex-col gap-md">
          <PanelCard label="Hồ sơ khiếu nại" className="flex flex-col gap-md p-md md:p-lg">
            <div className="flex flex-col gap-xs">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-[8px] bg-tint-primary px-2 py-1 text-body-sm font-semibold text-primary">
                <Icon
                  name={isRefundRequest ? 'cash-multiple' : 'chat-alert-outline'}
                  size={16}
                  color="currentColor"
                />
                {isRefundRequest ? 'Yêu cầu hoàn tiền' : 'Khiếu nại'}
              </span>
              <h2 className="text-[22px] font-bold leading-7 text-text">{data.storefrontName}</h2>
              <p
                className={`whitespace-pre-line break-words text-body-md text-muted ${longDescription && !expanded ? 'line-clamp-[10]' : ''}`}
              >
                {data.description}
              </p>
              {longDescription ? (
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() => setExpanded((v) => !v)}
                  className="inline-flex h-11 w-fit items-center rounded-[10px] px-xs text-label font-semibold text-primary hover:bg-tint-primary"
                >
                  {expanded ? 'Thu gọn' : 'Xem toàn bộ'}
                </button>
              ) : null}
            </div>

            <dl className="grid grid-cols-[auto_1fr] items-center gap-x-md gap-y-sm border-t border-border pt-md text-body-md">
              <dt className="text-muted">Khách hàng</dt>
              <dd className="min-w-0 text-right font-medium text-text sm:text-left">
                {data.customerName}
              </dd>
              <dt className="text-muted">Trạng thái đơn</dt>
              <dd className="flex justify-end sm:justify-start">
                <StatusChip code={data.orderStatus} />
              </dd>
            </dl>

            <div className="border-t border-border pt-md">
              <Timeline
                label="Diễn biến khiếu nại"
                steps={[
                  {
                    key: 'filed',
                    title: 'Gửi khiếu nại',
                    detail: (
                      <span className="font-sign font-tabular">
                        {formatDateTime(data.createdAt) ?? '—'}
                      </span>
                    ),
                  },
                  data.resolvedAt
                    ? {
                        key: 'resolved',
                        title: 'Đã xử lý',
                        detail: (
                          <>
                            <span className="block font-sign font-tabular">
                              {formatDateTime(data.resolvedAt)}
                            </span>
                            {data.resolvedByName ?? 'Platform Admin'}
                          </>
                        ),
                      }
                    : editable
                      ? {
                          key: 'waiting',
                          title: wait ? `Đang chờ, ${wait}` : 'Đang chờ',
                          waiting: true,
                        }
                      : { key: 'resolved', title: 'Đã xử lý' },
                ]}
              />
            </div>
          </PanelCard>

          {editable ? (
            <div className="flex flex-col gap-1">
              <TextField
                label="Ghi chú xử lý"
                value={notes}
                onChangeText={(value) => setNotes(value.slice(0, 1_000))}
                multiline
                helperText={`${notes.length}/1000 ký tự`}
                placeholder="Nêu kết quả xác minh và căn cứ quyết định..."
              />
              <span
                aria-hidden="true"
                className="ml-auto block h-1 w-full max-w-[240px] overflow-hidden rounded-full bg-sunken"
              >
                <span
                  className={`block h-full rounded-full transition-[width] duration-150 ${notes.length >= 900 ? 'bg-error' : 'bg-brand'}`}
                  style={{ width: `${(notes.length / 1000) * 100}%` }}
                />
              </span>
            </div>
          ) : data.resolutionNotes ? (
            <ResolutionCard
              status={data.status}
              notes={data.resolutionNotes}
              byline={
                data.resolvedAt
                  ? `${data.resolvedByName ?? 'Platform Admin'} · ${new Date(data.resolvedAt).toLocaleString('vi-VN')}`
                  : null
              }
            />
          ) : null}
        </div>

        <div className="flex w-full min-w-0 flex-col gap-md md:max-w-[520px] xl:sticky xl:top-0 xl:max-w-none">
          <RefundReceipt
            orderCode={data.orderCode}
            provider={data.paymentProvider}
            lines={lines}
            maximum={isRefundRequest ? maximumRefund : undefined}
            invalid={refundInvalid}
          >
            {editable && isRefundRequest ? (
              <div
                className={`flex flex-col gap-sm rounded-[14px] p-xs transition-colors duration-300 ${flash ? 'bg-tint-primary' : 'bg-transparent'}`}
              >
                <TextField
                  label="Số tiền hoàn được duyệt (không bắt buộc)"
                  value={refund}
                  onChangeText={(value) => setRefund(value.replace(/\D/g, '').slice(0, 18))}
                  keyboardType="number-pad"
                  helperText={`Tối đa ${maximumRefund.toLocaleString('vi-VN')}₫; để trống nếu không hoàn tiền`}
                  error={
                    refundInvalid ? 'Số tiền hoàn không hợp lệ hoặc vượt mức còn lại.' : undefined
                  }
                />
                {maximumRefund > 0 ? (
                  <button
                    type="button"
                    aria-label={`Điền mức tối đa ${formatVnd(maximumRefund)}`}
                    onClick={() => {
                      setRefund(String(maximumRefund));
                      setFlash(true);
                    }}
                    className="inline-flex h-11 w-full items-center justify-center gap-xs rounded-[10px] bg-card px-md text-label font-semibold text-primary ring-1 ring-inset ring-primary/35 transition-colors hover:bg-tint-primary sm:w-fit sm:self-end"
                  >
                    <Icon name="arrow-left" size={16} color="currentColor" className="rotate-90" />
                    Điền mức tối đa
                  </button>
                ) : null}
              </div>
            ) : null}
          </RefundReceipt>
        </div>
      </div>

      {editable && decide.error instanceof PlatformApiError ? (
        <p
          role="alert"
          className="sb-pop flex items-start gap-xs rounded-[12px] bg-[#FDEBEA] px-sm py-xs text-body-md font-medium text-[#8F1717] dark:bg-[#3A1414] dark:text-[#FF9A90]"
        >
          <Icon
            name="alert-circle-outline"
            size={18}
            color="currentColor"
            className="mt-0.5 shrink-0"
          />
          {decide.error.message}
        </p>
      ) : null}
    </Screen>
  );
}
