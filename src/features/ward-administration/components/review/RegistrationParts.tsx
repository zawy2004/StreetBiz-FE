import { useEffect, useState } from 'react';

import { Icon } from '@/components/common';
import { VERDICT_TONES } from '@/components/illustrations';
import type { WardEvidence, WardKycCheck } from '../../ward-api';
import { useGrowOnMount } from './helpers';

type StepState = 'todo' | 'done' | 'locked' | 'open' | 'demo';

/**
 * BR-41 as a rail of three numbered steps: the machine reads (reference only),
 * the officer compares the physical CCCD (required), then the decision unlocks.
 */
export function IdentityGateRail({
  aiSummary,
  aiRunning,
  identityVerified,
  verifiedAt,
  demo,
  onGoToIdentity,
}: {
  aiSummary: string;
  aiRunning: boolean;
  identityVerified: boolean;
  verifiedAt: string | null;
  demo: boolean;
  onGoToIdentity: () => void;
}) {
  const step2: StepState = demo ? 'demo' : identityVerified ? 'done' : 'todo';
  const step3: StepState = identityVerified ? 'open' : 'locked';
  const ok = VERDICT_TONES.ok;
  const step2Class =
    step2 === 'done' || step2 === 'demo'
      ? `${ok.wash} ${ok.ink}`
      : 'bg-[#FFF3E8] text-[#8A3200] dark:bg-[#3A2414] dark:text-[#FFB98A]';

  return (
    <ol
      aria-label="Các bước thẩm định"
      className="grid grid-cols-1 gap-xs rounded-[24px] bg-card p-xs shadow-card ring-1 ring-border md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-stretch md:gap-0"
    >
      <li className="flex min-h-14 items-center gap-sm rounded-[18px] bg-secondary-bg/80 p-sm text-on-secondary">
        <StepNumber n={1} className="bg-secondary text-[#3B2600]" />
        <span className="min-w-0">
          <span className="block font-sign text-[16px] font-bold leading-tight">
            [AI] Đọc & đối chiếu CCCD
          </span>
          <span className="block text-body-sm">{aiRunning ? 'Đang đọc CCCD...' : aiSummary}</span>
        </span>
      </li>
      <Connector done />
      <li
        aria-current={!identityVerified ? 'step' : undefined}
        className={`rounded-[18px] ${step2Class}`}
      >
        <button
          type="button"
          onClick={onGoToIdentity}
          className="flex min-h-14 w-full items-center gap-sm rounded-[18px] p-sm text-left transition-colors hover:brightness-[0.98]"
        >
          <StepNumber
            n={2}
            className={step2 === 'todo' ? 'bg-primary text-on-primary' : 'bg-tertiary text-white'}
          />
          <span className="min-w-0">
            <span className="block font-sign text-[16px] font-bold leading-tight">
              Cán bộ đối chiếu CCCD gốc
            </span>
            <span className="block text-body-sm">
              {step2 === 'demo'
                ? 'Chế độ demo: không có cổng máy chủ'
                : step2 === 'done'
                  ? verifiedAt
                    ? `Đã xác nhận lúc ${verifiedAt}`
                    : 'Đã xác nhận'
                  : 'Bắt buộc'}
            </span>
          </span>
        </button>
      </li>
      <Connector done={identityVerified} />
      <li
        aria-current={identityVerified ? 'step' : undefined}
        className={`flex min-h-14 items-center gap-sm rounded-[18px] p-sm ${step3 === 'open' ? `${ok.wash} ${ok.ink}` : 'bg-sunken/70 text-text'}`}
      >
        <span
          key={step3}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${step3 === 'open' ? 'sb-pop bg-tertiary text-white' : 'bg-card text-text ring-1 ring-border'}`}
        >
          <Icon
            name={step3 === 'open' ? 'check-circle' : 'lock-outline'}
            size={17}
            color="currentColor"
          />
        </span>
        <span className="min-w-0">
          <span className="block font-sign text-[16px] font-bold leading-tight">Quyết định</span>
          <span className="block text-body-sm">
            {step3 === 'open' ? 'Đã mở: cán bộ quyết định' : 'Khoá tới khi xong bước 2'}
          </span>
        </span>
      </li>
    </ol>
  );
}

function StepNumber({ n, className }: { n: number; className: string }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-sign text-[15px] font-bold ${className}`}
    >
      {n}
    </span>
  );
}

