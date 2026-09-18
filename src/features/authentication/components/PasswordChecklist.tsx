import { Icon } from '@/components/common';
import { colors } from '@/theme';
import { PASSWORD_RULES } from '@/core/auth/password-policy';

type Props = {
  value: string;
  /** Hide the list until the user starts typing, to keep the first paint calm. */
  visible?: boolean;
};

/**
 * Shows BR-59's password rules and ticks them off live, so the user is not
 * bounced by a server-side validation error they could not anticipate.
 */
export function PasswordChecklist({ value, visible = true }: Props) {
  if (!visible) return null;

  return (
    <ul className="flex flex-col gap-2xs rounded-sm border border-border bg-card p-sm">
      {PASSWORD_RULES.map((rule) => {
        const passed = rule.test(value);
        return (
          <li key={rule.id} className="flex items-center gap-xs">
            <Icon
              name={passed ? 'check-circle' : 'circle-outline'}
              size={16}
              color={passed ? colors.tertiary : colors.muted}
            />
            <span className={`text-body-sm ${passed ? 'text-text' : 'text-muted'}`}>
              {rule.label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
