import { useNavigate } from 'react-router-dom';

import { Icon, formatVnd } from '@/components/common';
import type { IconName } from '@/components/common/Icon';
import type { SidewalkZone } from '@/core/api/side-api';
import { deadlineText, formatHours } from '../slot-format';
import { occupancyLabel } from '../plan-labels';
import type { SlotCounts } from '../slot-stats';
import { SLOT_TONES } from '../slot-visuals';

type Props = {
  zoneName: string;
  /** Undefined while the zone details are still loading; the header still renders from the slots. */
  zone: SidewalkZone | undefined;
  counts: SlotCounts;
  nowMs: number;
};

/**
 * The route as a street-name plate (white plate, navy signage letters, a thin
 * painted kerb along its foot), its legal basis, code, segment and deadline,
 * the route's price, and one occupancy bar that doubles as the colour legend.
 */
export function ZoneHeader({ zoneName, zone, counts, nowMs }: Props) {
  const navigate = useNavigate();
  const segment =
    zone?.segmentFrom && zone.segmentTo ? `${zone.segmentFrom} ⇄ ${zone.segmentTo}` : null;
  const deadline = zone?.applicationDeadline ? deadlineText(zone.applicationDeadline, nowMs) : null;
  const closed = deadline === 'Đã hết hạn nộp';

  return (
    <header className="flex flex-col gap-md">
      <div className="flex flex-wrap items-center gap-xs">
        {zone?.regulationRef && (
          <Pill icon="gavel" tone="civic">
            {zone.regulationRef}
          </Pill>
        )}
        {zone?.zoneCode && <Pill tone="code">{zone.zoneCode}</Pill>}
        {segment && <Pill icon="map-marker-outline">{segment}</Pill>}
        {deadline && (
          <span
            className={`inline-flex h-8 items-center gap-1.5 rounded-full px-sm text-label font-semibold ${
              closed
                ? 'bg-[#FDEBEA] text-[#8F1717] dark:bg-[#3A1414] dark:text-[#FF9A90]'
                : 'bg-[#FFF3D1] text-[#6B4100] dark:bg-[#3A2A08] dark:text-[#FFD27A]'
            }`}
          >
            <Icon name="timer-outline" size={15} color="currentColor" />
            {deadline}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-md lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 flex-col gap-xs">
          {/* The street-name plate */}
          <div className="w-fit max-w-full overflow-hidden rounded-[14px] bg-card shadow-card ring-1 ring-border">
            <h1 className="break-words px-md pb-xs pt-sm font-sign text-[28px] font-extrabold leading-[1.1] tracking-[-0.01em] text-text [font-stretch:86%] md:text-[32px] lg:text-[40px] lg:leading-[44px]">
              {zoneName}
            </h1>
            <div aria-hidden="true" className="sb-kerb sb-kerb-thin" />
          </div>
          {zone ? (
            <p className="flex flex-wrap items-center gap-x-sm gap-y-1 text-body-sm text-muted">
              <span>
                Giá tuyến{' '}
                <span className="font-sign font-bold text-text">{formatVnd(zone.pricePerDay)}</span>
                /ngày
              </span>
              <span aria-hidden="true" className="h-1 w-1 rounded-full bg-muted/50" />
              <span>Bán {formatHours(zone.availableFrom, zone.availableTo)}</span>
              {zone.feeComponents.length > 0 ? (
                <>
                  <span aria-hidden="true" className="h-1 w-1 rounded-full bg-muted/50" />
                  <span>{zone.feeComponents.length} khoản phí tham khảo</span>
                </>
              ) : null}
            </p>
          ) : null}
        </div>

        {/* Applications, contracts, transfers and proposals live on one page of their own. */}
        <button
          type="button"
          onClick={() => navigate('/vendor/slots/mine')}
          className="inline-flex h-12 w-fit shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-card px-md text-label font-semibold text-text shadow-card ring-1 ring-border transition-[transform,box-shadow] hover:shadow-card-hover active:scale-[0.98]"
        >
          <Icon
            name="file-document-outline"
            size={18}
            color="currentColor"
            className="text-primary"
          />
          Thuê ô của tôi
          <Icon name="chevron-right" size={16} color="currentColor" className="text-muted" />
        </button>
      </div>

      <OccupancyBar counts={counts} />
    </header>
  );
}

const SEGMENTS: {
  key: keyof Omit<SlotCounts, 'total'>;
  label: string;
  tone: keyof typeof SLOT_TONES;
}[] = [
  { key: 'available', label: 'Còn trống', tone: 'AVAILABLE' },
  { key: 'pending', label: 'Có đơn / giữ chỗ', tone: 'PENDING' },
  { key: 'active', label: 'Đã thuê', tone: 'ACTIVE' },
  { key: 'suspended', label: 'Tạm ngưng', tone: 'SUSPENDED' },
];

export function OccupancyBar({ counts }: { counts: SlotCounts }) {
  const total = Math.max(counts.total, 1);
  return (
    <div className="flex flex-col gap-xs rounded-[20px] bg-card p-md shadow-card ring-1 ring-border md:flex-row md:items-center md:gap-lg">
      <p className="flex shrink-0 items-baseline gap-1">
        <span className="font-sign text-[30px] font-extrabold leading-none text-text">
          {counts.total}
        </span>
        <span className="text-body-md font-semibold text-muted">ô</span>
      </p>
      <div className="flex min-w-0 flex-1 flex-col gap-xs">
        <div
          role="img"
          aria-label={occupancyLabel(counts)}
          className="flex h-3.5 w-full gap-0.5 overflow-hidden rounded-full bg-sunken"
        >
          {SEGMENTS.map((s) =>
            counts[s.key] > 0 ? (
              <span
                key={s.key}
                className={`h-full first:rounded-l-full last:rounded-r-full ${SLOT_TONES[s.tone].swatch} transition-[width] duration-500`}
                style={{ width: `${(counts[s.key] / total) * 100}%` }}
              />
            ) : null,
          )}
        </div>
        <ul aria-hidden="true" className="flex flex-wrap gap-x-md gap-y-1 text-body-sm text-muted">
          {SEGMENTS.map((s) => (
            <li key={s.key} className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-[3px] ${SLOT_TONES[s.tone].swatch}`} />
              <span className="font-sign font-bold text-text">{counts[s.key]}</span>
              {s.label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Pill({
  icon,
  tone = 'neutral',
  children,
}: {
  icon?: IconName;
  tone?: 'civic' | 'code' | 'neutral';
  children: string;
}) {
  const toneClass =
    tone === 'civic'
      ? 'bg-tint-indigo text-indigo ring-indigo/25'
      : tone === 'code'
        ? 'bg-card font-sign font-bold tracking-[0.04em] text-text ring-text/20'
        : 'bg-card text-muted ring-border';
  return (
    <span
      className={`inline-flex h-8 max-w-full items-center gap-1.5 rounded-full px-sm text-label ring-1 ring-inset ${toneClass}`}
    >
      {icon && <Icon name={icon} size={15} color="currentColor" className="shrink-0" />}
      <span className="truncate">{children}</span>
    </span>
  );
}
