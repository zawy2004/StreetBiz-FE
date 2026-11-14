import { Link } from 'react-router-dom';

import { Icon } from '@/components/common';

/**
 * REV-03 entry point: a quiet “Báo cáo” link under a storefront or a dish. It opens the report
 * form with the kind, id and name in the address; a guest is asked to sign in there.
 */
export function ReportContentLink({
  contentType,
  targetId,
  name,
  label,
}: {
  contentType: 'STOREFRONT' | 'MENU_ITEM';
  targetId: number;
  name: string;
  label: string;
}) {
  const search = new URLSearchParams({ contentType, targetId: String(targetId), name });
  return (
    <Link
      to={`/customer/explore/report-content?${search.toString()}`}
      className="inline-flex min-h-11 items-center gap-1.5 self-start rounded-full px-sm text-body-md font-semibold text-muted transition-colors hover:bg-sunken hover:text-error"
    >
      <Icon name="flag-outline" size={18} color="currentColor" />
      {label}
    </Link>
  );
}