function Connector({ done }: { done: boolean }) {
  return (
    <span aria-hidden="true" className="hidden items-center px-1 md:flex">
      <span
        className={`h-[3px] w-6 rounded-full transition-colors duration-[400ms] ${done ? 'bg-tertiary' : 'bg-border'}`}
      />
    </span>
  );
}

/**
 * The AI match as a ring against the 85% threshold. Neutral when the result
 * did not come from AI (system text or demo), mango when it did.
 */
export function AiMatchGauge({
  percent,
  isAi,
  running,
}: {
  percent: number;
  isAi: boolean;
  running: boolean;
}) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const shown = useGrowOnMount(Math.max(0, Math.min(100, percent)) / 100);
  const tick = (85 / 100) * 2 * Math.PI - Math.PI / 2;
  return (
    <div className="flex items-center gap-sm">
      <svg
        viewBox="0 0 72 72"
        aria-hidden="true"
        className={`h-[72px] w-[72px] shrink-0 ${running ? 'animate-spin' : ''}`}
      >
        <circle cx="36" cy="36" r={r} className="fill-none stroke-sunken" strokeWidth="7" />
        {running ? (
          <circle
            cx="36"
            cy="36"
            r={r}
            className="fill-none stroke-secondary"
            strokeWidth="7"
            strokeDasharray="10 8"
          />
        ) : (
          <circle
            cx="36"
            cy="36"
            r={r}
            className={`fill-none transition-[stroke-dashoffset] duration-[600ms] [transition-timing-function:var(--ease-out)] ${isAi ? 'stroke-secondary' : 'stroke-muted/60'}`}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - shown)}
            transform="rotate(-90 36 36)"
          />
        )}
        <line
          x1={36 + (r - 6) * Math.cos(tick)}
          y1={36 + (r - 6) * Math.sin(tick)}
          x2={36 + (r + 6) * Math.cos(tick)}
          y2={36 + (r + 6) * Math.sin(tick)}
          className="stroke-text"
          strokeWidth="2"
        />
      </svg>
      <div className="min-w-0">
        <p className="flex items-baseline gap-1.5 text-text">
          <span className="font-sign text-[22px] font-bold leading-none font-tabular">
            {percent}%
          </span>
          <span className="text-body-sm font-semibold text-on-secondary">{isAi ? '[AI]' : ''}</span>
        </p>
        <p className="text-body-sm text-text/70">Độ khớp · ngưỡng 85%</p>
        {!isAi ? (
          <p className="text-body-xs font-semibold text-muted">Không phải kết quả AI</p>
        ) : null}
      </div>
    </div>
  );
}

