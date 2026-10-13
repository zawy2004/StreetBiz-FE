import { Icon } from '@/components/common';
import { ROLE_LABELS } from '@/core/types/role';
import { ROLE_ICON, ROLE_ORDER, ROLE_TINT } from './role-plates';

/**
 * "One door for everyone": the four roles that sign in here, as small plates.
 * Not interactive; shown when the demo accounts block is not.
 */
export function RoleUsage() {
  return (
    <div className="flex flex-col gap-xs border-t border-border pt-md">
      <p className="text-body-sm text-muted">Dùng chung cho</p>
      <ul className="flex flex-wrap gap-xs">
        {ROLE_ORDER.map((role) => (
          <li
            key={role}
            className={`inline-flex h-8 items-center gap-1.5 rounded-[8px] px-2.5 text-body-sm font-semibold ${ROLE_TINT[role]}`}
          >
            <Icon name={ROLE_ICON[role]} size={16} color="currentColor" weight="fill" />
            {ROLE_LABELS[role]}
          </li>
        ))}
      </ul>
    </div>
  );
}
