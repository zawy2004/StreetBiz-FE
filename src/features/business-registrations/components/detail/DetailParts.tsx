import { useEffect, useId, useState, type ReactNode } from 'react';

import { Button, Icon } from '@/components/common';
import { Skeleton } from '@/components/feedback';
import { VERDICT_TONES } from '@/components/illustrations';
import { StatusChip } from '@/components/status';
import { vendorRegistrationApi, type ApiEvidence, type ApiRegistration } from '@/core/api';
import { isLiveApi } from '@/core/config/env';
import type { StatusTone } from '@/theme';
import { hkdCode } from '@/features/sidewalk-slots/slot-format';
import { vendorTypeLabel } from '../../labels';
import { EVIDENCE_LABELS } from '../../new-registration-store';
import { RegistrationTrack } from '../RegistrationTrack';
import { FrontageMiniArt, HousePlateArt, SlotTopArt } from '../registration-art';

const localDate = (iso: string) => new Date(iso).toLocaleDateString('vi-VN');
const sealDate = (iso: string) =>
  new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

/* ------------------------------------------------------------------- seal */

const SEAL_FILL: Record<StatusTone, string> = {
  ok: 'fill-[#E6F6EC] dark:fill-[#10301F]',
  pending: 'fill-[#FFF3D1] dark:fill-[#3A2A08]',
  danger: 'fill-[#FDEBEA] dark:fill-[#3A1414]',
  neutral: 'fill-[#EEF1F4] dark:fill-[#1D2833]',
};

type SealSpec = { lines: string[]; words: string; tone: StatusTone; decided: boolean };

function sealFor(status: string): SealSpec {
  switch (status) {
    case 'APPROVED':
      return { lines: ['ĐÃ', 'DUYỆT'], words: 'Đã duyệt', tone: 'ok', decided: true };
    case 'REJECTED':
      return { lines: ['TỪ', 'CHỐI'], words: 'Từ chối', tone: 'danger', decided: true };
    case 'MORE_INFORMATION_REQUIRED':
      return { lines: ['CẦN', 'BỔ SUNG'], words: 'Cần bổ sung', tone: 'pending', decided: true };
    case 'WITHDRAWN':
      return { lines: ['ĐÃ', 'RÚT'], words: 'Đã rút', tone: 'neutral', decided: false };
    case 'DRAFT':
      return { lines: ['NHÁP'], words: 'Nháp', tone: 'neutral', decided: false };
    default:
      return { lines: ['ĐANG', 'CHỜ XÉT'], words: 'Đang chờ xét', tone: 'neutral', decided: false };
  }
}

/**
 * The ward's round seal. Pressed down (sb-stamp, once) only when the ward has
 * decided; while waiting it is a dashed outline that turns very slowly. The ring
 * reads "PHƯỜNG · STREETBIZ · ĐÀ NẴNG" (no ward name: this screen does not load it).
 */
