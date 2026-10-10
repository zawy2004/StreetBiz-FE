import type { ReactNode } from 'react';

import { Spinner } from '@/components/common';
import type { PlacementCheck } from '../../../ward-config-api';

/** No-entry sign: red ring with a bar, the mark for a BLOCK issue. */
export function ProhibitSign({ size = 28 }: { size?: number }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 28 28" width={size} height={size} className="shrink-0">
      <circle cx="14" cy="14" r="12" fill="#fff" stroke="#B42318" strokeWidth="3.5" />
      <path d="M6.2 21.8 21.8 6.2" stroke="#B42318" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}

/** Warning triangle in mango, the mark for a WARN issue. */
export function WarnSign({ size = 28 }: { size?: number }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 28 28" width={size} height={size} className="shrink-0">
      <path
        d="M14 2.8 26.4 24.4H1.6Z"
        fill="#FFB703"
        stroke="#6B4100"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M14 10v7" stroke="#2B1A00" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="14" cy="20.6" r="1.6" fill="#2B1A00" />
    </svg>
  );
}

/**
 * The server's placement check read like road signs: each BLOCK on a pale red
 * wash with a no-entry sign, each WARN on mango with a warning triangle, a
 * green strip when the spot is clear. The server's own sentence is kept as is.
 * Every pair is at least 7:1 (#8F1717 on #FDEBEA, #6B4100 on #FFF3D1,
 * #0B5D33 on #E6F6EC).
 */
export function PlacementVerdict({ check }: { check: PlacementCheck | undefined }) {
  if (!check) return null;
  if (check.issues.length === 0)
    return (
      <p
        aria-live="polite"
        className="sb-pop flex items-center gap-sm rounded-[12px] bg-[#E6F6EC] px-sm py-xs text-[16px] font-semibold leading-snug text-[#0B5D33] dark:bg-[#10301F] dark:text-[#8BE3B0]"
      >
        <span
          aria-hidden="true"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0B7F43] text-[15px] font-bold text-white"
        >
          ✓
        </span>{' '}
        Vị trí hợp lệ.
      </p>
    );
  return (
    <ul className="flex flex-col gap-xs" aria-live="polite">
      {check.issues.map((issue, i) => {
        const block = issue.severity === 'BLOCK';
        return (
          <li
            key={i}
            style={{ animationDelay: `${i * 40}ms` }}
            className={[
              'sb-pop flex items-start gap-sm rounded-[12px] px-sm py-xs text-[16px] leading-snug',
              block
                ? 'bg-[#FDEBEA] font-semibold text-[#8F1717] dark:bg-[#3A1414] dark:text-[#FF9A90]'
                : 'bg-[#FFF3D1] font-medium text-[#6B4100] dark:bg-[#3A2A08] dark:text-[#FFD27A]',
            ].join(' ')}
          >
            {block ? <ProhibitSign /> : <WarnSign />}
            <span className="min-w-0 pt-0.5">
              <span className="sr-only">{block ? 'Bị chặn: ' : 'Cảnh báo: '}</span>
              {issue.message}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** "Phiếu kiểm tra vị trí": the frame the check status and the verdict sit in. */
export function VerdictSlip({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-xs rounded-[16px] border border-dashed border-text/25 bg-bg p-sm">
      <p className="text-body-xs font-semibold uppercase tracking-[0.06em] text-muted">
        Phiếu kiểm tra vị trí
      </p>
      {children}
    </div>
  );
}

/** "Đang kiểm tra vị trí…" with a spinner, kept as a status line. */
export function CheckingLine() {
  return (
    <p role="status" className="flex items-center gap-xs text-body-md text-text">
      <span aria-hidden="true" className="flex">
        <Spinner size={16} color="rgb(var(--c-primary))" />
      </span>
      Đang kiểm tra vị trí…
    </p>
  );
}
