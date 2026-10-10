import { Icon } from '@/components/common';
import { PASSWORD_RULES } from '@/core/auth/password-policy';

type Props = {
  value: string;
  /** Hidden until the user starts typing, so the rules never sit on the page unasked. */
  visible?: boolean;
  /** Say "Mật khẩu đủ mạnh" here; off where another element already says it. */
  announceStrong?: boolean;
};

/**
 * BR-59 as a six-segment kerb meter over the rule list, ticked off live while
 * typing. Display only: validation still runs on submit, exactly as before.
 * Each rule is listed once.
 */
export function PasswordStrength({ value, visible = true, announceStrong = true }: Props) {
  if (!visible) return null;

  const results = PASSWORD_RULES.map((rule) => ({ rule, passed: rule.test(value) }));
  const met = results.filter((r) => r.passed).length;
  const total = results.length;
  const strong = met === total;

  return (
    <div className="sb-pop flex flex-col gap-sm rounded-[14px] bg-sunken/60 p-sm ring-1 ring-inset ring-border">
      <div className="flex flex-wrap items-center gap-x-sm gap-y-1.5">
        <div
          role="img"
          aria-label={`Độ mạnh mật khẩu: đạt ${met} trên ${total} yêu cầu`}
          className="grid min-w-[140px] flex-1 basis-[140px] gap-1"
          style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}
        >
          {results.map(({ rule }, index) => (
            <span key={rule.id} className="h-1.5 overflow-hidden rounded-[3px] bg-border">
              <span
                className={`block h-full origin-left rounded-[3px] transition-[transform,background-color] duration-200 ${strong ? 'bg-tertiary' : 'bg-brand'}`}
                style={{ transform: `scaleX(${index < met ? 1 : 0})` }}
              />
            </span>
          ))}
        </div>
        <span
          aria-live="polite"
          className={`shrink-0 text-label ${strong ? 'text-[#0B5D33] dark:text-[#8BE3B0]' : 'text-text'}`}
        >
          {`Đạt ${met}/${total} yêu cầu`}
          {strong && announceStrong ? (
            <span className="ml-xs font-semibold">Mật khẩu đủ mạnh</span>
          ) : null}
        </span>
      </div>
      <ul className="grid grid-cols-1 gap-x-md gap-y-1 sm:grid-cols-2">
        {results.map(({ rule, passed }) => (
          <li key={rule.id} className="flex min-w-0 items-center gap-xs">
            <span
              className={`shrink-0 ${passed ? 'text-tertiary' : 'text-muted'} transition-colors duration-200`}
            >
              <Icon
                name={passed ? 'check-circle' : 'circle-outline'}
                size={16}
                color="currentColor"
              />
            </span>
            <span className={`text-body-sm ${passed ? 'text-text' : 'text-muted'}`}>
              {rule.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
