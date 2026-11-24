import { Icon, type IconName } from '@/components/common';

export type RailButton = {
  /** Spoken and shown as the tooltip; the button itself is icon-only. */
  label: string;
  icon: IconName;
  /** A toggle (3D, satellite, heat) says whether it is on; a plain action leaves it out. */
  pressed?: boolean;
  disabled?: boolean;
  /** Short text beside the icon for the toggles people look for by name (e.g. "3D"). */
  text?: string;
  onPress: () => void;
};

function RailItem({ item }: { item: RailButton }) {
  return (
    <button
      type="button"
      aria-label={item.label}
      title={item.label}
      aria-pressed={item.pressed}
      disabled={item.disabled}
      onClick={item.onPress}
      className={[
        'flex h-11 w-11 items-center justify-center gap-0.5 transition-colors',
        'focus-visible:relative focus-visible:z-[1] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary',
        'disabled:cursor-not-allowed disabled:opacity-40',
        item.pressed ? 'bg-tint-primary text-primary' : 'text-text hover:bg-sunken',
      ].join(' ')}
    >
      {item.text ? (
        <span className="font-sign text-[14px] font-bold leading-none">{item.text}</span>
      ) : (
        <Icon name={item.icon} size={20} color="currentColor" />
      )}
    </button>
  );
}

/**
 * The map's controls as one column on its right edge: groups of 44 px buttons (a thumb-sized
 * target), so nothing floats over the search, the key or the GPS button, and the bottom-right
 * corner stays free for the app-wide "Hỏi trợ lý" bubble.
 */
export function MapRail({ groups }: { groups: RailButton[][] }) {
  return (
    <div
      role="toolbar"
      aria-label="Công cụ bản đồ"
      aria-orientation="vertical"
      className="pointer-events-none flex flex-col items-end gap-xs"
    >
      {groups
        .filter((g) => g.length > 0)
        .map((group, i) => (
          <div
            key={i}
            className="pointer-events-auto flex flex-col overflow-hidden rounded-[12px] bg-card/95 shadow-card ring-1 ring-border backdrop-blur-md [&>button+button]:border-t [&>button+button]:border-border"
          >
            {group.map((item) => (
              <RailItem key={item.label} item={item} />
            ))}
          </div>
        ))}
    </div>
  );
}
