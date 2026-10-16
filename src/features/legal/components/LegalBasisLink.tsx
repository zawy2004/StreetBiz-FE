import { Link } from 'react-router-dom';

import { Icon } from '@/components/common';
import { LEGAL_ROUTES } from '../legal-content';

/**
 * A quiet "Căn cứ pháp lý" link in place of quoting a law on the screen itself.
 * `title` (a decision number, say) shows on hover; the full list lives on the legal page.
 */
export function LegalBasisLink({
  title,
  anchor,
  className = '',
}: {
  title?: string;
  anchor?: 'tuyen' | 'duyet-ho-so' | 'cap-phuong' | 'kinh-doanh' | 'du-lieu' | 'xu-phat';
  className?: string;
}) {
  return (
    <Link
      to={anchor ? `${LEGAL_ROUTES.basis}#${anchor}` : LEGAL_ROUTES.basis}
      target="_blank"
      rel="noopener"
      title={title}
      className={`inline-flex min-h-8 items-center gap-1 text-label font-semibold text-primary underline-offset-2 hover:underline ${className}`}
    >
      <Icon name="gavel" size={14} color="currentColor" />
      Căn cứ pháp lý
    </Link>
  );
}
