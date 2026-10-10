import { useEffect, useRef, type ReactNode } from 'react';

import { Button, Icon, type IconName } from '@/components/common';
import { TextField } from '@/components/forms';
import { VERDICT_TONES } from '@/components/illustrations';
import type { WardComplianceFlag, WardViolationDetail } from '../../../ward-api';
import { daysUntil, prefersReducedMotion } from './violation-utils';

const OK = VERDICT_TONES.ok;
const PENDING = VERDICT_TONES.pending;
const DANGER = VERDICT_TONES.danger;

/** A conclusion line on a pale wash of its own colour, always with a glyph (≥7:1). */
export function Outcome({
  tone,
  icon,
  role,
  children,
}: {
  tone: 'ok' | 'pending' | 'danger';
  icon: IconName;
  role?: 'alert' | 'status';
  children: ReactNode;
}) {
  const t = { ok: OK, pending: PENDING, danger: DANGER }[tone];
  return (
    <div
      role={role}
      className={`flex items-start gap-xs rounded-[14px] px-sm py-sm ${t.wash} ${t.ink}`}
    >
      <Icon name={icon} size={20} color="currentColor" weight="fill" className="mt-0.5 shrink-0" />
      <div className="min-w-0 text-body-md font-medium leading-snug">{children}</div>
    </div>
  );
}

type DeliveryProps = {
  violation: WardViolationDetail;
  deliveredToName: string;
  onDeliveredToName: (v: string) => void;
  refusalReason: string;
  onRefusalReason: (v: string) => void;
  submitting: boolean;
  onDelivered: () => void;
  onRefused: () => void;
};

/** Handing the record over on the spot: to whom, or that it was refused and why. */
export function DeliveryPanel({
  violation,
  deliveredToName,
  onDeliveredToName,
  refusalReason,
  onRefusalReason,
  submitting,
  onDelivered,
  onRefused,
}: DeliveryProps) {
  if (violation.deliveredAt) {
    return (
      <Outcome tone="ok" icon="check-circle">
        Đã giao cho {violation.deliveredToName} lúc{' '}
        {new Date(violation.deliveredAt).toLocaleString('vi-VN')}
      </Outcome>
    );
  }
  if (violation.deliveryRefused) {
    return (
      <Outcome tone="danger" icon="close-circle-outline">
        Người vi phạm từ chối nhận: {violation.deliveryRefusalReason}
      </Outcome>
    );
  }
  return (
    <div className="grid gap-sm md:grid-cols-2">
      <div className="cq flex flex-col gap-sm rounded-[16px] bg-sunken/60 p-sm">
        <p className="flex items-center gap-1.5 text-label text-text">
          <Icon name="send-outline" size={16} color="currentColor" className="text-primary" />
          Giao tận tay
        </p>
        <TextField
          label="Người nhận biên bản"
          value={deliveredToName}
          onChangeText={onDeliveredToName}
        />
        <Button
          label={submitting ? 'Đang ghi nhận...' : 'Đã giao biên bản'}
          variant="approve"
          disabled={submitting || !deliveredToName.trim()}
          onPress={onDelivered}
        />
      </div>
      <div className="cq flex flex-col gap-sm rounded-[16px] bg-sunken/60 p-sm">
        <p className="flex items-center gap-1.5 text-label text-text">
          <Icon name="block-helper" size={16} color="currentColor" className="text-muted" />
          Người vi phạm không nhận
        </p>
        <TextField
          label="Hoặc lý do từ chối nhận (nếu có)"
          value={refusalReason}
          onChangeText={onRefusalReason}
        />
        <Button
          label="Người vi phạm từ chối nhận"
          variant="outline"
          disabled={submitting || !refusalReason.trim()}
          onPress={onRefused}
        />
      </div>
    </div>
  );
}

type ExplanationProps = {
  violation: WardViolationDetail;
  content: string;
  onContent: (v: string) => void;
  submitting: boolean;
  onSubmit: () => void;
};

/** Điều 61: how the violator may explain, by when (and how many days are left), and what they said. */
export function ExplanationPanel({
  violation,
  content,
  onContent,
  submitting,
  onSubmit,
}: ExplanationProps) {
  const left =
    violation.explanationDeadlineAt && !violation.explanationReceivedAt
      ? daysUntil(violation.explanationDeadlineAt)
      : null;
  return (
    <>
      <div className="flex flex-wrap items-center gap-x-sm gap-y-xs">
        <p className="text-body-lg text-text">
          Hình thức:{' '}
          <span className="font-semibold">
            {violation.explanationMethod === 'DIRECT' ? 'Trực tiếp' : 'Bằng văn bản'}
          </span>
          {violation.explanationDeadlineAt
            ? ` · Hạn: ${new Date(violation.explanationDeadlineAt).toLocaleString('vi-VN')}`
            : ''}
        </p>
        {left !== null ? (
          <span
            className={`inline-flex h-8 items-center gap-1 rounded-full px-sm text-label ${PENDING.wash} ${PENDING.ink}`}
          >
            <Icon name="timer-outline" size={15} color="currentColor" />
            {left > 0 ? `còn ${left} ngày` : 'đã hết hạn'}
          </span>
        ) : null}
      </div>
      {violation.explanationReceivedAt ? (
        <Outcome tone="ok" icon="check-circle">
          Đã nhận giải trình lúc {new Date(violation.explanationReceivedAt).toLocaleString('vi-VN')}
          {violation.explanationContent ? `: “${violation.explanationContent}”` : ''}
        </Outcome>
      ) : (
        <div className="flex flex-col gap-sm">
          <TextField
            label="Nội dung giải trình của người vi phạm"
            value={content}
            onChangeText={onContent}
            multiline
          />
          <div>
            <Button
              label={submitting ? 'Đang ghi nhận...' : 'Ghi nhận giải trình'}
              variant="outline"
              fullWidth={false}
              disabled={submitting || !content.trim()}
              onPress={onSubmit}
            />
          </div>
        </div>
      )}
    </>
  );
}

