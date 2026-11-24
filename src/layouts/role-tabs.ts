import type { RoleTabItem } from '@/components/layout/RoleTabBar';

export const CUSTOMER_TABS: RoleTabItem[] = [
  { to: '/customer/explore', label: 'Khám phá', icon: 'compass-outline' },
  { to: '/customer/scan', label: 'Quét QR', icon: 'qrcode-scan' },
  { to: '/customer/orders', label: 'Đơn hàng', icon: 'receipt-text-outline' },
  { to: '/customer/chat', label: 'Tin nhắn', icon: 'chat-outline' },
  { to: '/customer/account', label: 'Tài khoản', icon: 'account-circle-outline' },
];

/*
 * Management roles: the sidebar is split by job (`section`), and every page that used to be
 * reachable only through a button inside another page sits in its group's fold-out list. On a
 * phone the bar keeps the four most-used entries (`phoneOrder`) and the rest, with their
 * sub-pages, go behind "Thêm".
 */

export const VENDOR_TABS: RoleTabItem[] = [
  { to: '/vendor/home', label: 'Trang chủ', icon: 'home-outline', phoneOrder: 1 },
  {
    section: 'Vỉa hè',
    to: '/vendor/slots',
    label: 'Ô thuê',
    icon: 'map-marker-radius-outline',
    phoneOrder: 2,
    children: [
      { to: '/vendor/slots', label: 'Chọn ô trên bản đồ' },
      { to: '/vendor/slots/mine', label: 'Ô của tôi' },
      { to: '/vendor/slots/rental-applications', label: 'Đơn thuê ô' },
      { to: '/vendor/slots/contracts', label: 'Hợp đồng & giấy phép' },
      { to: '/vendor/slots/transfers', label: 'Chuyển nhượng ô' },
      { to: '/vendor/slots/slot-proposals/new', label: 'Đề xuất ô mới', match: [] },
    ],
  },
  {
    to: '/vendor/registrations',
    label: 'Hồ sơ kinh doanh',
    icon: 'file-document-outline',
    match: ['/vendor/onboarding'],
    children: [
      { to: '/vendor/registrations', label: 'Hồ sơ của tôi' },
      {
        to: '/vendor/registrations/new/type',
        label: 'Đăng ký hồ sơ mới',
        match: ['/vendor/registrations/new'],
      },
      { to: '/vendor/onboarding', label: 'Hướng dẫn bắt đầu', match: [] },
    ],
  },
  {
    section: 'Bán hàng',
    to: '/vendor/orders',
    label: 'Đơn hàng',
    icon: 'receipt-text-outline',
    phoneOrder: 4,
    children: [
      { to: '/vendor/orders', label: 'Bảng đơn hàng' },
      { to: '/vendor/orders/scan', label: 'Quét mã giao hàng', match: [] },
      {
        to: '/vendor/orders/sales-summary',
        label: 'Tổng kết bán hàng',
        match: ['/vendor/store/sales'],
      },
    ],
  },
  {
    to: '/vendor/store',
    label: 'Cửa hàng',
    icon: 'storefront-outline',
    children: [
      { to: '/vendor/store', label: 'Thông tin cửa hàng' },
      { to: '/vendor/store/menu', label: 'Thực đơn', match: [] },
      { to: '/vendor/store/counter', label: 'Bán tại quầy', match: [] },
      { to: '/vendor/store/food-safety', label: 'An toàn thực phẩm' },
    ],
  },
  { to: '/vendor/chat', label: 'Tin nhắn', icon: 'chat-outline' },
  {
    section: 'Tiền & thuế',
    to: '/vendor/finance',
    label: 'Tài chính',
    icon: 'cash-multiple',
    phoneOrder: 3,
    children: [
      { to: '/vendor/finance', label: 'Phí phải nộp' },
      { to: '/vendor/finance/invoices', label: 'Hoá đơn' },
      { to: '/vendor/finance/payments', label: 'Lịch sử thanh toán' },
      {
        to: '/vendor/finance/violations',
        label: 'Vi phạm & tiền phạt',
        match: ['/vendor/finance/penalties'],
      },
      { to: '/vendor/finance/payout-account', label: 'Tài khoản nhận tiền' },
    ],
  },
  {
    to: '/vendor/tax',
    label: 'Thuế',
    icon: 'calculator',
    children: [
      { to: '/vendor/tax', label: 'Tổng quan thuế' },
      { to: '/vendor/tax/ledger', label: 'Sổ doanh thu' },
      { to: '/vendor/tax/estimate', label: 'Ước tính thuế' },
      { to: '/vendor/tax/filings', label: 'Tờ khai' },
      { to: '/vendor/tax/settings', label: 'Cài đặt thuế' },
    ],
  },
  { to: '/vendor/account', label: 'Tài khoản', icon: 'account-circle-outline' },
];

