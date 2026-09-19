import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button, Icon, Money } from '@/components/common';
import { showToast } from '@/components/feedback';
import { sideApi, SideApiError, type FeeQuoteLine, type SidewalkSlot } from '@/core/api/side-api';
import { useAuthStore } from '@/store/auth-store';
import { colors } from '@/theme';
import { formatCountdown, formatShortVnd, secondsUntil } from '../slot-format';
import { slotDisplayState } from '../slot-stats';
import { useHolds } from '../useHolds';
import { useDebouncedValue, useNow } from '../useNow';

const DEFAULT_TERM_DAYS = '90';
const MAX_TERM_DAYS = 365;

// Fixed wording: the backend only stores *that* the vendor ticked both, at what
// time, so these two sentences are the whole contract the checkbox stands for.
export const COMMITMENTS = [
  'Tôi kinh doanh đúng vị trí, diện tích, khung giờ được cấp và không lấn lối đi chung.',
  'Tôi giữ vệ sinh, tuân thủ phòng cháy chữa cháy và quy định của Phường.',
] as const;

type Props = { slot: SidewalkSlot };

function quoteLineLabel(line: FeeQuoteLine): string {
  if (line.kind === 'RENT') return `Tiền thuê ô (${formatShortVnd(line.unitAmount)}/ngày × ${line.quantity} ngày)`;
  return line.calcBasis === 'PER_DAY'
    ? `${line.label} (${formatShortVnd(line.unitAmount)}/ngày × ${line.quantity} ngày)`
    : `${line.label} (một lần)`;
}

/**
 * Everything a vendor does about one slot: pick the term, see the estimated
 * cost, hold it for a while, accept the commitments and apply. Shared by the
 * workspace's detail panel and the standalone /vendor/slots/:slotId screen.
 */
