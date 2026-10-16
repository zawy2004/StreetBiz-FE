import { Link } from 'react-router-dom';

import { LEGAL_ROUTES } from '../legal-content';

const LINKS = [
  { to: LEGAL_ROUTES.terms, label: 'Điều khoản' },
  { to: LEGAL_ROUTES.privacy, label: 'Bảo mật' },
  { to: LEGAL_ROUTES.slotRules, label: 'Quy định thuê ô' },
  { to: LEGAL_ROUTES.basis, label: 'Căn cứ pháp lý' },
];

/** The three legal pages as one quiet row of links, for any footer. */
export function LegalLinks({ className = '' }: { className?: string }) {
  return (
    <nav
      aria-label="Pháp lý"
      className={`flex flex-wrap items-center gap-x-md gap-y-1 text-body-sm text-muted ${className}`}
    >
      {LINKS.map((link) => (
        <Link
          key={link.to}
          to={link.to}
          className="inline-flex min-h-11 items-center hover:text-text hover:underline"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
