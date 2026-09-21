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
  'circle-outline': Md.MdOutlineCircle,
  'cart-outline': Md.MdOutlineShoppingCart,
  minus: Md.MdRemove,
  plus: Md.MdAdd,
  creation: Md.MdOutlineAutoAwesome,
  magnify: Md.MdOutlineSearch,
  'account-circle-outline': Md.MdOutlineAccountCircle,
  'account-group-outline': Md.MdOutlineGroup,
  'trash-can-outline': Md.MdOutlineDeleteOutline,
  'pencil-outline': Md.MdOutlineEdit,
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
  'format-list-bulleted': Md.MdOutlineFormatListBulleted,
  'eye-off-outline': Md.MdOutlineVisibilityOff,
  'eye-outline': Md.MdOutlineVisibility,
  // Slot workspace (vendor "Ô thuê" screen)
  gavel: Md.MdOutlineGavel,
  'layers-outline': Md.MdOutlineLayers,
  'bookmark-outline': Md.MdOutlineBookmarkBorder,
  bookmark: Md.MdBookmark,
  'clock-outline': Md.MdOutlineAccessTime,
  check: Md.MdCheck,
  'information-outline': Md.MdOutlineInfo,
  'send-outline': Md.MdOutlineSend,
  'timer-outline': Md.MdOutlineTimer,
  'flash-outline': Md.MdOutlineBolt,
  'water-outline': Md.MdOutlineWaterDrop,
  'transmission-tower': Md.MdOutlineElectricalServices,
  'fire-hydrant': Md.MdOutlineLocalFireDepartment,
  'tree-outline': Md.MdOutlinePark,
  'lightbulb-outline': Md.MdOutlineLightbulb,
  'bus-stop': Md.MdOutlineDirectionsBus,
  parking: Md.MdOutlineLocalParking,
  walk: Md.MdOutlineDirectionsWalk,
  'ruler-square': Md.MdOutlineSquareFoot,
  'phone-outline': Md.MdOutlinePhone,
  'map-outline': Md.MdOutlineMap,
  'view-grid-outline': Md.MdOutlineGridView,
  'filter-variant': Md.MdOutlineFilterList,
  'chevron-down': Md.MdKeyboardArrowDown,
  'block-helper': Md.MdOutlineBlock,
  'tag-outline': Md.MdOutlineSell,
  'crosshairs-gps': Md.MdOutlineMyLocation,
  'plus-circle-outline': Md.MdOutlineAddCircleOutline,
  'arrow-right': Md.MdArrowForward,
  headset: Md.MdOutlineSupportAgent,
  'white-balance-sunny': Md.MdOutlineLightMode,
  'weather-night': Md.MdOutlineDarkMode,
  'monitor': Md.MdOutlineDesktopWindows,
  logout: Md.MdOutlineLogout,
  menu: Md.MdMenu,
  'chevron-left': Md.MdChevronLeft,
  'chevron-up': Md.MdExpandLess,
  'noodles': Md.MdOutlineRamenDining,
  'coffee-outline': Md.MdOutlineLocalCafe,
  'cupcake': Md.MdOutlineCake,
  'fire': Md.MdOutlineLocalFireDepartment,
  'rice': Md.MdOutlineRiceBowl,
  'fastfood': Md.MdOutlineFastfood,
  'icecream': Md.MdOutlineIcecream,
  'tune': Md.MdTune,
  'map-marker': Md.MdLocationOn,
  'sort': Md.MdSort,
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
