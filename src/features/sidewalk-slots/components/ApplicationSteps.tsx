import { Icon, type IconName } from '@/components/common';
import {
  applicationProgress,
  stopReached,
  type ApplicationStop,
  type ApplicationStopState,
} from '../application-progress';

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('vi-VN');

const DOT: Record<ApplicationStopState, { className: string; icon: IconName | null }> = {
  done: { className: 'bg-tertiary text-white dark:text-[#06140C]', icon: 'check' },
  waiting: {
    className: 'bg-accent text-[#6B4100] ring-2 ring-[#6B4100]/50',
    icon: 'clock-outline',
  },
  reviewing: {
    className: 'bg-accent text-[#6B4100] ring-2 ring-[#6B4100]/50',
    icon: 'clock-outline',
  },
  attention: {
    className: 'bg-accent text-[#6B4100] ring-2 ring-[#6B4100]',
    icon: 'alert-circle-outline',
  },
  approved: { className: 'bg-tertiary text-white dark:text-[#06140C]', icon: 'check-circle' },
  rejected: { className: 'bg-error text-white dark:text-[#1A0604]', icon: 'close' },
  withdrawn: { className: 'bg-[#EEF1F4] text-[#2B3640] ring-1 ring-[#2B3640]/30', icon: 'minus' },
  skipped: {
    className: 'border-2 border-dashed border-border bg-card text-muted',
    icon: null,
  },
  todo: { className: 'border-2 border-border bg-card text-muted', icon: null },
};

type Props = {
  status: string;
  createdAt: string;
  reviewedAt: string | null;
  /** `row` across a ticket (V14); `column` down the side of the application page (V15). */
  layout?: 'row' | 'column';
  /** Prefix the first stop's date with "Ngày nộp" (V14 moves that row into the steps). */
  sentLabel?: boolean;
};

/**
 * Sent -> ward review -> outcome, worked out from the status alone. Each stop
 * says its state in words beside the glyph. An unknown status shows nothing.
 */
export function ApplicationSteps({
  status,
  createdAt,
  reviewedAt,
  layout = 'row',
  sentLabel = false,
}: Props) {
  const stops = applicationProgress(status, createdAt, reviewedAt);
  if (!stops) return null;

  const dateText = (stop: ApplicationStop, index: number) =>
    stop.date && !Number.isNaN(Date.parse(stop.date))
      ? index === 0 && sentLabel
        ? `Ngày nộp ${formatDate(stop.date)}`
        : formatDate(stop.date)
      : null;

  if (layout === 'column') {
    return (
      <ol aria-label="Tiến trình đơn" className="flex flex-col">
        {stops.map((stop, i) => {
          const dot = DOT[stop.state];
          const next = i < stops.length - 1;
          return (
            <li key={stop.label} className="relative flex gap-sm pb-md last:pb-0">
              {next ? (
                <span
                  aria-hidden="true"
                  className={`absolute left-[15px] top-8 h-[calc(100%-32px)] w-0.5 ${
                    stopReached(stops, i + 1)
                      ? 'bg-tertiary'
                      : 'border-l-2 border-dashed border-border bg-transparent'
                  }`}
                />
              ) : null}
              <Dot dot={dot} pulse={stop.state === 'reviewing'} />
              <div className="flex min-w-0 flex-1 items-start justify-between gap-sm pt-1">
                <div className="min-w-0">
                  <p className="text-body-md font-semibold text-text">{stop.label}</p>
                  {stop.note ? <p className="text-body-sm text-muted">{stop.note}</p> : null}
                </div>
                {dateText(stop, i) ? (
                  <span className="shrink-0 font-tabular text-body-sm text-muted">
                    {dateText(stop, i)}
                  </span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <ol aria-label="Tiến trình đơn" className="grid grid-cols-3">
      {stops.map((stop, i) => {
        const dot = DOT[stop.state];
        const next = i < stops.length - 1;
        return (
          <li key={stop.label} className="relative flex flex-col gap-1 pr-xs">
            {next ? (
              <span
                aria-hidden="true"
                className={`absolute left-8 right-0 top-[13px] h-0.5 ${
                  stopReached(stops, i + 1) ? 'bg-tertiary' : 'bg-border'
                }`}
              />
            ) : null}
            <Dot dot={dot} pulse={stop.state === 'reviewing'} small />
            <span className="text-body-sm font-semibold leading-tight text-text">
              {stop.label}
              {stop.note ? <span className="sr-only">: {stop.note}</span> : null}
            </span>
            {stop.note && i > 0 ? (
              <span aria-hidden="true" className="text-body-xs leading-tight text-muted">
                {stop.note}
              </span>
            ) : null}
            {dateText(stop, i) ? (
              <span className="font-tabular text-body-xs leading-tight text-muted">
                {dateText(stop, i)}
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function Dot({
  dot,
  pulse,
  small,
}: {
  dot: { className: string; icon: IconName | null };
  pulse: boolean;
  small?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={`relative z-10 flex shrink-0 items-center justify-center rounded-full ${small ? 'h-7 w-7' : 'h-8 w-8'} ${dot.className}`}
    >
      {pulse ? <span className="sb-ping absolute inset-0 rounded-full bg-accent/60" /> : null}
      {dot.icon ? (
        <Icon name={dot.icon} size={small ? 15 : 17} color="currentColor" className="relative" />
      ) : null}
    </span>
  );
}
