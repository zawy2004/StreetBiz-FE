import { slotStatusLabels, type WardSlot, type WardStreetFeature } from '../../../ward-config-api';
import { FEATURE_BLOCK_COLOR, FEATURE_OTHER_COLOR, SLOT_DOT_COLORS, SUSPENDED_BAR } from './tokens';

function Swatch({
  color,
  shape,
  barred,
}: {
  color: string;
  shape: 'dot' | 'diamond';
  barred?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-3 w-3 shrink-0 ring-2 ring-white ${shape === 'dot' ? 'rounded-full' : 'rotate-45 rounded-[2px]'}`}
      style={{ background: barred ? `${SUSPENDED_BAR}, ${color}` : color }}
    />
  );
}

const ORDER: WardSlot['status'][] = ['AVAILABLE', 'PENDING_APPLICATION', 'ACTIVE', 'SUSPENDED'];

/**
 * The map's key with live counts, floating on the map: one chip per slot
 * status present, and street features. Only what is on the map is listed, so
 * a small grid does not show a row of zeros.
 */
export function MapLegend({
  slots,
  features,
}: {
  slots: WardSlot[];
  features: WardStreetFeature[];
}) {
  const counts = ORDER.map((status) => ({
    status,
    count: slots.filter((s) => s.status === status).length,
  })).filter((c) => c.count > 0);
  const blocking = features.filter((f) => f.blocksBusiness).length;
  if (counts.length === 0 && features.length === 0) return null;

  return (
    <ul
      aria-label="Chú giải bản đồ"
      className="no-scrollbar pointer-events-auto flex max-w-full gap-1 overflow-x-auto rounded-full bg-card/95 p-1 shadow-card ring-1 ring-border backdrop-blur-md"
    >
      {counts.map(({ status, count }) => (
        <li
          key={status}
          className="flex h-8 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-body-sm font-medium text-text"
        >
          <Swatch color={SLOT_DOT_COLORS[status]} shape="dot" barred={status === 'SUSPENDED'} />
          {slotStatusLabels[status]}
          <span className="font-sign text-[15px] font-bold font-tabular">{count}</span>
        </li>
      ))}
      {features.length > 0 && (
        <li className="flex h-8 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-body-sm font-medium text-text">
          <Swatch
            color={blocking > 0 ? FEATURE_BLOCK_COLOR : FEATURE_OTHER_COLOR}
            shape="diamond"
          />
          Chướng ngại vật
          <span className="font-sign text-[15px] font-bold font-tabular">{features.length}</span>
        </li>
      )}
    </ul>
  );
}
