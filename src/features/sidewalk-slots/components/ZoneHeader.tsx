import { useNavigate } from 'react-router-dom';

import { Icon } from '@/components/common';
import type { IconName } from '@/components/common/Icon';
import type { SidewalkZone } from '@/core/api/side-api';
import { colors } from '@/theme';
import { deadlineText } from '../slot-format';
import type { SlotCounts } from '../slot-stats';

type Props = {
  zoneName: string;
  /** Undefined while the zone details are still loading; the header still renders from the slots. */
  zone: SidewalkZone | undefined;
  counts: SlotCounts;
  nowMs: number;
};

export function ZoneHeader({ zoneName, zone, counts, nowMs }: Props) {
  const navigate = useNavigate();
  const segment =
    zone?.segmentFrom && zone.segmentTo ? `${zone.segmentFrom} ⇄ ${zone.segmentTo}` : null;
  const deadline = zone?.applicationDeadline ? deadlineText(zone.applicationDeadline, nowMs) : null;

  return (
    <header className="flex flex-col gap-md">
      <div className="flex flex-col gap-md xl:flex-row xl:items-start xl:justify-between">
        <div className="flex min-w-0 flex-col gap-xs">
          <div className="flex flex-wrap items-center gap-xs">
            {zone?.regulationRef && (
              <Pill icon="gavel" tone="indigo">
                {zone.regulationRef}
              </Pill>
            )}
            {zone?.zoneCode && <Pill tone="neutral">{zone.zoneCode}</Pill>}
            {segment && <Pill icon="map-marker-outline">{segment}</Pill>}
          </div>
          {deadline && <p className="text-body-sm font-semibold text-primary">{deadline}</p>}
          <h1 className="text-headline-lg text-text">{zoneName}</h1>
        </div>

        <div className="grid grid-cols-3 gap-xs sm:grid-cols-5 xl:w-[600px] xl:shrink-0">
          <StatTile icon="view-grid-outline" label="Tổng" value={counts.total} color={colors.indigo} />
          <StatTile icon="check-circle-outline" label="Còn trống" value={counts.available} color={colors.tertiary} />
          <StatTile icon="timer-outline" label="Có đơn" value={counts.pending} color={colors.secondary} />
          <StatTile icon="storefront-outline" label="Đã thuê" value={counts.active} color={colors.muted} />
          <StatTile icon="block-helper" label="Tạm ngưng" value={counts.suspended} color={colors.primary} />
        </div>
      </div>

      {/* Applications, contracts, transfers and proposals live on one page of their own. */}
      <button
        type="button"
        onClick={() => navigate('/vendor/slots/mine')}
        className="flex h-9 w-fit items-center gap-1 whitespace-nowrap rounded-full border border-border bg-card px-sm text-label text-text transition-opacity active:opacity-80"
      >
        <Icon name="file-document-outline" size={16} color={colors.muted} />
        Thuê ô của tôi
        <Icon name="chevron-right" size={16} color={colors.muted} />
      </button>
    </header>
  );
}

function Pill({
  icon,
  tone = 'neutral',
  children,
}: {
  icon?: IconName;
  tone?: 'indigo' | 'neutral';
  children: string;
}) {
  return (
    <span
      className={[
        'inline-flex h-7 items-center gap-1 rounded-full border px-sm text-label',
        tone === 'indigo' ? 'border-indigo/20 bg-tint-indigo text-indigo' : 'border-border bg-card text-muted',
      ].join(' ')}
    >
      {icon && <Icon name={icon} size={14} color={tone === 'indigo' ? colors.indigo : colors.muted} />}
      {children}
    </span>
  );
}

function StatTile({ icon, label, value, color }: { icon: IconName; label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md border border-border bg-card p-sm shadow-card">
      <div className="flex items-center justify-between gap-1">
        <span className="font-number font-tabular text-money-lg" style={{ color }}>
          {value}
        </span>
        <Icon name={icon} size={20} color={color} />
      </div>
      <span className="text-body-sm leading-tight text-muted">{label}</span>
    </div>
  );
}
