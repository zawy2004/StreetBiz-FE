import { formatVnd, Icon, KerbTag, type IconName } from '@/components/common';
import type { FeeItemDto } from '@/core/api';
import { addMonths, hcmDay, monthKey, monthRange, shortMonthLabel } from '../finance-view';

const PLATE: Record<string, { className: string; icon: IconName; word: string }> = {
  OVERDUE: {
    className:
      'bg-[#FDEBEA] text-[#8F1717] ring-1 ring-[#B42318]/45 dark:bg-[#3A1414] dark:text-[#FF9A90]',
    icon: 'alert-octagon-outline',
    word: 'Quá hạn',
  },
  PENDING: {
    className: 'bg-card text-[#6B4100] ring-[1.5px] ring-accent dark:text-[#FFD27A]',
    icon: 'clock-outline',
    word: 'Chưa đến hạn',
  },
  PAID: {
    className: 'bg-[#E6F6EC] text-[#0B5D33] dark:bg-[#10301F] dark:text-[#8BE3B0]',
    icon: 'check-circle',
    word: 'Đã trả',
  },
};

const OTHER_PLATE = {
  className: 'bg-sunken text-text',
  icon: 'circle-outline' as IconName,
  word: '',
};

/**
 * "Lịch phí trên vỉa hè": each slot is a lane, each month a painted block of
 * kerb, each instalment a small plate set on its month, and a line marks today.
 * Decoration that sums up the list below it: the plates are hidden from
 * assistive tech and take no focus (the rows underneath are what opens).
 */
export function FeeKerbCalendar({ fees, now }: { fees: FeeItemDto[]; now: Date }) {
  const today = hcmDay(now);
  const thisMonth = today.slice(0, 7);
  const keys = fees.map((f) => monthKey(f.dueDate));
  let start = [thisMonth, ...keys].sort()[0] ?? thisMonth;
  let end = [thisMonth, ...keys].sort().at(-1) ?? thisMonth;
  // At least four months, so one lonely instalment still sits on a stretch of kerb.
  for (let grow = 0; monthRange(start, end).length < 4; grow += 1) {
    if (grow % 2 === 0) end = addMonths(end, 1);
    else start = addMonths(start, -1);
  }
  const months = monthRange(start, end);
  const lanes = [...new Set(fees.map((f) => f.slotCode || ''))].sort();
  const overdue = fees.filter((f) => f.itemStatus === 'OVERDUE').length;

  const todayColumn = months.indexOf(thisMonth);
  const [y = 1970, m = 1, d = 1] = today.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const todayShare = ((d - 0.5) / daysInMonth) * 100;
  const lastRow = lanes.length + 3;

  return (
    <figure className="m-0 rounded-[20px] bg-card p-md shadow-card ring-1 ring-border/80">
      <figcaption className="mb-sm flex flex-wrap items-baseline justify-between gap-x-sm gap-y-1">
        <span className="font-sign text-[18px] font-bold leading-6 text-text">Lịch phí</span>
        <span className="text-body-md text-muted">
          {`${fees.length} kỳ phí trên ${lanes.length} ô, ${overdue > 0 ? `${overdue} kỳ quá hạn` : 'không có kỳ quá hạn'}`}
        </span>
      </figcaption>
      <div aria-hidden="true" className="no-scrollbar -mx-md overflow-x-auto px-md">
        <div
          className="relative grid min-w-max items-center gap-y-xs"
          style={{
            gridTemplateColumns: `96px repeat(${months.length}, minmax(76px, 1fr))`,
          }}
        >
          {months.map((key, i) => (
            <span
              key={`label-${key}`}
              className={`px-1 pb-1 font-sign text-[13px] font-bold tabular-nums ${key === thisMonth ? 'text-primary' : 'text-muted'}`}
              style={{ gridColumn: i + 2, gridRow: 1 }}
            >
              {shortMonthLabel(key, i === 0 || key.endsWith('-01'))}
            </span>
          ))}
          {months.map((key, i) => (
            <span
              key={`kerb-${key}`}
              className={`h-2 ${i % 2 === 0 ? 'bg-kerb' : 'bg-kerb-paint ring-1 ring-inset ring-kerb/30'} ${i === 0 ? 'rounded-l-full' : ''} ${i === months.length - 1 ? 'rounded-r-full' : ''}`}
              style={{ gridColumn: i + 2, gridRow: 2 }}
            />
          ))}

          {lanes.map((code, lane) => (
            <span
              key={`lane-${code}`}
              className="sticky left-0 z-10 flex h-10 items-center bg-card pr-xs"
              style={{ gridColumn: 1, gridRow: lane + 3 }}
            >
              {code ? (
                <KerbTag code={code} />
              ) : (
                <span className="text-body-sm text-muted">Chưa rõ ô</span>
              )}
            </span>
          ))}

          {lanes.flatMap((code, lane) =>
            months.map((key, i) => {
              const items = fees.filter(
                (f) => (f.slotCode || '') === code && monthKey(f.dueDate) === key,
              );
              return (
                <span
                  key={`cell-${code}-${key}`}
                  className="relative flex min-h-10 flex-col items-center justify-center gap-1 border-l border-dashed border-border px-1"
                  style={{ gridColumn: i + 2, gridRow: lane + 3 }}
                >
                  {items.map((f) => {
                    const plate = PLATE[f.itemStatus] ?? OTHER_PLATE;
                    const [, mm, dd] = hcmDay(f.dueDate).split('-').map(Number);
                    return (
                      <span
                        key={f.feeItemId}
                        title={[f.periodLabel, formatVnd(f.amount), plate.word]
                          .filter(Boolean)
                          .join(' · ')}
                        className={`inline-flex h-8 w-full max-w-[72px] items-center justify-center gap-1 rounded-[6px] font-sign text-[12px] font-bold tabular-nums ${plate.className}`}
                      >
                        <Icon name={plate.icon} size={13} color="currentColor" />
                        {`${dd}/${mm}`}
                      </span>
                    );
                  })}
                </span>
              );
            }),
          )}

          {todayColumn >= 0 ? (
            <span
              className="pointer-events-none relative h-full self-stretch"
              style={{ gridColumn: todayColumn + 2, gridRow: `2 / ${lastRow + 1}` }}
            >
              <span
                className="absolute bottom-5 top-0 w-0.5 -translate-x-1/2 rounded-full bg-brand"
                style={{ left: `${todayShare}%` }}
              />
              <span
                className="absolute bottom-0 -translate-x-1/2 whitespace-nowrap rounded-[5px] bg-primary px-1.5 text-[11px] font-bold leading-[18px] text-white"
                style={{ left: `${todayShare}%` }}
              >
                Hôm nay
              </span>
            </span>
          ) : null}
          <span className="h-5" style={{ gridColumn: 1, gridRow: lastRow }} />
        </div>
      </div>
    </figure>
  );
}
