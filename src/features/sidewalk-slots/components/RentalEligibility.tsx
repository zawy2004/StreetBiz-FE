import { Link } from 'react-router-dom';

import { Icon } from '@/components/common';
import { hkdCode } from '../slot-format';

type ApprovedProps = { registrationId: number; displayName: string };

/** BR-16 met: whose approved registration the application will be filed under. */
export function RentalEligibilityOk({ registrationId, displayName }: ApprovedProps) {
  return (
    <p className="flex items-start gap-xs rounded-[12px] bg-[#E6F6EC] px-sm py-xs text-body-sm text-[#0B5D33] dark:bg-[#10301F] dark:text-[#8BE3B0]">
      <Icon
        name="shield-check-outline"
        size={18}
        color="currentColor"
        weight="fill"
        className="mt-px shrink-0"
      />
      <span className="min-w-0">
        Đứng tên hồ sơ{' '}
        <span className="font-sign font-bold tracking-[0.02em]">{hkdCode(registrationId)}</span>
        {displayName ? ` · ${displayName}` : ''}, đã duyệt
      </span>
    </p>
  );
}

/**
 * BR-16 not met: no approved registration, so nothing here can be held or
 * applied for. Says so in the original words and points to where to fix it.
 */
export function RentalEligibilityMissing() {
  return (
    <div className="flex flex-col gap-sm rounded-[16px] bg-[#FFF3D1] p-md text-[#6B4100] dark:bg-[#3A2A08] dark:text-[#FFD27A]">
      <div className="flex items-start gap-sm">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card shadow-card"
        >
          <Icon name="file-document-outline" size={22} color="currentColor" weight="duotone" />
        </span>
        <p className="pt-0.5 text-body-md font-semibold leading-snug">
          Cần hồ sơ kinh doanh đã được duyệt để giữ chỗ hoặc nộp đơn.
        </p>
      </div>
      <Link
        to="/vendor/registrations"
        className="inline-flex h-12 items-center justify-center gap-xs rounded-[12px] bg-card px-md text-[15px] font-semibold text-primary shadow-card ring-1 ring-inset ring-primary/30 transition-colors hover:bg-tint-primary focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        Xem hồ sơ đăng ký
        <Icon name="chevron-right" size={18} color="currentColor" />
      </Link>
    </div>
  );
}