export function WardSeal({ status, reviewedAt }: { status: string; reviewedAt: string | null }) {
  const seal = sealFor(status);
  const tone = VERDICT_TONES[seal.tone];
  const ringId = `seal-ring-${useId().replace(/:/g, '')}`;
  const date = seal.decided && reviewedAt ? sealDate(reviewedAt) : null;
  const ink = seal.decided ? tone.ink : 'text-muted';
  const stroke = seal.decided ? tone.stroke : 'stroke-muted';

  return (
    <div
      role="img"
      aria-label={date ? `Kết quả: ${seal.words} ngày ${date}` : `Kết quả: ${seal.words}`}
      className={`relative h-[104px] w-[104px] shrink-0 md:h-[136px] md:w-[136px] ${ink} ${
        seal.decided ? 'sb-stamp' : ''
      }`}
    >
      <svg viewBox="0 0 140 140" className="h-full w-full">
        <defs>
          <path id={ringId} d="M70 70 m-52 0 a52 52 0 1 1 104 0 a52 52 0 1 1 -104 0" />
        </defs>
        <circle
          cx="70"
          cy="70"
          r="64"
          className={seal.decided ? SEAL_FILL[seal.tone] : 'fill-card'}
        />
        <g
          style={
            seal.decided
              ? undefined
              : { transformOrigin: '70px 70px', animation: 'sb-spin 20s linear infinite' }
          }
        >
          <circle
            cx="70"
            cy="70"
            r="64"
            fill="none"
            strokeWidth="4"
            strokeDasharray={seal.decided ? undefined : '9 7'}
            className={stroke}
          />
          <text
            fill="currentColor"
            fontSize="11"
            fontWeight="800"
            letterSpacing="2"
            className="font-sign"
          >
            <textPath href={`#${ringId}`}>PHƯỜNG · STREETBIZ · ĐÀ NẴNG · PHƯỜNG ·</textPath>
          </text>
        </g>
        <circle
          cx="70"
          cy="70"
          r="42"
          fill="none"
          strokeWidth="2"
          strokeDasharray={seal.decided ? undefined : '4 4'}
          className={stroke}
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {seal.lines.map((l) => (
          <span
            key={l}
            className="font-sign text-[14px] font-extrabold leading-[1.05] [font-stretch:75%] md:text-[18px]"
          >
            {l}
          </span>
        ))}
        {date ? (
          <span className="mt-0.5 text-[10px] font-bold font-tabular md:text-[11px]">{date}</span>
        ) : null}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ cover */

/** The folder cover: name, code, dates and the journey on the left, the seal on the right. */
export function RegistrationCover({ registration: r }: { registration: ApiRegistration }) {
  return (
    <section className="relative overflow-hidden rounded-[28px] bg-card shadow-card ring-1 ring-border">
      <div aria-hidden="true" className="sb-kerb sb-kerb-thin" />
      <div className="relative flex flex-col gap-md p-md md:p-lg">
        <div className="absolute right-sm top-sm md:right-lg md:top-lg">
          <WardSeal status={r.registrationStatus} reviewedAt={r.reviewedAt} />
        </div>
        <div className="flex min-w-0 flex-col gap-xs pr-[112px] md:pr-[160px]">
          <h1
            title={r.displayName}
            className="line-clamp-2 break-words font-sign text-[26px] font-extrabold leading-[32px] tracking-[-0.02em] text-text md:text-[34px] md:leading-[40px]"
          >
            {r.displayName}
          </h1>
          <p className="flex flex-wrap items-center gap-x-sm gap-y-1 text-body-md text-muted">
            <span className="inline-flex h-7 items-center rounded-[6px] bg-sunken px-2 font-sign text-[15px] font-bold tracking-[0.03em] text-text [font-stretch:72%] font-tabular">
              {hkdCode(r.registrationId)}
            </span>
            <span>{vendorTypeLabel(r.vendorType)}</span>
          </p>
          <p className="flex flex-wrap items-center gap-x-sm gap-y-1 text-body-md text-muted">
            <span>Nộp ngày {localDate(r.createdAt)}</span>
            {r.reviewedAt ? <span>Xét duyệt ngày {localDate(r.reviewedAt)}</span> : null}
            <StatusChip code={r.registrationStatus} />
          </p>
        </div>
        <div className="max-w-[560px] pt-xs">
          <RegistrationTrack
            status={r.registrationStatus}
            createdAt={r.createdAt}
            reviewedAt={r.reviewedAt}
            size="lg"
          />
        </div>
      </div>
    </section>
  );
}

export function CoverSkeleton() {
  return (
    <div role="status" aria-label="Đang tải" className="flex flex-col gap-lg">
      <div className="overflow-hidden rounded-[28px] bg-card shadow-card ring-1 ring-border">
        <div aria-hidden="true" className="sb-kerb sb-kerb-thin opacity-50" />
        <div className="flex items-start justify-between gap-md p-lg">
          <div className="flex flex-1 flex-col gap-sm">
            <Skeleton className="h-9 w-3/4" />
            <Skeleton className="h-9 w-1/2" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-sm h-6 w-full max-w-[420px]" />
          </div>
          <Skeleton className="h-[104px] w-[104px] shrink-0 rounded-full md:h-[136px] md:w-[136px]" />
        </div>
      </div>
      <Skeleton className="h-[120px] w-full rounded-[20px]" />
      <Skeleton className="h-[120px] w-full rounded-[20px]" />
    </div>
  );
}

/* --------------------------------------------------------------- feedback */

const FEEDBACK_TONE: Record<string, StatusTone> = {
  APPROVED: 'ok',
  MORE_INFORMATION_REQUIRED: 'pending',
  REJECTED: 'danger',
};

/**
 * "Phản hồi từ Phường" as a note clipped to the folder, in the colour of the
 * decision (green approved, mango needs more, red rejected, grey otherwise).
 */
export function WardFeedbackNote({
  status,
  reason,
  needsMoreInfo,
  action,
}: {
  status: string;
  reason: string;
  needsMoreInfo: boolean;
  action?: ReactNode;
}) {
  const headingId = useId();
  const tone = VERDICT_TONES[FEEDBACK_TONE[status] ?? 'neutral'];
  const bar = {
    ok: 'bg-[#0B5D33] dark:bg-[#8BE3B0]',
    pending: 'bg-secondary',
    danger: 'bg-[#8F1717] dark:bg-[#FF9A90]',
    neutral: 'bg-[#2B3640] dark:bg-[#C5D0DA]',
  }[FEEDBACK_TONE[status] ?? 'neutral'];

  return (
    <section
      aria-labelledby={headingId}
      className={`relative rotate-[0.6deg] overflow-visible rounded-[18px] p-md pl-lg shadow-card md:p-lg md:pl-xl ${tone.wash}`}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-y-0 left-0 w-1.5 rounded-l-[18px] ${bar}`}
      />
      <svg
        viewBox="0 0 24 48"
        aria-hidden="true"
        className="absolute -top-4 right-lg h-10 w-5 -rotate-6 text-muted"
      >
        <path
          d="M8 30 V10 a4 4 0 0 1 8 0 V34 a6 6 0 0 1 -12 0 V14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
      <h2 id={headingId} className={`text-label ${tone.ink}`}>
        Phản hồi từ Phường
      </h2>
      <p className="mt-xs text-[18px] leading-[28px] text-text">“{reason}”</p>
      {needsMoreInfo ? (
        <p className={`mt-xs text-body-md font-medium ${tone.ink}`}>
          Cập nhật hồ sơ theo yêu cầu rồi gửi lại để được xét duyệt tiếp.
        </p>
      ) : null}
      {action ? <div className="mt-md sm:max-w-[260px]">{action}</div> : null}
    </section>
  );
}

/* ------------------------------------------------------------ submitted info */

const GENDER: Record<string, string> = { MALE: 'Nam', FEMALE: 'Nữ', OTHER: 'Khác' };
const ID_TYPE: Record<string, string> = { CCCD: 'CCCD gắn chip', PASSPORT: 'Hộ chiếu' };
const dash = (v: string | null | undefined) => (v && v.trim() ? v : '—');

function InfoGrid({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-lg md:grid-cols-2">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex min-w-0 flex-col gap-0.5 border-b border-border/70 py-sm last:border-b-0 md:[&:nth-last-child(2):nth-child(odd)]:border-b-0"
        >
          <dt className="text-[13px] leading-[18px] text-muted">{row.label}</dt>
          <dd className="break-words text-[16px] font-medium leading-6 text-text">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Group({ title, count, children }: { title: string; count?: number; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  return (
    <div className="border-t border-border">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-12 w-full items-center justify-between gap-sm py-xs text-left text-[15px] font-semibold text-text"
      >
        <span>
          {title}
          {count != null ? <span className="ml-1 text-muted">({count})</span> : null}
        </span>
        <Icon
          name="chevron-down"
          size={18}
          color="currentColor"
          className={`text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div id={panelId} hidden={!open} className="pb-sm">
        {children}
      </div>
    </div>
  );
}

/** "Thông tin đã nộp": the seven lines always shown, then the rest of Mẫu số 01 folded. */
export function SubmittedInfo({ registration: r }: { registration: ApiRegistration }) {
  const headingId = useId();
  const main = [
    { label: 'Tên hộ kinh doanh', value: r.displayName },
    { label: 'Loại hình', value: vendorTypeLabel(r.vendorType) },
    {
      label: 'Địa chỉ kinh doanh',
      value: r.declaredAddress ?? 'Không khai báo (bán hàng lưu động)',
    },
    { label: 'Ưu tiên xử lý nhanh', value: r.fastTrackFlag ? 'Có' : 'Không' },
    { label: 'Ngành, nghề kinh doanh', value: r.businessLine ?? 'Chưa cập nhật' },
    {
      label: 'Vốn kinh doanh / Số lao động',
      value: `${r.capitalAmount != null ? `${r.capitalAmount.toLocaleString('vi-VN')} đ` : '—'} · ${r.laborCount ?? '—'} lao động`,
    },
    {
      label: 'Cam kết an toàn thực phẩm',
      value: r.foodSafetyCommitmentAt ? 'Đã cam kết' : 'Chưa cam kết',
    },
  ];
  const owner = [
    { label: 'Ngày sinh', value: dash(r.ownerDateOfBirth) },
    { label: 'Giới tính', value: r.ownerGender ? (GENDER[r.ownerGender] ?? r.ownerGender) : '—' },
    { label: 'Dân tộc', value: dash(r.ownerEthnicity) },
    { label: 'Quốc tịch', value: dash(r.ownerNationality) },
    { label: 'Loại giấy tờ pháp lý', value: r.idType ? (ID_TYPE[r.idType] ?? r.idType) : '—' },
    { label: 'Ngày cấp', value: dash(r.idIssuedDate) },
    { label: 'Nơi cấp', value: dash(r.idIssuedPlace) },
    { label: 'Địa chỉ thường trú', value: dash(r.permanentAddress) },
    { label: 'Địa chỉ liên lạc', value: dash(r.contactAddress) },
  ];
  const other = [
    { label: 'Ngày dự kiến bắt đầu hoạt động', value: dash(r.plannedStartDate) },
    ...(r.businessLineCode ? [{ label: 'Mã ngành', value: r.businessLineCode }] : []),
  ];

  return (
    <section
      aria-labelledby={headingId}
      className="rounded-[24px] bg-card p-md shadow-card ring-1 ring-border md:p-lg"
    >
      <h2 id={headingId} className="font-sign text-[21px] font-extrabold leading-tight text-text">
        Thông tin đã nộp
      </h2>
      <div className="mt-xs">
        <InfoGrid rows={main} />
      </div>
      {r.identityVerifiedAt ? (
        <p className="mb-sm flex items-start gap-1.5 rounded-[12px] bg-[#E6F6EC] px-sm py-xs text-body-md font-medium text-[#0B5D33] dark:bg-[#10301F] dark:text-[#8BE3B0]">
          <Icon
            name="shield-check-outline"
            size={18}
            color="currentColor"
            className="mt-0.5 shrink-0"
          />
          <span>
            Phường đã xác minh danh tính ngày {localDate(r.identityVerifiedAt)}
            {r.identityVerificationNote ? (
              <span className="block text-text/75">{r.identityVerificationNote}</span>
            ) : null}
          </span>
        </p>
      ) : null}
      <Group title="Chủ hộ kinh doanh" count={owner.length}>
        <InfoGrid rows={owner} />
      </Group>
      <Group title="Thành viên hộ gia đình" count={r.householdMembers.length}>
        {r.householdMembers.length === 0 ? (
          <p className="text-body-md text-muted">Không khai báo thành viên góp vốn.</p>
        ) : (
          <ul className="flex flex-col gap-xs">
            {r.householdMembers.map((m, i) => (
              <li
                key={m.memberId ?? i}
                className="flex items-center gap-sm rounded-[14px] bg-sunken/60 p-sm"
              >
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card font-sign text-[15px] font-extrabold text-primary ring-1 ring-border"
                >
                  {m.fullName.trim().charAt(0).toUpperCase() || i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-text">
                    {m.fullName}
                  </span>
                  <span className="block truncate text-body-sm text-muted">
                    {[
                      m.relationshipToOwner,
                      m.dateOfBirth,
                      m.idNumber ? `CCCD ${m.idNumber}` : null,
                      m.capitalContribution != null
                        ? `${m.capitalContribution.toLocaleString('vi-VN')} đ`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' · ') || '—'}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Group>
      <Group title="Thông tin khác">
        <InfoGrid rows={other} />
      </Group>
    </section>
  );
}

/* ---------------------------------------------------------------- evidence */

/**
 * One uploaded document, large. Same loading as EvidencePreview (fetched with
 * the bearer token when the tile mounts, shown through an object URL), drawn at
 * 160px with a readable failure state.
 */
export function EvidenceTile({
  evidence,
}: {
  evidence: Pick<ApiEvidence, 'fileUrl'> & { evidenceType: string };
}) {
  const label =
    (EVIDENCE_LABELS as Record<string, string | undefined>)[evidence.evidenceType] ??
    evidence.evidenceType;
  const [objectUrl, setObjectUrl] = useState<string>();
  const [isPdf, setIsPdf] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!isLiveApi) {
      setObjectUrl(evidence.fileUrl || undefined);
      return;
    }

    let url: string | undefined;
    let cancelled = false;
    vendorRegistrationApi
      .downloadEvidenceFile(evidence.fileUrl)
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setIsPdf(blob.type === 'application/pdf');
        setObjectUrl(url);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [evidence.fileUrl]);

  let content: ReactNode;
  if (failed) {
    content = (
      <span className="flex h-full w-full flex-col items-center justify-center gap-1 bg-[#FDEBEA] p-xs text-center text-[#8F1717] dark:bg-[#3A1414] dark:text-[#FF9A90]">
        <Icon name="alert-circle-outline" size={28} color="currentColor" />
        <span className="text-body-sm font-semibold">Không mở được ảnh</span>
      </span>
    );
  } else if (!objectUrl) {
    content =
      !isLiveApi && !evidence.fileUrl ? (
        <span className="flex h-full w-full flex-col items-center justify-center gap-1 p-xs text-center text-muted">
          <Icon name="file-document-outline" size={28} color="currentColor" />
          <span className="text-body-sm font-medium">Dữ liệu mẫu, không có tệp</span>
        </span>
      ) : (
        <span role="status" aria-label={`Đang tải ${label}`} className="block h-full w-full">
          <Skeleton className="h-full w-full rounded-none" />
        </span>
      );
  } else if (isPdf) {
    content = (
      <a
        href={objectUrl}
        target="_blank"
        rel="noreferrer"
        aria-label={`Mở ${label} ở tab mới`}
        className="flex h-full w-full flex-col items-center justify-center gap-1 bg-card text-primary"
      >
        <Icon name="file-document-outline" size={32} color="currentColor" />
        <span className="text-label">Mở PDF</span>
      </a>
    );
  } else {
    content = (
      <a
        href={objectUrl}
        target="_blank"
        rel="noreferrer"
        aria-label={`Mở ${label} ở tab mới`}
        className="block h-full w-full"
      >
        <img
          src={objectUrl}
          alt={label}
          className="h-full w-full object-cover transition-transform duration-200 hover:scale-[1.03]"
        />
      </a>
    );
  }

  return (
    <figure className="flex min-w-0 flex-col gap-xs">
      <div className="aspect-square w-full overflow-hidden rounded-[14px] bg-sunken ring-1 ring-border">
        {content}
      </div>
      <figcaption className="line-clamp-2 text-[14px] font-semibold leading-5 text-text">
        {label}
      </figcaption>
    </figure>
  );
}

/* --------------------------------------------------------------- form 01 */

/**
 * "Xuất hồ sơ": a small A4 sheet of Mẫu số 01 — crossed "BẢN NHÁP" until the
 * file is approved, as the downloaded copy will be — beside the two download
 * buttons.
 */
export function Form01Card({
  approved,
  downloadingFormat,
  onDownload,
}: {
  approved: boolean;
  downloadingFormat: 'docx' | 'pdf' | null;
  onDownload: (format: 'docx' | 'pdf') => void;
}) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className="rounded-[24px] bg-card p-md shadow-card ring-1 ring-border"
    >
      <h2 id={headingId} className="text-headline-sm text-text">
        Xuất hồ sơ (Mẫu số 01 Phụ lục II, TT 68/2025/TT-BTC)
      </h2>
      <div className="mt-sm flex items-start gap-md">
        <div
          aria-hidden="true"
          className="relative aspect-[1/1.414] w-[96px] shrink-0 overflow-hidden rounded-[6px] bg-white p-2 shadow-card ring-1 ring-border"
        >
          <p className="text-center font-sign text-[8px] font-extrabold leading-tight text-[#111C2B]">
            Mẫu số 01
          </p>
          <p className="mt-0.5 text-center text-[5.5px] font-semibold leading-tight text-[#566173]">
            GIẤY ĐỀ NGHỊ ĐĂNG KÝ HỘ KINH DOANH
          </p>
          <div className="mt-1.5 flex flex-col gap-[3px]">
            {[90, 70, 84, 60, 78, 66, 88, 52].map((w, i) => (
              <span
                key={i}
                className="h-[2.5px] rounded-full bg-[#E1E5EA]"
                style={{ width: `${w}%` }}
              />
            ))}
          </div>
          {!approved ? (
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="-rotate-[32deg] rounded-[3px] border-2 border-[#B42318]/45 px-1 font-sign text-[13px] font-extrabold tracking-[0.06em] text-[#B42318]/45">
                BẢN NHÁP
              </span>
            </span>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-xs">
          <Button
            label={downloadingFormat === 'docx' ? 'Đang tải...' : 'Tải .docx'}
            variant="outline"
            disabled={downloadingFormat !== null}
            onPress={() => onDownload('docx')}
          />
          <Button
            label={downloadingFormat === 'pdf' ? 'Đang tải...' : 'Tải .pdf'}
            variant="outline"
            disabled={downloadingFormat !== null}
            onPress={() => onDownload('pdf')}
          />
        </div>
      </div>
      {!approved ? (
        <p className="mt-xs text-body-sm text-muted">
          Hồ sơ chưa được duyệt — bản tải về sẽ có nhãn "BẢN NHÁP".
        </p>
      ) : null}
    </section>
  );
}

/* --------------------------------------------------------------- next step */

/** A way forward from an approved file, drawn as a card with its own little picture. */
export function NextStepCard({
  label,
  caption,
  art,
  onPress,
  primary,
}: {
  label: string;
  caption: string;
  art: 'plate' | 'frontage' | 'slot';
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      className={`group flex min-h-[88px] w-full items-center gap-sm rounded-[20px] p-sm text-left ring-1 transition-[transform,box-shadow] duration-200 [transition-timing-function:var(--ease-out)] hover:-translate-y-0.5 hover:shadow-card-hover ${
        primary ? 'bg-[#FFF3E8] ring-brand/30 dark:bg-[#2A2420]' : 'bg-card shadow-card ring-border'
      }`}
    >
      <span
        aria-hidden="true"
        className="flex h-[64px] w-[88px] shrink-0 items-center justify-center rounded-[14px] bg-sunken/70"
      >
        {art === 'plate' ? (
          <HousePlateArt className="h-[44px] w-[76px]" />
        ) : art === 'frontage' ? (
          <FrontageMiniArt className="h-[56px] w-[76px]" />
        ) : (
          <SlotTopArt className="h-[56px] w-[56px]" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] font-semibold leading-[22px] text-text">{label}</span>
        <span className="mt-0.5 block text-body-sm text-muted">{caption}</span>
      </span>
      <Icon
        name="chevron-right"
        size={18}
        color="currentColor"
        className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5"
      />
    </button>
  );
}
