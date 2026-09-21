import { Icon, type IconName } from '@/components/common';
import { useIsDark, useThemeStore, type ThemeMode } from '@/store/theme-store';
import { colors } from '@/theme';

const OPTIONS: { value: ThemeMode; label: string; icon: IconName }[] = [
  { value: 'light', label: 'Sáng', icon: 'white-balance-sunny' },
  { value: 'dark', label: 'Tối', icon: 'weather-night' },
  { value: 'system', label: 'Tự động', icon: 'monitor' },
];

/** Three-way choice for settings panels and the sidebar. */
export function ThemeToggle() {
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);

  return (
    <div role="radiogroup" aria-label="Giao diện" className="grid grid-cols-3 gap-1 rounded-sm bg-sunken p-1">
      {OPTIONS.map((opt) => {
        const active = mode === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setMode(opt.value)}
            className={[
              'flex h-8 items-center justify-center gap-1 rounded-[6px] text-body-xs transition-colors',
              active ? 'bg-card font-semibold text-text shadow-card' : 'text-muted hover:text-text',
            ].join(' ')}
          >
            <Icon name={opt.icon} size={15} color={active ? colors.primary : colors.muted} />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/** One-tap switch between light and dark, for crowded top bars. */
export function ThemeSwitchButton({ onDark = false }: { onDark?: boolean }) {
  const dark = useIsDark();
  const setMode = useThemeStore((s) => s.setMode);
  const label = dark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối';

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => setMode(dark ? 'light' : 'dark')}
      className={[
        'flex h-10 w-10 items-center justify-center rounded-full transition-colors',
        onDark ? 'hover:bg-white/15' : 'hover:bg-sunken',
      ].join(' ')}
    >
      <Icon
        name={dark ? 'white-balance-sunny' : 'weather-night'}
        size={21}
        color={onDark ? colors.white : colors.text}
      />
    </button>
  );
}
