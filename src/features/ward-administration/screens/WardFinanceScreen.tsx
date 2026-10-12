import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button, formatVnd, Icon } from '@/components/common';
import { showToast } from '@/components/feedback';
import { SegmentedControl, TextField } from '@/components/forms';
import { AppHeader, Screen, Section } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { useAuthStore } from '@/store/auth-store';
import { DateInput, MoneyInput } from '../components/ConfigFields';
import { WardGate } from '../components/WardGate';
import {
  wardFinanceApi,
  type OfflineMethod,
  type WardFeeItem,
  type WardFinanceContractDetail,
  type WardPenaltyItem,
} from '../ward-finance-api';
import { errorMessage, formatDateVn } from '../ward-config-api';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Chưa đến hạn',
  OVERDUE: 'Quá hạn',
  PAID: 'Đã nộp',
  CANCELLED: 'Đã miễn',
  UNPAID: 'Chưa nộp',
  WAIVED: 'Đã miễn',
};

function StatusPill({ status }: { status: string }) {
  const tone =
    status === 'PAID' ? 'ok' : status === 'OVERDUE' ? 'danger' : status === 'PENDING' || status === 'UNPAID' ? 'pending' : 'neutral';
  return <StatusChip label={STATUS_LABEL[status] ?? status} tone={tone} />;
}

const METHOD_OPTIONS: { value: OfflineMethod; label: string }[] = [
  { value: 'CASH', label: 'Tiền mặt' },
  { value: 'BANK_TRANSFER', label: 'Chuyển khoản' },
];

/** One reason box + confirm, used under whichever action the officer opened. */
function ActionPanel({
  title,
  children,
  confirmLabel,
  disabled,
  pending,
  onConfirm,
  onCancel,
}: {
  title: string;
  children: React.ReactNode;
  confirmLabel: string;
  disabled: boolean;
  pending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      role="group"
      aria-label={title}
      className="mt-sm flex flex-col gap-sm rounded-[16px] border border-border bg-bg/60 p-sm md:p-md"
    >
      <p className="text-label font-semibold text-text">{title}</p>
      {children}
      <div className="flex flex-wrap justify-end gap-xs">
        <Button label="Huỷ" variant="ghost" fullWidth={false} onPress={onCancel} />
        <Button
          label={confirmLabel}
          fullWidth={false}
          loading={pending}
          disabled={disabled}
          onPress={onConfirm}
        />
      </div>
    </div>
  );
}

type Open =
  | { kind: 'ADJUST' | 'WAIVE' | 'PAY'; target: 'FEE'; id: number }
  | { kind: 'WAIVE' | 'PAY'; target: 'PENALTY'; id: number }
  | { kind: 'REFUND' }
  | { kind: 'SLOT_PRICE' }
  | null;

