import { useId, type ReactNode } from 'react';

import { Button, formatVnd, Icon } from '@/components/common';
import { showToast } from '@/components/feedback';
import type { BankTransferDto } from '@/core/api/finance-api';

async function copy(value: string, what: string) {
  try {
    await navigator.clipboard.writeText(value);
    showToast(`Đã sao chép ${what}`);
  } catch {
    showToast(`Không sao chép được ${what}. Hãy chọn và sao chép thủ công.`);
  }
}

type Props = {
  transfer: BankTransferDto;
  /** True while a check with the backend is in flight. */
  checking?: boolean;
  onCheck: () => void;
  /** Extra actions under the check button (change method, development simulator). */
  children?: ReactNode;
};

/**
 * "Chuyển khoản qua VietQR": the QR for the payer's banking app and the same
 * details to type by hand, each with a copy button. The transfer content is
 * the payment code and is marked as required: without it the money cannot be
 * matched to this payment. Nothing here says the payment worked; the screen
 * moves on only when the backend reports SUCCESS.
 */
export function BankTransferPanel({ transfer, checking = false, onCheck, children }: Props) {
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      className="flex min-w-0 max-w-[640px] flex-col gap-md rounded-[20px] bg-card p-md shadow-card ring-1 ring-border/80 md:p-lg"
    >
      <header className="flex items-start gap-sm">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-tint-primary text-primary"
        >
          <Icon name="qrcode" size={22} color="currentColor" weight="duotone" />
        </span>
        <div className="min-w-0">
          <h2 id={titleId} className="font-sign text-[18px] font-bold leading-6 text-text">
            Chuyển khoản qua VietQR
          </h2>
          <p className="mt-0.5 text-body-md text-muted">
            Mở ứng dụng ngân hàng và quét mã. Hệ thống tự xác nhận khi tiền về tài khoản.
          </p>
        </div>
      </header>

      <img
        src={transfer.qrImageUrl}
        alt={`Mã VietQR chuyển ${formatVnd(transfer.amount)} tới ${transfer.bankName} ${transfer.accountNumber}, nội dung ${transfer.transferContent}`}
        width={240}
        height={240}
        className="mx-auto aspect-square w-[240px] max-w-full rounded-[16px] bg-white p-2 ring-1 ring-border"
      />

      <dl className="flex flex-col divide-y divide-border rounded-[16px] bg-sunken/60 px-sm">
        <Detail label="Ngân hàng" value={transfer.bankName} />
        <Detail
          label="Số tài khoản"
          value={transfer.accountNumber}
          onCopy={() => void copy(transfer.accountNumber, 'số tài khoản')}
        />
        {transfer.accountName ? <Detail label="Chủ tài khoản" value={transfer.accountName} /> : null}
        <Detail
          label="Số tiền"
          value={formatVnd(transfer.amount)}
          onCopy={() => void copy(String(transfer.amount), 'số tiền')}
        />
        <Detail
          label="Nội dung chuyển khoản"
          value={transfer.transferContent}
          onCopy={() => void copy(transfer.transferContent, 'nội dung chuyển khoản')}
          emphasis
        />
      </dl>
      <p className="flex items-start gap-xs text-body-sm text-[#6B4100] dark:text-[#FFD27A]">
        <Icon name="information-outline" size={18} color="currentColor" className="mt-0.5 shrink-0" />
        <span>
          Giữ nguyên nội dung <span className="font-semibold">{transfer.transferContent}</span> và đúng
          số tiền. Thiếu hoặc sai nội dung, hệ thống không nhận ra khoản của bạn.
        </span>
      </p>

      <p
        role="status"
        aria-live="polite"
        className="flex items-center gap-xs text-body-md font-medium text-text"
      >
        <span
          aria-hidden="true"
          className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent motion-reduce:animate-none"
        />
        {checking ? 'Đang kiểm tra với ngân hàng…' : 'Đang chờ tiền về. Trang tự kiểm tra mỗi 5 giây.'}
      </p>

      <div className="flex flex-col gap-sm">
        <Button
          label="Tôi đã chuyển khoản, kiểm tra ngay"
          variant="outline"
          loading={checking}
          disabled={checking}
          onPress={onCheck}
        />
        {children}
      </div>
    </section>
  );
}

function Detail({
  label,
  value,
  onCopy,
  emphasis = false,
}: {
  label: string;
  value: string;
  onCopy?: () => void;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-sm py-xs">
      <div className="min-w-0">
        <dt className="text-body-sm text-muted">{label}</dt>
        <dd
          className={`break-all font-sign tabular-nums text-text ${
            emphasis ? 'text-[18px] font-bold tracking-[0.04em] text-primary' : 'text-[16px] font-semibold'
          }`}
        >
          {value}
        </dd>
      </div>
      {onCopy ? (
        <button
          type="button"
          onClick={onCopy}
          aria-label={`Sao chép ${label.toLowerCase()}`}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-card hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          <Icon name="content-copy" size={18} color="currentColor" />
        </button>
      ) : null}
    </div>
  );
}
