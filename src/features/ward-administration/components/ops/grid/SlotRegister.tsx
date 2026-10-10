import { Icon, type IconName } from '@/components/common';
import { StatusChip } from '@/components/status';
import { slotStatusLabels, type WardSlot } from '../../../ward-config-api';
import { SLOT_DOT_COLORS, SUSPENDED_BAR } from './tokens';

type StatusFilter = WardSlot['status'] | 'ALL';

/** Status filter as 48px chips with how many slots each holds (counted from the loaded grid). */
export function StatusFilterChips({
  slots,
  value,
  onChange,
}: {
  slots: WardSlot[];
  value: StatusFilter;
  onChange: (v: StatusFilter) => void;
}) {
  const options: { value: StatusFilter; label: string; count: number }[] = [
    { value: 'ALL', label: 'Tất cả', count: slots.length },
    ...(Object.keys(slotStatusLabels) as WardSlot['status'][]).map((s) => ({
      value: s,
      label: slotStatusLabels[s],
      count: slots.filter((slot) => slot.status === s).length,
    })),
  ];
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-label text-text">Trạng thái</span>
      <div
        role="radiogroup"
        aria-label="Trạng thái"
        className="no-scrollbar -mx-1 flex gap-xs overflow-x-auto px-1 py-0.5 lg:flex-wrap lg:overflow-visible"
      >
        {options.map((opt) => {
          const selected = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(opt.value)}
              className={[
                'flex h-12 shrink-0 items-center gap-xs rounded-full border px-md text-label transition-colors duration-150',
                selected
                  ? 'border-primary bg-primary font-semibold text-on-primary shadow-[0_8px_20px_-14px_rgb(var(--c-primary)/0.9)]'
                  : 'border-border bg-card text-text hover:border-text/30',
              ].join(' ')}
            >
              {opt.value !== 'ALL' && (
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 rounded-full ring-2 ring-white"
                  style={{
                    background:
                      opt.value === 'SUSPENDED'
                        ? `${SUSPENDED_BAR}, ${SLOT_DOT_COLORS[opt.value]}`
                        : SLOT_DOT_COLORS[opt.value],
                  }}
                />
              )}
              {opt.label}
              <span
                className={`rounded-full px-1.5 font-tabular text-body-xs font-bold ${
                  selected ? 'bg-white/25' : 'bg-sunken text-muted'
                }`}
              >
                {opt.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const FACILITY_ICONS: { key: 'hasPower' | 'hasWater' | 'hasTrashBin'; icon: IconName }[] = [
  { key: 'hasPower', icon: 'flash-outline' },
  { key: 'hasWater', icon: 'water-outline' },
  { key: 'hasTrashBin', icon: 'trash-can-outline' },
];

/**
 * One line of the register: the slot code as a painted plate, zone and size,
 * its facilities, and the status sign. In multi-select the row shows a check
 * and a primary rim when chosen.
 */
export function SlotRow({
  slot,
  bulkMode,
  checked,
  selected,
  onPress,
}: {
  slot: WardSlot;
  bulkMode: boolean;
  checked: boolean;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={bulkMode ? checked : undefined}
      onClick={onPress}
      className={[
        'flex min-h-14 w-full items-center gap-sm rounded-[14px] bg-card px-sm py-xs text-left shadow-card transition-[box-shadow,transform] duration-150 hover:-translate-y-px hover:shadow-card-hover',
        (bulkMode && checked) || selected ? 'ring-2 ring-primary' : 'ring-1 ring-border',
      ].join(' ')}
    >
      {bulkMode && (
        <Icon
          name={checked ? 'check-circle' : 'check-circle-outline'}
          size={24}
          color="currentColor"
          className={checked ? 'shrink-0 text-primary' : 'shrink-0 text-muted'}
        />
      )}
      <span className="flex h-9 min-w-[76px] shrink-0 items-center justify-center rounded-[7px] bg-card px-2 font-sign text-[18px] font-extrabold leading-none tracking-[0.03em] text-text ring-2 ring-text [font-stretch:72%]">
        {slot.slotCode}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body-md font-medium text-text">{slot.zoneName}</span>
        <span className="block text-body-sm text-muted">
          {slot.widthMeters ?? '?'} × {slot.lengthMeters ?? '?'} m
          {slot.source === 'VENDOR_PROPOSED' ? ' · do hộ kinh doanh đề xuất' : ''}
        </span>
      </span>
      <span aria-hidden="true" className="hidden items-center gap-1 text-tertiary sm:flex">
        {FACILITY_ICONS.filter((f) => slot[f.key]).map((f) => (
          <Icon key={f.key} name={f.icon} size={16} color="currentColor" weight="fill" />
        ))}
      </span>
      <StatusChip
        label={slotStatusLabels[slot.status]}
        tone={
          slot.status === 'AVAILABLE' ? 'ok' : slot.status === 'SUSPENDED' ? 'neutral' : 'pending'
        }
      />
    </button>
  );
}

/** "Không có ô nào khớp bộ lọc.": an empty stretch of pavement above its painted kerb. */
export function EmptyKerb({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-sm rounded-[20px] bg-card px-md py-lg text-center ring-1 ring-border">
      <svg aria-hidden="true" viewBox="0 0 220 64" className="h-16 w-[220px]">
        <rect
          x="0"
          y="6"
          width="220"
          height="44"
          rx="6"
          className="fill-[#FFF3E8] dark:fill-[#2A2420]"
        />
        {[0, 1, 2].map((i) => (
          <rect
            key={i}
            x={18 + i * 66}
            y="14"
            width="52"
            height="28"
            rx="5"
            strokeWidth="2"
            strokeDasharray="6 5"
            className="fill-none stroke-[rgb(var(--c-primary)/0.45)]"
          />
        ))}
        {Array.from({ length: 10 }, (_, i) => (
          <rect
            key={i}
            x={i * 22}
            y="52"
            width="22"
            height="8"
            className={i % 2 ? 'fill-[#FFF8F2]' : 'fill-brand'}
          />
        ))}
      </svg>
      <p className="text-body-md text-muted">{text}</p>
    </div>
  );
}

const STEPS: { icon: IconName; text: string }[] = [
  { icon: 'walk', text: 'Ra đứng đúng chỗ đặt ô trên vỉa hè, đo bề rộng và chiều dài bằng thước.' },
  { icon: 'crosshairs-gps', text: 'Bấm Vị trí của tôi (GPS) để ghi tọa độ ngay tại chỗ đứng.' },
  { icon: 'ruler-square', text: 'Điền kích thước, xem phiếu kiểm tra vị trí rồi bấm Thêm ô.' },
];

/** With only a slot or two on the grid: the three steps of placing one in the field. */
export function FewDataGuide() {
  return (
    <div className="overflow-hidden rounded-[20px] bg-card shadow-card ring-1 ring-border">
      <div aria-hidden="true" className="sb-kerb sb-kerb-thin" />
      <div className="flex flex-col gap-md p-md md:p-lg">
        <p className="font-sign text-[20px] font-extrabold leading-tight text-text [font-stretch:90%]">
          Đặt một ô ngoài vỉa hè
        </p>
        <ol className="grid gap-sm md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.text} className="flex items-start gap-sm">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary font-sign text-[15px] font-bold text-on-primary">
                {i + 1}
              </span>
              <span className="flex min-w-0 flex-col gap-1 pt-1">
                <Icon name={step.icon} size={18} color="currentColor" className="text-primary" />
                <span className="text-body-md leading-snug text-text">{step.text}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
