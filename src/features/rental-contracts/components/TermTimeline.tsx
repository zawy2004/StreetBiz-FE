import { KerbTag } from '@/components/common';
import type { RentalContract } from '@/core/api/side-api';
import { contractProgress } from '@/features/sidewalk-slots/my-slots-view';

const DAY_MS = 86_400_000;
const MAX_ROWS = 8;

/** "2026-12-01" as local midnight, matching how contractProgress counts days. */
function localDay(isoDate: string): number {
  const [y, m, d] = isoDate.slice(0, 10).split('-').map(Number);
  return new Date(y ?? 0, (m ?? 1) - 1, d ?? 1).getTime();
}

type Props = { contracts: readonly RentalContract[]; today: Date };

/**
 * The live contracts side by side on one calendar: months across the top, a
 * brand-orange "Hôm nay" line, and one bar per contract from its first to its
 * last day, the part already gone solid and the rest pale. Bars are not links.
 */
export function TermTimeline({ contracts, today }: Props) {
  const rows = contracts.filter((c) => c.startDate && c.endDate);
  if (rows.length === 0) return null;
  const shown = rows.slice(0, MAX_ROWS);
  const now = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const start = Math.min(now, ...shown.map((c) => localDay(c.startDate)));
  const end = Math.max(now + DAY_MS, ...shown.map((c) => localDay(c.endDate)));
  const span = end - start;
  const at = (t: number) => `${((t - start) / span) * 100}%`;

  const months: { label: string; t: number; key: string }[] = [];
  const cursor = new Date(start);
  cursor.setDate(1);
  cursor.setMonth(cursor.getMonth() + 1);
  while (cursor.getTime() < end) {
    months.push({
      label: `T${cursor.getMonth() + 1}`,
      t: cursor.getTime(),
      key: `${cursor.getFullYear()}-${cursor.getMonth()}`,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  const todayLabel = `Hôm nay ${today.getDate()}/${today.getMonth() + 1}`;

  return (
    <section
      aria-label="Thước thời hạn các hợp đồng đang hiệu lực"
      className="overflow-hidden rounded-[20px] bg-card p-md shadow-card ring-1 ring-border md:p-lg"
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-sm gap-y-sm">
        <span />
        <div className="relative h-5 text-[13px] font-semibold text-muted">
          {months.map((m, i) => (
            <span
              key={m.key}
              className={`absolute top-0 -translate-x-1/2 font-sign ${
                // On a phone only the first, the current and the last month are labelled.
                i === 0 || i === months.length - 1 || Math.abs(m.t - now) < 31 * DAY_MS
                  ? ''
                  : 'hidden sm:inline'
              }`}
              style={{ left: at(m.t) }}
            >
              {m.label}
            </span>
          ))}
        </div>

        {shown.map((c) => {
          const s = localDay(c.startDate);
          const e = localDay(c.endDate);
          const suspended = c.contractStatus === 'SUSPENDED';
          const soon = !suspended && contractProgress(c.startDate, c.endDate, today).expiringSoon;
          const bar = suspended
            ? 'bg-[#FDEBEA] ring-1 ring-inset ring-[#8F1717]/60 bg-[repeating-linear-gradient(135deg,rgb(143_23_23/0.16)_0_3px,transparent_3px_8px)] dark:bg-[#3A1414]'
            : soon
              ? 'bg-[#FFF3D1] dark:bg-[#3A2A08]'
              : 'bg-[#E6F6EC] dark:bg-[#10301F]';
          const solid = suspended ? 'bg-[#8F1717]/70' : soon ? 'bg-accent' : 'bg-tertiary';
          const gone = Math.min(Math.max(now, s), e);
          return (
            <div key={c.contractId} className="contents">
              <KerbTag code={c.slotCode} className="self-center" />
              <div className="relative h-9">
                {months.map((m) => (
                  <span
                    key={m.key}
                    aria-hidden="true"
                    className="absolute inset-y-0 w-px bg-border"
                    style={{ left: at(m.t) }}
                  />
                ))}
                <span
                  aria-hidden="true"
                  className={`absolute top-1.5 h-6 overflow-hidden rounded-full ${bar}`}
                  style={{ left: at(s), width: `${((e - s) / span) * 100}%` }}
                >
                  <span
                    className={`block h-full rounded-l-full ${solid}`}
                    style={{ width: `${e > s ? ((gone - s) / (e - s)) * 100 : 100}%` }}
                  />
                </span>
                <span
                  aria-hidden="true"
                  className="absolute -inset-y-1.5 z-10 w-0.5 -translate-x-1/2 bg-brand"
                  style={{ left: at(now) }}
                />
              </div>
            </div>
          );
        })}

        <span />
        <div className="relative h-7">
          <span
            aria-hidden="true"
            className="absolute -top-2 h-3 w-0.5 -translate-x-1/2 bg-brand"
            style={{ left: at(now) }}
          />
          <span
            className="absolute top-1 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand px-2 py-0.5 text-body-xs font-bold text-white"
            style={{ left: `clamp(48px, ${at(now)}, calc(100% - 48px))` }}
          >
            {todayLabel}
          </span>
        </div>
      </div>
      {rows.length > MAX_ROWS ? (
        <p className="mt-xs text-body-sm text-muted">+ {rows.length - MAX_ROWS} hợp đồng khác</p>
      ) : null}
    </section>
  );
}