/** Advisory only (BR-41): no action here; revocation is decided on the permit screen. */
export function RevocationAdvisory({ flag }: { flag: WardComplianceFlag }) {
  return (
    <div className={`flex gap-sm rounded-[18px] p-md ring-1 ring-[#6B4100]/15 ${PENDING.wash}`}>
      <span
        aria-hidden="true"
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card ${PENDING.ink}`}
      >
        <Icon name="shield-alert-outline" size={22} color="currentColor" weight="fill" />
      </span>
      <div className={`min-w-0 ${PENDING.ink}`}>
        <p className="text-[16px] font-bold leading-snug">Đề xuất xem xét thu hồi giấy phép</p>
        {flag.violationThresholdReached ? (
          <p className="mt-1 text-body-md">
            Đã đạt {flag.sanctionedViolationCount}/{flag.violationThreshold} lần vi phạm đã có quyết
            định xử phạt trong cửa sổ thời gian phường đã cấu hình.
          </p>
        ) : null}
        {flag.hasOverduePenalty ? (
          <p className="mt-1 text-body-md">
            Còn khoản phạt chưa nộp quá {flag.overduePenaltyDays} ngày.
          </p>
        ) : null}
        <p className="mt-1 text-body-sm">
          Chỉ là gợi ý — cán bộ tự quyết định có thu hồi giấy phép sử dụng tạm thời hè phố hay
          không, tại màn hình quản lý giấy phép tương ứng.
        </p>
      </div>
    </div>
  );
}

/** Who will sign, as the server knows it from the signed-in account; never typed here. */
export function SignerBlock({ title }: { title: string | null | undefined }) {
  return (
    <div className="flex flex-col gap-xs">
      <p className="text-label text-text">
        Người ký quyết định (Chủ tịch/Phó Chủ tịch UBND Phường hoặc người được uỷ quyền — không phải
        cán bộ lập biên bản)
      </p>
      {title === undefined ? (
        <p role="status" className="flex items-center gap-xs text-body-md text-muted">
          <span
            aria-hidden="true"
            className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
          Đang kiểm tra thẩm quyền tài khoản…
        </p>
      ) : title ? (
        <Outcome tone="ok" icon="shield-check-outline">
          Ký với tư cách: <strong>{title}</strong>
        </Outcome>
      ) : (
        <Outcome tone="danger" icon="lock-outline" role="alert">
          Tài khoản của bạn chưa được giao thẩm quyền ký quyết định xử phạt. Chỉ Chủ tịch, Phó Chủ
          tịch UBND phường hoặc người được uỷ quyền bằng văn bản mới được ký.
        </Outcome>
      )}
    </div>
  );
}

/**
 * The server refused because the giải trình window is still open: its own words,
 * and the officer's explicit acknowledgement for the next "Ban hành".
 */
export function EarlySanctionBlock({
  message,
  checked,
  onChecked,
}: {
  message: string;
  checked: boolean;
  onChecked: (v: boolean) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView?.({
      block: 'nearest',
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });
  }, [message]);
  return (
    <div
      ref={ref}
      className={`flex flex-col gap-sm rounded-[18px] p-md ring-1 ring-[#8F1717]/20 ${DANGER.wash}`}
    >
      <p
        role="alert"
        className={`flex items-start gap-xs text-body-md font-semibold ${DANGER.ink}`}
      >
        <Icon
          name="alert-octagon-outline"
          size={20}
          color="currentColor"
          className="mt-0.5 shrink-0"
        />
        {message}
      </p>
      <label className="flex min-h-12 cursor-pointer items-center gap-sm rounded-[12px] bg-card px-sm py-xs has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary">
        <input
          type="checkbox"
          className="h-5 w-5 shrink-0 accent-[rgb(var(--c-primary))]"
          checked={checked}
          onChange={(e) => onChecked(e.target.checked)}
        />
        <span className="text-body-md text-text">
          Tôi xác nhận vẫn ra quyết định xử phạt ngay dù còn thời hạn giải trình.
        </span>
      </label>
    </div>
  );
}

/** The amount of the chosen penalty frame, large, beside "Khung xử phạt áp dụng". */
export function SanctionAmount({ amount }: { amount: number | null }) {
  return (
    <div
      className={`flex flex-wrap items-baseline justify-between gap-x-md gap-y-1 rounded-[16px] px-md py-sm ${DANGER.wash} ${DANGER.ink}`}
    >
      <span className="text-body-md font-semibold">Số tiền theo khung đang chọn</span>
      {amount !== null ? (
        <span
          key={amount}
          className="sb-pop font-tabular font-sign text-[30px] font-extrabold leading-tight [font-stretch:86%]"
        >
          {amount.toLocaleString('vi-VN')} đ
        </span>
      ) : (
        <span className="text-body-md font-semibold">Chưa chọn khung xử phạt</span>
      )}
    </div>
  );
}
