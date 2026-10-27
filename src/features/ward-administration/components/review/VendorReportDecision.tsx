import { useId, useState } from 'react';

import { Button, formatVnd, Icon } from '@/components/common';
import { SelectField } from '@/components/forms';
import { VERDICT_TONES } from '@/components/illustrations';
import { StatusChip } from '@/components/status';
import type { VendorReportOutcome } from '@/core/api/ai-api';
import { formatBoardStamp, formatDueDay } from '@/features/price-board/price-board-format';
import { reportTypeShort, resolutionLabel } from '@/features/vendor-reports/report-kinds';
import { MoneyInput } from '../ConfigFields';

const NOTE_MAX = 500;

type Choice = 'DISMISSED' | 'MEDIATED' | 'VIOLATION';

export type ResolveError = { message: string; conflict: boolean };

type PanelProps = {
  /** The amount the buyer was charged (an overcharge); a refund cannot exceed it. Null: no refund field. */
  chargedAmount: number | null;
  /** The violation type "Lập biên bản" pre-selects, in words (rule-based, from the report type). */
  suggestedViolation: string | null;
  submitting: boolean;
  error: ResolveError | null;
  onResolve: (outcome: 'DISMISSED' | 'MEDIATED', note: string, refundAmount: number | null) => void;
  onRecordViolation: () => void;
  onReload: () => void;
};

/**
 * WARD-19: the officer closes a pending report in one of three ways, and nothing closes it
 * without them (BR-41/43). "Bác" needs the reason the reporter will read; "Đã hòa giải" a note
 * and, for an overcharge, any refund up to what was charged; "Lập biên bản" opens the record
 * form filled from the report, which closes the report in the same transaction.
 */
export function VendorReportResolvePanel({
  chargedAmount,
  suggestedViolation,
  submitting,
  error,
  onResolve,
  onRecordViolation,
  onReload,
}: PanelProps) {
  const noteId = useId();
  const [choice, setChoice] = useState<Choice>('MEDIATED');
  const [note, setNote] = useState('');
  const [refund, setRefund] = useState<number | null>(null);
  const [tried, setTried] = useState(false);

  const trimmed = note.trim();
  const noteError =
    tried && !trimmed
      ? choice === 'DISMISSED'
        ? 'Nhập lý do bác: người phản ánh sẽ đọc lý do này.'
        : 'Nhập ghi chú hòa giải.'
      : trimmed.length > NOTE_MAX
        ? `Tối đa ${NOTE_MAX} ký tự.`
        : undefined;
  const refundError =
    choice === 'MEDIATED' && refund != null && chargedAmount != null && refund > chargedAmount
      ? `Số tiền hoàn không được vượt số tiền khách bị tính (${formatVnd(chargedAmount)}).`
      : undefined;

  const submit = () => {
    setTried(true);
    if (choice === 'VIOLATION') return;
    if (!trimmed || trimmed.length > NOTE_MAX || refundError) return;
    onResolve(choice, trimmed, choice === 'MEDIATED' ? refund : null);
  };

  return (
    <section
      aria-labelledby="resolve-title"
      className="cq flex flex-col gap-md rounded-[24px] bg-card p-md shadow-sheet ring-1 ring-border md:p-lg"
    >
      <div>
        <h2 id="resolve-title" className="font-heading text-[21px] font-bold text-text">
          Đóng phản ánh
        </h2>
        <p className="mt-0.5 text-body-sm text-muted">
          Cán bộ quyết định; hệ thống không tự đóng, không tự lập biên bản. Người phản ánh và người
          bán nhận thông báo kết quả (người bán không thấy ghi chú của bạn).
        </p>
      </div>

      <SelectField<Choice>
        label="Kết quả"
        value={choice}
        onChange={(next) => {
          setChoice(next);
          setTried(false);
        }}
        options={[
          {
            value: 'DISMISSED',
            label: 'Bác phản ánh',
            description: 'Không đủ căn cứ. Lý do bắt buộc, gửi cho người phản ánh.',
          },
          {
            value: 'MEDIATED',
            label: 'Đã hòa giải',
            description: 'Hai bên đã thỏa thuận; ghi số tiền người bán hoàn nếu có.',
          },
          {
            value: 'VIOLATION',
            label: 'Lập biên bản',
            description: 'Mở biểu mẫu biên bản đã điền sẵn từ phản ánh này.',
          },
        ]}
      />

      {choice === 'VIOLATION' ? (
        <div className="flex flex-col gap-sm">
          <p className="text-body-md text-text">
            Biểu mẫu biên bản điền sẵn người bán, ô, mô tả và ảnh từ phản ánh.
            {suggestedViolation ? (
              <>
                {' '}
                Loại vi phạm gợi ý theo loại phản ánh: <strong>{suggestedViolation}</strong> (cán bộ
                vẫn chọn lại được).
              </>
            ) : null}{' '}
            Phản ánh chỉ đóng khi biên bản được lập.
          </p>
          <Button
            label="Mở biểu mẫu biên bản"
            variant="danger"
            icon={<Icon name="gavel" size={19} color="currentColor" />}
            onPress={onRecordViolation}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-sm">
          <div className="field">
            <label htmlFor={noteId} className="field-label text-label text-text">
              {choice === 'DISMISSED' ? 'Lý do bác (người phản ánh sẽ đọc)' : 'Ghi chú hòa giải'}
            </label>
            <div className="field-control">
              <textarea
                id={noteId}
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX + 20))}
                rows={3}
                aria-invalid={noteError ? true : undefined}
                aria-describedby={`${noteId}-message`}
                placeholder={
                  choice === 'DISMISSED'
                    ? 'VD: Cán bộ đã kiểm tra tại quầy, giá bán đúng với bảng giá niêm yết.'
                    : 'VD: Người bán đã xin lỗi và hoàn lại phần chênh lệch tại quầy.'
                }
                className={`input-shell w-full rounded-sm border bg-card px-sm py-sm text-body-lg text-text placeholder:text-muted/80 ${noteError ? 'border-error' : 'border-border'}`}
              />
              <span
                id={`${noteId}-message`}
                className={`text-body-sm ${noteError ? 'text-error' : 'text-muted'}`}
              >
                {noteError ?? `${trimmed.length}/${NOTE_MAX} ký tự`}
              </span>
            </div>
          </div>
          {choice === 'MEDIATED' && chargedAmount != null ? (
            <MoneyInput
              label="Số tiền người bán hoàn (không bắt buộc)"
              value={refund}
              onChange={setRefund}
              error={refundError}
              helperText={`Tối đa ${formatVnd(chargedAmount)}, số tiền khách bị tính.`}
            />
          ) : null}
          {error ? (
            <div
              role="alert"
              className={`flex flex-col gap-sm rounded-[14px] px-md py-sm sm:flex-row sm:items-center sm:justify-between ${error.conflict ? `${VERDICT_TONES.pending.wash} ${VERDICT_TONES.pending.ink}` : `${VERDICT_TONES.danger.wash} ${VERDICT_TONES.danger.ink}`}`}
            >
              <p className="text-body-md font-semibold">{error.message}</p>
              {error.conflict ? (
                <Button label="Tải lại" variant="outline" fullWidth={false} onPress={onReload} />
              ) : null}
            </div>
          ) : null}
          <Button
            label={choice === 'DISMISSED' ? 'Bác phản ánh' : 'Xác nhận đã hòa giải'}
            variant={choice === 'DISMISSED' ? 'civic' : 'approve'}
            loading={submitting}
            icon={
              <Icon
                name={choice === 'DISMISSED' ? 'close-circle-outline' : 'handshake'}
                size={19}
                color="currentColor"
              />
            }
            onPress={submit}
          />
        </div>
      )}
    </section>
  );
}

