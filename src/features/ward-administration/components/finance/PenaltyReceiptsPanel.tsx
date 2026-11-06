import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/common';
import { ErrorState, showToast } from '@/components/feedback';
import { SegmentedControl, TextField } from '@/components/forms';
import { Section } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { EvidencePreview } from '@/features/business-registrations/components/EvidencePreview';
import { useAuthStore } from '@/store/auth-store';
import { wardFinanceApi, type WardPenaltyReceipt } from '../../ward-finance-api';
import { errorMessage, formatDateVn } from '../../ward-config-api';
import { Ledger, LedgerEmpty, LedgerRow } from './FinanceParts';

type View = 'WAITING' | 'DONE';

const VIEW_OPTIONS: { value: View; label: string }[] = [
  { value: 'WAITING', label: 'Chờ kiểm tra' },
  { value: 'DONE', label: 'Đã xử lý' },
];

const STATE = {
  SUBMITTED: { label: 'Chờ kiểm tra', tone: 'pending' },
  ACCEPTED: { label: 'Đã ghi nhận', tone: 'ok' },
  REJECTED: { label: 'Chưa chấp nhận', tone: 'danger' },
} as const;

type Open = { kind: 'ACCEPT' | 'REJECT'; receiptId: number } | null;

/**
 * Receipts households sent for fines they paid to the State Treasury. StreetBiz does not collect
 * fines: the officer matches each receipt with the Treasury, then records the fine as paid (and
 * the household gets its invoice) or sends the receipt back with the reason.
 */
