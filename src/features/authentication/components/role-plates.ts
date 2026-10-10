import type { IconName } from '@/components/common';
import type { RoleCode } from '@/core/types/role';

export const ROLE_ORDER: RoleCode[] = ['CUSTOMER', 'VENDOR', 'WARD_AUTHORITY', 'PLATFORM_ADMIN'];

export const ROLE_ICON: Record<RoleCode, IconName> = {
  CUSTOMER: 'silverware-fork-knife',
  VENDOR: 'storefront-outline',
  WARD_AUTHORITY: 'clipboard-text-outline',
  PLATFORM_ADMIN: 'cog-outline',
};

/** Each role's plate colour: a light wash and its own deep ink, never colour alone. */
export const ROLE_TINT: Record<RoleCode, string> = {
  CUSTOMER: 'bg-tint-primary text-primary',
  VENDOR: 'bg-[#FFF4D1] text-[#7A5400] dark:bg-[#3A2D0E] dark:text-[#FFD88C]',
  WARD_AUTHORITY: 'bg-[#E6F6EC] text-[#0B5D33] dark:bg-[#10301F] dark:text-[#8BE3B0]',
  PLATFORM_ADMIN: 'bg-sunken text-text',
};
