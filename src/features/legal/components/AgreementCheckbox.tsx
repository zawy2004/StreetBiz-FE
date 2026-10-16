import { Fragment } from 'react';
import { Link } from 'react-router-dom';

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  links: { label: string; to: string }[];
  error?: string;
};

/**
 * One "I have read and agree to …" tick in place of long commitment sentences.
 * The links open in a new tab so reading them never loses the form.
 */
export function AgreementCheckbox({ checked, onChange, links, error }: Props) {
  return (
    <div className="flex flex-col gap-1">
      <label
        className={`flex min-h-12 cursor-pointer items-start gap-sm rounded-[16px] px-md py-sm text-body-sm text-text ring-1 ring-inset transition-colors ${
          checked
            ? 'bg-[#E6F6EC]/70 ring-border dark:bg-[#10301F]/70'
            : error
              ? 'bg-card ring-error'
              : 'bg-card ring-border hover:bg-sunken'
        }`}
      >
        <input
          type="checkbox"
          className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-primary"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={error ? true : undefined}
        />
        <span>
          Tôi đã đọc và đồng ý{' '}
          {links.map((link, i) => (
            <Fragment key={link.to}>
              {i > 0 ? (i === links.length - 1 ? ' và ' : ', ') : null}
              <Link
                to={link.to}
                target="_blank"
                rel="noopener"
                className="font-semibold text-primary underline-offset-2 hover:underline"
              >
                {link.label}
              </Link>
            </Fragment>
          ))}
          .
        </span>
      </label>
      {error ? (
        <p role="alert" className="text-body-sm text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