export function PenaltyReceiptsPanel() {
  const client = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const [view, setView] = useState<View>('WAITING');
  const [open, setOpen] = useState<Open>(null);
  const [note, setNote] = useState('');
  const list = useQuery({
    queryKey: ['ward', userId, 'finance', 'penalty-receipts'],
    queryFn: () => wardFinanceApi.penaltyReceipts(),
  });

  const close = () => {
    setOpen(null);
    setNote('');
  };
  const done = {
    onSuccess: (result: { message: string }) => {
      showToast(result.message);
      void client.invalidateQueries({ queryKey: ['ward', userId, 'finance'] });
      close();
    },
    onError: (error: unknown) => showToast(errorMessage(error)),
  };
  const accept = useMutation({
    mutationFn: (receiptId: number) => wardFinanceApi.acceptPenaltyReceipt(receiptId, note.trim() || null),
    ...done,
  });
  const reject = useMutation({
    mutationFn: (receiptId: number) => wardFinanceApi.rejectPenaltyReceipt(receiptId, note.trim()),
    ...done,
  });

  if (list.isError) {
    return <ErrorState message={errorMessage(list.error)} onRetry={() => void list.refetch()} />;
  }
  const all = list.data ?? [];
  const waiting = all.filter((row) => row.receipt.status === 'SUBMITTED');
  const shown = view === 'WAITING' ? waiting : all.filter((row) => row.receipt.status !== 'SUBMITTED');
  // Nothing has ever been sent: the panel stays out of the way instead of showing an empty ledger.
  if (!list.isPending && all.length === 0) return null;

  const actions = (row: WardPenaltyReceipt) => {
    const id = row.receipt.receiptId;
    if (row.receipt.status !== 'SUBMITTED') return null;
    const panel =
      open?.receiptId === id ? (
        <div
          role="group"
          aria-label={open.kind === 'ACCEPT' ? 'Ghi nhận đã nộp Kho bạc' : 'Từ chối biên lai'}
          className="flex flex-col gap-sm rounded-[16px] bg-sunken p-sm ring-1 ring-border md:p-md"
        >
          <p className="text-label font-semibold text-text">
            {open.kind === 'ACCEPT' ? 'Ghi nhận khoản phạt đã nộp Kho bạc' : 'Biên lai chưa được chấp nhận'}
          </p>
          <TextField
            label={open.kind === 'ACCEPT' ? 'Ghi chú (nếu có)' : 'Lý do *'}
            value={note}
            onChangeText={setNote}
            multiline
            maxLength={500}
          />
          <p className="text-body-sm text-muted">
            {open.kind === 'ACCEPT'
              ? 'Chỉ ghi nhận sau khi đã đối chiếu với Kho bạc. Hộ được báo và nhận hoá đơn.'
              : 'Hộ được báo lý do và có thể gửi lại biên lai khác.'}
          </p>
          <div className="flex flex-wrap justify-end gap-xs">
            <Button label="Huỷ" variant="ghost" fullWidth={false} onPress={close} />
            <Button
              label={open.kind === 'ACCEPT' ? 'Ghi nhận đã nộp' : 'Gửi lại cho hộ'}
              fullWidth={false}
              loading={accept.isPending || reject.isPending}
              disabled={open.kind === 'REJECT' && !note.trim()}
              onPress={() => (open.kind === 'ACCEPT' ? accept.mutate(id) : reject.mutate(id))}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-xs">
          <Button
            label="Đã đối chiếu, ghi nhận đã nộp"
            variant="outline"
            fullWidth={false}
            onPress={() => {
              close();
              setOpen({ kind: 'ACCEPT', receiptId: id });
            }}
          />
          <Button
            label="Chưa chấp nhận"
            variant="ghost"
            fullWidth={false}
            onPress={() => {
              close();
              setOpen({ kind: 'REJECT', receiptId: id });
            }}
          />
        </div>
      );
    return panel;
  };

  return (
    <Section
      title="Biên lai nộp phạt"
      description="Hộ nộp tiền phạt vào Kho bạc rồi gửi biên lai. Đối chiếu với Kho bạc trước khi ghi nhận."
      action={
        <SegmentedControl
          value={view}
          onChange={setView}
          options={VIEW_OPTIONS.map((option) => ({
            ...option,
            label: `${option.label} (${option.value === 'WAITING' ? waiting.length : all.length - waiting.length})`,
          }))}
        />
      }
    >
      {list.isPending ? (
        <p role="status" className="text-body-md text-muted">
          Đang tải biên lai…
        </p>
      ) : shown.length === 0 ? (
        <LedgerEmpty
          icon="receipt-text-outline"
          title={view === 'WAITING' ? 'Không có biên lai nào đang chờ' : 'Chưa xử lý biên lai nào'}
        />
      ) : (
        <Ledger>
          {shown.map((row) => {
            const state = STATE[row.receipt.status];
            return (
              <LedgerRow
                key={row.receipt.receiptId}
                lead={formatDateVn(row.receipt.submittedAt.slice(0, 10))}
                title={`${row.vendorName ?? 'Hộ kinh doanh'} · ${row.violationLabel}`}
                amount={row.amount}
                status={<StatusChip label={state.label} tone={state.tone} />}
                notes={
                  <div className="flex items-start gap-sm">
                    <EvidencePreview
                      evidence={{ fileUrl: row.receipt.receiptUrl, evidenceType: 'PENALTY_RECEIPT' }}
                      label="Biên lai"
                    />
                    <div className="min-w-0 text-body-sm text-muted">
                      {row.decisionNumber ? <p>QĐ số {row.decisionNumber}</p> : null}
                      {row.slotCode ? <p>Ô {row.slotCode}</p> : null}
                      <p>Nộp ngày {formatDateVn(row.receipt.paidOn)}</p>
                      {row.receipt.reference ? <p>Số chứng từ: {row.receipt.reference}</p> : null}
                      {row.receipt.note ? <p>Hộ ghi: {row.receipt.note}</p> : null}
                      {row.receipt.reviewNote ? <p>Phường ghi: {row.receipt.reviewNote}</p> : null}
                      {row.reviewedByName ? <p>Xử lý bởi {row.reviewedByName}</p> : null}
                    </div>
                  </div>
                }
              >
                {actions(row)}
              </LedgerRow>
            );
          })}
        </Ledger>
      )}
    </Section>
  );
}