function ContractDetail({ contractId }: { contractId: number }) {
  const navigate = useNavigate();
  const client = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const key = ['ward', userId, 'finance', 'contract', contractId];
  const detail = useQuery({ queryKey: key, queryFn: () => wardFinanceApi.getContract(contractId) });
  const [open, setOpen] = useState<Open>(null);

  const [amount, setAmount] = useState<number | null>(null);
  const [dueDate, setDueDate] = useState('');
  const [reason, setReason] = useState('');
  const [method, setMethod] = useState<OfflineMethod>('CASH');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');

  const close = () => {
    setOpen(null);
    setAmount(null);
    setDueDate('');
    setReason('');
    setReference('');
    setNote('');
    setMethod('CASH');
  };

  const done = {
    onSuccess: (result: { message: string }) => {
      showToast(result.message);
      void client.invalidateQueries({ queryKey: ['ward', userId, 'finance'] });
      close();
    },
    onError: (error: unknown) => showToast(errorMessage(error)),
  };

  const adjust = useMutation({
    mutationFn: (id: number) =>
      wardFinanceApi.adjustFeeItem(id, {
        newAmount: amount,
        newDueDate: dueDate || null,
        reason: reason.trim(),
      }),
    ...done,
  });
  const waiveFee = useMutation({
    mutationFn: (id: number) => wardFinanceApi.waiveFeeItem(id, reason.trim()),
    ...done,
  });
  const waivePenalty = useMutation({
    mutationFn: (id: number) => wardFinanceApi.waivePenalty(id, reason.trim()),
    ...done,
  });
  const pay = useMutation({
    mutationFn: (v: { target: 'FEE' | 'PENALTY'; id: number }) =>
      wardFinanceApi.recordOfflinePayment({
        target: v.target,
        targetId: v.id,
        method,
        reference: reference.trim(),
        note: note.trim() || null,
      }),
    ...done,
  });
  const slotPrice = useMutation({
    mutationFn: (clear: boolean) =>
      wardFinanceApi.setSlotPrice(detail.data!.slotId, clear ? null : amount, reason.trim()),
    ...done,
  });
  const refund = useMutation({
    mutationFn: () =>
      wardFinanceApi.refundDeposit(contractId, {
        amount: amount ?? 0,
        method,
        reference: reference.trim() || null,
        deductionReason: reason.trim() || null,
      }),
    ...done,
  });

  if (detail.isPending) {
    return <p className="text-body-md text-muted">Đang tải hợp đồng…</p>;
  }
  if (detail.error || !detail.data) {
    return (
      <p role="alert" className="text-body-md text-error">
        {errorMessage(detail.error)}
      </p>
    );
  }
  const d: WardFinanceContractDetail = detail.data;
  const unit = d.rentalMode === 'STANDARD' ? 'tháng' : 'ngày';
  const hasReason = reason.trim().length > 0;

  const feeActions = (item: WardFeeItem) =>
    item.canEdit ? (
      <div className="flex flex-wrap gap-xs">
        <Button
          label="Sửa số tiền / hạn"
          variant="outline"
          fullWidth={false}
          onPress={() => {
            close();
            setAmount(item.amount);
            setDueDate(item.dueDate);
            setOpen({ kind: 'ADJUST', target: 'FEE', id: item.feeItemId });
          }}
        />
        <Button
          label="Ghi nhận đã thu"
          variant="outline"
          fullWidth={false}
          onPress={() => {
            close();
            setOpen({ kind: 'PAY', target: 'FEE', id: item.feeItemId });
          }}
        />
        <Button
          label="Miễn kỳ này"
          variant="ghost"
          fullWidth={false}
          onPress={() => {
            close();
            setOpen({ kind: 'WAIVE', target: 'FEE', id: item.feeItemId });
          }}
        />
      </div>
    ) : null;

  const paymentFields = (
    <>
      <SegmentedControl value={method} onChange={setMethod} options={METHOD_OPTIONS} />
      <TextField
        label="Số biên lai / mã giao dịch *"
        value={reference}
        onChangeText={setReference}
        maxLength={100}
      />
      <TextField label="Ghi chú" value={note} onChangeText={setNote} maxLength={500} />
    </>
  );

  const panelFor = (kind: 'FEE' | 'PENALTY', id: number) => {
    if (!open || !('target' in open) || open.target !== kind || open.id !== id) return null;
    if (open.kind === 'ADJUST') {
      return (
        <ActionPanel
          title="Điều chỉnh kỳ phí"
          confirmLabel="Lưu điều chỉnh"
          pending={adjust.isPending}
          disabled={!hasReason || (amount ?? 0) <= 0}
          onCancel={close}
          onConfirm={() => adjust.mutate(id)}
        >
          <MoneyInput label="Số tiền mới" value={amount} onChange={setAmount} />
          <DateInput label="Hạn nộp mới" value={dueDate} onChange={setDueDate} />
          <TextField
            label="Lý do điều chỉnh *"
            value={reason}
            onChangeText={setReason}
            multiline
            maxLength={500}
          />
          <p className="text-body-sm text-muted">
            Hộ kinh doanh được thông báo số tiền, hạn nộp mới và lý do. Lần thanh toán đang mở với
            số cũ sẽ bị huỷ.
          </p>
        </ActionPanel>
      );
    }
    if (open.kind === 'WAIVE') {
      const submit = () => (kind === 'FEE' ? waiveFee.mutate(id) : waivePenalty.mutate(id));
      return (
        <ActionPanel
          title={kind === 'FEE' ? 'Miễn kỳ phí này' : 'Miễn khoản phạt này'}
          confirmLabel="Xác nhận miễn"
          pending={waiveFee.isPending || waivePenalty.isPending}
          disabled={!hasReason}
          onCancel={close}
          onConfirm={submit}
        >
          <TextField
            label="Lý do miễn *"
            value={reason}
            onChangeText={setReason}
            multiline
            maxLength={500}
          />
        </ActionPanel>
      );
    }
    return (
      <ActionPanel
        title="Ghi nhận khoản đã thu ngoài hệ thống"
        confirmLabel="Ghi nhận & phát hành hoá đơn"
        pending={pay.isPending}
        disabled={!reference.trim()}
        onCancel={close}
        onConfirm={() => pay.mutate({ target: kind, id })}
      >
        {paymentFields}
      </ActionPanel>
    );
  };

  const penaltyActions = (p: WardPenaltyItem) =>
    p.status === 'UNPAID' ? (
      <div className="flex flex-wrap gap-xs">
        <Button
          label="Ghi nhận đã thu"
          variant="outline"
          fullWidth={false}
          onPress={() => {
            close();
            setOpen({ kind: 'PAY', target: 'PENALTY', id: p.penaltyId });
          }}
        />
        <Button
          label="Miễn khoản phạt"
          variant="ghost"
          fullWidth={false}
          onPress={() => {
            close();
            setOpen({ kind: 'WAIVE', target: 'PENALTY', id: p.penaltyId });
          }}
        />
      </div>
    ) : null;

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex flex-wrap items-center justify-between gap-sm rounded-[20px] bg-card p-md shadow-card ring-1 ring-border">
        <div className="min-w-0">
          <p className="text-headline-sm text-text">
            Ô {d.slotCode} · {d.vendorName}
          </p>
          <p className="text-body-sm text-muted">
            {d.zoneName} · {formatDateVn(d.startDate)} – {formatDateVn(d.endDate)}
            {d.vendorPhone ? ` · ${d.vendorPhone}` : ''}
          </p>
        </div>
        <div className="text-right">
          <p className="text-body-sm text-muted">Còn phải thu</p>
          <p className="font-sign text-[22px] font-bold text-text">{formatVnd(d.outstanding)}</p>
        </div>
      </div>

      <Section title="Các kỳ phí" description="Sửa số tiền hoặc hạn nộp, miễn một kỳ, hoặc ghi nhận khoản đã thu trực tiếp.">
        <ul className="flex flex-col gap-sm">
          {d.items.map((item) => (
            <li
              key={item.feeItemId}
              className="rounded-[16px] bg-card p-md shadow-card ring-1 ring-border"
            >
              <div className="flex flex-wrap items-center justify-between gap-sm">
                <div>
                  <p className="text-label font-semibold text-text">
                    Kỳ {item.ordinal} · hạn {formatDateVn(item.dueDate)}
                  </p>
                  {item.depositAmount > 0 ? (
                    <p className="text-body-sm text-muted">
                      Gồm {formatVnd(item.depositAmount)} tiền cọc (hoàn lại)
                    </p>
                  ) : null}
                  {item.originalAmount != null && item.originalAmount !== item.amount ? (
                    <p className="text-body-sm text-muted">
                      Đã sửa từ {formatVnd(item.originalAmount)}
                      {item.adjustmentReason ? ` — ${item.adjustmentReason}` : ''}
                    </p>
                  ) : item.status === 'CANCELLED' && item.adjustmentReason ? (
                    <p className="text-body-sm text-muted">Lý do miễn: {item.adjustmentReason}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-sm">
                  <span className="font-tabular text-body-lg font-semibold text-text">
                    {formatVnd(item.amount)}
                  </span>
                  <StatusPill status={item.status} />
                </div>
              </div>
              {feeActions(item)}
              {panelFor('FEE', item.feeItemId)}
            </li>
          ))}
          {d.items.length === 0 ? (
            <li className="text-body-md text-muted">Hợp đồng chưa có lịch thu phí.</li>
          ) : null}
        </ul>
      </Section>

      <Section title="Tiền phạt của hộ kinh doanh">
        <ul className="flex flex-col gap-sm">
          {d.penalties.map((p) => (
            <li key={p.penaltyId} className="rounded-[16px] bg-card p-md shadow-card ring-1 ring-border">
              <div className="flex flex-wrap items-center justify-between gap-sm">
                <div>
                  <p className="text-label font-semibold text-text">{p.violationType}</p>
                  <p className="text-body-sm text-muted">
                    {p.decisionNumber ? `QĐ số ${p.decisionNumber} · ` : ''}
                    {formatDateVn(p.createdAt.slice(0, 10))}
                    {p.waiverReason ? ` · Lý do miễn: ${p.waiverReason}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-sm">
                  <span className="font-tabular text-body-lg font-semibold text-text">
                    {formatVnd(p.amount)}
                  </span>
                  <StatusPill status={p.status} />
                </div>
              </div>
              {penaltyActions(p)}
              {panelFor('PENALTY', p.penaltyId)}
            </li>
          ))}
          {d.penalties.length === 0 ? (
            <li className="text-body-md text-muted">Không có khoản phạt nào.</li>
          ) : null}
        </ul>
      </Section>

      <Section title="Tiền đặt cọc">
        <div className="rounded-[16px] bg-card p-md shadow-card ring-1 ring-border">
          <p className="text-body-md text-text">
            Đã thu <span className="font-semibold">{formatVnd(d.depositPaid)}</span>
          </p>
          {d.depositRefund ? (
            <p className="mt-xs text-body-md text-text">
              Đã hoàn <span className="font-semibold">{formatVnd(d.depositRefund.amount)}</span> ngày{' '}
              {formatDateVn(d.depositRefund.refundedAt.slice(0, 10))}
              {d.depositRefund.deductionReason
                ? ` (khấu trừ: ${d.depositRefund.deductionReason})`
                : ''}
            </p>
          ) : d.canRefundDeposit ? (
            <div className="mt-sm">
              <Button
                label="Hoàn cọc"
                variant="outline"
                fullWidth={false}
                onPress={() => {
                  close();
                  setAmount(d.depositPaid);
                  setOpen({ kind: 'REFUND' });
                }}
              />
            </div>
          ) : (
            <p className="mt-xs text-body-sm text-muted">{d.refundBlockedReason}</p>
          )}
          {open?.kind === 'REFUND' ? (
            <ActionPanel
              title="Hoàn tiền đặt cọc"
              confirmLabel="Ghi nhận hoàn cọc"
              pending={refund.isPending}
              disabled={amount == null || amount > d.depositPaid || (amount < d.depositPaid && !hasReason)}
              onCancel={close}
              onConfirm={() => refund.mutate()}
            >
              <MoneyInput
                label="Số tiền hoàn"
                value={amount}
                onChange={setAmount}
                helperText={`Tối đa ${formatVnd(d.depositPaid)}`}
              />
              <SegmentedControl value={method} onChange={setMethod} options={METHOD_OPTIONS} />
              <TextField label="Số biên lai / mã giao dịch" value={reference} onChangeText={setReference} maxLength={100} />
              {amount != null && amount < d.depositPaid ? (
                <TextField
                  label="Lý do khấu trừ *"
                  value={reason}
                  onChangeText={setReason}
                  multiline
                  maxLength={500}
                />
              ) : null}
            </ActionPanel>
          ) : null}
        </div>
      </Section>

      <Section
        title="Giá riêng của ô"
        description="Đặt giá cho riêng ô này thay cho giá chung của khu vực. Áp dụng cho đơn được duyệt từ nay; hợp đồng đang chạy không đổi."
      >
        <div className="rounded-[16px] bg-card p-md shadow-card ring-1 ring-border">
          <p className="text-body-md text-text">
            {d.slotPriceOverride != null ? (
              <>
                Giá riêng: <span className="font-semibold">{formatVnd(d.slotPriceOverride)}</span>/{unit}
                {' '}(giá khu: {formatVnd(d.zonePrice)}/{unit})
              </>
            ) : (
              <>
                Đang theo giá khu: <span className="font-semibold">{formatVnd(d.zonePrice)}</span>/{unit}
              </>
            )}
          </p>
          <div className="mt-sm flex flex-wrap gap-xs">
            <Button
              label="Đặt giá riêng"
              variant="outline"
              fullWidth={false}
              onPress={() => {
                close();
                setAmount(d.slotPriceOverride ?? d.zonePrice);
                setOpen({ kind: 'SLOT_PRICE' });
              }}
            />
            {d.slotPriceOverride != null ? (
              <Button
                label="Quay về giá khu"
                variant="ghost"
                fullWidth={false}
                onPress={() => {
                  close();
                  setAmount(null);
                  setOpen({ kind: 'SLOT_PRICE' });
                }}
              />
            ) : null}
          </div>
          {open?.kind === 'SLOT_PRICE' ? (
            <ActionPanel
              title={amount == null ? 'Quay về giá chung của khu' : `Giá riêng theo ${unit}`}
              confirmLabel="Lưu giá"
              pending={slotPrice.isPending}
              disabled={!hasReason}
              onCancel={close}
              onConfirm={() => slotPrice.mutate(amount == null)}
            >
              {amount != null ? (
                <MoneyInput label={`Giá thuê mỗi ${unit}`} value={amount} onChange={setAmount} />
              ) : null}
              <TextField
                label="Lý do *"
                value={reason}
                onChangeText={setReason}
                multiline
                maxLength={500}
              />
            </ActionPanel>
          ) : null}
        </div>
      </Section>

      <div>
        <Button
          label="Quay lại danh sách"
          variant="ghost"
          fullWidth={false}
          icon={<Icon name="arrow-left" size={18} color="currentColor" />}
          onPress={() => navigate('/ward/finance')}
        />
      </div>
    </div>
  );
}

function ContractList() {
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.user?.id);
  const list = useQuery({
    queryKey: ['ward', userId, 'finance', 'contracts'],
    queryFn: wardFinanceApi.listContracts,
  });

  if (list.isPending) return <p className="text-body-md text-muted">Đang tải…</p>;
  if (list.error) {
    return (
      <p role="alert" className="text-body-md text-error">
        {errorMessage(list.error)}
      </p>
    );
  }
  if (list.data.length === 0) {
    return <p className="text-body-md text-muted">Phường chưa có hợp đồng thuê ô nào.</p>;
  }

  return (
    <ul className="flex flex-col gap-sm">
      {list.data.map((c) => (
        <li key={c.contractId}>
          <button
            type="button"
            onClick={() => navigate(`/ward/finance/${c.contractId}`)}
            className="flex w-full flex-wrap items-center justify-between gap-sm rounded-[16px] bg-card p-md text-left shadow-card ring-1 ring-border transition-shadow hover:shadow-card-hover"
          >
            <div className="min-w-0">
              <p className="text-label font-semibold text-text">
                Ô {c.slotCode} · {c.vendorName}
              </p>
              <p className="text-body-sm text-muted">
                {c.zoneName} · đến {formatDateVn(c.endDate)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-xs">
              {c.overdueCount > 0 ? (
                <StatusChip label={`${c.overdueCount} kỳ quá hạn`} tone="danger" />
              ) : null}
              {c.unpaidPenalties > 0 ? (
                <StatusChip label={`Phạt ${formatVnd(c.unpaidPenalties)}`} tone="pending" />
              ) : null}
              {c.depositPaid > 0 && !c.depositRefunded && c.contractStatus !== 'ACTIVE' ? (
                <StatusChip label="Chờ hoàn cọc" tone="pending" />
              ) : null}
              <span className="font-tabular text-body-lg font-semibold text-text">
                {formatVnd(c.outstanding)}
              </span>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function WardFinanceScreen() {
  const { contractId } = useParams();
  const id = contractId ? Number(contractId) : null;
  return (
    <WardGate>
      <Screen width="default">
        <AppHeader
          title="Thu phí & điều chỉnh"
          subtitle="Sửa tay các khoản tiền: kỳ phí, tiền phạt, tiền cọc, giá riêng của ô"
        />
        {id ? <ContractDetail contractId={id} /> : <ContractList />}
      </Screen>
    </WardGate>
  );
}
