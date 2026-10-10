import * as Pi from 'react-icons/pi';
import type { IconType } from 'react-icons';

type Glyph = { regular: IconType; fill?: IconType; duotone?: IconType };
const g = (regular: IconType, fill?: IconType, duotone?: IconType): Glyph => ({
  regular,
  fill,
  duotone,
});

/**
 * One icon family across the product: Phosphor (the assistant uses it too).
 * Call sites keep the legacy MaterialCommunityIcons-style names from the RN
 * port (`compass-outline`, `home-outline`…); each maps to a Phosphor glyph.
 * Static member access keeps the bundle tree-shaken.
 */
const ICON_MAP: Record<string, Glyph> = {
  'view-dashboard-outline': g(Pi.PiSquaresFour, Pi.PiSquaresFourFill, Pi.PiSquaresFourDuotone),
  'inbox-outline': g(Pi.PiTray, Pi.PiTrayFill, Pi.PiTrayDuotone),
  'map-marker-radius-outline': g(Pi.PiMapPinArea, Pi.PiMapPinAreaFill, Pi.PiMapPinAreaDuotone),
  'map-marker-outline': g(Pi.PiMapPin, Pi.PiMapPinFill, Pi.PiMapPinDuotone),
  'map-marker-off-outline': g(Pi.PiMapPinSimpleLine, Pi.PiMapPinSimpleLineFill),
  'map-marker': g(Pi.PiMapPinFill, Pi.PiMapPinFill),
  'qrcode-scan': g(Pi.PiScan, Pi.PiScanFill, Pi.PiScanDuotone),
  'qrcode-remove': g(Pi.PiScan, Pi.PiScanFill),
  qrcode: g(Pi.PiQrCode, Pi.PiQrCodeFill, Pi.PiQrCodeDuotone),
  'cloud-check-outline': g(Pi.PiCloudCheck, Pi.PiCloudCheckFill, Pi.PiCloudCheckDuotone),
  'clipboard-text-outline': g(
    Pi.PiClipboardText,
    Pi.PiClipboardTextFill,
    Pi.PiClipboardTextDuotone,
  ),
  'chart-bar': g(Pi.PiChartBar, Pi.PiChartBarFill, Pi.PiChartBarDuotone),
  'chart-line': g(Pi.PiChartLineUp, Pi.PiChartLineUpFill, Pi.PiChartLineUpDuotone),
  devices: g(Pi.PiDevices, Pi.PiDevicesFill),
  laptop: g(Pi.PiLaptop, Pi.PiLaptopFill),
  'close-circle-outline': g(Pi.PiXCircle, Pi.PiXCircleFill),
  close: g(Pi.PiX, Pi.PiXBold),
  'bell-outline': g(Pi.PiBell, Pi.PiBellFill, Pi.PiBellDuotone),
  'bell-ring': g(Pi.PiBellRinging, Pi.PiBellRingingFill),
  'shield-check-outline': g(Pi.PiShieldCheck, Pi.PiShieldCheckFill, Pi.PiShieldCheckDuotone),
  'shield-alert-outline': g(Pi.PiShieldWarning, Pi.PiShieldWarningFill, Pi.PiShieldWarningDuotone),
  'lock-outline': g(Pi.PiLockSimple, Pi.PiLockSimpleFill),
  'arrow-left': g(Pi.PiArrowLeft, Pi.PiArrowLeftBold),
  'arrow-right': g(Pi.PiArrowRight, Pi.PiArrowRightBold),
  history: g(Pi.PiClockCounterClockwise, Pi.PiClockCounterClockwiseFill),
  'file-document-outline': g(Pi.PiFileText, Pi.PiFileTextFill, Pi.PiFileTextDuotone),
  receipt: g(Pi.PiReceipt, Pi.PiReceiptFill, Pi.PiReceiptDuotone),
  'receipt-text-outline': g(Pi.PiReceipt, Pi.PiReceiptFill, Pi.PiReceiptDuotone),
  'cash-multiple': g(Pi.PiMoney, Pi.PiMoneyFill, Pi.PiMoneyDuotone),
  'alert-octagon-outline': g(Pi.PiWarningOctagon, Pi.PiWarningOctagonFill),
  'alert-circle-outline': g(Pi.PiWarningCircle, Pi.PiWarningCircleFill),
  'wallet-outline': g(Pi.PiWallet, Pi.PiWalletFill, Pi.PiWalletDuotone),
  'check-circle': g(Pi.PiCheckCircleFill, Pi.PiCheckCircleFill),
  'check-circle-outline': g(Pi.PiCheckCircle, Pi.PiCheckCircleFill),
  'circle-outline': g(Pi.PiCircle, Pi.PiCircleFill),
  'cart-outline': g(Pi.PiShoppingBagOpen, Pi.PiShoppingBagOpenFill, Pi.PiShoppingBagOpenDuotone),
  minus: g(Pi.PiMinus, Pi.PiMinusBold),
  plus: g(Pi.PiPlus, Pi.PiPlusBold),
  'plus-circle-outline': g(Pi.PiPlusCircle, Pi.PiPlusCircleFill),
  creation: g(Pi.PiSparkle, Pi.PiSparkleFill, Pi.PiSparkleDuotone),
  magnify: g(Pi.PiMagnifyingGlass, Pi.PiMagnifyingGlassBold),
  'account-circle-outline': g(Pi.PiUserCircle, Pi.PiUserCircleFill, Pi.PiUserCircleDuotone),
  'account-group-outline': g(Pi.PiUsersThree, Pi.PiUsersThreeFill, Pi.PiUsersThreeDuotone),
  'trash-can-outline': g(Pi.PiTrash, Pi.PiTrashFill),
  'pencil-outline': g(Pi.PiPencilSimple, Pi.PiPencilSimpleFill),
  'storefront-outline': g(Pi.PiStorefront, Pi.PiStorefrontFill, Pi.PiStorefrontDuotone),
  'silverware-fork-knife': g(Pi.PiForkKnife, Pi.PiForkKnifeFill, Pi.PiForkKnifeDuotone),
  'flag-outline': g(Pi.PiFlag, Pi.PiFlagFill),
  'chat-alert-outline': g(Pi.PiChatCircleDots, Pi.PiChatCircleDotsFill),
  'chat-outline': g(Pi.PiChatCircle, Pi.PiChatCircleFill, Pi.PiChatCircleDuotone),
  'comment-outline': g(Pi.PiChatText, Pi.PiChatTextFill),
  login: g(Pi.PiSignIn, Pi.PiSignInBold),
  logout: g(Pi.PiSignOut, Pi.PiSignOutBold),
  'cog-outline': g(Pi.PiGearSix, Pi.PiGearSixFill),
  'camera-plus-outline': g(Pi.PiCameraPlus, Pi.PiCameraPlusFill),
  'compass-outline': g(Pi.PiCompass, Pi.PiCompassFill, Pi.PiCompassDuotone),
  'home-outline': g(Pi.PiHouse, Pi.PiHouseFill, Pi.PiHouseDuotone),
  star: g(Pi.PiStarFill, Pi.PiStarFill),
  'star-outline': g(Pi.PiStar, Pi.PiStarFill),
  'swap-horizontal': g(Pi.PiArrowsLeftRight, Pi.PiArrowsLeftRightBold),
  'shape-outline': g(Pi.PiShapes, Pi.PiShapesFill, Pi.PiShapesDuotone),
  'chevron-right': g(Pi.PiCaretRight, Pi.PiCaretRightBold),
  'chevron-left': g(Pi.PiCaretLeft, Pi.PiCaretLeftBold),
  'chevron-down': g(Pi.PiCaretDown, Pi.PiCaretDownBold),
  'chevron-up': g(Pi.PiCaretUp, Pi.PiCaretUpBold),
  'format-list-bulleted': g(Pi.PiListBullets, Pi.PiListBulletsBold),
  'eye-off-outline': g(Pi.PiEyeSlash, Pi.PiEyeSlashFill),
  'eye-outline': g(Pi.PiEye, Pi.PiEyeFill),
  gavel: g(Pi.PiGavel, Pi.PiGavelFill, Pi.PiGavelDuotone),
  'layers-outline': g(Pi.PiStack, Pi.PiStackFill),
  'bookmark-outline': g(Pi.PiBookmarkSimple, Pi.PiBookmarkSimpleFill),
  bookmark: g(Pi.PiBookmarkSimpleFill, Pi.PiBookmarkSimpleFill),
  'clock-outline': g(Pi.PiClock, Pi.PiClockFill),
  check: g(Pi.PiCheck, Pi.PiCheckBold),
  'information-outline': g(Pi.PiInfo, Pi.PiInfoFill),
  'send-outline': g(Pi.PiPaperPlaneTilt, Pi.PiPaperPlaneTiltFill),
  'timer-outline': g(Pi.PiTimer, Pi.PiTimerFill),
  'flash-outline': g(Pi.PiLightning, Pi.PiLightningFill),
  'water-outline': g(Pi.PiDrop, Pi.PiDropFill),
  'transmission-tower': g(Pi.PiPlug, Pi.PiPlugFill),
  'fire-hydrant': g(Pi.PiFireExtinguisher, Pi.PiFireExtinguisherFill),
  'tree-outline': g(Pi.PiTree, Pi.PiTreeFill),
  'lightbulb-outline': g(Pi.PiLightbulb, Pi.PiLightbulbFill),
  'bus-stop': g(Pi.PiBus, Pi.PiBusFill),
  parking: g(Pi.PiCarSimple, Pi.PiCarSimpleFill),
  walk: g(Pi.PiPersonSimpleWalk, Pi.PiPersonSimpleWalkFill),
  'ruler-square': g(Pi.PiRuler, Pi.PiRulerFill),
  'phone-outline': g(Pi.PiPhone, Pi.PiPhoneFill),
  'map-outline': g(Pi.PiMapTrifold, Pi.PiMapTrifoldFill, Pi.PiMapTrifoldDuotone),
  'view-grid-outline': g(Pi.PiGridFour, Pi.PiGridFourFill),
  'filter-variant': g(Pi.PiFunnelSimple, Pi.PiFunnelSimpleFill),
  'block-helper': g(Pi.PiProhibit, Pi.PiProhibitBold),
  'tag-outline': g(Pi.PiTag, Pi.PiTagFill),
  'crosshairs-gps': g(Pi.PiCrosshair, Pi.PiCrosshairBold),
  headset: g(Pi.PiHeadset, Pi.PiHeadsetFill),
  'white-balance-sunny': g(Pi.PiSun, Pi.PiSunFill),
  'weather-night': g(Pi.PiMoon, Pi.PiMoonFill),
  monitor: g(Pi.PiMonitor, Pi.PiMonitorFill),
  menu: g(Pi.PiList, Pi.PiListBold),
  noodles: g(Pi.PiBowlSteam, Pi.PiBowlSteamFill, Pi.PiBowlSteamDuotone),
  'coffee-outline': g(Pi.PiCoffee, Pi.PiCoffeeFill, Pi.PiCoffeeDuotone),
  cupcake: g(Pi.PiCake, Pi.PiCakeFill, Pi.PiCakeDuotone),
  fire: g(Pi.PiFire, Pi.PiFireFill, Pi.PiFireDuotone),
  rice: g(Pi.PiBowlFood, Pi.PiBowlFoodFill, Pi.PiBowlFoodDuotone),
  fastfood: g(Pi.PiHamburger, Pi.PiHamburgerFill, Pi.PiHamburgerDuotone),
  icecream: g(Pi.PiIceCream, Pi.PiIceCreamFill, Pi.PiIceCreamDuotone),
  tune: g(Pi.PiSlidersHorizontal, Pi.PiSlidersHorizontalFill),
  sort: g(Pi.PiSortAscending, Pi.PiSortAscendingBold),
};

export type IconName = keyof typeof ICON_MAP | (string & {});
export type IconWeight = 'regular' | 'fill' | 'duotone';

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  className?: string;
  /** `fill` for active navigation and filled marks, `duotone` for large decorative tiles. */
  weight?: IconWeight;
};

export function Icon({ name, size = 20, color, className, weight = 'regular' }: Props) {
  const glyph = ICON_MAP[name];
  const Cmp = (glyph && (glyph[weight] ?? glyph.regular)) ?? Pi.PiQuestion;
  return <Cmp size={size} color={color} className={className} aria-hidden="true" />;
}