export const WARD_TABS: RoleTabItem[] = [
  { to: '/ward/dashboard', label: 'Tổng quan', icon: 'view-dashboard-outline', phoneOrder: 1 },
  {
    section: 'Hồ sơ',
    to: '/ward/inbox',
    label: 'Hộp duyệt',
    icon: 'inbox-outline',
    phoneOrder: 2,
    children: [
      // Everything under the inbox not claimed below: registrations, rental
      // applications and renewals open from the overview.
      { to: '/ward/inbox', label: 'Tổng quan' },
      {
        to: '/ward/inbox/reviews',
        label: 'Hồ sơ vị trí',
        match: [
          '/ward/inbox/slot-proposals',
          '/ward/inbox/slot-transfers',
          '/ward/inbox/address-conflicts',
        ],
      },
      { to: '/ward/inbox/food-safety', label: 'Hồ sơ an toàn thực phẩm', match: [] },
      { to: '/ward/inbox/vendor-reports', label: 'Phản ánh về hộ kinh doanh', match: [] },
    ],
  },
  {
    section: 'Hiện trường',
    to: '/ward/slots',
    label: 'Lưới ô',
    icon: 'map-marker-radius-outline',
    phoneOrder: 3,
    children: [
      { to: '/ward/slots', label: 'Bảng ô & lấp đầy' },
      { to: '/ward/slots/editor', label: 'Vẽ & sửa lưới ô', match: [] },
    ],
  },
  {
    to: '/ward/patrol',
    label: 'Tuần tra',
    icon: 'qrcode-scan',
    phoneOrder: 4,
    children: [
      { to: '/ward/patrol', label: 'Quét giấy phép' },
      { to: '/ward/patrol/violations/new', label: 'Ghi nhận vi phạm', match: [] },
    ],
  },
  {
    section: 'Tài chính',
    to: '/ward/finance',
    label: 'Thu phí',
    icon: 'cash-multiple',
    children: [
      { to: '/ward/finance', label: 'Theo dõi thu phí' },
      { to: '/ward/finance/receipts', label: 'Lịch sử thu', match: [] },
      { to: '/ward/finance/payout-account', label: 'Tài khoản nhận tiền', match: [] },
    ],
  },
  { to: '/ward/tax', label: 'Thuế', icon: 'calculator' },
  {
    to: '/ward/reports',
    label: 'Báo cáo',
    icon: 'chart-bar',
    children: [
      { to: '/ward/reports', label: 'Báo cáo thu' },
      { to: '/ward/reports/debtors', label: 'Hộ còn nợ', match: [] },
    ],
  },
  {
    section: 'Thiết lập',
    to: '/ward/settings/pricing',
    label: 'Quy định & mức thu',
    icon: 'tune',
    match: ['/ward/settings'],
    children: [
      { to: '/ward/settings/pricing', label: 'Giá & khung giờ' },
      { to: '/ward/settings/penalties', label: 'Mức phạt vi phạm' },
    ],
  },
];

export const PLATFORM_TABS: RoleTabItem[] = [
  { to: '/platform/dashboard', label: 'Tổng quan', icon: 'view-dashboard-outline' },
  {
    section: 'Người dùng & nội dung',
    to: '/platform/accounts',
    label: 'Tài khoản',
    icon: 'account-group-outline',
  },
  { to: '/platform/moderation', label: 'Kiểm duyệt', icon: 'shield-alert-outline' },
  { section: 'Cấu hình', to: '/platform/categories', label: 'Danh mục', icon: 'shape-outline' },
  { to: '/platform/tax-policies', label: 'Chính sách thuế', icon: 'calculator' },
];