export function SlotApplyForm({ slot }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const nowMs = useNow();
  const { registration, holds, hold, release, refresh } = useHolds();

  const [termDays, setTermDays] = useState(DEFAULT_TERM_DAYS);
  const [accepted, setAccepted] = useState<boolean[]>(() => COMMITMENTS.map(() => false));

  const days = Number(termDays);
  const validDays = Number.isInteger(days) && days >= 1 && days <= MAX_TERM_DAYS;
  const debouncedDays = useDebouncedValue(days);

  const state = slotDisplayState(slot, nowMs);
  const myHold = holds.find((h) => h.slotId === slot.slotId);
  const heldByOther = state === 'HELD' && !myHold;

  // A hold lapses on its own; when the countdown reaches zero, re-read the
  // list so the basket and the slot's state stop showing it.
  useEffect(() => {
    if (myHold && Date.parse(myHold.expiresAt) <= nowMs) refresh();
  }, [myHold, nowMs, refresh]);

  const quote = useQuery({
    queryKey: ['side', userId, 'quote', slot.slotId, debouncedDays],
    queryFn: () => sideApi.getSlotQuote(slot.slotId, debouncedDays),
    enabled: validDays && debouncedDays === days,
    placeholderData: (previous) => previous,
  });

  const apply = useMutation({
    mutationFn: () =>
      sideApi.submitOpenSlotApplication({
        registrationId: registration!.registrationId,
        slotId: slot.slotId,
        requestedTermDays: days,
        commitmentsAccepted: accepted.every(Boolean),
      }),
    onSuccess: (result) => {
      showToast(result.message);
      refresh();
      void queryClient.invalidateQueries({ queryKey: ['side', userId, 'applications'] });
      navigate('/vendor/slots/rental-applications');
    },
    onError: (error) => {
      showToast(error instanceof SideApiError ? error.message : 'Không gửi được đơn thuê.');
      refresh();
    },
  });

  if (state !== 'AVAILABLE' && state !== 'HELD') {
    return (
      <p className="rounded-md bg-bg p-sm text-body-sm text-muted">
        {state === 'ACTIVE'
          ? 'Ô này đã có người thuê.'
          : state === 'PENDING'
            ? 'Ô này đang có đơn chờ duyệt.'
            : 'Ô này đang tạm ngưng.'}
      </p>
    );
  }

  if (!registration) {
    return (
      <p className="rounded-md bg-bg p-sm text-body-sm text-muted">
        Cần hồ sơ kinh doanh đã được duyệt để giữ chỗ hoặc nộp đơn.
      </p>
    );
  }

  const canSubmit = validDays && accepted.every(Boolean) && !heldByOther;

  return (
    <div className="flex flex-col gap-md">
      <label className="flex flex-col gap-xs text-label text-text">
        Số ngày thuê
        <input
          className="h-10 w-full rounded-sm border border-border bg-card px-sm text-body-md"
          value={termDays}
          onChange={(e) => setTermDays(e.target.value)}
          inputMode="numeric"
          aria-invalid={!validDays}
        />
      </label>

      <div className="overflow-hidden rounded-md border border-border">
        {!validDays ? (
          <p className="p-sm text-body-sm text-muted">Nhập 1 – {MAX_TERM_DAYS} ngày.</p>
        ) : quote.error ? (
          <p className="p-sm text-body-sm text-error">
            {quote.error instanceof SideApiError ? quote.error.message : 'Không tính được báo giá.'}
          </p>
        ) : quote.data ? (
          <ul className="divide-y divide-border">
            {quote.data.lines.map((line, i) => (
              <li key={`${line.kind}-${i}`} className="flex items-baseline justify-between gap-sm px-sm py-xs">
                <span className="text-body-sm text-text">{quoteLineLabel(line)}</span>
                <Money amountVnd={line.amount} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-sm text-body-sm text-muted">Đang tính báo giá…</p>
        )}
      </div>

      {quote.data && validDays && (
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-sm">
            <p className="text-headline-sm text-text">Tạm tính</p>
            <Money amountVnd={quote.data.total} size="lg" color={colors.tertiary} className="whitespace-nowrap" />
          </div>
          <p className="text-body-sm text-muted">Ước tính, chưa phải phí chính thức.</p>
        </div>
      )}

      <div className="flex flex-col gap-xs rounded-md bg-bg p-sm">
        {COMMITMENTS.map((text, i) => (
          <label key={text} className="flex items-start gap-xs text-body-sm text-text">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 shrink-0 accent-[#1A2238]"
              checked={accepted[i]}
              onChange={(e) => setAccepted((prev) => prev.map((v, j) => (j === i ? e.target.checked : v)))}
            />
            {text}
          </label>
        ))}
      </div>

      {heldByOther && slot.holdExpiresAt && (
        <p className="rounded-md bg-tint-secondary p-sm text-body-sm text-on-secondary">
          Ô đang được hộ khác giữ chỗ (còn {formatCountdown(secondsUntil(slot.holdExpiresAt, nowMs))}).
        </p>
      )}

      <div className="flex items-stretch gap-xs">
        <div className="min-w-0 flex-1">
          <Button
            label="Đăng ký & nộp hồ sơ"
            icon={<Icon name="check-circle-outline" size={20} color={colors.white} />}
            loading={apply.isPending}
            disabled={!canSubmit}
            onPress={() => apply.mutate()}
          />
        </div>
        {myHold ? (
          <div className="w-44 shrink-0">
            <Button
              variant="outline"
              label={`Nhả chỗ · ${formatCountdown(secondsUntil(myHold.expiresAt, nowMs))}`}
              icon={<Icon name="bookmark" size={18} color={colors.indigo} />}
              loading={release.isPending}
              onPress={() => release.mutate(slot.slotId)}
            />
          </div>
        ) : (
          <div className="w-44 shrink-0">
            <Button
              variant="outline"
              label="Giữ chỗ 15 phút"
              icon={<Icon name="bookmark-outline" size={18} color={colors.indigo} />}
              loading={hold.isPending}
              disabled={heldByOther}
              onPress={() => hold.mutate(slot.slotId)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
