import type { ReactNode } from 'react';

import { Icon, type IconName } from '@/components/common';

type Tone = 'success' | 'waiting' | 'danger' | 'safe';

/** Pale wash + deep ink of the same hue (every pair ≥ 7:1, readable outdoors). */
const TONES: Record<Tone, { box: string; icon: IconName }> = {
  success: {
    box: 'bg-[#E6F6EC] text-[#0B5D33] ring-[#0B5D33]/15 dark:bg-[#10301F] dark:text-[#8BE3B0]',
    icon: 'check-circle',
  },
  waiting: {
    box: 'bg-[#FFF3D1] text-[#6B4100] ring-[#6B4100]/15 dark:bg-[#3A2A08] dark:text-[#FFD27A]',
    icon: 'clock-outline',
  },
  danger: {
    box: 'bg-[#FDEBEA] text-[#8F1717] ring-[#8F1717]/15 dark:bg-[#3A1414] dark:text-[#FF9A90]',
    icon: 'alert-circle-outline',
  },
  safe: {
    box: 'bg-[#E6F6EC] text-[#0B5D33] ring-[#0B5D33]/15 dark:bg-[#10301F] dark:text-[#8BE3B0]',
    icon: 'shield-check-outline',
  },
};

type Props = {
  tone: Tone;
  children: ReactNode;
  /** Kept on the element exactly as the screen asks (`status` banners, `alert` errors). */
  role?: 'status' | 'alert';
  icon?: IconName;
  /** Pop the icon in once, for a moment worth celebrating. */
  popIcon?: boolean;
  action?: ReactNode;
};

/** A banner with an icon on a light wash of its meaning; the words stay in one element. */
export function AuthNotice({ tone, children, role, icon, popIcon, action }: Props) {
  const look = TONES[tone];
  return (
    <div
      role={role}
      className={`flex items-start gap-sm rounded-[14px] px-sm py-sm ring-1 ring-inset ${look.box}`}
    >
      <span className={`mt-px shrink-0 ${popIcon ? 'sb-pop' : ''}`}>
        <Icon name={icon ?? look.icon} size={20} color="currentColor" weight="fill" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-body-md font-medium">{children}</p>
        {action ? <div className="mt-sm">{action}</div> : null}
      </div>
    </div>
  );
}
