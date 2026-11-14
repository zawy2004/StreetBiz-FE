import type { Ref } from 'react';

import { Icon } from '@/components/common';
import { PermitStamp, VERDICT_TONES } from '@/components/illustrations';
import { SlotPlate } from '@/features/buyer-discovery/components/storefront/SlotPlate';
import type { PermitVerification } from '@/features/vendor-map/community-api';
import { passSentence, passTone, passVerdict } from '@/features/vendor-map/scan-format';
import { formatVnDay } from '../price-board-format';

const VERDICT_EN: Record<string, string> = {
  VALID: 'Valid permit',
  NOT_YET_VALID: 'Not yet valid',
  SUSPENDED: 'Suspended',
  EXPIRED: 'Expired',
  REVOKED: 'Revoked',
};

/** The verdict in English; a result marked invalid never reads "Valid permit", whatever its status. */
function verdictEn(status: string, isValid: boolean): string {
  if (isValid) return VERDICT_EN[status] ?? VERDICT_EN.VALID!;
  return status !== 'VALID' && VERDICT_EN[status] ? VERDICT_EN[status] : 'Not valid';
}

const SENTENCE_EN: Record<string, string> = {
  ok: 'This stall holds a valid permit for this sidewalk slot.',
  pending: 'This permit has not started yet.',
  danger: 'This permit is no longer valid.',
};

const timeFormat = new Intl.DateTimeFormat('vi-VN', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  timeZone: 'Asia/Ho_Chi_Minh',
});

type Props = {
  result: PermitVerification;
  /** When this answer came from the server; the stamp comes down once per answer. */
  checkedAt: Date | null;
  headingRef?: Ref<HTMLHeadingElement>;
};

/**
 * The live verdict on the public page, in Vietnamese with English beneath: the slot plate,
 * the verdict in large words on a pale wash of its tone, the ward stamp only while the
 * permit is valid, then whose stall it is and how long the permit runs.
 */
export function PermitVerdictCard({ result, checkedAt, headingRef }: Props) {
  if (!result.permitId) {
    const tone = VERDICT_TONES.danger;
    return (
      <section
        aria-label="Kết quả kiểm tra giấy phép"
        aria-live="polite"
        className={`sb-pop flex flex-col items-center gap-sm rounded-[28px] border-2 border-dashed border-[#8F1717]/45 px-lg py-xl text-center dark:border-[#FF9A90]/45 ${tone.wash}`}
      >
        <span
          aria-hidden="true"
          className={`flex h-16 w-16 items-center justify-center rounded-full bg-card shadow-card ${tone.ink}`}
        >
          <Icon name="qrcode-remove" size={34} color="currentColor" />
        </span>
        <h2
          ref={headingRef}
          tabIndex={-1}
          className={`font-sign text-[30px] font-extrabold leading-tight outline-none [font-stretch:90%] ${tone.ink}`}
        >
          Mã QR không hợp lệ
          <span lang="en" className="block text-[18px] font-semibold">
            Invalid QR code
          </span>
        </h2>
        <p className="max-w-[46ch] text-body-md text-text/80">
          Không có giấy phép nào khớp với mã này; mã có thể đã bị sửa hoặc là mã giả. Lần kiểm tra
          đã được ghi nhận.
          <span lang="en" className="block text-body-sm text-muted">
            No permit matches this code; it may have been altered or faked. This check was logged.
          </span>
        </p>
      </section>
    );
  }

  const tone = passTone(result.status, result.isValid);
  const verdict = VERDICT_TONES[tone];
  const sentence = passSentence(tone, result.slotCode);
  const from = formatVnDay(result.validFrom) ?? '—';
  const until = formatVnDay(result.validUntil) ?? '—';

  return (
    <section
      aria-label="Kết quả kiểm tra giấy phép"
      aria-live="polite"
      className="sb-pop overflow-hidden rounded-[28px] bg-card shadow-sheet ring-1 ring-border"
    >
      <div aria-hidden="true" className="sb-kerb sb-kerb-thin" />
      <div className={`relative overflow-hidden p-md md:p-lg ${verdict.wash}`}>
        <div className="relative z-10 pr-[104px] md:pr-[140px]">
          <SlotPlate code={result.slotCode} size="lg" />
        </div>
        <div
          className={`relative z-10 mt-md flex items-start gap-sm pr-[88px] md:pr-[140px] ${verdict.ink}`}
        >
          <Icon
            name={verdict.icon}
            size={40}
            color="currentColor"
            weight="fill"
            className="mt-1 shrink-0"
          />
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="font-sign text-[38px] font-extrabold leading-none tracking-[-0.01em] outline-none [font-stretch:88%] md:text-[48px]"
          >
            {passVerdict(result.status, result.isValid)}
            <span lang="en" className="mt-1 block text-[18px] font-semibold tracking-normal">
              {verdictEn(result.status, result.isValid)}
            </span>
          </h2>
        </div>
        {sentence ? (
          <p
            className={`relative z-10 mt-sm max-w-[42ch] text-body-lg font-semibold ${verdict.ink}`}
          >
            {sentence}
            {SENTENCE_EN[tone] ? (
              <span lang="en" className="block text-body-md font-normal">
                {SENTENCE_EN[tone]}
              </span>
            ) : null}
          </p>
        ) : null}
        {result.isValid ? (
          <PermitStamp
            key={checkedAt?.getTime() ?? 'pass'}
            icon={verdict.icon}
            inkClass={verdict.ink}
            strokeClass={verdict.stroke}
            className="absolute -right-2 top-3 h-[108px] w-[108px] [animation-delay:120ms] md:right-md md:top-md md:h-[128px] md:w-[128px]"
          />
        ) : null}
      </div>

      <div className="flex flex-col gap-md p-md md:p-lg">
        {result.displayName ? (
          <p className="text-[22px] font-semibold leading-snug tracking-[-0.01em] text-text">
            {result.displayName}
          </p>
        ) : null}
        <dl className="grid gap-px overflow-hidden rounded-[16px] bg-border ring-1 ring-border sm:grid-cols-2">
          <div className="flex flex-col gap-1 bg-card p-sm md:p-md">
            <dt className="text-body-xs text-muted">
              Ô được cấp phép <span lang="en">· Licensed slot</span>
            </dt>
            <dd className="text-[17px] font-semibold leading-snug text-text">
              {result.slotCode ?? '—'}
            </dd>
          </div>
          <div className="flex flex-col gap-1 bg-card p-sm md:p-md">
            <dt className="text-body-xs text-muted">
              Thời hạn <span lang="en">· Valid</span>
            </dt>
            <dd className="text-[17px] font-semibold leading-snug text-text">{`${from} – ${until}`}</dd>
          </div>
        </dl>
        {checkedAt ? (
          <p className="flex items-center gap-1.5 text-body-sm text-muted">
            <Icon name="cloud-check-outline" size={16} color="currentColor" />
            <span>
              Tra trực tiếp với máy chủ lúc {timeFormat.format(checkedAt)}
              <span lang="en"> · Checked live with the server</span>
            </span>
          </p>
        ) : null}
      </div>
    </section>
  );
}
