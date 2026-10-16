import { Link } from 'react-router-dom';

import { Icon } from '@/components/common';

const MODES = [
  { key: 'choose', to: '/vendor/slots', label: 'Chọn ô', icon: 'map-marker-radius-outline' },
  { key: 'mine', to: '/vendor/slots/mine', label: 'Ô của tôi', icon: 'file-document-outline' },
] as const;

/**
 * The "Ô thuê" tab holds two jobs: picking a free slot, and looking back at the slots
 * already rented (applications, contracts, transfers). One switch keeps both one tap away.
 */
export function SlotsModeSwitch({ active }: { active: (typeof MODES)[number]['key'] }) {
  return (
    <nav
      aria-label="Ô thuê"
      className="flex w-full gap-1 rounded-[14px] bg-card p-1 shadow-card ring-1 ring-border md:w-fit"
    >
      {MODES.map((mode) => {
        const on = mode.key === active;
        return (
          <Link
            key={mode.key}
            to={mode.to}
            replace
            aria-current={on ? 'page' : undefined}
            className={`flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[10px] px-md text-label transition-colors duration-150 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-primary md:flex-none ${
              on
                ? 'bg-primary font-semibold text-on-primary shadow-[0_8px_18px_-10px_rgb(var(--c-primary)/0.8)]'
                : 'text-muted hover:bg-sunken hover:text-text'
            }`}
          >
            <Icon name={mode.icon} size={18} color="currentColor" />
            {mode.label}
          </Link>
        );
      })}
    </nav>
  );
}