/** eKYC results the server recorded at submission, each against its threshold. */
export function KycCheckBars({ checks }: { checks: WardKycCheck[] }) {
  return (
    <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-[16px] bg-card ring-1 ring-border">
      {checks.map((check) => {
        const face = check.checkType === 'FACE_MATCH';
        const value = (face ? check.similarityPercent : check.confidencePercent) ?? 0;
        return (
          <li key={check.checkType} className="flex flex-col gap-xs p-md">
            <p className="text-[16px] font-semibold text-text">
              {face ? 'Đối chiếu khuôn mặt ↔ ảnh CCCD' : 'Đọc dữ liệu CCCD (OCR)'}
            </p>
            <p className="flex flex-wrap items-center gap-1.5 text-[14px] text-text/80">
              {face ? (
                <>
                  <span
                    className={`inline-flex items-center gap-1 font-semibold ${check.isMatch ? 'text-[#0B5D33] dark:text-[#8BE3B0]' : 'text-[#6B4100] dark:text-[#FFD27A]'}`}
                  >
                    <Icon
                      name={check.isMatch ? 'check-circle' : 'alert-circle-outline'}
                      size={16}
                      color="currentColor"
                    />
                    {check.isMatch ? 'Khớp' : 'Chưa khớp'}
                  </span>
                  <span>· độ tương đồng {check.similarityPercent ?? 0}% (ngưỡng 80%)</span>
                </>
              ) : (
                <span>Độ tin cậy {check.confidencePercent ?? 0}%</span>
              )}
            </p>
            <ThresholdBar value={value} threshold={face ? 80 : undefined} />
            {check.warnings ? (
              <p
                className={`rounded-[10px] px-sm py-1.5 text-body-sm ${VERDICT_TONES.danger.wash} ${VERDICT_TONES.danger.ink}`}
              >
                {check.warnings}
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function ThresholdBar({ value, threshold }: { value: number; threshold?: number }) {
  const grown = useGrowOnMount(Math.max(0, Math.min(100, value)) / 100);
  return (
    <span aria-hidden="true" className="relative block h-2 rounded-full bg-sunken">
      <span
        className="block h-full rounded-full bg-indigo transition-[width] duration-[600ms] [transition-timing-function:var(--ease-out)]"
        style={{ width: `${grown * 100}%` }}
      />
      {threshold ? (
        <span
          className="absolute -top-1 h-4 w-[2px] rounded-full bg-text"
          style={{ left: `${threshold}%` }}
        />
      ) : null}
    </span>
  );
}

/** Evidence photos large on a light table, so the officer can hold them against the form. */
export function EvidenceLightTable({ evidence }: { evidence: WardEvidence[] }) {
  if (evidence.length === 0)
    return (
      <div className="grid grid-cols-2 gap-sm sm:flex sm:flex-wrap">
        {['Ảnh CCCD', 'Giấy phép'].map((label) => (
          <div
            key={label}
            className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-1 rounded-[14px] border-2 border-dashed border-border bg-card text-body-sm text-muted sm:w-[240px]"
          >
            <Icon name="file-document-outline" size={26} color="currentColor" />
            Chưa có ảnh
          </div>
        ))}
      </div>
    );
  return (
    <ul className="grid grid-cols-2 gap-sm sm:flex sm:flex-wrap">
      {evidence.map((ev) => (
        <EvidenceTile key={ev.evidenceId || ev.type} ev={ev} />
      ))}
    </ul>
  );
}

function EvidenceTile({ ev }: { ev: WardEvidence }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [ev.fileUrl]);
  const frame =
    'flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-[14px] bg-sunken ring-1 ring-border sm:w-[240px]';
  return (
    <li className="flex min-w-0 flex-col gap-1.5 sm:w-[240px]">
      {ev.fileUrl ? (
        <a href={ev.fileUrl} target="_blank" rel="noreferrer" className={`group ${frame}`}>
          {broken ? (
            <span className="flex flex-col items-center gap-1 px-sm text-center text-body-sm text-muted">
              <Icon name="file-document-outline" size={28} color="currentColor" weight="duotone" />
              Không xem trước được, mở trong tab mới
            </span>
          ) : (
            <img
              src={ev.fileUrl}
              alt={ev.label}
              loading="lazy"
              onError={() => setBroken(true)}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          )}
        </a>
      ) : (
        <div
          className={`${frame} flex-col gap-1 border-2 border-dashed border-border bg-card text-body-sm text-muted ring-0`}
        >
          <Icon name="file-document-outline" size={26} color="currentColor" />
          Chưa có ảnh
        </div>
      )}
      <span className="truncate text-body-sm font-medium text-text" title={ev.label}>
        {ev.label}
      </span>
    </li>
  );
}

export type IndexEntry = { id: string; label: string };

/** Jump links to the long dossier's blocks (scroll only; the URL does not change). */
export function SectionIndex({ entries }: { entries: IndexEntry[] }) {
  const [active, setActive] = useState(entries[0]?.id ?? '');
  useEffect(() => {
    if (typeof IntersectionObserver !== 'function') return;
    const observer = new IntersectionObserver(
      (records) => {
        const visible = records.filter((r) => r.isIntersecting);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-10% 0px -70% 0px' },
    );
    entries.forEach((e) => {
      const node = document.getElementById(e.id);
      if (node) observer.observe(node);
    });
    return () => observer.disconnect();
  }, [entries]);
  return (
    <nav
      aria-label="Mục lục hồ sơ"
      className="no-scrollbar -mx-md overflow-x-auto px-md md:mx-0 md:px-0"
    >
      <ul className="flex gap-xs">
        {entries.map((e) => (
          <li key={e.id}>
            <button
              type="button"
              onClick={() =>
                document
                  .getElementById(e.id)
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
              aria-current={active === e.id ? 'location' : undefined}
              className={`relative min-h-11 whitespace-nowrap rounded-full px-md text-body-sm font-semibold transition-colors ${
                active === e.id
                  ? 'bg-tint-primary text-primary ring-1 ring-primary/30'
                  : 'bg-card text-text ring-1 ring-border hover:bg-sunken'
              }`}
            >
              {e.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
