import type { RoleTabItem } from '@/components/layout/RoleTabBar';

export const CUSTOMER_TABS: RoleTabItem[] = [
  { to: '/customer/explore', label: 'Khám phá', icon: 'compass-outline' },
  { to: '/customer/scan', label: 'Quét QR', icon: 'qrcode-scan' },
  { to: '/customer/orders', label: 'Đơn hàng', icon: 'receipt-text-outline' },
  { to: '/customer/account', label: 'Tài khoản', icon: 'account-circle-outline' },
];

export const VENDOR_TABS: RoleTabItem[] = [
  { to: '/vendor/home', label: 'Trang chủ', icon: 'home-outline' },
  { to: '/vendor/slots', label: 'Ô thuê', icon: 'map-marker-radius-outline' },
  { to: '/vendor/finance', label: 'Tài chính', icon: 'cash-multiple' },
  { to: '/vendor/store', label: 'Cửa hàng', icon: 'silverware-fork-knife' },
  { to: '/vendor/account', label: 'Tài khoản', icon: 'account-circle-outline' },
];

export const WARD_TABS: RoleTabItem[] = [
  { to: '/ward/dashboard', label: 'Tổng quan', icon: 'view-dashboard-outline' },
  { to: '/ward/inbox', label: 'Hộp duyệt', icon: 'inbox-outline' },
  { to: '/ward/slots', label: 'Lưới ô', icon: 'map-marker-radius-outline' },
  { to: '/ward/patrol', label: 'Tuần tra', icon: 'qrcode-scan' },
  { to: '/ward/reports', label: 'Báo cáo', icon: 'chart-bar' },
];

export const PLATFORM_TABS: RoleTabItem[] = [
  { to: '/platform/dashboard', label: 'Tổng quan', icon: 'view-dashboard-outline' },
  { to: '/platform/accounts', label: 'Tài khoản', icon: 'account-group-outline' },
  { to: '/platform/categories', label: 'Danh mục', icon: 'shape-outline' },
  { to: '/platform/moderation', label: 'Kiểm duyệt', icon: 'shield-alert-outline' },
];
