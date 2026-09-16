import * as Md from 'react-icons/md';
import type { IconType } from 'react-icons';

/**
 * Maps the old MaterialCommunityIcons (Expo) glyph names used throughout the
 * codebase to their closest react-icons/md (Material Icons) equivalent, so
 * every call site (`<Icon name="compass-outline" />`, `tabIcon('home-outline')`)
 * keeps working unchanged after the RN → web migration. Unknown names fall
 * back to a generic "help" glyph instead of crashing.
 */
const ICON_MAP: Record<string, IconType> = {
  'view-dashboard-outline': Md.MdOutlineDashboard,
  'inbox-outline': Md.MdOutlineInbox,
  'map-marker-radius-outline': Md.MdOutlineLocationOn,
  'map-marker-outline': Md.MdOutlineLocationOn,
  'map-marker-off-outline': Md.MdOutlineLocationOff,
  'qrcode-scan': Md.MdOutlineQrCodeScanner,
  'qrcode-remove': Md.MdOutlineQrCodeScanner,
  qrcode: Md.MdOutlineQrCode2,
  'chart-bar': Md.MdOutlineBarChart,
  'chart-line': Md.MdOutlineShowChart,
  devices: Md.MdOutlineDevices,
  laptop: Md.MdOutlineLaptop,
  'close-circle-outline': Md.MdOutlineCancel,
  close: Md.MdClose,
  'bell-outline': Md.MdOutlineNotifications,
  'shield-check-outline': Md.MdOutlineVerifiedUser,
  'shield-alert-outline': Md.MdOutlineGppMaybe,
  'lock-outline': Md.MdOutlineLock,
  'arrow-left': Md.MdArrowBack,
  history: Md.MdOutlineHistory,
  'file-document-outline': Md.MdOutlineDescription,
  receipt: Md.MdOutlineReceiptLong,
  'receipt-text-outline': Md.MdOutlineReceiptLong,
  'cash-multiple': Md.MdOutlinePayments,
  'alert-octagon-outline': Md.MdOutlineReportProblem,
  'alert-circle-outline': Md.MdOutlineErrorOutline,
  'wallet-outline': Md.MdOutlineAccountBalanceWallet,
  'check-circle': Md.MdCheckCircle,
  'check-circle-outline': Md.MdOutlineCheckCircle,
  'cart-outline': Md.MdOutlineShoppingCart,
  minus: Md.MdRemove,
  plus: Md.MdAdd,
  creation: Md.MdOutlineAutoAwesome,
  magnify: Md.MdOutlineSearch,
  'account-circle-outline': Md.MdOutlineAccountCircle,
  'account-group-outline': Md.MdOutlineGroup,
  'trash-can-outline': Md.MdOutlineDeleteOutline,
  'storefront-outline': Md.MdOutlineStorefront,
  'silverware-fork-knife': Md.MdOutlineRestaurant,
  'flag-outline': Md.MdOutlineFlag,
  'chat-alert-outline': Md.MdOutlineChat,
  login: Md.MdOutlineLogin,
  'cog-outline': Md.MdOutlineSettings,
  'camera-plus-outline': Md.MdOutlineAddAPhoto,
  'compass-outline': Md.MdOutlineExplore,
  'home-outline': Md.MdOutlineHome,
  star: Md.MdStar,
  'star-outline': Md.MdStarBorder,
  'comment-outline': Md.MdOutlineComment,
  'swap-horizontal': Md.MdOutlineSwapHoriz,
  'shape-outline': Md.MdOutlineCategory,
  'chevron-right': Md.MdChevronRight,
  'eye-off-outline': Md.MdOutlineVisibilityOff,
  'eye-outline': Md.MdOutlineVisibility,
};

export type IconName = keyof typeof ICON_MAP | (string & {});

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  className?: string;
};

export function Icon({ name, size = 20, color, className }: Props) {
  const Cmp = ICON_MAP[name] ?? Md.MdOutlineHelpOutline;
  return <Cmp size={size} color={color} className={className} />;
}
