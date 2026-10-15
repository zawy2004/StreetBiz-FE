import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button, formatVnd } from '@/components/common';
import { EmptyState, ErrorState, showToast } from '@/components/feedback';
import { SegmentedControl, TextField } from '@/components/forms';
import { AppHeader, Screen, Section } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { useAuthStore } from '@/store/auth-store';
import { DateInput, MoneyInput } from '../components/ConfigFields';
import {
  ContractHero,
  ContractLedger,
  FinanceSkeleton,
  Ledger,
  LedgerEmpty,
  LedgerRow,
  WardOwedHero,
} from '../components/finance/FinanceParts';
import {
  countByFilter,
  filterContracts,
  summariseContracts,
  type ContractFilter,
} from '../components/finance/finance-model';
import { DecisionDeskCard } from '../components/review/PermitDossierParts';
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
      className="flex flex-col gap-sm rounded-[16px] bg-sunken p-sm ring-1 ring-border md:p-md"
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

  if (detail.isPending) return <FinanceSkeleton />;
  if (detail.error || !detail.data) {
    return (
      <div className="rounded-[24px] bg-card shadow-card ring-1 ring-border">
        <ErrorState message={errorMessage(detail.error)} onRetry={() => void detail.refetch()} />
      </div>
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
      <ContractHero detail={d} />

      <div className="grid items-start gap-lg xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex min-w-0 flex-col gap-lg">
          <Section
            title="Các kỳ phí"
            description="Sửa số tiền hoặc hạn nộp, miễn một kỳ, hoặc ghi nhận khoản đã thu trực tiếp."
          >
            {d.items.length === 0 ? (
              <LedgerEmpty icon="receipt-text-outline" title="Hợp đồng chưa có lịch thu phí" />
            ) : (
              <Ledger>
                {d.items.map((item) => (
                  <LedgerRow
                    key={item.feeItemId}
                    lead={formatDateVn(item.dueDate)}
                    title={`Kỳ ${item.ordinal}`}
                    amount={item.amount}
                    status={<StatusPill status={item.status} />}
                    notes={
                      <>
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
                      </>
                    }
                  >
                    {feeActions(item)}
                    {panelFor('FEE', item.feeItemId)}
                  </LedgerRow>
                ))}
              </Ledger>
            )}
          </Section>

          <Section title="Tiền phạt của hộ kinh doanh">
            {d.penalties.length === 0 ? (
              <LedgerEmpty icon="shield-check-outline" title="Không có khoản phạt nào" />
            ) : (
              <Ledger>
                {d.penalties.map((p) => (
                  <LedgerRow
                    key={p.penaltyId}
                    lead={formatDateVn(p.createdAt.slice(0, 10))}
                    title={p.violationType}
                    amount={p.amount}
                    status={<StatusPill status={p.status} />}
                    notes={
                      p.decisionNumber || p.waiverReason ? (
                        <p className="text-body-sm text-muted">
                          {p.decisionNumber ? `QĐ số ${p.decisionNumber}` : ''}
                          {p.decisionNumber && p.waiverReason ? ' · ' : ''}
                          {p.waiverReason ? `Lý do miễn: ${p.waiverReason}` : ''}
                        </p>
                      ) : null
                    }
                  >
                    {penaltyActions(p)}
                    {panelFor('PENALTY', p.penaltyId)}
                  </LedgerRow>
                ))}
              </Ledger>
            )}
          </Section>
        </div>

        <aside className="flex min-w-0 flex-col gap-md">
          <DecisionDeskCard title="Tiền đặt cọc">
            <p className="text-body-md text-text">
              Đã thu <span className="font-semibold">{formatVnd(d.depositPaid)}</span>
            </p>
            {d.depositRefund ? (
              <p className="text-body-md text-text">
                Đã hoàn <span className="font-semibold">{formatVnd(d.depositRefund.amount)}</span>{' '}
                ngày {formatDateVn(d.depositRefund.refundedAt.slice(0, 10))}
                {d.depositRefund.deductionReason
                  ? ` (khấu trừ: ${d.depositRefund.deductionReason})`
                  : ''}
              </p>
            ) : d.canRefundDeposit ? (
              <div>
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
              <p className="text-body-sm text-muted">{d.refundBlockedReason}</p>
            )}
            {open?.kind === 'REFUND' ? (
              <ActionPanel
                title="Hoàn tiền đặt cọc"
                confirmLabel="Ghi nhận hoàn cọc"
                pending={refund.isPending}
                disabled={
                  amount == null || amount > d.depositPaid || (amount < d.depositPaid && !hasReason)
                }
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
                <TextField
                  label="Số biên lai / mã giao dịch"
                  value={reference}
                  onChangeText={setReference}
                  maxLength={100}
                />
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
          </DecisionDeskCard>

          <DecisionDeskCard title="Giá riêng của ô">
            <p className="text-body-md text-text">
              {d.slotPriceOverride != null ? (
                <>
                  Giá riêng: <span className="font-semibold">{formatVnd(d.slotPriceOverride)}</span>/
                  {unit} (giá khu: {formatVnd(d.zonePrice)}/{unit})
                </>
              ) : (
                <>
                  Đang theo giá khu: <span className="font-semibold">{formatVnd(d.zonePrice)}</span>/
                  {unit}
                </>
              )}
            </p>
            <p className="text-body-sm text-muted">
              Đặt giá cho riêng ô này thay cho giá chung của khu vực. Áp dụng cho đơn được duyệt từ
              nay; hợp đồng đang chạy không đổi.
            </p>
            <div className="flex flex-wrap gap-xs">
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
          </DecisionDeskCard>
        </aside>
      </div>
    </div>
  );
}

const FILTER_LABEL: Record<ContractFilter, string> = {
  ALL: 'Tất cả',
  OVERDUE: 'Quá hạn',
  PENALTY: 'Có tiền phạt',
  REFUND: 'Chờ hoàn cọc',
};

function ContractList() {
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.user?.id);
  const [filter, setFilter] = useState<ContractFilter>('ALL');
  const [query, setQuery] = useState('');
  const list = useQuery({
    queryKey: ['ward', userId, 'finance', 'contracts'],
    queryFn: wardFinanceApi.listContracts,
  });

  if (list.isPending) return <FinanceSkeleton />;
  if (list.error) {
    return (
      <div className="rounded-[24px] bg-card shadow-card ring-1 ring-border">
        <ErrorState message={errorMessage(list.error)} onRetry={() => void list.refetch()} />
      </div>
    );
  }
  if (list.data.length === 0) {
    return (
      <div className="rounded-[24px] bg-card shadow-card ring-1 ring-border">
        <EmptyState
          icon="receipt-text-outline"
          title="Phường chưa có hợp đồng thuê ô nào"
          description="Khi có hợp đồng, các kỳ phí và tiền phạt sẽ hiện ở đây để điều chỉnh."
        />
      </div>
    );
  }

  const counts = countByFilter(list.data);
  const shown = filterContracts(list.data, filter, query);

  return (
    <div className="flex flex-col gap-lg">
      <div className="sb-pop">
        <WardOwedHero summary={summariseContracts(list.data)} />
      </div>

      <div className="flex flex-col gap-sm md:flex-row md:items-center md:justify-between">
        <SegmentedControl
          value={filter}
          onChange={setFilter}
          options={(Object.keys(FILTER_LABEL) as ContractFilter[]).map((value) => ({
            value,
            label: `${FILTER_LABEL[value]} (${counts[value]})`,
          }))}
        />
        <div className="md:w-[320px]">
          <TextField
            value={query}
            onChangeText={setQuery}
            placeholder="Tìm theo mã ô, tên hộ hoặc số điện thoại"
          />
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="rounded-[24px] bg-card shadow-card ring-1 ring-border">
          <EmptyState
            icon="magnify"
            title="Không có hợp đồng phù hợp"
            description="Thử bỏ bộ lọc hoặc đổi từ khoá tìm kiếm."
            compact
          />
        </div>
      ) : (
        <ContractLedger items={shown} onOpen={(id) => navigate(`/ward/finance/${id}`)} />
      )}
    </div>
  );
}

export function WardFinanceScreen() {
  const { contractId } = useParams();
  const id = contractId ? Number(contractId) : null;
  return (
    <WardGate>
      <Screen width="wide">
        <AppHeader
          title="Thu phí & điều chỉnh"
          subtitle="Sửa tay các khoản tiền: kỳ phí, tiền phạt, tiền cọc, giá riêng của ô"
          back={Boolean(id)}
        />
        {id ? <ContractDetail contractId={id} /> : <ContractList />}
      </Screen>
    </WardGate>
  );
}
