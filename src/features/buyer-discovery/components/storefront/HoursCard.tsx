import { Icon } from '@/components/common';
import type { StorefrontHour } from '@/core/api/commerce-api';
import { weeklySchedule } from '../../discovery-format';
import { rulerAxis, rulerSpans, vietnamClock } from '../../storefront-hours';

const AXIS_LABELS = [6, 12, 18, 24];

/**
 * The week on one ruler: a bar per day across 05:00–24:00 (earlier if the stall
 * opens before five), today ringed in orange with a dot at "now" (Vietnam time).
 * Each row still says its day and windows in words; the bars are decoration.
 */
export function HoursCard({
  weeklyHours,
  now = new Date(),
}: {
  weeklyHours: StorefrontHour[];
  now?: Date;
}) {
  const schedule = weeklySchedule(weeklyHours);
  const clock = vietnamClock(now);
  const axis = rulerAxis(weeklyHours);
  const nowAt = (clock.minutes - axis.start) / (axis.end - axis.start);

  return (
    <section
      aria-labelledby="hours-title"
      className="rounded-[24px] bg-card p-md shadow-card ring-1 ring-border md:p-lg"
    >
      <h2
        id="hours-title"
        className="flex items-center gap-xs font-editorial text-[22px] font-semibold leading-tight text-text"
      >
        <Icon name="clock-outline" size={20} color="currentColor" className="text-primary" />
        Giờ mở cửa
      </h2>
      {schedule ? (
        <>
          <ul className="mt-md flex flex-col gap-1">
            {schedule.map((day) => {
              const today = day.day === clock.day;
              const spans = rulerSpans(weeklyHours, day.day, axis);
              return (
                <li
                  key={day.day}
                  className={[
                    'grid grid-cols-[64px_minmax(0,1fr)_7.5rem] items-center gap-sm rounded-[12px] px-xs py-1.5 text-body-md',
                    today
                      ? 'bg-tint-primary font-semibold text-text ring-1 ring-brand/60'
                      : 'text-muted',
                  ].join(' ')}
                >
                  <span>{day.label}</span>
                  <span aria-hidden="true" className="relative h-2.5 rounded-full bg-sunken">
                    {spans.map((span, index) => (
                      <span
                        key={index}
                        className={`absolute inset-y-0 rounded-full ${today ? 'bg-brand' : 'bg-primary/30'}`}
                        style={{ left: `${span.left * 100}%`, width: `${span.width * 100}%` }}
                      />
                    ))}
                    {today && nowAt >= 0 && nowAt <= 1 ? (
                      <span
                        className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2"
                        style={{ left: `${nowAt * 100}%` }}
                      >
                        <span className="sb-ping absolute inset-0 rounded-full bg-text/30" />
                        <span className="absolute inset-0 rounded-full border-2 border-card bg-text" />
                      </span>
                    ) : null}
                  </span>
                  <span className="text-right font-tabular">
                    {day.ranges.length > 0 ? day.ranges.join(', ') : 'Nghỉ'}
                  </span>
                </li>
              );
            })}
          </ul>
          <div
            aria-hidden="true"
            className="mt-1 grid grid-cols-[64px_minmax(0,1fr)_7.5rem] gap-sm px-xs text-[11px] font-medium text-muted"
          >
            <span />
            <span className="relative h-4">
              {AXIS_LABELS.map((h) => (
                <span
                  key={h}
                  className="absolute -translate-x-1/2 font-tabular"
                  style={{ left: `${((h * 60 - axis.start) / (axis.end - axis.start)) * 100}%` }}
                >
                  {h}h
                </span>
              ))}
            </span>
            <span />
          </div>
        </>
      ) : (
        <p className="mt-sm flex items-center gap-sm text-body-md text-muted">
          <Icon name="timer-outline" size={20} color="currentColor" />
          Quán chưa đăng giờ mở cửa.
        </p>
      )}
    </section>
  );
}
