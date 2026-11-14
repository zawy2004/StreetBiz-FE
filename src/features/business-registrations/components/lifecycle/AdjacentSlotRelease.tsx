import { Icon } from '@/components/common';
import { StatusChip } from '@/components/status';
import type { AddressChangeRequest, RentalContract } from '@/core/api/side-api';

/** Grace days the server counts from the day the change is requested (mirrors AdjacentSlotRelease.GraceDays). */
export const RELEASE_GRACE_DAYS = 7;

const day = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'Asia/Ho_Chi_Minh',
});
const formatDay = (iso: string) => day.format(new Date(`${iso.slice(0, 10)}T00:00:00+07:00`));

/**
 * SIDE-10: which of the vendor's current slots is given back after the move. Nothing is chosen by
 * default; the slot is only returned after the grace period and only once nothing is owed on it.
 */
export function ReleaseSlotPicker({
  contracts,
  value,
  onChange,
}: {
  contracts: RentalContract[];
  value: number | null;
  onChange: (contractId: number | null) => void;
}) {
  if (contracts.length === 0) return null;
  return (
    <fieldset className="flex max-w-[600px] flex-col gap-xs">
      <legend className="text-label font-semibold text-text">Ô liền kề cũ cần trả (không bắt buộc)</legend>
      <p className="text-body-sm text-muted">
        Ô được trả sau {RELEASE_GRACE_DAYS} ngày ân hạn kể từ khi gửi yêu cầu, và chỉ khi không còn
        phí quá hạn hoặc tiền phạt chưa nộp. Phường có thể gia hạn hoặc để bạn giữ ô.
      </p>
      <label className="flex min-h-11 cursor-pointer items-center gap-xs rounded-[12px] border border-border bg-card px-sm">
        <input
          type="radio"
          name="release-slot"
          checked={value === null}
          onChange={() => onChange(null)}
        />
        <span className="text-body-md text-text">Chưa trả ô nào</span>
      </label>
      {contracts.map((contract) => (
        <label
          key={contract.contractId}
          className="flex min-h-11 cursor-pointer items-center gap-xs rounded-[12px] border border-border bg-card px-sm"
        >
          <input
            type="radio"
            name="release-slot"
            checked={value === contract.contractId}
            onChange={() => onChange(contract.contractId)}
          />
          <span className="text-body-md text-text">
            Trả ô <span className="font-sign font-semibold">{contract.slotCode}</span>
            <span className="text-muted"> · {contract.zoneName}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}

/** What the vendor sees of earlier requests: where each stands, and when the old slot goes back. */
export function AddressChangeHistory({ changes }: { changes: AddressChangeRequest[] }) {
  if (changes.length === 0) return null;
  return (
    <section aria-label="Yêu cầu đổi địa chỉ đã gửi" className="flex max-w-[600px] flex-col gap-sm">
      <h2 className="text-headline-md text-text">Yêu cầu đã gửi</h2>
      <ul className="flex flex-col gap-sm">
        {changes.map((change) => (
          <li
            key={change.addressChangeId}
            className="flex flex-col gap-xs rounded-[16px] bg-card p-md shadow-card ring-1 ring-border/80"
          >
            <div className="flex items-start justify-between gap-sm">
              <span className="min-w-0 break-words text-body-md font-semibold text-text">
                {change.newAddress}
              </span>
              <StatusChip code={change.changeStatus} />
            </div>
            <ReleaseLine change={change} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ReleaseLine({ change }: { change: AddressChangeRequest }) {
  if (change.releaseState === 'PENDING_RELEASE' && change.releaseGraceEndsOn) {
    return (
      <p
        className={`flex items-start gap-xs text-body-sm ${change.releaseBlockedByDebt ? 'font-medium text-error' : 'text-text'}`}
      >
        <Icon
          name={change.releaseBlockedByDebt ? 'alert-circle-outline' : 'clock-outline'}
          size={18}
          color="currentColor"
          className="mt-px shrink-0"
        />
        <span>
          Ô {change.releasedSlotCode} chờ trả, ân hạn đến {formatDay(change.releaseGraceEndsOn)}.
          {change.releaseBlockedByDebt
            ? ' Bạn còn phí quá hạn hoặc tiền phạt chưa nộp nên ô chưa thể được trả. Hãy thanh toán trước.'
            : ' Cần đổi ý? Phường có thể gia hạn hoặc cho bạn giữ ô.'}
        </span>
      </p>
    );
  }
  if (change.releaseState === 'RELEASED') {
    return (
      <p className="flex items-start gap-xs text-body-sm text-text">
        <Icon name="check-circle-outline" size={18} color="currentColor" className="mt-px shrink-0 text-tertiary" />
        Đã trả ô {change.releasedSlotCode}.
      </p>
    );
  }
  return null;
}
