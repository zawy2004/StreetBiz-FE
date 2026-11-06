import { useRef, useState } from 'react';

import { Button, Icon } from '@/components/common';
import { PhotoPicker, TextField } from '@/components/forms';
import { StatusChip } from '@/components/status';
import {
  errorMessage,
  vendorRegistrationApi,
  type PenaltyReceiptDto,
  type SubmitPenaltyReceiptBody,
} from '@/core/api';
import { EvidencePreview } from '@/features/business-registrations/components/EvidencePreview';
import { hcmDay } from '../finance-view';
import { useSubmitPenaltyReceipt } from '../useFinance';

/** Evidence uploads are capped by the server at 5 MB (JPG, PNG, WEBP, PDF). */
const MAX_FILE_BYTES = 5 * 1024 * 1024;

const dateOnly = (value: string) => new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString('vi-VN');
const dateTime = (value: string) =>
  new Date(value).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });

const RECEIPT_STATE = {
  SUBMITTED: { label: 'Chờ phường kiểm tra', tone: 'pending' },
  ACCEPTED: { label: 'Phường đã ghi nhận', tone: 'ok' },
  REJECTED: { label: 'Chưa được chấp nhận', tone: 'danger' },
} as const;

/** "Cách nộp": the Treasury instructions from the server, in order. */
export function TreasuryGuide({ instructions }: { instructions: string[] }) {
  return (
    <section aria-label="Cách nộp phạt" className="rounded-[20px] bg-card p-md ring-1 ring-border/80">
      <h2 className="mb-sm flex items-center gap-xs text-[16px] font-bold leading-6 text-text">
        <span className="text-tertiary">
          <Icon name="bank" size={20} color="currentColor" />
        </span>
        Nộp tiền phạt vào Kho bạc
      </h2>
      <ol className="flex flex-col gap-sm">
        {instructions.map((text, index) => (
          <li key={text} className="flex items-start gap-sm">
            <span
              aria-hidden="true"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tint-primary font-sign text-[15px] font-bold text-primary"
            >
              {index + 1}
            </span>
            <span className="pt-1 text-body-md text-text">{text}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** The household's latest receipt: where it stands with the ward, and the ward's reason if it was turned down. */
export function ReceiptStatus({ receipt }: { receipt: PenaltyReceiptDto }) {
  const state = RECEIPT_STATE[receipt.status];
  return (
    <section
      aria-label="Biên lai đã gửi"
      className="flex flex-col gap-sm rounded-[20px] bg-card p-md ring-1 ring-border/80"
    >
      <div className="flex flex-wrap items-center justify-between gap-xs">
        <h2 className="font-sign text-[18px] font-bold leading-6 text-text">Biên lai đã gửi</h2>
        <StatusChip label={state.label} tone={state.tone} />
      </div>
      <div className="flex items-start gap-md">
        <EvidencePreview
          evidence={{ fileUrl: receipt.receiptUrl, evidenceType: 'PENALTY_RECEIPT' }}
          label="Biên lai"
        />
        <dl className="min-w-0 flex-1 text-body-md">
          <div className="flex justify-between gap-sm py-1">
            <dt className="text-muted">Ngày nộp</dt>
            <dd className="font-semibold tabular-nums text-text">{dateOnly(receipt.paidOn)}</dd>
          </div>
          {receipt.reference ? (
            <div className="flex justify-between gap-sm py-1">
              <dt className="text-muted">Số chứng từ</dt>
              <dd className="break-all font-semibold text-text">{receipt.reference}</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-sm py-1">
            <dt className="text-muted">Gửi lúc</dt>
            <dd className="tabular-nums text-text">{dateTime(receipt.submittedAt)}</dd>
          </div>
        </dl>
      </div>
      {receipt.status === 'SUBMITTED' ? (
        <p role="status" className="text-body-md text-text/80">
          Phường sẽ đối chiếu biên lai với Kho bạc rồi ghi nhận khoản phạt là đã nộp. Bạn sẽ nhận
          thông báo khi có kết quả.
        </p>
      ) : null}
      {receipt.status === 'REJECTED' ? (
        <p
          role="alert"
          className="flex items-start gap-xs rounded-[12px] bg-[#FDEBEA] px-sm py-xs text-body-md text-[#B42318] dark:bg-[#3A1414] dark:text-[#FF9A90]"
        >
          <Icon name="alert-circle-outline" size={20} color="currentColor" className="mt-0.5 shrink-0" />
          <span>
            Phường chưa chấp nhận biên lai này
            {receipt.reviewNote ? `: ${receipt.reviewNote}` : '.'} Bạn có thể gửi lại biên lai khác.
          </span>
        </p>
      ) : null}
    </section>
  );
}

/**
 * Sends the Treasury receipt: the file (uploaded first, once), the date paid and an optional
 * voucher number. The ward checks it against the Treasury; nothing here marks the fine as paid.
 */
export function ReceiptForm({ penaltyId, issuedAt }: { penaltyId: number; issuedAt: string }) {
  const submit = useSubmitPenaltyReceipt(penaltyId);
  const today = hcmDay(new Date());
  const earliest = hcmDay(issuedAt);
  const [file, setFile] = useState<{ file: File; preview: string } | null>(null);
  const [paidOn, setPaidOn] = useState(today);
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  // The upload survives a failed submit, so retrying does not store the same file twice.
  const uploaded = useRef<{ file: File; url: string } | null>(null);

  const dateError =
    paidOn < earliest || paidOn > today
      ? 'Ngày nộp phải từ ngày lập biên bản đến hôm nay.'
      : undefined;
  const fileError = problem ?? undefined;

  const send = async () => {
    if (!file) {
      setProblem('Chọn ảnh hoặc PDF biên lai nộp Kho bạc.');
      return;
    }
    if (dateError || sending) return;
    setSending(true);
    setProblem(null);
    try {
      if (uploaded.current?.file !== file.file) {
        const stored = await vendorRegistrationApi.uploadEvidenceFile(file.file);
        uploaded.current = { file: file.file, url: stored.fileUrl };
      }
      const body: SubmitPenaltyReceiptBody = {
        receiptUrl: uploaded.current.url,
        reference: reference.trim() || null,
        paidOn,
        note: note.trim() || null,
      };
      await submit.mutateAsync(body);
    } catch (error) {
      setProblem(errorMessage(error));
    } finally {
      setSending(false);
    }
  };

  return (
    <form
      aria-label="Gửi biên lai nộp phạt"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void send();
      }}
      className="flex flex-col gap-md rounded-[20px] bg-card p-md shadow-card ring-1 ring-border/80 md:p-lg"
    >
      <h2 className="flex items-center gap-xs font-sign text-[18px] font-bold leading-6 text-text">
        <span className="text-primary">
          <Icon name="upload-outline" size={22} color="currentColor" />
        </span>
        Gửi biên lai
      </h2>
      <div className="flex flex-col gap-xs">
        <PhotoPicker
          label="Tải ảnh hoặc PDF biên lai"
          accept="image/*,application/pdf"
          uri={file?.preview}
          error={Boolean(fileError)}
          validate={(picked) => (picked.size > MAX_FILE_BYTES ? 'Tệp tối đa 5 MB.' : undefined)}
          onInvalid={setProblem}
          onChange={(preview, picked) => {
            setProblem(null);
            setFile({ file: picked, preview });
          }}
          onRemove={() => setFile(null)}
        />
        {fileError ? (
          <p role="alert" className="text-body-sm text-error">
            {fileError}
          </p>
        ) : null}
      </div>
      <label className="flex flex-col gap-1 text-label text-text">
        Ngày nộp
        <input
          type="date"
          value={paidOn}
          min={earliest}
          max={today}
          onChange={(event) => setPaidOn(event.target.value)}
          aria-invalid={dateError ? true : undefined}
          className="h-12 rounded-sm border border-border bg-card px-sm text-body-lg text-text"
        />
        {dateError ? <span className="text-body-sm text-error">{dateError}</span> : null}
      </label>
      <TextField
        label="Số chứng từ (nếu có)"
        value={reference}
        onChangeText={setReference}
        maxLength={100}
        disabled={sending}
      />
      <TextField
        label="Ghi chú cho phường (nếu có)"
        value={note}
        onChangeText={setNote}
        maxLength={500}
        multiline
        disabled={sending}
      />
      <Button
        label={sending ? 'Đang gửi biên lai…' : 'Gửi biên lai cho phường'}
        loading={sending}
        disabled={sending}
        onPress={() => void send()}
      />
    </form>
  );
}
