import { useEffect, useState } from 'react';

import { contractProgress } from '@/features/sidewalk-slots/my-slots-view';

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('vi-VN');

type Props = {
  startDate: string;
  endDate: string;
  today: Date;
  /**
   * `sm` (contract cards): the ring with "Còn N ngày" written beside it.
   * `lg` (contract page): the day count in the middle, the sentence for screen readers.
   */
  size?: 'sm' | 'lg';
};

/**
 * How much of a live contract's term is left, as a ring: the part still to run
 * in green (mango when it ends within 14 days), the part gone in grey. The arc
 * draws in once when it appears. One "Còn N ngày" and one progressbar per use.
 */
export function TermRing({ startDate, endDate, today, size = 'sm' }: Props) {
  const progress = contractProgress(startDate, endDate, today);
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const id = window.requestAnimationFrame(() => setDrawn(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  const large = size === 'lg';
  const box = large ? 168 : 72;
  const stroke = large ? 12 : 8;
  const r = (box - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const left = Math.max(0, 100 - progress.percent) / 100;
  const tone = progress.expiringSoon
    ? { arc: 'stroke-[#B86E00] dark:stroke-accent', ink: 'text-[#6B4100] dark:text-[#FFD27A]' }
    : { arc: 'stroke-tertiary', ink: 'text-[#0B5D33] dark:text-[#8BE3B0]' };
  const daysText = `Còn ${progress.daysLeft} ngày`;

  const ring = (
    <div
      role="progressbar"
      aria-label="Tiến độ thời hạn thuê"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progress.percent}
      className="relative shrink-0"
      style={{ width: box, height: box }}
    >
      <svg viewBox={`0 0 ${box} ${box}`} className="h-full w-full -rotate-90" aria-hidden="true">
        <circle
          cx={box / 2}
          cy={box / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-sunken"
        />
        <circle
          cx={box / 2}
          cy={box / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={drawn ? circumference * (1 - left) : circumference}
          className={tone.arc}
          style={{ transition: 'stroke-dashoffset 700ms var(--ease-out)' }}
        />
      </svg>
      {large ? (
        <span className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            aria-hidden="true"
            className={`font-sign text-[52px] font-extrabold leading-none ${tone.ink}`}
          >
            {progress.daysLeft}
          </span>
          <span aria-hidden="true" className="text-body-sm font-semibold text-muted">
            ngày còn lại
          </span>
        </span>
      ) : null}
    </div>
  );

  if (large) {
    return (
      <div className="flex flex-col items-center gap-xs">
        {ring}
        <span className="sr-only">{daysText}</span>
        <span className="font-tabular text-body-sm text-muted">
          {formatDate(startDate)} – {formatDate(endDate)}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-md">
      {ring}
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className={`font-sign text-[26px] font-extrabold leading-8 ${tone.ink}`}>
          {daysText}
        </span>
        <span className="font-tabular text-body-sm text-muted">
          {formatDate(startDate)} – {formatDate(endDate)}
        </span>
      </div>
    </div>
  );
}