/** How the report was closed, with who closed it and when (BR-46). */
export function VendorReportOutcomeCard({
  outcome,
  violationId,
}: {
  outcome: VendorReportOutcome;
  violationId?: number | null;
}) {
  const label = resolutionLabel(outcome.resolution);
  const tone = VERDICT_TONES[label?.tone ?? 'neutral'];
  const at = formatBoardStamp(outcome.reviewedAt);
  return (
    <section
      aria-label="Kết quả xử lý"
      className={`flex flex-col gap-xs rounded-[20px] p-md ${tone.wash}`}
    >
      <p className={`flex items-center gap-xs text-body-lg font-semibold ${tone.ink}`}>
        <Icon
          name={outcome.resolution === 'DISMISSED' ? 'close-circle-outline' : 'check-circle'}
          size={20}
          color="currentColor"
        />
        {label?.label ?? outcome.resolution}
      </p>
      {outcome.note ? <p className="text-body-md text-text">{outcome.note}</p> : null}
      {outcome.refundAmount ? (
        <p className="text-body-md font-semibold text-text">
          Người bán hoàn: {formatVnd(outcome.refundAmount)}
        </p>
      ) : null}
      <p className="text-body-sm text-muted">
        {outcome.reviewedByName ? `${outcome.reviewedByName}` : 'Cán bộ phường'}
        {at ? ` · ${at}` : ''}
        {violationId ? ` · Biên bản #${violationId}` : ''}
      </p>
    </section>
  );
}

/** The report's type, due date (an internal target, not a legal deadline) and the vendor's 90-day count. */
export function VendorReportFacts({
  reportType,
  status,
  dueAt,
  isOverdue,
  reportsAgainstVendor90Days,
}: {
  reportType: string | null | undefined;
  status: string;
  dueAt: string | null | undefined;
  isOverdue: boolean | undefined;
  reportsAgainstVendor90Days: number | undefined;
}) {
  const due = formatDueDay(dueAt);
  return (
    <dl className="flex flex-col gap-sm rounded-[20px] bg-card p-md text-body-md shadow-card ring-1 ring-border">
      <div className="flex flex-wrap items-center justify-between gap-xs">
        <dt className="text-body-sm text-muted">Loại phản ánh</dt>
        <dd className="font-semibold text-text">{reportTypeShort(reportType)}</dd>
      </div>
      {status === 'PENDING' ? (
        <div className="flex flex-wrap items-center justify-between gap-xs">
          <dt className="text-body-sm text-muted">Hạn xử lý (nội bộ)</dt>
          <dd className="flex items-center gap-xs font-semibold text-text">
            {due ? `Hết ngày ${due}` : 'Chưa đặt'}
            {isOverdue ? <StatusChip label="Quá hạn" tone="danger" /> : null}
          </dd>
        </div>
      ) : null}
      {reportsAgainstVendor90Days != null ? (
        <div className="flex flex-col gap-0.5 border-t border-border pt-sm">
          <div className="flex flex-wrap items-center justify-between gap-xs">
            <dt className="text-body-sm text-muted">Phản ánh về người bán này trong 90 ngày</dt>
            <dd className="font-sign text-[20px] font-bold text-text font-tabular">
              {reportsAgainstVendor90Days}
            </dd>
          </div>
          <p className="text-body-xs text-muted">
            Chỉ để tham khảo: không phải điểm số, không dùng để tự xử lý.
          </p>
        </div>
      ) : null}
    </dl>
  );
}
